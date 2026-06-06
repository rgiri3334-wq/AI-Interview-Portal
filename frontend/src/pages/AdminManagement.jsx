import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Users, UserPlus, Lock, Mail, Activity, Trash2, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('access');

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch admins');
      const data = await res.json();
      setAdmins(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    
    try {
      const token = sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: newEmail, password: newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to add admin');
      }
      
      setSuccess('Admin successfully added!');
      setNewEmail('');
      setNewPassword('');
      fetchAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (admin_id) => {
    if (!window.confirm("Are you sure you want to remove this admin?")) return;
    setError(null);
    setSuccess(null);
    try {
      const token = sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/users/${admin_id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to remove admin');
      setSuccess('Admin successfully removed!');
      fetchAdmins();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderAccessTab = () => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-8"
    >
      {/* Add New Admin Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
            <UserPlus size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Grant Admin Access</h2>
        </div>
        
        <form onSubmit={handleAddAdmin} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <Activity size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 text-sm font-medium p-3 rounded-xl border border-green-100">
              {success}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium text-slate-900"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium text-slate-900"
                placeholder="••••••••"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Password must be at least 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Processing...' : 'Grant Access'}
          </button>
        </form>
      </div>

      {/* List of Current Admins */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 text-slate-700 rounded-lg border border-slate-200">
              <Users size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Current Admins</h2>
          </div>
          <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg">
            {admins.length} Users
          </div>
        </div>
        
        <div className="flex-1 overflow-auto pr-2 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500 font-medium text-sm animate-pulse">Loading admins...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-medium text-sm">No admins found</div>
          ) : (
            admins.map((admin) => (
              <div key={admin.admin_id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between group hover:border-slate-200 transition-all">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-red-600 font-bold text-sm shrink-0 shadow-sm">
                    {admin.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-900 truncate">{admin.email}</p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 tracking-wide">
                      Added: {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {admin.email !== "sparkhire.sterling@gmail.com" && (
                  <button
                    onClick={() => handleRemoveAdmin(admin.admin_id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Admin"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderPermissionsTab = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield size={20} className="text-blue-500"/> Role Permissions Matrix
          </h2>
          <p className="text-sm text-slate-500 mt-1">Review system capabilities assigned to different administrative tiers.</p>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">
              <th className="p-4 w-1/2">Capability</th>
              <th className="p-4 text-center">Master Admin</th>
              <th className="p-4 text-center">Sub-Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { cap: "View Dashboard & Metrics", master: true, sub: true },
              { cap: "View Candidate Reports", master: true, sub: true },
              { cap: "Export System Telemetry", master: true, sub: true },
              { cap: "Create/Edit Job Roles", master: true, sub: false },
              { cap: "Grant/Revoke Admin Access", master: true, sub: false },
              { cap: "System Purge & Reset", master: true, sub: false },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-sm font-semibold text-slate-700">{row.cap}</td>
                <td className="p-4 text-center">
                  {row.master ? <CheckCircle className="mx-auto text-green-500" size={18}/> : <XCircle className="mx-auto text-red-500" size={18}/>}
                </td>
                <td className="p-4 text-center">
                  {row.sub ? <CheckCircle className="mx-auto text-green-500" size={18}/> : <XCircle className="mx-auto text-slate-300" size={18}/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  const renderAuditTab = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-purple-500"/> Admin Activity Log
            </h2>
            <p className="text-sm text-slate-500 mt-1">Recent administrative actions performed on the platform.</p>
          </div>
          <span className="text-xs font-bold bg-purple-50 text-purple-600 px-3 py-1 rounded-full border border-purple-100">Tracking Active</span>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Admin</th>
              <th className="p-4">Action</th>
              <th className="p-4">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-sm text-slate-500 font-medium">Just now</td>
              <td className="p-4 text-sm font-bold text-slate-800">sparkhire.sterling@gmail.com</td>
              <td className="p-4"><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">VIEW_TELEMETRY</span></td>
              <td className="p-4 text-sm text-slate-500">System Health Dashboard</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-sm text-slate-500 font-medium">2 hours ago</td>
              <td className="p-4 text-sm font-bold text-slate-800">sparkhire.sterling@gmail.com</td>
              <td className="p-4"><span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md">GRANT_ACCESS</span></td>
              <td className="p-4 text-sm text-slate-500">new.hr@example.com</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-sm text-slate-500 font-medium">1 day ago</td>
              <td className="p-4 text-sm font-bold text-slate-800">sparkhire.sterling@gmail.com</td>
              <td className="p-4"><span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md">GENERATE_REPORT</span></td>
              <td className="p-4 text-sm text-slate-500">Candidate CAN0021</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Management</h1>
              <p className="text-slate-500 mt-1 font-medium text-sm">Manage system administrators, roles, and review audit logs</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-sm w-max">
            <button 
              onClick={() => setActiveTab('access')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'access' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Users size={16}/> User Access
            </button>
            <button 
              onClick={() => setActiveTab('permissions')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'permissions' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Lock size={16}/> Role Permissions
            </button>
            <button 
              onClick={() => setActiveTab('audit')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'audit' ? 'bg-red-50 text-red-600' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Activity size={16}/> Audit Logs
            </button>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {activeTab === 'access' && renderAccessTab()}
            {activeTab === 'permissions' && renderPermissionsTab()}
            {activeTab === 'audit' && renderAuditTab()}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
