import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Activity, Server, Database, Cpu, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

const customFetch = (url, options = {}) => {
  const token = sessionStorage.getItem('adminToken');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
};

export default function SystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('api'); // 'api', 'database', 'ai', 'sessions'

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

  const renderChart = () => {
    if (!healthData?.telemetry) return null;

    const data = healthData.telemetry[activeTab];
    let dataKey1, dataKey2, color1, color2, name1, name2;

    switch (activeTab) {
      case 'api':
        dataKey1 = 'requests'; name1 = 'Requests/min'; color1 = '#3b82f6';
        dataKey2 = 'latency'; name2 = 'Latency (ms)'; color2 = '#93c5fd';
        break;
      case 'database':
        dataKey1 = 'queries'; name1 = 'Queries/min'; color1 = '#10b981';
        dataKey2 = 'latency'; name2 = 'Latency (ms)'; color2 = '#6ee7b7';
        break;
      case 'ai':
        dataKey1 = 'tokens'; name1 = 'Tokens Generated'; color1 = '#8b5cf6';
        dataKey2 = 'latency'; name2 = 'Latency (ms)'; color2 = '#c4b5fd';
        break;
      case 'sessions':
        dataKey1 = 'active'; name1 = 'Active Sessions'; color1 = '#f59e0b';
        dataKey2 = 'waiting'; name2 = 'Waiting in Queue'; color2 = '#fcd34d';
        break;
      default:
        return null;
    }

    return (
      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8"
      >
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800 capitalize">Live {activeTab} Telemetry</h3>
          <p className="text-sm text-slate-500">Real-time performance metrics over the last 20 minutes.</p>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="color1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color1} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color1} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="color2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color2} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color2} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey={dataKey1} name={name1} stroke={color1} strokeWidth={3} fillOpacity={1} fill="url(#color1)" />
              <Area type="monotone" dataKey={dataKey2} name={name2} stroke={color2} strokeWidth={3} fillOpacity={1} fill="url(#color2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
              <ShieldCheck size={14} /> Systems Operational
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              System <span className="text-emerald-600">Health</span>
            </h1>
            <p className="text-slate-500 mt-2">Real-time metrics and diagnostic information for the Spark-Hire platform.</p>
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

        {loading && !healthData ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => setActiveTab('api')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'api' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'api' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    <Server size={20} />
                  </div>
                  <h3 className="font-bold text-slate-700">API Status</h3>
                </div>
                <p className="text-2xl font-black text-slate-900">{healthData?.api_status || 'Online'}</p>
                <p className="text-xs text-slate-500 mt-1">Uptime: {healthData?.uptime || '99.9%'}</p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => setActiveTab('database')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} 
                className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'database' ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'database' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Database size={20} />
                  </div>
                  <h3 className="font-bold text-slate-700">Database</h3>
                </div>
                <p className="text-2xl font-black text-slate-900">{healthData?.db_status || 'Connected'}</p>
                <p className="text-xs text-slate-500 mt-1">Latency: {healthData?.db_latency || '12ms'}</p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => setActiveTab('ai')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} 
                className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'ai' ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'ai' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600'}`}>
                    <Cpu size={20} />
                  </div>
                  <h3 className="font-bold text-slate-700">AI Engine</h3>
                </div>
                <p className="text-2xl font-black text-slate-900">{healthData?.ai_engine || 'Operational'}</p>
                <p className="text-xs text-slate-500 mt-1">Load: {healthData?.ai_load || 'Normal'}</p>
              </motion.div>

              <motion.div 
                whileHover={{ y: -4 }}
                onClick={() => setActiveTab('sessions')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} 
                className={`p-6 rounded-2xl border cursor-pointer transition-all ${activeTab === 'sessions' ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'sessions' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
                    <Activity size={20} />
                  </div>
                  <h3 className="font-bold text-slate-700">Active Sessions</h3>
                </div>
                <p className="text-2xl font-black text-slate-900">{healthData?.active_sessions || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Candidates in progress</p>
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              {renderChart()}
            </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
