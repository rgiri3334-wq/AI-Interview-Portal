import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Activity, Server, Database, Cpu, ShieldCheck, RefreshCw, ShieldAlert, Users, Video, Zap, Network, Lock, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

const customFetch = (url, options = {}) => {
  const token = sessionStorage.getItem('adminToken');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

// Monochromatic Red/Slate Palette for charts
const COLORS = ['#ef4444', '#94a3b8', '#dc2626', '#fca5a5', '#475569'];

export default function SystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('global');
  const [activeMetric, setActiveMetric] = useState('requests'); 

  const fetchHealth = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await customFetch(`${API_BASE}/admin/system/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error("Failed to fetch health data", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const renderGlobalOverview = () => {
    const data = healthData?.telemetry?.api || [];
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-8">
        
        {/* Bento Grid Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          <motion.div variants={itemVariants} onClick={() => setActiveMetric('requests')} className={`relative bg-white/70 backdrop-blur-2xl p-6 rounded-[2rem] border cursor-pointer transition-all group overflow-hidden ${activeMetric === 'requests' ? 'border-red-400 ring-4 ring-red-50 shadow-[0_8px_30px_rgb(220,38,38,0.1)]' : 'border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-200'}`}>
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-slate-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-colors ${activeMetric === 'requests' ? 'bg-gradient-to-br from-red-500 to-red-600 text-white border-red-500 shadow-[0_8px_20px_rgba(220,38,38,0.3)]' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-red-50 group-hover:text-red-600'}`}>
                <Network size={24} />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600 text-xs font-black tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
              </div>
            </div>
            <h3 className="relative z-10 font-bold text-slate-500 text-sm uppercase tracking-widest mb-1">API Status</h3>
            <p className="relative z-10 text-4xl font-black text-slate-900 tracking-tight">{healthData?.api_status || 'Online'}</p>
            <p className="relative z-10 text-xs font-bold text-slate-400 mt-3 flex items-center gap-1.5">
              <Activity size={14} className="text-red-500" /> Uptime: {healthData?.uptime}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => setActiveMetric('latency')} className={`relative bg-white/70 backdrop-blur-2xl p-6 rounded-[2rem] border cursor-pointer transition-all group overflow-hidden ${activeMetric === 'latency' ? 'border-slate-800 ring-4 ring-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.1)]' : 'border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-200'}`}>
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-slate-200 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-colors ${activeMetric === 'latency' ? 'bg-gradient-to-br from-slate-700 to-slate-900 text-white border-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.3)]' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-slate-100 group-hover:text-slate-800'}`}>
                <Database size={24} />
              </div>
            </div>
            <h3 className="relative z-10 font-bold text-slate-500 text-sm uppercase tracking-widest mb-1">Database Node</h3>
            <p className="relative z-10 text-4xl font-black text-slate-900 tracking-tight">{healthData?.db_status || 'Connected'}</p>
            <p className="relative z-10 text-xs font-bold text-slate-400 mt-3 flex items-center gap-1.5">
              <Zap size={14} className="text-slate-500" /> Latency: {healthData?.db_latency}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => setActiveCategory('ai')} className={`relative bg-white/70 backdrop-blur-2xl p-6 rounded-[2rem] border cursor-pointer transition-all group overflow-hidden border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-200`}>
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shadow-sm transition-colors group-hover:bg-rose-50 group-hover:text-rose-600">
                <Cpu size={24} />
              </div>
            </div>
            <h3 className="relative z-10 font-bold text-slate-500 text-sm uppercase tracking-widest mb-1">AI Engine Core</h3>
            <p className="relative z-10 text-4xl font-black text-slate-900 tracking-tight">{healthData?.ai_engine || 'Online'}</p>
            <p className="relative z-10 text-xs font-bold text-slate-400 mt-3 flex items-center gap-1.5">
              <Server size={14} className="text-rose-500" /> Load: {healthData?.ai_load}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} onClick={() => setActiveMetric('sessions')} className={`relative bg-white/70 backdrop-blur-2xl p-6 rounded-[2rem] border cursor-pointer transition-all group overflow-hidden ${activeMetric === 'sessions' ? 'border-red-600 ring-4 ring-red-50 shadow-[0_8px_30px_rgb(220,38,38,0.15)]' : 'border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-slate-200'}`}>
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-red-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border transition-colors ${activeMetric === 'sessions' ? 'bg-gradient-to-br from-red-600 to-red-800 text-white border-red-500 shadow-[0_8px_20px_rgba(220,38,38,0.3)]' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-red-50 group-hover:text-red-600'}`}>
                <Users size={24} />
              </div>
            </div>
            <h3 className="relative z-10 font-bold text-slate-500 text-sm uppercase tracking-widest mb-1">Active Sessions</h3>
            <p className="relative z-10 text-4xl font-black text-slate-900 tracking-tight">{healthData?.active_sessions}</p>
            <p className="relative z-10 text-xs font-bold text-slate-400 mt-3 flex items-center gap-1.5">
              <Video size={14} className="text-red-600" /> Candidates currently online
            </p>
          </motion.div>
        </div>

        {/* Large Chart Area */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100/40 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-end mb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeMetric === 'requests' && 'Platform Traffic (API Requests)'}
                {activeMetric === 'latency' && 'Database Ping (Latency in ms)'}
                {activeMetric === 'sessions' && 'Active Interview Sessions'}
              </h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Real-time telemetry stream synchronized with Sterling core.</p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Sync Active</span>
            </div>
          </div>

          <div className="h-96 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px rgb(0 0 0 / 0.1)', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }} 
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                
                {activeMetric === 'requests' && <Area type="monotone" dataKey="requests" name="API Requests" stroke="#ef4444" strokeWidth={5} fillOpacity={1} fill="url(#colorReq)" activeDot={{r: 6, strokeWidth: 0, fill: '#ef4444', filter: 'drop-shadow(0px 0px 4px rgba(239,68,68,0.8))'}} />}
                {activeMetric === 'latency' && <Area type="monotone" dataKey="latency" name="DB Ping (ms)" stroke="#475569" strokeWidth={5} fillOpacity={1} fill="url(#colorLat)" activeDot={{r: 6, strokeWidth: 0, fill: '#475569', filter: 'drop-shadow(0px 0px 4px rgba(71,85,105,0.8))'}} />}
                {activeMetric === 'sessions' && <Area type="monotone" dataKey="sessions" name="Active Sessions" stroke="#dc2626" strokeWidth={5} fillOpacity={1} fill="url(#colorSes)" activeDot={{r: 6, strokeWidth: 0, fill: '#dc2626', filter: 'drop-shadow(0px 0px 4px rgba(220,38,38,0.8))'}} />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderAiSubsystem = () => {
    const radarData = healthData?.telemetry?.ai_radar || [];
    const aiData = healthData?.telemetry?.ai || [];
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-red-50 rounded-full blur-[80px] pointer-events-none" />
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 relative z-10">Neural Token Stream</h3>
          <p className="text-slate-500 text-sm font-medium mb-8 relative z-10">Real-time LLM token generation velocity.</p>
          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTok" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="tokens" name="Tokens/sec" stroke="#ef4444" strokeWidth={5} fillOpacity={1} fill="url(#colorTok)" activeDot={{r: 6, fill: '#ef4444', strokeWidth:0}} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-slate-100 rounded-full blur-[60px] pointer-events-none" />
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 relative z-10">Global Persona IQ</h3>
          <p className="text-slate-500 text-sm font-medium mb-6 relative z-10">Average scores across all active sessions.</p>
          <div className="flex-1 w-full min-h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                <PolarAngleAxis dataKey="metric" tick={{fill: '#475569', fontSize: 11, fontWeight: 800}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke="#ef4444" strokeWidth={4} fill="#ef4444" fillOpacity={0.25} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgb(0 0 0 / 0.1)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
    );
  };

  const renderLiveSessions = () => {
    const rolesData = healthData?.telemetry?.role_distribution || [];
    const liveStreams = healthData?.telemetry?.live_streams || [];
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-red-50 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm">
                  <Video className="text-red-600 animate-pulse" size={24}/>
                </div>
                Active Uplinks
              </h3>
              <p className="text-sm text-slate-500 font-medium mt-2 ml-1">Real-time candidate interview monitoring.</p>
            </div>
            <span className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] text-xs font-black px-4 py-2 rounded-xl uppercase tracking-widest">{liveStreams.length} LIVE</span>
          </div>
          
          <div className="overflow-x-auto relative z-10">
            {liveStreams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                <Video size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold text-lg">No active uplinks right now.</p>
              </div>
            ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-4 px-4">Candidate Identity</th>
                  <th className="pb-4 px-4">Target Vector</th>
                  <th className="pb-4 px-4">Current Protocol</th>
                  <th className="pb-4 px-4 text-right">T+ Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {liveStreams.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-red-600 transition-colors text-base">{s.name}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{s.id}</div>
                    </td>
                    <td className="py-5 px-4 text-sm font-bold text-slate-600">{s.role}</td>
                    <td className="py-5 px-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black bg-white shadow-sm border border-slate-200 text-slate-700">
                        {s.status === 'Live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>}
                        {s.stage}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-right text-sm font-black text-slate-800 tabular-nums bg-slate-50/50 rounded-r-xl">{s.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden">
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-slate-100 rounded-full blur-[60px] pointer-events-none" />
          <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 relative z-10">Vector Distribution</h3>
          <p className="text-sm text-slate-500 font-medium mb-6 relative z-10">Job role allocation for live streams.</p>
          <div className="flex-1 w-full min-h-[250px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rolesData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                  {rolesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: '800', fontSize: '12px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
    );
  };

  const renderSecurity = () => {
    const secData = healthData?.telemetry?.security || [];
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }} className="bg-white/80 backdrop-blur-3xl p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-40 bg-red-50 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 pb-8 border-b-2 border-slate-100 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl flex items-center justify-center border border-red-200 shadow-sm shrink-0">
            <Fingerprint className="text-red-600" size={32}/>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">Security & Authentication Grid</h3>
            <p className="text-slate-500 font-medium mt-2">Threat detection, rate limit interventions, and unauthorized access attempts.</p>
          </div>
        </div>
        
        <div className="h-[400px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={secData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 20px 40px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                cursor={{fill: '#f8fafc', radius: 10}} 
              />
              <Legend wrapperStyle={{ paddingTop: '30px', fontWeight: '800', fontSize: '13px' }} iconType="circle" />
              <Bar dataKey="failed_logins" name="Auth Rejections" fill="#ef4444" radius={[8, 8, 8, 8]} barSize={36} />
              <Bar dataKey="api_blocks" name="Rate Limit Interventions" fill="#475569" radius={[8, 8, 8, 8]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    );
  };

  const tabs = [
    { id: 'global', label: 'Global Overview', icon: Activity },
    { id: 'ai', label: 'AI Subsystem', icon: Cpu },
    { id: 'live', label: 'Live Uplinks', icon: Video },
    { id: 'security', label: 'Security Grid', icon: Lock },
  ];

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans relative overflow-hidden text-slate-900 selection:bg-red-200 selection:text-red-900">
      
      {/* High-End Ambient Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-slate-100/90 via-slate-50/50 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-60 -right-40 w-[800px] h-[800px] bg-red-100/50 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-slate-200/50 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTU5LjUgMGguNXY2MEgwaC0uNXYtNjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U1ZTdlYiIgc3Ryb2tlLW9wYWNpdHk9IjAuNCIvPjwvc3ZnPg==')] opacity-40 pointer-events-none z-0" />

      <Sidebar />
      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-10 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b-2 border-slate-200/60 relative">
            <div className="absolute bottom-0 left-0 w-32 h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-[1.5rem] flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Activity size={36} className="text-red-600 relative z-10" />
              </div>
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">System <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">Health</span></h1>
                <p className="text-slate-500 mt-2 font-bold text-sm tracking-widest uppercase">Enterprise Telemetry Command Center</p>
              </div>
            </div>
            
            <button 
              onClick={() => fetchHealth(true)}
              disabled={refreshing || loading}
              className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-[0_8px_20px_rgb(15,23,42,0.2)] hover:shadow-[0_12px_30px_rgb(15,23,42,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
            >
              <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? 'Synchronizing...' : 'Sync Telemetry'}
            </button>
          </div>

          {/* Premium Segmented Tabs */}
          <div className="flex p-2 bg-white/60 backdrop-blur-xl rounded-[1.5rem] w-max border border-slate-200 shadow-sm relative z-20">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`relative flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm transition-all z-10 ${
                    isActive ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="health-active-tab-premium"
                      className="absolute inset-0 bg-slate-900 rounded-xl shadow-[0_8px_20px_rgb(15,23,42,0.2)]"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-2.5">
                    <Icon size={18} className={isActive ? "text-red-400" : ""} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Content Area */}
          {loading && !healthData ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-6" />
              <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">Establishing Uplink...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeCategory === 'global' && renderGlobalOverview()}
              {activeCategory === 'ai' && renderAiSubsystem()}
              {activeCategory === 'live' && renderLiveSessions()}
              {activeCategory === 'security' && renderSecurity()}
            </AnimatePresence>
          )}

        </div>
      </main>
    </div>
  );
}
