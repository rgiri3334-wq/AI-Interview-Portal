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

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function SystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('global'); // global, ai, live, security

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><Server className="text-blue-600" size={20}/><h3 className="font-bold text-slate-700">API Status</h3></div>
            <p className="text-2xl font-black text-slate-900">{healthData?.api_status || 'Online'}</p>
            <p className="text-xs text-slate-500">Uptime: {healthData?.uptime}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><Database className="text-emerald-600" size={20}/><h3 className="font-bold text-slate-700">Database</h3></div>
            <p className="text-2xl font-black text-slate-900">{healthData?.db_status || 'Connected'}</p>
            <p className="text-xs text-slate-500">Latency: {healthData?.db_latency}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><Cpu className="text-purple-600" size={20}/><h3 className="font-bold text-slate-700">AI Engine</h3></div>
            <p className="text-2xl font-black text-slate-900">{healthData?.ai_engine}</p>
            <p className="text-xs text-slate-500">Load: {healthData?.ai_load}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><Activity className="text-amber-600" size={20}/><h3 className="font-bold text-slate-700">Active Sessions</h3></div>
            <p className="text-2xl font-black text-slate-900">{healthData?.active_sessions}</p>
            <p className="text-xs text-slate-500">Candidates currently online</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">API Traffic & Latency</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#93c5fd" stopOpacity={0.3}/><stop offset="95%" stopColor="#93c5fd" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey="requests" name="Requests/min" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReq)" />
                <Area type="monotone" dataKey="latency" name="Latency (ms)" stroke="#93c5fd" strokeWidth={3} fillOpacity={1} fill="url(#colorLat)" />
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Sterling Token Generation Rate</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTok" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="tokens" name="Tokens Generated" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTok)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Model Confidence Matrix</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{fill: '#64748b', fontSize: 11}} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.4} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Video className="text-red-500 animate-pulse" size={20}/> Active Candidate Streams
            </h3>
            <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full">{liveStreams.length} LIVE</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 px-4">Candidate</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Current Stage</th>
                  <th className="pb-3 px-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveStreams.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.id}</div>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-slate-700">{s.role}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">
                        {s.status === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>}
                        {s.stage}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-bold text-slate-700 tabular-nums">{s.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Role Distribution</h3>
          <p className="text-sm text-slate-500 mb-4">Breakdown of active sessions by job role.</p>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rolesData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {rolesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="text-red-500" size={24}/>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Security & Authentication Log</h3>
            <p className="text-sm text-slate-500">Failed logins and API rate-limit blocks.</p>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={secData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
              <Legend />
              <Bar dataKey="failed_logins" name="Failed Auth Attempts" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="api_blocks" name="Rate Limit Blocks" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
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
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
              <ShieldCheck size={14} /> Platform Command Center
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              System <span className="text-emerald-600">Health</span>
            </h1>
          </div>
          <button 
            onClick={() => fetchHealth(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? 'Refreshing...' : 'Refresh Telemetry'}
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex space-x-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeCategory === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveCategory(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </div>

        {loading && !healthData ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeCategory === 'global' && renderGlobalOverview()}
            {activeCategory === 'ai' && renderAiSubsystem()}
            {activeCategory === 'live' && renderLiveSessions()}
            {activeCategory === 'security' && renderSecurity()}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
