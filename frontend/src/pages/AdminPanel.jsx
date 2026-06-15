import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus, Trash2, ShieldAlert, ArrowRight, Settings2, RefreshCw, UploadCloud, Users, FileText, Search, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';

const customFetch = (url, options = {}) => {
  const token = sessionStorage.getItem('adminToken');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

const DEFAULT_STRUCTURE = {
  "Customer Support": ["Customer Success Manager"],
  "Engineering": [
    "Embedded Systems Engineer",
    "BMS Engineer",
    "Motor Control Engineer",
    "Power Electronics Engineer",
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "DevOps Engineer",
    "Data Scientist",
    "AI/ML Engineer"
  ],
  "Finance": ["Financial Analyst", "Accounts Manager"],
  "Human Resources": [
    "HR Specialist",
    "Talent Acquisition Specialist",
    "HR Manager",
    "Learning and Development Specialist",
    "Payroll Specialist"
  ],
  "IT": ["Cybersecurity Analyst", "System Administrator"],
  "Marketing": ["Marketing Specialist", "Brand Manager"],
  "Operations": ["Operations Manager", "Supply Chain Analyst"],
  "Sales": ["Sales Executive", "Sales Manager"]
};

const ManageableSelect = ({ label, options, value, onChange, onAdd, onDelete }) => {
  const [newVal, setNewVal] = useState('');
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <select value={value} onChange={onChange} className="flex-1 min-w-0 h-[48px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-sm appearance-none cursor-pointer font-medium text-ellipsis overflow-hidden whitespace-nowrap">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button type="button" onClick={() => onDelete(value)} className="shrink-0 px-4 h-[48px] bg-white text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 transition-colors shadow-sm" title="Delete Selected">
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex gap-2">
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder={`New ${label}...`} className="flex-1 min-w-0 h-[48px] bg-white border border-slate-200 rounded-xl px-4 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap" />
        <button type="button" onClick={() => { if(newVal.trim()) { onAdd(newVal.trim()); setNewVal(''); } }} className="shrink-0 px-6 h-[48px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap">
          Add
        </button>
      </div>
    </div>
  );
};

// ── Decision Badge & Dropdown ─────────────────────────────────────────────
const DECISION_STYLE = {
  HIRED:        { bg: 'bg-emerald-50',  border: 'border-emerald-200',  color: 'text-emerald-700',  icon: '🏆' },
  SHORTLISTED:  { bg: 'bg-red-50',  border: 'border-red-200',  color: 'text-red-700',  icon: '⭐' },
  UNDER_REVIEW: { bg: 'bg-orange-50',  border: 'border-orange-200',  color: 'text-orange-700',  icon: '🔍' },
  REJECTED:     { bg: 'bg-slate-100',  border: 'border-slate-300',  color: 'text-slate-700',  icon: '❌' },
  PENDING:      { bg: 'bg-slate-50', border: 'border-slate-200', color: 'text-slate-500', icon: '⏳' },
};

