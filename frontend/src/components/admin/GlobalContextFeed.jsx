import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Trash2, Clock, AlertTriangle, Info,
  CheckCircle2, PackagePlus, Tag, Calendar
} from 'lucide-react';

// Removed Bundles
// Fallback icons if Activity/ShieldOff fail to import properly
import { Activity, ShieldOff } from 'lucide-react';

export default function GlobalContextFeed({ companyContext, handleSaveCompanyContext, showToast }) {
  const [newText, setNewText] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [expiration, setExpiration] = useState("");

  const handleInject = () => {
    if (!newText.trim()) return;
    const newContext = { 
      id: Date.now().toString(), 
      text: newText.trim(), 
      date: new Date().toISOString(), 
      active: true, 
      author: 'Admin',
      priority: priority,
      expiresAt: expiration ? new Date(expiration).toISOString() : null
    };
    handleSaveCompanyContext([newContext, ...companyContext]);
    setNewText("");
    setExpiration("");
    setPriority("MEDIUM");
    showToast("Context injected successfully!");
  };

  const getPriorityStyle = (pri) => {
    if (pri === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-300';
    if (pri === 'HIGH') return 'bg-orange-100 text-orange-800 border-orange-300';
    if (pri === 'LOW') return 'bg-slate-100 text-slate-600 border-slate-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-[1200px] mx-auto">
      
      {/* Top Section: Main Injector */}
      <div className="w-full bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute right-0 top-0 p-32 bg-red-50 rounded-full blur-[80px] pointer-events-none opacity-50" />
        
        <h3 className="relative z-10 text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
          <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200">
            <FileText size={20} />
          </div>
          Inject AI Intelligence Context
        </h3>
        
        <div className="relative z-10 space-y-5">
          <textarea 
            rows={3} 
            value={newText}
            onChange={e => setNewText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" 
            placeholder="e.g. Sterling just launched an 800V battery platform. Weave this into the interview." 
          />
          
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><Tag size={12}/> Priority Level</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2"><Calendar size={12}/> Auto-Expire Date (Optional)</label>
              <input type="datetime-local" value={expiration} onChange={e => setExpiration(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all" />
            </div>
          </div>

          <button onClick={handleInject} disabled={!newText.trim()} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] active:scale-95 transition-all flex items-center justify-center gap-2">
            <Plus size={18} /> Broadcast to AI Engine
          </button>
        </div>
      </div>

      {/* The Feed */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-[500px]">
         <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
           <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
             <Activity size={24} className="text-red-600" />
             Live Intelligence Feed
           </h3>
           <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
             {companyContext.filter(c => c.active && !isExpired(c.expiresAt)).length} Active Contexts
           </span>
         </div>

         <div className="space-y-4">
            <AnimatePresence>
              {companyContext.length === 0 ? (
                 <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-slate-400 text-sm font-bold text-center py-20">No intelligence broadcasted yet.</motion.p>
              ) : companyContext.map((ctx) => {
                const expired = isExpired(ctx.expiresAt);
                const active = ctx.active && !expired;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={ctx.id} 
                    className={`p-6 rounded-2xl border transition-all relative overflow-hidden group ${active ? 'bg-white border-slate-200 shadow-sm hover:border-red-200 hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-70'}`}
                  >
                    <div className={`absolute left-0 top-0 w-1.5 h-full transition-colors ${active ? (ctx.priority==='CRITICAL' ? 'bg-red-600' : ctx.priority==='HIGH' ? 'bg-orange-500' : 'bg-blue-500') : 'bg-slate-300'}`} />
                    
                    <div className="flex justify-between items-start gap-6 pl-2">
                       <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2 flex-wrap">
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getPriorityStyle(ctx.priority || 'MEDIUM')}`}>
                             {ctx.priority || 'MEDIUM'}
                           </span>
                           {expired && (
                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-200 text-slate-500 border-slate-300 flex items-center gap-1">
                               <Clock size={10} /> Expired
                             </span>
                           )}
                           {ctx.expiresAt && !expired && (
                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
                               <Clock size={10} /> Expires: {new Date(ctx.expiresAt).toLocaleDateString()}
                             </span>
                           )}
                         </div>
                         <p className={`text-sm font-bold leading-relaxed ${active ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{ctx.text}</p>
                         <div className="mt-3 text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-3">
                           <span>By {ctx.author}</span>
                           <span>•</span>
                           <span>{new Date(ctx.date).toLocaleString()}</span>
                         </div>
                       </div>
                       <div className="flex flex-col sm:flex-row items-center gap-2">
                         <button 
                           onClick={() => handleSaveCompanyContext(companyContext.map(c => c.id === ctx.id ? { ...c, active: !c.active } : c))}
                           disabled={expired}
                           className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${expired ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : ctx.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'}`}
                         >
                           {ctx.active ? 'Enabled' : 'Disabled'}
                         </button>
                         <button 
                           onClick={() => handleSaveCompanyContext(companyContext.filter(c => c.id !== ctx.id))}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
         </div>
      </div>

    </motion.div>
  );
}

