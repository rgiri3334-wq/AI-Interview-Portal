import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, UserCheck, Key, Shield, Layers, 
  Target, Info, Eye, Briefcase
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

  const handleWeightChange = (key, value) => {
    setRoleConfigs({ ...roleConfigs, [key]: parseInt(value) });
  };

  const saveConfiguration = () => {
    // Append secret briefing and traits to the role configs
    handleSaveRoleConfig({
      ...roleConfigs,
      personaTraits,
      secretBriefing
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-[1200px] mx-auto space-y-8">
      
      {/* Header Info */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
         <div className="absolute right-0 top-0 w-64 h-64 bg-red-600 rounded-full blur-[100px] opacity-30 pointer-events-none" />
         <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
           <Layers className="text-red-500" />
           Role & Persona Architecture
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

          {/* Dynamic Persona Builder */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
             <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                <UserCheck size={20} />
              </div>
              Dynamic AI Persona
            </h3>
            
            <ManageableSelect 
              label="Base Persona Archetype"
              options={personas}
              value={roleConfigs.persona}
              onChange={e => setRoleConfigs({...roleConfigs, persona: e.target.value})}
              onAdd={addPersona}
              onDelete={deletePersona}
            />

            <div className="mt-8 space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Behavioral Matrix Tuning</h4>
              
              {/* Formality Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>Casual & Friendly</span>
                  <span>Strict & Formal</span>
                </div>
                <input type="range" min="0" max="100" value={personaTraits.formality} onChange={e => setPersonaTraits({...personaTraits, formality: e.target.value})} className="w-full accent-slate-900" />
              </div>

              {/* Empathy Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>Cold & Logical</span>
                  <span>High Empathy</span>
                </div>
                <input type="range" min="0" max="100" value={personaTraits.empathy} onChange={e => setPersonaTraits({...personaTraits, empathy: e.target.value})} className="w-full accent-blue-600" />
              </div>

               {/* Aggressiveness Slider */}
               <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>Passive Listener</span>
                  <span>Aggressive Interrogator</span>
                </div>
                <input type="range" min="0" max="100" value={personaTraits.aggressiveness} onChange={e => setPersonaTraits({...personaTraits, aggressiveness: e.target.value})} className="w-full accent-red-600" />
              </div>
            </div>

            <div className="mt-8">
               <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2"><Key size={14}/> Pre-Interview Secret Briefing</label>
               <textarea 
                  rows={4}
                  value={secretBriefing}
                  onChange={e => setSecretBriefing(e.target.value)}
                  className="w-full bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-xl resize-none focus:outline-none focus:ring-4 focus:ring-slate-900/20"
                  placeholder="e.g. 'This candidate is applying for a senior role. Do not hold back on system design questions. Push them to their absolute limits on scalability.'"
               />
               <p className="text-[10px] font-bold text-slate-400 mt-2">This prompt is injected into the AI's core instructions immediately before the interview starts.</p>
            </div>

          </div>
        </div>

        {/* Right Column: Balancing Weights */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col group">
          <div className="flex-1">
            <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                <Settings2 size={20} />
              </div>
              Auto-Balancing Quotas
            </h3>
            
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              Define the percentage breakdown of questions asked. The AI will constantly check its quota and pivot the interview to ensure these weights are met perfectly by the end.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Briefcase size={14}/> Phase 2: Core Interview</span>
                <span className={`text-xs font-black px-3 py-1 rounded-lg tracking-wider transition-colors ${currentTotalWeight === 100 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  Total: {currentTotalWeight}%
                </span>
              </div>
              
              <div className="space-y-8">
                {[
                  { label: 'Technical Rigor', key: 'tech_weight', color: 'accent-red-600', icon: '💻' },
                  { label: 'Communication & Clarity', key: 'comm_weight', color: 'accent-blue-600', icon: '🗣️' },
                  { label: 'Emotional Intelligence (EQ)', key: 'eq_weight', color: 'accent-emerald-600', icon: '🧠' },
                  { label: 'Confidence & Assertiveness', key: 'conf_weight', color: 'accent-orange-600', icon: '⚡' }
                ].map(s => (
                  <div key={s.key} className="relative">
                    <div className="flex justify-between text-sm font-bold text-slate-800 mb-3">
                      <span className="flex items-center gap-2">{s.icon} {s.label}</span>
                      <span className={`${s.color.replace('accent-','text-')}`}>{roleConfigs[s.key]}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={roleConfigs[s.key]} onChange={e => handleWeightChange(s.key, e.target.value)} className={`w-full ${s.color} h-2 rounded-lg cursor-pointer`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Visual breakdown bar */}
            {currentTotalWeight === 100 && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="h-4 w-full rounded-full overflow-hidden flex shadow-inner mb-8">
                <div style={{width: `${roleConfigs.tech_weight}%`}} className="bg-red-500" title="Tech" />
                <div style={{width: `${roleConfigs.comm_weight}%`}} className="bg-blue-500" title="Comm" />
                <div style={{width: `${roleConfigs.eq_weight}%`}} className="bg-emerald-500" title="EQ" />
                <div style={{width: `${roleConfigs.conf_weight}%`}} className="bg-orange-500" title="Conf" />
              </motion.div>
            )}

            {currentTotalWeight !== 100 && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-bold flex items-start gap-3 mb-8">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                Weights must equal exactly 100%. Currently at {currentTotalWeight}%.
              </motion.div>
            )}

          </div>

          <div className="pt-6 border-t border-slate-100">
             <button 
                onClick={saveConfiguration} 
                disabled={currentTotalWeight !== 100}
                className={`w-full font-extrabold py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${currentTotalWeight === 100 ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                <Shield size={18} /> Deploy Architecture to Engine
              </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

