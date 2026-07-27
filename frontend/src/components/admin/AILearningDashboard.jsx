import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import { Brain, ShieldAlert, Cpu, Activity, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/apiClient';

export default function AILearningDashboard() {
  const [stats, setStats] = useState({
    total_lessons_learned: 0,
    last_training_time: null,
    active_rules: [],
    historical_log: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/ai-learning-stats');
      if (response.data && response.data.status === 'success') {
        setStats(response.data.data);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch AI learning stats');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
        <div className="text-center text-red-600 font-bold animate-pulse z-10 text-xl tracking-widest uppercase">
          Initializing Neural Link...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div className="text-red-600 mb-4 font-bold">Error: {error}</div>
        <button onClick={fetchStats} className="px-6 py-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition font-bold tracking-wide">
          Re-initialize
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden p-6 lg:p-10">
      
      {/* Optimized VR Particles (i5 Safe) */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fpsLimit: 60,
            particles: {
              color: { value: "#dc2626" },
              number: { density: { enable: true, area: 800 }, value: 35 }, /* Low density */
              opacity: { value: 0.5, random: true },
              shape: { type: "circle" },
              size: { value: { min: 1, max: 3 } },
              move: {
                enable: true,
                direction: "none",
                outModes: { default: "out" },
                random: true,
                speed: 0.3, /* Very slow for VR depth */
                straight: false,
              }
            },
            interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } }, /* Disabled physics */
            detectRetina: true,
          }}
        />
      </div>

      {/* Ambient Red Glows (CSS only) */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1600px] mx-auto relative z-10">
        
        {/* Core Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center text-white relative">
              {/* Pulse effect */}
              <div className="absolute inset-0 rounded-2xl border border-red-400 animate-ping opacity-20"></div>
              <Brain size={32} />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
                AI Cognitive Core
              </h1>
              <p className="text-slate-500 font-medium tracking-wide uppercase text-sm mt-1">
                Real-time Self-Reflection & Alignment
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm px-6 py-3 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Loops</span>
              <span className="text-2xl font-black text-red-600">{stats.total_lessons_learned}</span>
            </div>
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm px-6 py-3 rounded-2xl flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Last Trained</span>
              <span className="text-sm font-bold text-slate-700">{formatDate(stats.last_training_time)}</span>
            </div>
          </div>
        </motion.div>

        {/* 2-Column Spatial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Active System Constraints */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-4 space-y-6"
          >
            <div className="bg-red-600/5 backdrop-blur-2xl border border-red-500/20 rounded-3xl p-6 shadow-[inset_0_0_40px_rgba(220,38,38,0.02)]">
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="text-red-600" size={24} />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">Active Constraints</h2>
              </div>
              
              <div className="space-y-4">
                {stats.active_rules.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">Neural network operating without manual overrides.</p>
                ) : (
                  stats.active_rules.map((rule, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (idx * 0.1) }}
                      className="bg-white/90 backdrop-blur-md border border-red-100 p-4 rounded-2xl shadow-sm relative group overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-400"></div>
                      <p className="font-mono text-[13px] text-slate-700 leading-relaxed pl-3 font-medium">
                        <span className="text-red-500 font-bold mr-2">SYS_RULE:</span>
                        {rule}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Detailed Telemetry Dossier */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-8"
          >
            <div className="bg-white/70 backdrop-blur-2xl border border-white rounded-3xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.04)] relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                <Activity className="text-slate-400" size={24} />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">Historical Telemetry Dossier</h2>
              </div>

              <div className="space-y-6 relative">
                {/* Vertical glowing timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-red-500 via-red-200 to-transparent opacity-30 hidden md:block"></div>

                {stats.historical_log.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 italic">No telemetry data recorded.</div>
                ) : (
                  stats.historical_log.map((log, idx) => (
                    <div key={idx} className="relative md:pl-16">
                      
                      {/* Timeline Node */}
                      <div className="absolute left-[21px] top-6 w-3 h-3 rounded-full bg-red-500 ring-4 ring-white shadow-[0_0_10px_rgba(220,38,38,0.5)] hidden md:block"></div>
                      
                      <div 
                        className={`bg-white border transition-all duration-300 rounded-2xl cursor-pointer ${expandedRow === idx ? 'border-red-300 shadow-[0_10px_40px_rgba(220,38,38,0.1)]' : 'border-slate-100 shadow-sm hover:border-red-200 hover:shadow-md'}`}
                        onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                      >
                        {/* Summary Header */}
                        <div className="p-5 flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                                Incident #{stats.historical_log.length - idx}
                              </span>
                              <span className="text-xs text-slate-400 font-medium">{formatDate(log.timestamp)}</span>
                            </div>
                            <h3 className="text-slate-800 font-bold text-[15px] leading-snug">
                              {log.mistake_made}
                            </h3>
                          </div>
                          <div className="text-slate-400 mt-2 bg-slate-50 p-2 rounded-full">
                            {expandedRow === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {/* Expanded Deep Dossier */}
                        <AnimatePresence>
                          {expandedRow === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-slate-100 bg-slate-50/50 rounded-b-2xl"
                            >
                              <div className="p-6 space-y-6">
                                {/* Lesson Learned */}
                                <div>
                                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 mb-2">
                                    <Brain size={14} /> Neural Pathway Formed (Lesson)
                                  </h4>
                                  <p className="text-slate-600 text-sm leading-relaxed bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                    {log.lesson_learned || "System realized inefficiency in response mechanism."}
                                  </p>
                                </div>

                                {/* Future Improvements */}
                                <div>
                                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 mb-2">
                                    <TrendingUp size={14} /> Optimization Vector (Future)
                                  </h4>
                                  <p className="text-slate-600 text-sm leading-relaxed bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                                    {log.future_improvement_areas || "Pending deeper architectural alignment."}
                                  </p>
                                </div>

                                {/* Strict Rule */}
                                <div>
                                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-red-600 mb-2">
                                    <Cpu size={14} /> Enforced Overwrite (New Rule)
                                  </h4>
                                  <div className="bg-red-600 text-white font-mono text-sm p-4 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] relative overflow-hidden">
                                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-red-700 to-transparent opacity-50"></div>
                                    &gt; {log.new_rule}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
