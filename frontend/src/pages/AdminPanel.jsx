import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Settings, LayoutDashboard, Globe, Layers,
  Database, Activity, Radar, CalendarDays, Brain
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, customFetch } from '../config/api';

// Modules
import PipelineDashboard from '../components/admin/PipelineDashboard';
import GlobalContextFeed from '../components/admin/GlobalContextFeed';
import RoleArchitecture from '../components/admin/RoleArchitecture';
import QuestionBank from '../components/admin/QuestionBank';
import AnalyticsEngine from '../components/admin/AnalyticsEngine';
import LiveIntervention from '../components/admin/LiveIntervention';
import SlotManager from '../components/admin/SlotManager';

import Sidebar from '../components/Layout/Sidebar';
import PageWrapper from '../components/Layout/PageWrapper';

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

export default function AdminPanel() {
  const navigate = useNavigate();

  // Master State
  const [activeTab, setActiveTab] = useState('pipeline');
  const [toast, setToast] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [companyContext, setCompanyContext] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [companyStructure, setCompanyStructure] = useState({});
  const [personas, setPersonas] = useState([]);
  const [roleConfigs, setRoleConfigs] = useState({ 
    job_role: 'ALL', 
    target_dept: 'ALL', 
    persona: '', 
    tech_weight: 40, 
    comm_weight: 20, 
    eq_weight: 20, 
    conf_weight: 20 
  });
  
  const [loading, setLoading] = useState({
    pipeline: true,
    questions: true,
    config: true
  });

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchPipeline();
    fetchQuestions();
    fetchConfig();
    fetchGlobalContext();
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await customFetch(`${API_BASE}/admin/pipeline`);
      const data = await res.json();
      setPipeline(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(p => ({...p, pipeline: false}));
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await customFetch(`${API_BASE}/admin/questions`);
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(p => ({...p, questions: false}));
    }
  };

  const fetchConfig = async () => {
    try {
      const gRes = await customFetch(`${API_BASE}/admin/config/global/company_context`);
      let contextVal = '';
      if (gRes.ok) {
        const gData = await gRes.json();
        contextVal = gData.value || '';
        console.log("Global Context Config String:", contextVal);
      }

      const sRes = await customFetch(`${API_BASE}/admin/config/global/company_structure`);
      let structure = DEFAULT_STRUCTURE;
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.value) structure = JSON.parse(sData.value);
      }
      setCompanyStructure(structure);

      const rRes = await customFetch(`${API_BASE}/admin/config/role/ALL`);
      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData.value) {
          const parsed = JSON.parse(rData.value);
          setRoleConfigs(parsed);
        }
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    } finally {
      setLoading(p => ({...p, config: false}));
    }
  };

  const fetchGlobalContext = async () => {
    try {
      const res = await customFetch(`${API_BASE}/admin/config/global/company_context`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCompanyContext(data);
      } else {
        setCompanyContext([]); // Start fresh if it's the old string format
      }
    } catch(e) { console.error("Global context error:", e); }
  };

  const handleSaveCompanyContext = async (newContextArr) => {
    try {
      await customFetch(`${API_BASE}/admin/config/global/company_context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newContextArr })
      });
      setCompanyContext(newContextArr);
    } catch (e) {
      console.error("Context sync error:", e);
      showToast("Failed to sync context", "error");
    }
  };

  const handleSaveRoleConfig = async (newConfig) => {
    try {
      await customFetch(`${API_BASE}/admin/config/role/${newConfig.job_role || 'ALL'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      showToast('Architecture Deployed Successfully!');
    } catch(e) {
      console.error("Role config error:", e);
      showToast("Failed to deploy architecture", "error");
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Delete this rubric criterion?')) return;
    try {
      await customFetch(`${API_BASE}/admin/questions/${id}`, { method: 'DELETE' });
      setQuestions(questions.filter(q => q.id !== id));
      showToast("Criterion removed.");
    } catch {
      showToast("Failed to remove.", "error");
    }
  };

  const handleViewDossier = (id) => {
    navigate(`/report/${id}`);
  };

  // Add/Delete configs handlers
  const addDepartment = async (dept) => {
    const updated = { ...companyStructure, [dept]: [] };
    setCompanyStructure(updated);
    await syncConfig({ company_structure: updated });
    showToast(`Added Department: ${dept}`);
  };
  const deleteDepartment = async (dept) => {
    const updated = { ...companyStructure };
    delete updated[dept];
    setCompanyStructure(updated);
    await syncConfig({ company_structure: updated });
    showToast(`Removed Department: ${dept}`);
  };
  const addRole = async (role) => {
    if (!roleConfigs.target_dept || roleConfigs.target_dept === 'ALL') return showToast("Select a department first.", "error");
    const updated = { ...companyStructure };
    updated[roleConfigs.target_dept] = [...(updated[roleConfigs.target_dept] || []), role];
    setCompanyStructure(updated);
    await syncConfig({ company_structure: updated });
    showToast(`Added Role: ${role}`);
  };
  const deleteRole = async (role) => {
    if (!roleConfigs.target_dept || roleConfigs.target_dept === 'ALL') return;
    const updated = { ...companyStructure };
    updated[roleConfigs.target_dept] = updated[roleConfigs.target_dept].filter(r => r !== role);
    setCompanyStructure(updated);
    await syncConfig({ company_structure: updated });
    showToast(`Removed Role: ${role}`);
  };
  const addPersona = async (p) => {
    const updated = [...personas, p];
    setPersonas(updated);
    await syncConfig({ personas: updated });
    showToast(`Added Persona: ${p}`);
  };
  const deletePersona = async (p) => {
    const updated = personas.filter(x => x !== p);
    setPersonas(updated);
    await syncConfig({ personas: updated });
    showToast(`Removed Persona: ${p}`);
  };
  
  const syncConfig = async (partialConfig) => {
    if (partialConfig.company_structure) {
      await customFetch(`${API_BASE}/admin/config/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'company_structure', value: JSON.stringify(partialConfig.company_structure) })
      });
    }
  };

  const TABS = [
    { id: 'pipeline', label: 'Candidate Pipeline', icon: <LayoutDashboard size={16} /> },
    { id: 'slots', label: 'Interview Scheduling', icon: <CalendarDays size={16} /> },
    { id: 'analytics', label: 'Global Analytics', icon: <Activity size={16} /> },
    { id: 'live', label: 'Live Interview Monitor', icon: <Radar size={16} /> },
    { id: 'context', label: 'Global Context', icon: <Globe size={16} /> },
    { id: 'architecture', label: 'Dept & Role Configuration', icon: <Layers size={16} /> },
    { id: 'questions', label: 'Rubric Engine', icon: <Database size={16} /> },
  ];
  return (
    <PageWrapper className="flex min-h-screen bg-slate-50 font-sans relative overflow-hidden text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 relative">
        {/* Absolute Ambient Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-100/80 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />
        
        {loading.config ? (
          <div className="min-h-screen flex items-center justify-center relative z-10">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4 shadow-lg" />
              <p className="font-black tracking-widest uppercase text-slate-500 text-xs">Initializing Admin Core...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.9 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 text-white font-bold backdrop-blur-md border ${toast.type === 'error' ? 'bg-red-600/90 border-red-500' : 'bg-slate-900/90 border-slate-700'}`}>
              <ShieldAlert size={20} className={toast.type === 'error' ? 'text-white' : 'text-emerald-400'} />
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Header Navbar — Two-section layout */}
      <div className="relative z-40 px-4 pt-5 mb-2">
        <div className="max-w-[1600px] mx-auto">
          {/* Top Row: Branding */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 border-b-0 shadow-sm rounded-t-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 text-white">
                <Settings size={19} />
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg text-emerald-400 border border-slate-700">
                <Brain size={19} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">Admin Command Center</h1>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600/80">Enterprise Control Panel</span>
              </div>
            </div>

            {/* Mobile tab selector — visible below lg */}
            <div className="lg:hidden relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-8 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 cursor-pointer"
              >
                {TABS.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>

          {/* Bottom Row: Full-width tab bar — hidden on mobile, visible on lg+ */}
          <div className="hidden lg:block bg-white/80 backdrop-blur-xl border border-slate-200/60 border-t border-t-slate-100 shadow-sm rounded-b-2xl px-3 py-2">
            <div
              className="flex items-center gap-1.5 overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`.admin-tabs::-webkit-scrollbar { display: none; }`}</style>
              {TABS.map(t => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`
                      relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold
                      transition-all duration-300 whitespace-nowrap shrink-0
                      ${isActive
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_4px_16px_0_rgb(220,38,38,0.35)]'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
                      }
                    `}
                  >
                    <span className={`transition-colors duration-300 ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                      {t.icon}
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-6 pt-10">
        <AnimatePresence mode="wait">
          
          {activeTab === 'pipeline' && (
            <PipelineDashboard 
               key="pipeline"
               pipeline={pipeline} 
               setPipeline={setPipeline} 
               showToast={showToast} 
               handleViewDossier={handleViewDossier} 
            />
          )}

          {activeTab === 'slots' && (
            <SlotManager key="slots" showToast={showToast} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsEngine key="analytics" pipeline={pipeline} />
          )}

          {activeTab === 'live' && (
            <LiveIntervention key="live" showToast={showToast} />
          )}

          {activeTab === 'context' && (
            <GlobalContextFeed 
               key="context"
               companyContext={companyContext} 
               handleSaveCompanyContext={handleSaveCompanyContext} 
               showToast={showToast} 
            />
          )}

          {activeTab === 'architecture' && (
            <RoleArchitecture 
               key="arch"
               roleConfigs={roleConfigs} 
               setRoleConfigs={setRoleConfigs}
               companyStructure={companyStructure}
               personas={personas}
               addPersona={addPersona}
               deletePersona={deletePersona}
               handleSaveRoleConfig={handleSaveRoleConfig}
               showToast={showToast}
            />
          )}


          {activeTab === 'questions' && (
            <QuestionBank 
               key="questions"
               questions={questions}
               setQuestions={setQuestions}
               loading={loading.questions}
               handleDelete={handleDeleteQuestion}
               companyStructure={companyStructure}
               addDepartment={addDepartment}
               deleteDepartment={deleteDepartment}
               addRole={addRole}
               deleteRole={deleteRole}
               showToast={showToast}
               roleConfigs={roleConfigs}
            />
          )}

        </AnimatePresence>
      </div>
      </>
      )}
      </main>
    </PageWrapper>
  );
}
