import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Activity, Server, Database, Cpu, ShieldCheck, RefreshCw, ShieldAlert, Users, Video } from 'lucide-react';
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
  const [activeMetric, setActiveMetric] = useState('requests'); // global, ai, live, security

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

  const renderGlobalOverview = () => {
    const data = healthData?.telemetry?.api || [];
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div onClick={() => setActiveMetric('requests')} className={`relative bg-white p-6 rounded-3xl border cursor-pointer transition-all group overflow-hidden ${activeMetric === 'requests' ? 'border-red-400 ring-4 ring-red-50 shadow-[0_8px_30px_rgb(220,38,38,0.1)]' : 'border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-slate-200'}`}>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${activeMetric === 'requests' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-red-50 group-hover:text-red-600'}`}>
                <Server size={18} />
              </div>
              <h3 className="font-bold text-slate-700">API Status</h3>
            </div>
            <p className="relative z-10 text-3xl font-black text-slate-900 tracking-tight">{healthData?.api_status || 'Online'}</p>
            <p className="relative z-10 text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Uptime: {healthData?.uptime}</p>
          </div>

          <div onClick={() => setActiveMetric('latency')} className={`relative bg-white p-6 rounded-3xl border cursor-pointer transition-all group overflow-hidden ${activeMetric === 'latency' ? 'border-slate-800 ring-4 ring-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.1)]' : 'border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-slate-200'}`}>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-100 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${activeMetric === 'latency' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-slate-100 group-hover:text-slate-800'}`}>
                <Database size={18} />
              </div>
              <h3 className="font-bold text-slate-700">Database</h3>
            </div>
            <p className="relative z-10 text-3xl font-black text-slate-900 tracking-tight">{healthData?.db_status || 'Connected'}</p>
            <p className="relative z-10 text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Latency: {healthData?.db_latency}</p>
          </div>

          <div onClick={() => setActiveCategory('ai')} className={`relative bg-white p-6 rounded-3xl border cursor-pointer transition-all group overflow-hidden border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-slate-200`}>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shadow-sm group-hover:bg-rose-50 group-hover:text-rose-600">
                <Cpu size={18} />
              </div>
              <h3 className="font-bold text-slate-700">AI Engine</h3>
            </div>
            <p className="relative z-10 text-3xl font-black text-slate-900 tracking-tight">{healthData?.ai_engine}</p>
            <p className="relative z-10 text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Load: {healthData?.ai_load}</p>
          </div>

          <div onClick={() => setActiveMetric('sessions')} className={`relative bg-white p-6 rounded-3xl border cursor-pointer transition-all group overflow-hidden ${activeMetric === 'sessions' ? 'border-red-600 ring-4 ring-red-50 shadow-[0_8px_30px_rgb(220,38,38,0.15)]' : 'border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-slate-200'}`}>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${activeMetric === 'sessions' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-50 text-slate-600 border-slate-200 group-hover:bg-red-50 group-hover:text-red-600'}`}>
                <Activity size={18} />
              </div>
              <h3 className="font-bold text-slate-700">Active Sessions</h3>
            </div>
            <p className="relative z-10 text-3xl font-black text-slate-900 tracking-tight">{healthData?.active_sessions}</p>
            <p className="relative z-10 text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Candidates currently online</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-6">
            {activeMetric === 'requests' && 'Platform Traffic (API Requests)'}
            {activeMetric === 'latency' && 'Database Ping (Latency in ms)'}
            {activeMetric === 'sessions' && 'Active Interview Sessions'}
          </h3>
          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#475569" stopOpacity={0.3}/><stop offset="95%" stopColor="#475569" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorSes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)', fontWeight: 'bold' }} />
                
                {activeMetric === 'requests' && <Area type="monotone" dataKey="requests" name="API Requests" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorReq)" />}
                {activeMetric === 'latency' && <Area type="monotone" dataKey="latency" name="DB Ping (ms)" stroke="#475569" strokeWidth={4} fillOpacity={1} fill="url(#colorLat)" />}
                {activeMetric === 'sessions' && <Area type="monotone" dataKey="sessions" name="Active Sessions" stroke="#dc2626" strokeWidth={4} fillOpacity={1} fill="url(#colorSes)" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderAiSubsystem = () => {
    const radarData = healthData?.telemetry?.ai_radar || [];
    const aiData = healthData?.telemetry?.ai || [];
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-6">Sterling Token Generation Rate</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTok" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="tokens" name="Tokens Generated" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorTok)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">Average Interview Scores</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="55%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="metric" tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke="#ef4444" strokeWidth={3} fill="#ef4444" fillOpacity={0.2} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderLiveSessions = () => {
    const rolesData = healthData?.telemetry?.role_distribution || [];
    const liveStreams = healthData?.telemetry?.live_streams || [];
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Video className="text-red-600 animate-pulse" size={20}/>
              </div>
              Active Streams
            </h3>
            <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{liveStreams.length} LIVE</span>
          </div>
          <div className="overflow-x-auto">
            {liveStreams.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl">
                <Video size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">No active interviews right now.</p>
              </div>
            ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="pb-4 px-4">Candidate</th>
                  <th className="pb-4 px-4">Role</th>
                  <th className="pb-4 px-4">Current Stage</th>
                  <th className="pb-4 px-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveStreams.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">{s.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{s.id}</div>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-600">{s.role}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.status === 'Live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>}
                        {s.stage}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-black text-slate-800 tabular-nums">{s.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">Role Distribution</h3>
          <p className="text-sm text-slate-500 font-medium mb-4">Breakdown of active sessions.</p>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rolesData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {rolesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSecurity = () => {
    const secData = healthData?.telemetry?.security || [];
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="p-3 bg-red-50 rounded-xl">
            <ShieldAlert className="text-red-600" size={28}/>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Security & Authentication Log</h3>
            <p className="text-sm text-slate-500 font-medium mt-1">Failed logins and API rate-limit blocks.</p>
          </div>
        </div>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={secData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0 0 0 / 0.12)', fontWeight: 'bold' }} cursor={{fill: '#f8fafc'}} />
              <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold' }} />
              <Bar dataKey="failed_logins" name="Failed Auth Attempts" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
              <Bar dataKey="api_blocks" name="Rate Limit Blocks" fill="#475569" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    );
  };

  const tabs = [
    { id: 'global', label: 'Global Overview', icon: Activity },
    { id: 'ai', label: 'AI Subsystem', icon: Cpu },
    { id: 'live', label: 'Live Interviews', icon: Users },
    { id: 'security', label: 'Security & Auth', icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-screen bg-[#fafafa] font-sans relative overflow-hidden text-slate-900">
      {/* Absolute Ambient Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-100/80 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-50 pointer-events-none" />

      <Sidebar />
      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-10">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(15,23,42,0.2)]">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">System <span className="text-red-600">Health</span></h1>
                <p className="text-slate-500 mt-1 font-medium text-sm">Real-time platform telemetry and command center.</p>
              </div>
            </div>
            <button 
              onClick={() => fetchHealth(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 hover:bg-red-50 px-5 py-3 rounded-2xl font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? 'Syncing...' : 'Sync Telemetry'}
            </button>
          </div>

          {/* iOS-Style Segmented Tabs using Framer Motion */}
          <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-max backdrop-blur-xl border border-slate-200 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors z-10 ${
                    isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="health-active-tab"
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

          {loading && !healthData ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
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
