import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, UserCheck, Key, Shield, Layers, 
  Target, Info, Eye, Briefcase, AlertTriangle
} from 'lucide-react';
import { API_BASE, customFetch } from '../../config/api';

const ManageableSelect = ({ label, options, value, onChange, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const handleAdd = () => {
    if (newVal.trim()) {
      onAdd(newVal.trim());
      setNewVal("");
      setIsAdding(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</label>
      {isAdding ? (
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={newVal} 
            onChange={e => setNewVal(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500"
            placeholder={`New ${label}...`}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">Add</button>
          <button onClick={() => setIsAdding(false)} className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select 
              value={value || ''} 
              onChange={onChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>Select {label}</option>
              {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">+</button>
          {value && (
            <button onClick={() => onDelete(value)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">-</button>
          )}
        </div>
      )}
    </div>
  );
};

export default function RoleArchitecture({ 
  roleConfigs, setRoleConfigs, 
  companyStructure, personas, 
  addPersona, deletePersona, 
  handleSaveRoleConfig, showToast 
}) {

  // Dynamic Persona Sliders
  const [personaTraits, setPersonaTraits] = useState({
    formality: 50,
    empathy: 70,
    aggressiveness: 20
  });

  // Briefing
  const [secretBriefing, setSecretBriefing] = useState("");

  const currentTotalWeight = ['tech_weight', 'comm_weight', 'eq_weight', 'conf_weight'].reduce((sum, k) => sum + parseInt(roleConfigs[k] || 0), 0);

  const handleTargetDeptChange = (e) => {
    const selectedDept = e.target.value;
    setRoleConfigs({ ...roleConfigs, target_dept: selectedDept, job_role: 'ALL' });
  };

  const handleConfigChange = (key, value) => {
    setRoleConfigs({ ...roleConfigs, [key]: value });
  };

  const saveConfiguration = () => {
    handleSaveRoleConfig(roleConfigs);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-[1200px] mx-auto space-y-8">
      
      {/* Header Info */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-red-600 rounded-full blur-[100px] opacity-30 pointer-events-none" />
         <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
           <Layers className="text-red-500" />
           Dept & Role Configuration
         </h2>
         <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
           Configure exactly how the AI will evaluate specific roles. Adjust internal persona traits, write secret system prompts, and define algorithmic evaluation weights.
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Scope & Persona */}
        <div className="space-y-8">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
            <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                <Target size={20} />
              </div>
              Architectural Scope
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Department</label>
                  <select value={roleConfigs.target_dept} onChange={handleTargetDeptChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all shadow-inner appearance-none cursor-pointer">
                    <option value="ALL">All Departments</option>
                    {Object.keys(companyStructure).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Role</label>
                  <select value={roleConfigs.job_role} onChange={e => {
                      setRoleConfigs({...roleConfigs, job_role: e.target.value});
                  }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all shadow-inner appearance-none cursor-pointer">
                    <option value="ALL">All Roles</option>
                    {roleConfigs.target_dept !== 'ALL' && (companyStructure[roleConfigs.target_dept] || []).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    {roleConfigs.target_dept === 'ALL' && Object.values(companyStructure).flat().map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Evaluation Guidelines */}
        <div className="space-y-8">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
            <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                <Shield size={20} />
              </div>
              Role-Specific Guidelines
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mandatory "Must-Have" Skills</label>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">AI will explicitly test these and hard-fail if lacking. (Comma separated)</p>
                <input 
                  type="text"
                  value={roleConfigs.must_have_skills || ''}
                  onChange={e => handleConfigChange('must_have_skills', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all shadow-inner"
                  placeholder="e.g. React.js, Docker, AWS"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Role Reality Briefing</label>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">Describe the *actual* day-to-day to stress-test their willingness.</p>
                <textarea 
                  rows={3}
                  value={roleConfigs.role_reality || ''}
                  onChange={e => handleConfigChange('role_reality', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all shadow-inner resize-none"
                  placeholder="e.g. You will primarily be fixing bugs in a legacy codebase..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex justify-between">
                  <span>Hard-Reject Threshold (Technical)</span>
                  <span className="text-red-600 font-black">{roleConfigs.hard_reject_score || 50}%</span>
                </label>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">Minimum acceptable technical score to pass.</p>
                <input 
                  type="range"
                  min="0" max="100"
                  value={roleConfigs.hard_reject_score || 50}
                  onChange={e => handleConfigChange('hard_reject_score', parseInt(e.target.value))}
                  className="w-full accent-red-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <button onClick={saveConfiguration} className="w-full mt-8 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] active:scale-95 transition-all flex items-center justify-center gap-2">
               Deploy Role Architecture
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

