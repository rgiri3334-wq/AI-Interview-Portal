import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, ShieldOff, FileText, Trash2, ChevronDown, 
  ChevronUp, Download, RefreshCw, BarChart2, Activity,
  Filter, CheckSquare, Square
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { API_BASE } from '../../config/api';

const getGrade = (score, isProctoringAct) => {
  if (isProctoringAct) return { letter: 'F', color: 'bg-red-100 text-red-700 border-red-300' };
  if (score >= 90) return { letter: 'A+', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  if (score >= 80) return { letter: 'A', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  if (score >= 70) return { letter: 'B', color: 'bg-blue-50 text-blue-600 border-blue-200' };
  if (score >= 60) return { letter: 'C', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' };
  return { letter: 'F', color: 'bg-red-50 text-red-600 border-red-200' };
};

const DecisionDropdown = ({ candidate, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const newVal = e.target.value;
    setLoading(true);
    await onUpdate(candidate.id, newVal);
    setLoading(false);
  };

  const getStyle = (val) => {
    if (val === 'HIRE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (val === 'NO_HIRE') return 'bg-red-50 text-red-700 border-red-200';
    if (val === 'PENDING') return 'bg-slate-50 text-slate-700 border-slate-200';
    if (val === 'PROCTORING_ACT') return 'bg-red-100 text-red-800 border-red-400 font-black';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="relative">
      <select
        value={candidate.hiring_decision || 'PENDING'}
        onChange={handleChange}
        disabled={loading}
        className={`appearance-none px-3 py-1.5 pr-8 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 ${getStyle(candidate.hiring_decision)}`}
      >
        <option value="PENDING">Pending</option>
        <option value="HIRE">Hire</option>
        <option value="NO_HIRE">No Hire</option>
        <option value="PROCTORING_ACT">Proctoring Act</option>
      </select>
      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
      {loading && <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />}
    </div>
  );
};

export default function PipelineDashboard({ pipeline, setPipeline, showToast, handleViewDossier }) {
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Advanced Filters
  const [filterGrade, setFilterGrade] = useState("ALL");
  const [filterRole, setFilterRole] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set(pipeline.map(c => c.job_role).filter(Boolean));
    return ["ALL", ...Array.from(roles)];
  }, [pipeline]);

  const filteredPipeline = useMemo(() => {
    return pipeline.filter(c => {
      // Search text
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.name?.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q) && !c.job_role?.toLowerCase().includes(q)) {
          return false;
        }
      }
      
      // Filter Role
      if (filterRole !== "ALL" && c.job_role !== filterRole) return false;
      
      // Filter Grade
      if (filterGrade !== "ALL") {
        const isProctoringAct = c.termination_reason === 'PROCTORING_ACT' || c.hiring_decision === 'PROCTORING_ACT';
        const g = getGrade(c.global_score || 0, isProctoringAct);
        if (!g.letter.startsWith(filterGrade)) return false;
      }
      
      return true;
    });
  }, [pipeline, search, filterRole, filterGrade]);

  const handleDecisionChange = async (id, decision) => {
    try {
      const res = await fetch(`${API_BASE}/candidates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiring_decision: decision })
      });
      if (!res.ok) throw new Error("Failed to update decision");
      setPipeline(prev => prev.map(p => p.id === id ? { ...p, hiring_decision: decision } : p));
      showToast("Decision updated");
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPipeline.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPipeline.map(c => c.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} candidates?`)) return;
    
    let successCount = 0;
    for (let id of Array.from(selectedIds)) {
      try {
         await fetch(`${API_BASE}/candidates/${id}`, { method: 'DELETE' });
         successCount++;
      } catch(e) {}
    }
    
    setPipeline(pipeline.filter(p => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    showToast(`Deleted ${successCount} candidates`);
  };

  const exportCSV = () => {
    const items = pipeline.filter(p => selectedIds.has(p.id));
    if (items.length === 0) return showToast("Select candidates to export", "error");
    
    const headers = ["Name,Email,Role,Score,Decision,Attempt"];
    const rows = items.map(c => `"${c.name}","${c.email}","${c.job_role}","${Math.round(c.global_score || 0)}","${c.hiring_decision || 'PENDING'}","${c.attempt_label || 'Interview'}"`);
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates_export_${new Date().toISOString()}.csv`;
    a.click();
  };

  const toggleCompare = (c) => {
    if (compareIds.includes(c.id)) {
      setCompareIds(compareIds.filter(id => id !== c.id));
    } else {
      if (compareIds.length >= 2) {
        showToast("You can only compare 2 candidates at once", "error");
        return;
      }
      setCompareIds([...compareIds, c.id]);
    }
  };

  const renderComparisonRadar = () => {
    if (compareIds.length !== 2) return null;
    const c1 = pipeline.find(p => p.id === compareIds[0]);
    const c2 = pipeline.find(p => p.id === compareIds[1]);
    if (!c1 || !c2) return null;

    const data = [
      { subject: 'Technical', A: c1.technical_score || 0, B: c2.technical_score || 0, fullMark: 100 },
      { subject: 'Communication', A: c1.communication_score || 0, B: c2.communication_score || 0, fullMark: 100 },
      { subject: 'EQ', A: c1.eq_score || 0, B: c2.eq_score || 0, fullMark: 100 },
      { subject: 'Confidence', A: c1.confidence_score || 0, B: c2.confidence_score || 0, fullMark: 100 },
      { subject: 'Global', A: c1.global_score || 0, B: c2.global_score || 0, fullMark: 100 },
    ];

    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-slate-900 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-600 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-extrabold flex items-center gap-3">
              <Activity className="text-red-500" />
              Candidate Head-to-Head
           </h3>
           <button onClick={() => setCompareIds([])} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors">
             Close Comparison
           </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1 space-y-6">
             {/* C1 Card */}
             <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-red-500" />
                <h4 className="font-bold text-lg">{c1.name}</h4>
                <p className="text-xs text-slate-400 mb-3">{c1.job_role}</p>
                <div className="flex justify-between items-center text-sm">
                   <span className="font-bold">Global Score</span>
                   <span className="text-red-400 font-black">{Math.round(c1.global_score || 0)}</span>
                </div>
             </div>
             {/* C2 Card */}
             <div className="p-5 rounded-2xl bg-slate-800 border border-slate-700 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
                <h4 className="font-bold text-lg">{c2.name}</h4>
                <p className="text-xs text-slate-400 mb-3">{c2.job_role}</p>
                <div className="flex justify-between items-center text-sm">
                   <span className="font-bold">Global Score</span>
                   <span className="text-blue-400 font-black">{Math.round(c2.global_score || 0)}</span>
                </div>
             </div>
          </div>
          
          <div className="lg:col-span-2 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569' }} />
                <Radar name={c1.name} dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
                <Radar name={c2.name} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-[1400px] mx-auto">
      
      <AnimatePresence>
        {renderComparisonRadar()}
      </AnimatePresence>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Header & Controls */}
        <div className="p-8 border-b border-slate-100 bg-white space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm">
                <Users size={24} />
              </div>
              Candidate Dossier Hub
            </h3>
            
            <div className="flex items-center gap-3">
               {selectedIds.size > 0 && (
                 <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
                   <span className="text-xs font-bold mr-2">{selectedIds.size} selected</span>
                   <button onClick={exportCSV} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors" title="Export CSV"><Download size={16}/></button>
                   <button onClick={handleBulkDelete} className="p-1.5 hover:bg-red-600 rounded-lg transition-colors" title="Delete"><Trash2 size={16}/></button>
                 </motion.div>
               )}
               
               <button onClick={() => setCompareMode(!compareMode)} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${compareMode ? 'bg-red-600 text-white shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`}>
                 <BarChart2 size={16} /> Compare
               </button>

               <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${showFilters ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`}>
                 <Filter size={16} /> Filters
               </button>
            </div>
          </div>

          {/* Search & Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, email..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all"
                    />
                  </div>
                  <div>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all appearance-none cursor-pointer">
                       {uniqueRoles.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r}</option>)}
                    </select>
                  </div>
                  <div>
                    <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all appearance-none cursor-pointer">
                       <option value="ALL">All Grades</option>
                       <option value="A">Grade A (80+)</option>
                       <option value="B">Grade B (70-79)</option>
                       <option value="C">Grade C (60-69)</option>
                       <option value="F">Grade F / Proctoring</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                <th className="p-5 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600 transition-colors">
                    {selectedIds.size === filteredPipeline.length && filteredPipeline.length > 0 ? <CheckSquare size={18} className="text-red-600"/> : <Square size={18}/>}
                  </button>
                </th>
                <th className="p-5">Candidate</th>
                <th className="p-5">Applied Role</th>
                <th className="p-5">Decision</th>
                <th className="p-5">Grade</th>
                <th className="p-5">Global Score</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPipeline.length === 0 ? (
                <tr><td colSpan="7" className="p-16 text-center text-slate-400 font-bold">No candidates match your criteria.</td></tr>
              ) : (
                filteredPipeline.map((c, rowIdx) => {
                  const isProctoringAct = c.termination_reason === 'PROCTORING_ACT' || c.hiring_decision === 'PROCTORING_ACT';
                  const isCompleted = c.interview_status === 'completed' || isProctoringAct;
                  const g = getGrade(c.global_score || 0, isProctoringAct);
                  const isExpanded = expandedRow === c.id;
                  const isSelected = selectedIds.has(c.id);
                  const isComparing = compareIds.includes(c.id);

                  return (
                    <React.Fragment key={c.id}>
                      <tr className={`transition-colors group cursor-pointer ${
                        isSelected ? 'bg-red-50/50' : isProctoringAct ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50/80'
                      }`} onClick={() => !compareMode && setExpandedRow(isExpanded ? null : c.id)}>
                        <td className="p-5 text-center" onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}>
                          <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            {isSelected ? <CheckSquare size={18} className="text-red-600"/> : <Square size={18}/>}
                          </button>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                              isProctoringAct ? 'bg-red-100 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-700 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100'
                            }`}>
                              {isProctoringAct ? '⛔' : c.name?.[0]}
                            </div>
                            <div>
                              <div className={`font-extrabold text-sm leading-tight transition-colors ${
                                isProctoringAct ? 'text-red-700' : 'text-slate-900 group-hover:text-red-600'
                              }`}>
                                {c.name}
                                {isProctoringAct && (
                                  <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                    <ShieldOff size={9} /> Proctoring Act
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5">{c.email}</div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {c.attempt_label && c.attempt_label !== 'Interview' && (
                                  <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c.attempt_label}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.job_role}</span>
                        </td>
                        <td className="p-5" onClick={(e) => e.stopPropagation()}>
                          {isProctoringAct ? (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-red-100 border border-red-300 text-red-700 inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                              ⛔ PROCTORING ACT
                            </span>
                          ) : (
                            <DecisionDropdown candidate={c} onUpdate={handleDecisionChange} />
                          )}
                        </td>
                        <td className="p-5">
                          {isCompleted ? (
                            <span className={`w-8 h-8 flex items-center justify-center rounded-xl border font-black text-sm shadow-sm ${g.color}`}>
                              {g.letter}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>
                        <td className="p-5">
                          {isCompleted ? (
                            <div className="flex items-center gap-3">
                              {isProctoringAct ? (
                                <span className="text-sm font-black text-red-600">0</span>
                              ) : (
                                <>
                                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                    <div className={`h-full ${g.color.split(' ')[0]} ${g.color.split(' ')[1].replace('text-', 'bg-')}`} style={{width: `${c.global_score}%`}} />
                                  </div>
                                  <span className="text-sm font-black text-slate-800">{Math.round(c.global_score)}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>
                        <td className="p-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {compareMode ? (
                              <button 
                                onClick={() => toggleCompare(c)}
                                disabled={!isCompleted}
                                className={`px-4 py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all shadow-sm uppercase tracking-wider ${
                                  isComparing 
                                    ? 'bg-blue-600 text-white shadow-[0_4px_14px_0_rgb(59,130,246,0.39)]' 
                                    : 'bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600'
                                }`}
                              >
                                {isComparing ? 'Comparing' : 'Select'}
                              </button>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleViewDossier(c.id)}
                                  disabled={!isCompleted}
                                  className={`px-4 py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all shadow-sm uppercase tracking-wider ${
                                    isCompleted
                                      ? isProctoringAct
                                        ? 'bg-red-50 border border-red-200 hover:border-red-400 text-red-700 hover:text-red-800'
                                        : 'bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600'
                                      : 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  <FileText size={14} /> Dossier
                                </button>
                                <button 
                                  onClick={() => setExpandedRow(isExpanded ? null : c.id)}
                                  className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                  {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row Content */}
                      <AnimatePresence>
                        {isExpanded && !compareMode && (
                          <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            <td colSpan="7" className="p-0 border-b border-slate-100 bg-slate-50/50 overflow-hidden">
                              <div className="p-6 md:pl-24 grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-4 col-span-1 md:col-span-2">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Summary</h4>
                                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                    {c.ai_summary || "No summary generated for this candidate. The interview might not be fully processed or was terminated early."}
                                  </p>
                                </div>
                                <div className="space-y-4">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Micro Scores</h4>
                                  <div className="space-y-2">
                                     <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">Tech</span><span className="text-slate-900">{Math.round(c.technical_score||0)}/100</span></div>
                                     <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">Comm</span><span className="text-slate-900">{Math.round(c.communication_score||0)}/100</span></div>
                                     <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">EQ</span><span className="text-slate-900">{Math.round(c.eq_score||0)}/100</span></div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Interview Meta</h4>
                                  <div className="text-xs text-slate-600 font-medium space-y-2">
                                    <p><strong>Session ID:</strong> <span className="font-mono bg-white px-1.5 py-0.5 border rounded">{c.interview_id?.slice(0,8)}...</span></p>
                                    <p><strong>Date:</strong> {c.session_timestamp ? new Date(c.session_timestamp).toLocaleString() : 'N/A'}</p>
                                    <p><strong>Status:</strong> <span className="uppercase tracking-widest font-black text-[9px] bg-slate-200 px-1.5 py-0.5 rounded">{c.interview_status}</span></p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
