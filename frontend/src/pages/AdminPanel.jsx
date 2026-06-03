import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus, Trash2, ShieldAlert, ArrowRight, Settings2, RefreshCw, UploadCloud, Users, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
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
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <select value={value} onChange={onChange} className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600 transition-colors shadow-sm appearance-none">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button type="button" onClick={() => onDelete(value)} className="px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 transition-colors" title="Delete Selected">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex gap-2">
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder={`New ${label}...`} className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-red-600 transition-colors shadow-sm" />
        <button type="button" onClick={() => { if(newVal.trim()) { onAdd(newVal.trim()); setNewVal(''); } }} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-sm">
          Add {label}
        </button>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('rubric'); // 'rubric' | 'pipeline'
  const [pipeline, setPipeline] = useState([]);
  const [pipelineSearch, setPipelineSearch] = useState(''); // BUG-09 fix: search state

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
    JSON.parse(localStorage.getItem('personas')) || DEFAULT_PERSONAS
  );

  const addPersona = (newPersona) => {
    const updated = [...personas, newPersona];
    setPersonas(updated);
    localStorage.setItem('personas', JSON.stringify(updated));
    setRoleConfigs({...roleConfigs, persona: newPersona});
  };

  const deletePersona = (p) => {
    if (personas.length <= 1) return showToast("Cannot delete the last persona", "error");
    const updated = personas.filter(x => x !== p);
    setPersonas(updated);
    localStorage.setItem('personas', JSON.stringify(updated));
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
      // Fetch Global Structure
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
    } finally {
      setLoading(false);
    }
  };

  const fetchPipeline = async () => {
    try {
      const res = await customFetch(`${API_BASE}/admin/pipeline`);
      if (res.ok) {
        const data = await res.json();
        setPipeline(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    let retries = 5;
    const initData = async () => {
      try {
        await Promise.all([fetchQuestions(), fetchConfigs(), fetchPipeline()]);
      } catch (err) {
        if (retries > 0) {
          retries -= 1;
          setTimeout(initData, 1000);
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
          // BUG-19 fix: Force last key to absorb remainder so total is always exactly 100
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

  const getGrade = (score) => {
    if (score >= 90) return { letter: 'S', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    if (score >= 80) return { letter: 'A', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (score >= 70) return { letter: 'B', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    if (score >= 60) return { letter: 'C', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    return { letter: 'F', color: 'bg-red-100 text-red-700 border-red-200' };
  };

  const handleViewDossier = (id) => {
    localStorage.setItem('candidate_id', id);
    navigate('/report');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 font-bold text-sm border ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
          >
            {toast.type === 'error' ? <ShieldAlert size={18} /> : <Database size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
              <ShieldAlert size={14} /> Enterprise Root Access
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Recruitment <span className="text-red-700">Control Panel</span>
            </h1>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setActiveTab('rubric')} className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'rubric' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Database size={16} /> Rubric Engine
              </button>
              <button onClick={() => setActiveTab('pipeline')} className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'pipeline' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Users size={16} /> Candidate Pipeline
              </button>
            </div>
          </div>
          <button 
            onClick={() => navigate('/candidate')}
            className="w-full lg:w-auto px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 mb-1"
          >
            Launch Candidate View <ArrowRight size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8 font-bold flex items-center gap-3">
             {error}
          </div>
        )}

        {activeTab === 'rubric' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Configs & Form */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Company Context */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Settings2 size={20} className="text-red-600"/> Global Company Context
              </h3>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Recent News / Updates</label>
                <textarea 
                  value={companyContext} 
                  onChange={e => setCompanyContext(e.target.value)} 
                  rows={3} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-600 transition-colors resize-none shadow-inner" 
                  placeholder="e.g. Sterling just launched an 800V battery platform. Weave this into the interview." 
                />
                <button onClick={handleSaveCompanyContext} className="w-full mt-3 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm">
                  Inject Global Context
                </button>



              </div>
            </div>

            {/* Role Configuration */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Settings2 size={20} className="text-red-600"/> Role Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Target Department</label>
                  <select value={roleConfigs.target_dept} onChange={handleTargetDeptChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-red-600 transition-colors shadow-inner appearance-none cursor-pointer">
                    <option value="ALL">All Departments</option>
                    {Object.keys(companyStructure).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Target Role</label>
                  <select value={roleConfigs.job_role} onChange={e => {
                      const selectedRole = e.target.value;
                      setRoleConfigs({...roleConfigs, job_role: selectedRole});
                      setForm({...form, department: roleConfigs.target_dept === 'ALL' ? '' : roleConfigs.target_dept, role: selectedRole === 'ALL' ? '' : selectedRole});
                      if (selectedRole !== 'ALL') fetchPersonaForRole(selectedRole);
                  }} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-red-600 focus:border-red-600 cursor-pointer">
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
                    label="AI Interviewer Persona"
                    options={personas}
                    value={roleConfigs.persona}
                    onChange={e => setRoleConfigs({...roleConfigs, persona: e.target.value})}
                    onAdd={addPersona}
                    onDelete={deletePersona}
                  />
                </div>
                
                {/* Sliders */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Balancing Evaluation Weights</label>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentTotalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      Total: {currentTotalWeight}%
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Technical Skill</span><span>{roleConfigs.tech_weight}%</span></div>
                      <input type="range" min="0" max="100" value={roleConfigs.tech_weight} onChange={e => handleWeightChange('tech_weight', e.target.value)} className="w-full accent-red-600" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Communication</span><span>{roleConfigs.comm_weight}%</span></div>
                      <input type="range" min="0" max="100" value={roleConfigs.comm_weight} onChange={e => handleWeightChange('comm_weight', e.target.value)} className="w-full accent-red-600" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Emotional Intelligence (EQ)</span><span>{roleConfigs.eq_weight}%</span></div>
                      <input type="range" min="0" max="100" value={roleConfigs.eq_weight} onChange={e => handleWeightChange('eq_weight', e.target.value)} className="w-full accent-red-600" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Confidence & Delivery</span><span>{roleConfigs.conf_weight}%</span></div>
                      <input type="range" min="0" max="100" value={roleConfigs.conf_weight} onChange={e => handleWeightChange('conf_weight', e.target.value)} className="w-full accent-red-600" />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSaveRoleConfig} 
                  disabled={currentTotalWeight !== 100}
                  className={`w-full font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${currentTotalWeight === 100 ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  Save Configuration
                </button>
              </div>
            </div>

            {/* Add Question Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Plus size={20} className="text-red-600"/> Add Evaluation Criteria
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Question to Ask</label>
                  <textarea value={form.question} onChange={e => setForm({...form, question: e.target.value})} rows={3} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-600 transition-colors resize-none shadow-sm" placeholder="e.g. Explain how you would optimize..." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mandatory Keywords (Comma separated)</label>
                  <textarea value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} rows={3} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-600 transition-colors resize-none shadow-sm" placeholder="e.g. Memory leak, Garbage collection, Profiling..." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-red-600 transition-colors appearance-none shadow-sm">
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                
                <button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Database size={18} /> Append to Database
                </button>
              </form>

              {/* Bulk Import */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-md font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <UploadCloud size={18} className="text-red-600"/> Bulk Import Rubric (CSV)
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Upload a CSV file containing <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">department, role, question, keywords, difficulty</span>. 
                  Rollback enabled on failure.
                </p>
                <form onSubmit={handleBulkSubmit} className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-6 h-6 mb-2 text-slate-400" />
                        <p className="text-xs text-slate-500 font-medium">
                          {bulkFile ? bulkFile.name : "Click to select CSV"}
                        </p>
                      </div>
                      <input type="file" accept=".csv" className="hidden" onChange={e => setBulkFile(e.target.files[0])} />
                    </label>
                  </div>
                  <button type="submit" disabled={!bulkFile || uploadingBulk} className={`w-full font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${bulkFile ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                    {uploadingBulk ? 'Importing...' : 'Execute Bulk Import'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Question List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[500px]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 size={20} className="text-red-600"/> 
                  Evaluation Rubrics for {roleConfigs.job_role === 'ALL' ? 'All Roles' : (roleConfigs.job_role || 'Selected Role')}
                </h3>
                <button onClick={handleSeed} className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors text-slate-800 shadow-sm">
                  <RefreshCw size={14} /> Seed SEM Defaults
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                   <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                   Loading intelligence schemas...
                </div>
              ) : questions.filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role)).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <Database size={48} className="mb-4 opacity-50" />
                  <p>No rubrics defined for {roleConfigs.job_role === 'ALL' ? 'these filters' : roleConfigs.job_role}. Add one above or seed defaults.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions
                    .filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role))
                    .map((q) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={q.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-red-500/30 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded mr-2">{q.department}</span>
                          <span className="text-xs font-bold text-slate-700">{q.role}</span>
                        </div>
                        <button onClick={() => handleDelete(q.id)} className="text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-slate-900 font-medium mb-3">{q.question}</p>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Required Concept Triggers:</span>
                        <div className="flex flex-wrap gap-2">
                          {q.keywords.split(',').map((k, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 shadow-sm">
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
        </div>
        ) : (
          /* Pipeline Dashboard Tab */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-red-600"/> Candidate Dossier Hub
              </h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                {/* BUG-09 fix: Search input now has state and filters the pipeline rows */}
                <input
                  type="text"
                  placeholder="Search candidates..."
                  value={pipelineSearch}
                  onChange={e => setPipelineSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Applied Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Grade</th>
                    <th className="p-4">Global Score</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pipeline.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No candidates in the pipeline yet.</td></tr>
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
                    .map(c => {
                      const g = getGrade(c.global_score || 0);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-xs text-slate-500">{c.email}</div>
                          </td>
                          <td className="p-4 font-medium text-slate-700">{c.job_role}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${c.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {c.status === 'COMPLETED' ? (
                              <span className={`w-8 h-8 flex items-center justify-center rounded-lg border font-black text-sm ${g.color}`}>
                                {g.letter}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {c.status === 'COMPLETED' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${g.color.split(' ')[0]}`} style={{width: `${c.global_score}%`}} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{Math.round(c.global_score)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleViewDossier(c.id)}
                                disabled={c.status !== 'COMPLETED'}
                                className={`px-4 py-2 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all shadow-sm ${c.status === 'COMPLETED' ? 'bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600' : 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed'}`}
                              >
                                <FileText size={14} /> View Dossier
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
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
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
          </div>
        )}
      </main>
    </div>
  );
}