function DecisionBadge({ decision }) {
  const s = DECISION_STYLE[decision] || DECISION_STYLE.PENDING;
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${s.bg} border ${s.border} ${s.color} inline-flex items-center gap-1.5 shadow-sm whitespace-nowrap`}>
      {s.icon} {decision?.replace('_', ' ') || 'PENDING'}
    </span>
  );
}

function DecisionDropdown({ candidate, onUpdate }) {
  const adminRole = sessionStorage.getItem('adminRole') || 'sub_admin';
  const currentDecision = candidate.hiring_decision || (candidate.interview_status === 'completed' ? 'UNDER_REVIEW' : 'PENDING');
  
  if (adminRole !== 'master_admin') {
    return (
      <div className="flex flex-col gap-2">
        <DecisionBadge decision={currentDecision} />
        {candidate.ai_recommendation && (
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            AI: {candidate.ai_recommendation}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={currentDecision}
        onChange={(e) => onUpdate(candidate.id, e.target.value)}
        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm outline-none transition-colors cursor-pointer appearance-none ${
          DECISION_STYLE[currentDecision]?.bg || DECISION_STYLE.PENDING.bg
        } ${DECISION_STYLE[currentDecision]?.color || DECISION_STYLE.PENDING.color} ${
          DECISION_STYLE[currentDecision]?.border || DECISION_STYLE.PENDING.border
        }`}
      >
        <option value="PENDING">⏳ PENDING</option>
        <option value="SHORTLISTED">⭐ SHORTLISTED</option>
        <option value="UNDER_REVIEW">🔍 UNDER REVIEW</option>
        <option value="REJECTED">❌ REJECTED</option>
      </select>
      {candidate.ai_recommendation && (
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
          AI: {candidate.ai_recommendation}
        </span>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('rubric'); // 'rubric' | 'pipeline'
  const [pipeline, setPipeline] = useState([]);
  const [pipelineSearch, setPipelineSearch] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  
  const [companyContext, setCompanyContext] = useState('');
  const [companyStructure, setCompanyStructure] = useState(DEFAULT_STRUCTURE);
  
  const DEFAULT_PERSONAS = [
    "Strictly Technical (System Design)",
    "Behavioral & Leadership",
    "Consultative & Friendly",
    "HR Screening",
    "Executive Leadership",
    "Embedded Systems Expert",
    "EV Systems Architect"
  ];
  const [personas, setPersonas] = useState(
    JSON.parse(sessionStorage.getItem('personas')) || DEFAULT_PERSONAS
  );

  const addPersona = (newPersona) => {
    const updated = [...personas, newPersona];
    setPersonas(updated);
    sessionStorage.setItem('personas', JSON.stringify(updated));
    setRoleConfigs({...roleConfigs, persona: newPersona});
  };

  const deletePersona = (p) => {
    if (personas.length <= 1) return showToast("Cannot delete the last persona", "error");
    const updated = personas.filter(x => x !== p);
    setPersonas(updated);
    sessionStorage.setItem('personas', JSON.stringify(updated));
    if (roleConfigs.persona === p) {
      setRoleConfigs({...roleConfigs, persona: updated[0]});
    }
  };
  
  const [roleConfigs, setRoleConfigs] = useState({
    target_dept: '',
    job_role: '',
    persona: 'Strictly Technical (System Design)',
    tech_weight: 40,
    comm_weight: 20,
    eq_weight: 20,
    conf_weight: 20
  });
  
  // New Question Form
  const [form, setForm] = useState({
    department: '',
    role: '',
    question: '',
    keywords: '',
    difficulty: 'Medium'
  });

  // Bulk Upload State
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  const fetchQuestions = async () => {
    try {
      const res = await customFetch(`${API_BASE}/admin/questions`);
      if (!res.ok) throw new Error('Failed to fetch admin questions');
      const data = await res.json();
      setQuestions(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchConfigs = async () => {
    try {
      const gRes = await customFetch(`${API_BASE}/admin/config/global/company_context`);
      if (gRes.ok) {
        const gData = await gRes.json();
        setCompanyContext(gData.value || '');
      }
      const sRes = await customFetch(`${API_BASE}/admin/config/global/company_structure`);
      
      let structure = DEFAULT_STRUCTURE;
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.value) structure = JSON.parse(sData.value);
      }
      
      setCompanyStructure(structure);
      
      const depts = Object.keys(structure);
      const firstDept = depts[0] || '';
      const firstRole = firstDept ? structure[firstDept][0] : '';
      
      setForm(prev => ({ ...prev, department: firstDept, role: firstRole }));
      setRoleConfigs(prev => ({ ...prev, target_dept: firstDept, job_role: firstRole }));

      if (firstRole) {
        const rRes = await customFetch(`${API_BASE}/admin/config/role/${encodeURIComponent(firstRole)}`);
        if (rRes.ok) {
          const rData = await rRes.json();
          setRoleConfigs(prev => ({
            ...prev, 
            persona: rData.persona || prev.persona,
            tech_weight: rData.tech_weight ?? 40,
            comm_weight: rData.comm_weight ?? 20,
            eq_weight: rData.eq_weight ?? 20,
            conf_weight: rData.conf_weight ?? 20,
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPipeline = async () => {
    try {
      const res = await customFetch(`${API_BASE}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        // The leaderboard endpoint returns { total, candidates }
        setPipeline(data.candidates || []);
      } else {
        console.error("Failed to fetch pipeline, status:", res.status);
      }
    } catch (e) {
      console.error("Error fetching pipeline:", e);
    }
  };

  const handleDecisionChange = async (candidateId, newDecision) => {
    try {
      await apiClient.updateHiringDecision(candidateId, newDecision);
      setPipeline(prev => prev.map(c => 
        c.id === candidateId ? { ...c, hiring_decision: newDecision } : c
      ));
    } catch (err) {
      console.error('Failed to update decision:', err);
      alert('Failed to update decision. Please try again.');
    }
  };

  useEffect(() => {
    let retries = 5;
    const initData = async () => {
      try {
        await Promise.all([fetchQuestions(), fetchConfigs(), fetchPipeline()]);
        setLoading(false);
      } catch (err) {
        if (retries > 0) {
          retries -= 1;
          setTimeout(initData, 1000);
        } else {
          setLoading(false);
        }
      }
    };
    initData();
  }, []);

  const handleUpdateGlobalStructure = async (newStructure) => {
    try {
      await customFetch(`${API_BASE}/admin/config/global`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'company_structure', value: JSON.stringify(newStructure) })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const addDepartment = (dept) => {
    if (companyStructure[dept]) return;
    const newStructure = { ...companyStructure, [dept]: [] };
    setCompanyStructure(newStructure);
    setForm(f => ({ ...f, department: dept, role: '' }));
    handleUpdateGlobalStructure(newStructure);
    showToast(`Added department: ${dept}`);
  };

  const deleteDepartment = (dept) => {
    const depts = Object.keys(companyStructure);
    if (depts.length <= 1) { showToast("Cannot delete the last department", "error"); return; }
    
    const newStructure = { ...companyStructure };
    delete newStructure[dept];
    setCompanyStructure(newStructure);
    
    const newFirstDept = Object.keys(newStructure)[0];
    if (form.department === dept) {
      setForm(f => ({ ...f, department: newFirstDept, role: newStructure[newFirstDept][0] || '' }));
    }
    if (roleConfigs.target_dept === dept) {
      setRoleConfigs(r => ({ ...r, target_dept: newFirstDept, job_role: newStructure[newFirstDept][0] || '' }));
    }
    handleUpdateGlobalStructure(newStructure);
    showToast(`Deleted department: ${dept}`);
  };

  const addRole = (role) => {
    const dept = form.department;
    if (!dept) { showToast("Select a department first", "error"); return; }
    if (companyStructure[dept].includes(role)) return;
    
    const newStructure = { ...companyStructure, [dept]: [...companyStructure[dept], role] };
    setCompanyStructure(newStructure);
    setForm(f => ({ ...f, role }));
    handleUpdateGlobalStructure(newStructure);
    showToast(`Added role: ${role}`);
  };

  const deleteRole = (role) => {
    const dept = form.department;
    if (!dept) return;
    if (companyStructure[dept].length <= 1) { showToast("Cannot delete the last job role in this department", "error"); return; }
    
    const newStructure = { ...companyStructure, [dept]: companyStructure[dept].filter(r => r !== role) };
    setCompanyStructure(newStructure);
    
    if (form.role === role) setForm(f => ({ ...f, role: newStructure[dept][0] }));
    if (roleConfigs.job_role === role) setRoleConfigs(r => ({ ...r, job_role: newStructure[dept][0] }));
    
    handleUpdateGlobalStructure(newStructure);
    showToast(`Deleted role: ${role}`);
  };

  const handleTargetDeptChange = (e) => {
    const newDept = e.target.value;
    const firstRole = companyStructure[newDept][0] || '';
    setRoleConfigs(prev => ({...prev, target_dept: newDept, job_role: firstRole}));
    if (firstRole) fetchPersonaForRole(firstRole);
  };

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    setRoleConfigs(prev => ({...prev, job_role: newRole}));
    fetchPersonaForRole(newRole);
  };
  
  const fetchPersonaForRole = async (roleName) => {
    try {
      const rRes = await customFetch(`${API_BASE}/admin/config/role/${encodeURIComponent(roleName)}`);
      if (rRes.ok) {
        const rData = await rRes.json();
        setRoleConfigs(prev => ({
          ...prev, 
          persona: rData.persona || 'Strictly Technical (System Design)',
          tech_weight: rData.tech_weight ?? 40,
          comm_weight: rData.comm_weight ?? 20,
          eq_weight: rData.eq_weight ?? 20,
          conf_weight: rData.conf_weight ?? 20,
        }));
      }
    } catch(err) {}
  };

  const handleWeightChange = (key, newValue) => {
    let val = parseInt(newValue) || 0;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
    
    let newConfigs = { ...roleConfigs, [key]: val };
    const otherKeys = ['tech_weight', 'comm_weight', 'eq_weight', 'conf_weight'].filter(k => k !== key);
    
    let remaining = 100 - val;
    let otherSum = otherKeys.reduce((sum, k) => sum + roleConfigs[k], 0);
    
    if (otherSum === 0) {
      const split = Math.floor(remaining / 3);
      otherKeys.forEach(k => newConfigs[k] = split);
      newConfigs[otherKeys[0]] += remaining - (split * 3);
    } else {
      let allocatedSum = 0;
      otherKeys.forEach((k, idx) => {
        if (idx === otherKeys.length - 1) {
          newConfigs[k] = remaining - allocatedSum;
        } else {
          const share = Math.round((roleConfigs[k] / otherSum) * remaining);
          newConfigs[k] = share;
          allocatedSum += share;
        }
      });
    }
    setRoleConfigs(newConfigs);
  };

  const handleSaveCompanyContext = async () => {
    try {
      await customFetch(`${API_BASE}/admin/config/global`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'company_context', value: companyContext })
      });
      showToast('Company Context Saved Successfully!');
    } catch (e) {
      showToast('Failed to save context', 'error');
    }
  };

  const handleSaveRoleConfig = async () => {
    const total = roleConfigs.tech_weight + roleConfigs.comm_weight + roleConfigs.eq_weight + roleConfigs.conf_weight;
    if (total !== 100) {
      showToast(`Total weights must equal 100%. Currently at ${total}%.`, 'error');
      return;
    }
    try {
      await customFetch(`${API_BASE}/admin/config/role`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleConfigs)
      });
      showToast(`Configuration for ${roleConfigs.job_role} Saved!`);
    } catch (e) {
      showToast('Failed to save configuration', 'error');
    }
  };

  const currentTotalWeight = roleConfigs.tech_weight + roleConfigs.comm_weight + roleConfigs.eq_weight + roleConfigs.conf_weight;

  const handleSeed = async () => {
    try {
      setLoading(true);
      const res = await customFetch(`${API_BASE}/admin/seed`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to seed database');
      await fetchQuestions();
      await fetchConfigs();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await customFetch(`${API_BASE}/admin/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete question');
      setQuestions(questions.filter(q => q.id !== id));
      showToast('Evaluation rubric deleted successfully');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question || !form.keywords) return;
    try {
      setLoading(true);
      const res = await customFetch(`${API_BASE}/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to add question');
      setForm({ ...form, question: '', keywords: '' });
      await fetchQuestions();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) return;
    try {
      setUploadingBulk(true);
      const formData = new FormData();
      formData.append('file', bulkFile);
      
      const res = await customFetch(`${API_BASE}/admin/questions/bulk`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Bulk upload failed');
      
      showToast(`Success! Imported ${data.imported} questions.`);
      setBulkFile(null);
      await fetchQuestions();
      await fetchConfigs();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingBulk(false);
    }
  };

  const getGrade = (score, isProctoringAct = false) => {
    if (isProctoringAct) return { letter: 'F', color: 'bg-red-100 text-red-700 border-red-300' };
    if (score >= 90) return { letter: 'S', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (score >= 80) return { letter: 'A', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    if (score >= 70) return { letter: 'B', color: 'bg-blue-50 text-blue-600 border-blue-100' };
    if (score >= 60) return { letter: 'C', color: 'bg-amber-50 text-amber-600 border-amber-100' };
    return { letter: 'F', color: 'bg-red-50 text-red-600 border-red-200' };
  };

  const handleViewDossier = (id) => {
    sessionStorage.setItem('candidate_id', id);
    navigate('/report');
  };

  const tabs = [
    { id: 'rubric', label: 'Rubric Engine', icon: Database },
    { id: 'pipeline', label: 'Candidate Pipeline', icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans relative overflow-hidden text-slate-900">
      
      {/* Absolute Ambient Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-100/80 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 font-bold text-sm border backdrop-blur-xl ${toast.type === 'error' ? 'bg-red-500/90 text-white border-red-400' : 'bg-slate-900/90 text-white border-slate-800'}`}
          >
            {toast.type === 'error' ? <ShieldAlert size={18} /> : <Database size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />
      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-10">
        
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(220,38,38,0.3)]">
                <ShieldAlert size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recruitment <span className="text-red-600">Control Panel</span></h1>
                <p className="text-slate-500 mt-1 font-bold text-sm uppercase tracking-widest">Enterprise Root Access</p>
              </div>
            </div>
            
            <button 
              onClick={() => { setLoading(true); fetchPipeline().then(() => setLoading(false)); }}
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] active:scale-95"
            >
              Refresh <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-max backdrop-blur-xl border border-slate-200 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors z-10 ${
                    isActive ? 'text-red-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="admin-active-tab"
                      className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-2">
                    <Icon size={16} className={isActive ? "text-red-600" : ""} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-sm">
               <ShieldAlert size={20} /> {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'rubric' ? (
              <motion.div key="rubric" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                
                {/* Left Column: Configs & Form */}
                <div className="xl:col-span-1 space-y-6 sticky top-8">
                  
                  {/* Company Context */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                        <Settings2 size={20} />
                      </div>
                      Global Context
                    </h3>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Recent News / Updates</label>
                      <textarea 
                        value={companyContext} 
                        onChange={e => setCompanyContext(e.target.value)} 
                        rows={3} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" 
                        placeholder="e.g. Sterling just launched an 800V battery platform. Weave this into the interview." 
                      />
                      <button onClick={handleSaveCompanyContext} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-sm">
                        Inject Context
                      </button>
                    </div>
                  </div>

                  {/* Role Configuration */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                        <Settings2 size={20} />
                      </div>
                      Role Config
                    </h3>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Department</label>
                        <select value={roleConfigs.target_dept} onChange={handleTargetDeptChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-inner appearance-none cursor-pointer">
                          <option value="ALL">All Departments</option>
                          {Object.keys(companyStructure).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Role</label>
                        <select value={roleConfigs.job_role} onChange={e => {
                            const selectedRole = e.target.value;
                            setRoleConfigs({...roleConfigs, job_role: selectedRole});
                            setForm({...form, department: roleConfigs.target_dept === 'ALL' ? '' : roleConfigs.target_dept, role: selectedRole === 'ALL' ? '' : selectedRole});
                            if (selectedRole !== 'ALL') fetchPersonaForRole(selectedRole);
                        }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-inner appearance-none cursor-pointer">
                          <option value="ALL">All Roles</option>
                          {roleConfigs.target_dept !== 'ALL' && (companyStructure[roleConfigs.target_dept] || []).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          {roleConfigs.target_dept === 'ALL' && Object.values(companyStructure).flat().map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-4">
                        <ManageableSelect 
                          label="AI Persona"
                          options={personas}
                          value={roleConfigs.persona}
                          onChange={e => setRoleConfigs({...roleConfigs, persona: e.target.value})}
                          onAdd={addPersona}
                          onDelete={deletePersona}
                        />
                      </div>
                      
                      {/* Sliders */}
                      <div className="pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Balancing Weights</label>
                          <span className={`text-xs font-black px-2 py-1 rounded-md tracking-wider ${currentTotalWeight === 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {currentTotalWeight}%
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          {[
                            { label: 'Technical Skill', key: 'tech_weight' },
                            { label: 'Communication', key: 'comm_weight' },
                            { label: 'Emotional Intel (EQ)', key: 'eq_weight' },
                            { label: 'Confidence', key: 'conf_weight' }
                          ].map(s => (
                            <div key={s.key}>
                              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                                <span>{s.label}</span>
                                <span className="text-red-600">{roleConfigs[s.key]}%</span>
                              </div>
                              <input type="range" min="0" max="100" value={roleConfigs[s.key]} onChange={e => handleWeightChange(s.key, e.target.value)} className="w-full accent-red-600" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={handleSaveRoleConfig} 
                        disabled={currentTotalWeight !== 100}
                        className={`w-full font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${currentTotalWeight === 100 ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>

                  {/* Bulk Import */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                        <UploadCloud size={20} />
                      </div>
                      Bulk Import
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">
                      Upload a CSV containing <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold border border-slate-200">dept, role, question, keywords, difficulty</span>. 
                      Rollback enabled.
                    </p>
                    <form onSubmit={handleBulkSubmit} className="space-y-4">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                            <p className="text-xs text-slate-600 font-bold">
                              {bulkFile ? bulkFile.name : "Click to select CSV"}
                            </p>
                          </div>
                          <input type="file" accept=".csv" className="hidden" onChange={e => setBulkFile(e.target.files[0])} />
                        </label>
                      </div>
                      <button type="submit" disabled={!bulkFile || uploadingBulk} className={`w-full font-bold py-3 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${bulkFile ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                        {uploadingBulk ? 'Importing...' : 'Execute Import'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Question List & Add Form */}
                <div className="xl:col-span-2 space-y-8">
                  
                  {/* Add Form Horizontal */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-red-50 rounded-full blur-[80px] pointer-events-none" />
                    
                    <h3 className="relative z-10 text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <Plus size={20} />
                      </div>
                      Append Evaluation Criteria
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ManageableSelect 
                          label="Department"
                          options={Object.keys(companyStructure)}
                          value={form.department}
                          onChange={e => {
                            const newDept = e.target.value;
                            setForm({...form, department: newDept, role: companyStructure[newDept]?.[0] || ''});
                          }}
                          onAdd={addDepartment}
                          onDelete={deleteDepartment}
                        />
                        <ManageableSelect 
                          label="Job Role"
                          options={companyStructure[form.department] || []}
                          value={form.role}
                          onChange={e => setForm({...form, role: e.target.value})}
                          onAdd={addRole}
                          onDelete={deleteRole}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Question to Ask</label>
                        <textarea value={form.question} onChange={e => setForm({...form, question: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" placeholder="e.g. Explain how you would optimize..." />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Keywords (Comma separated)</label>
                          <textarea value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" placeholder="e.g. Memory leak, Garbage collection..." />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Difficulty</label>
                          <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full h-[76px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all appearance-none shadow-inner cursor-pointer">
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                          </select>
                        </div>
                      </div>
                      
                      <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Database size={18} /> Append to Database
                      </button>
                    </form>
                  </div>

                  {/* Rubric List */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-[500px]">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                      <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
                          <Database size={20} />
                        </div> 
                        Rubrics for {roleConfigs.job_role === 'ALL' ? 'All Roles' : (roleConfigs.job_role || 'Selected Role')}
                      </h3>
                      <button onClick={handleSeed} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors text-slate-700 shadow-sm">
                        <RefreshCw size={16} /> Seed Defaults
                      </button>
                    </div>

                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                         <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                         <p className="font-bold text-sm uppercase tracking-widest">Loading Schemas...</p>
                      </div>
                    ) : questions.filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role)).length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                        <Database size={56} className="mb-4 opacity-50 text-slate-300" />
                        <p className="font-bold">No rubrics defined for {roleConfigs.job_role === 'ALL' ? 'these filters' : roleConfigs.job_role}.</p>
                        <p className="text-sm mt-1">Add one above or seed defaults.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {questions
                          .filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role))
                          .map((q) => (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-red-300 hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute left-0 top-0 w-1 h-full bg-slate-200 group-hover:bg-red-500 transition-colors" />
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-md">{q.department}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{q.role}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                  q.difficulty === 'Hard' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                                  q.difficulty === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>{q.difficulty}</span>
                              </div>
                              <button onClick={() => handleDelete(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-100 opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <p className="text-slate-900 font-bold mb-4 text-base leading-snug">{q.question}</p>
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Required Concept Triggers</span>
                              <div className="flex flex-wrap gap-2">
                                {q.keywords.split(',').map((k, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                    {k.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            ) : (
              /* Pipeline Dashboard Tab */
              <motion.div key="pipeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
                      <Users size={20} />
                    </div>
                    Candidate Dossier Hub
                  </h3>
                  <div className="relative w-full sm:w-72">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search candidates..."
                      value={pipelineSearch}
                      onChange={e => setPipelineSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                        <th className="p-5">Candidate</th>
                        <th className="p-5">Applied Role</th>
                        <th className="p-5">Decision</th>
                        <th className="p-5">Grade</th>
                        <th className="p-5">Global Score</th>
                        <th className="p-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pipeline.length === 0 ? (
                        <tr><td colSpan="6" className="p-16 text-center text-slate-400 font-bold">No candidates in the pipeline yet.</td></tr>
                      ) : (
                       pipeline
                        .filter(c => {
                          if (!pipelineSearch.trim()) return true;
                          const q = pipelineSearch.toLowerCase();
                          return (
                            c.name?.toLowerCase().includes(q) ||
                            c.email?.toLowerCase().includes(q) ||
                            c.job_role?.toLowerCase().includes(q)
                          );
                        })
                        .map((c, rowIdx) => {
                          const isProctoringAct = c.termination_reason === 'PROCTORING_ACT' || c.hiring_decision === 'PROCTORING_ACT';
                          const isCompleted = c.interview_status === 'completed' || isProctoringAct;
                          const g = getGrade(c.global_score || 0, isProctoringAct);
                          return (
                            <tr key={`${c.id}-${c.interview_id || rowIdx}`} className={`hover:bg-slate-50/80 transition-colors group ${
                              isProctoringAct ? 'bg-red-50/30' : ''
                            }`}>
                              <td className="p-5">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                                    isProctoringAct
                                      ? 'bg-red-100 border-red-200 text-red-700'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100'
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
                                    {/* Attempt label + session timestamp */}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {c.attempt_label && c.attempt_label !== 'Interview' && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{c.attempt_label}</span>
                                      )}
                                      {c.session_timestamp && (
                                        <span className="text-[9px] font-bold text-slate-400">{c.session_timestamp}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.job_role}</span>
                              </td>
                              <td className="p-5">
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
                              <td className="p-5 text-right">
                                <div className="flex items-center justify-end gap-2">
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
                                    onClick={async () => {
                                      if (!window.confirm("Are you sure you want to delete this candidate? This cannot be undone.")) return;
                                      try {
                                        const res = await customFetch(`${API_BASE}/candidates/${c.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          setPipeline(pipeline.filter(p => p.id !== c.id));
                                          showToast("Candidate deleted successfully");
                                        } else {
                                          throw new Error("Failed to delete candidate");
                                        }
                                      } catch (err) {
                                        showToast(err.message, 'error');
                                      }
                                    }}
                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                                    title="Delete Candidate"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
