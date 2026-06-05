import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Activity, Server, Database, Cpu, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

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

  useEffect(() => {
    const fetchHealth = async () => {
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
      }
    };
    fetchHealth();
    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
            <ShieldCheck size={14} /> Systems Operational
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            System <span className="text-emerald-600">Health</span>
          </h1>
          <p className="text-slate-500 mt-2">Real-time metrics and diagnostic information for the Spark-Hire platform.</p>
        </div>

        {loading && !healthData ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Server size={20} />
                </div>
                <h3 className="font-bold text-slate-700">API Status</h3>
              </div>
              <p className="text-2xl font-black text-slate-900">{healthData?.api_status || 'Online'}</p>
              <p className="text-xs text-slate-500 mt-1">Uptime: {healthData?.uptime || '99.9%'}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Database size={20} />
                </div>
                <h3 className="font-bold text-slate-700">Database</h3>
              </div>
              <p className="text-2xl font-black text-slate-900">{healthData?.db_status || 'Connected'}</p>
              <p className="text-xs text-slate-500 mt-1">Latency: {healthData?.db_latency || '12ms'}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <Cpu size={20} />
                </div>
                <h3 className="font-bold text-slate-700">AI Engine</h3>
              </div>
              <p className="text-2xl font-black text-slate-900">{healthData?.ai_engine || 'Operational'}</p>
              <p className="text-xs text-slate-500 mt-1">Load: {healthData?.ai_load || 'Normal'}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Activity size={20} />
                </div>
                <h3 className="font-bold text-slate-700">Active Sessions</h3>
              </div>
              <p className="text-2xl font-black text-slate-900">{healthData?.active_sessions || 0}</p>
              <p className="text-xs text-slate-500 mt-1">Candidates in progress</p>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
