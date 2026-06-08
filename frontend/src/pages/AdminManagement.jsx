import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Users, UserPlus, Lock, Mail, Activity, Trash2, Shield, Clock, CheckCircle, XCircle, Key, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('access');

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('sub_admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserRole = React.useMemo(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) return 'sub_admin';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'sub_admin';
    } catch(e) {
      return 'sub_admin';
    }
  }, []);

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

  const fetchAuditLogs = async () => {
    try {
      const token = sessionStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/audit-logs`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchAuditLogs();
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
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to add admin');
      }
      
      setSuccess('Admin successfully added!');
      setNewEmail('');
      setNewPassword('');
      setNewRole('sub_admin');
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
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      {/* Grant Access Form - Sticky Side Panel style */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sticky top-8">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-red-100">
            <UserPlus size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Grant Access</h2>
          <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">
            Invite a new administrator to the platform. They will have full access to view reports and manage settings.
          </p>
          
          <form onSubmit={handleAddAdmin} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-bold px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2">
                <Activity size={16} /> {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 text-emerald-600 text-sm font-bold px-4 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                <CheckCircle size={16} /> {success}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-sm font-bold text-slate-900 placeholder:font-medium"
                  placeholder="admin@sterling.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Secure Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-sm font-bold text-slate-900 placeholder:font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {currentUserRole === 'master_admin' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Admin Level</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Shield className="text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                  </div>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl pl-11 pr-4 py-3 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all font-medium appearance-none cursor-pointer"
                  >
                    <option value="sub_admin">Sub Admin</option>
                    <option value="master_admin">Master Admin</option>
                  </select>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Provisioning...' : 'Authorize Admin'}
            </button>
          </form>
        </div>
      </div>

      {/* List of Current Admins - Grid Layout */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-end justify-between px-2">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Administrators</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Manage personnel with system access.</p>
          </div>
          <div className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200">
            {admins.length} Users
          </div>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-3xl border border-slate-100 shadow-sm" />)}
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-bold">No administrators found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {admins.map((admin) => (
              <div key={admin.admin_id} className="relative bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group overflow-hidden flex flex-col justify-between min-h-[140px]">
                {/* Background decorative blob */}
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-red-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-red-600 font-black text-lg shadow-sm">
                      {admin.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border border-slate-200">
                        {admin.email === "sparkhire.sterling@gmail.com" ? "Master" : "Admin"}
                      </span>
                    </div>
                  </div>
                  
                  {admin.email !== "sparkhire.sterling@gmail.com" && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.admin_id)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                      title="Revoke Access"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="relative z-10 mt-4">
                  <p className="text-sm font-bold text-slate-900 truncate" title={admin.email}>{admin.email}</p>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                    Added • {new Date(admin.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderPermissionsTab = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Role Capabilities</h2>
        <p className="text-slate-500 mt-2 font-medium">Compare access levels across the platform tiers.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Sub-Admin Tier */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col">
          <div className="mb-8 relative z-10">
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">Standard Tier</span>
            <h3 className="text-3xl font-black text-slate-900 mt-4">Sub-Admin</h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">Perfect for daily recruiters and interview reviewers.</p>
          </div>
          
          <div className="space-y-4 flex-1 relative z-10">
            {[
              { cap: "View Dashboard & Metrics", has: true },
              { cap: "View Candidate Reports", has: true },
              { cap: "Create/Edit Job Roles & Questions", has: true },
              { cap: "System Purge & Reset", has: true },
              { cap: "Add/Remove Sub-Admins", has: true },
              { cap: "Add/Remove Master Admins", has: false },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 ${!item.has && 'opacity-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.has ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {item.has ? <CheckCircle size={14} /> : <XCircle size={14} />}
                </div>
                <span className={`text-sm font-bold ${item.has ? 'text-slate-700' : 'text-slate-400'}`}>{item.cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Master Admin Tier */}
        <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-[0_20px_40px_rgb(0,0,0,0.2)] relative overflow-hidden flex flex-col transform md:-translate-y-4">
          <div className="absolute top-0 right-0 p-32 bg-red-600/20 rounded-full blur-[80px]" />
          
          <div className="mb-8 relative z-10">
            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/20">God Mode</span>
            <h3 className="text-3xl font-black text-white mt-4">Master Admin</h3>
            <p className="text-sm text-slate-400 mt-2 font-medium">Full unhindered access to platform controls and security.</p>
          </div>
          
          <div className="space-y-4 flex-1 relative z-10">
            {[
              { cap: "View Dashboard & Metrics", has: true },
              { cap: "View Candidate Reports", has: true },
              { cap: "Create/Edit Job Roles & Questions", has: true },
              { cap: "System Purge & Reset", has: true },
              { cap: "Add/Remove Sub-Admins", has: true },
              { cap: "Add/Remove Master Admins", has: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-400">
                  <CheckCircle size={14} />
                </div>
                <span className="text-sm font-bold text-slate-200">{item.cap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const getActionIcon = (type) => {
    if (type.includes('GRANT')) return <UserPlus size={16} className="text-emerald-600" />;
    if (type.includes('REVOKE')) return <Trash2 size={16} className="text-red-600" />;
    if (type.includes('LOGIN')) return <Key size={16} className="text-blue-600" />;
    return <ShieldAlert size={16} className="text-purple-600" />;
  };

  const getActionColor = (type) => {
    if (type.includes('GRANT')) return 'bg-emerald-100 border-emerald-200';
    if (type.includes('REVOKE')) return 'bg-red-100 border-red-200';
    if (type.includes('LOGIN')) return 'bg-blue-100 border-blue-200';
    return 'bg-purple-100 border-purple-200';
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown Date';
    
    let date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      const cleanDate = String(dateString).replace(' ', 'T').substring(0, 19) + 'Z';
      date = new Date(cleanDate);
    }
    
    if (isNaN(date.getTime())) return `Invalid: ${dateString}`;

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
  };

  const renderAuditTab = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-end relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-purple-50 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security Timeline</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">A chronological feed of administrative events.</p>
          </div>
          <div className="relative z-10 hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Live Feed</span>
          </div>
        </div>

        <div className="p-8 relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-[51px] top-8 bottom-8 w-px bg-slate-200" />
          
          <div className="space-y-8 relative z-10">
            {auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold">No activity recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex gap-6 group">
                  {/* Icon Badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm z-10 ${getActionColor(log.action_type)} transition-transform group-hover:scale-110`}>
                    {getActionIcon(log.action_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm group-hover:shadow-md group-hover:border-slate-200 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.admin_email}</span>
                        <span className="text-slate-400 font-medium text-sm">performed</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
                          {log.action_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    {log.target && (
                      <div className="text-sm text-slate-600 font-medium">
                        Target: <span className="font-bold text-slate-800">{log.target}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const tabs = [
    { id: 'access', label: 'User Access', icon: Users },
    { id: 'permissions', label: 'Role Permissions', icon: Lock },
    { id: 'audit', label: 'Audit Timeline', icon: Activity }
  ];

  return (
    <div className="flex h-screen bg-[#fafafa] font-sans relative overflow-hidden">
      {/* Absolute Ambient Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-slate-100/80 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100 rounded-full blur-[100px] opacity-60 pointer-events-none" />
      
      <Sidebar />
      <main className="flex-1 p-8 md:p-12 overflow-y-auto z-10">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(220,38,38,0.3)]">
                <Shield size={32} />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin <span className="text-red-600">Management</span></h1>
                <p className="text-slate-500 mt-1 font-medium text-sm">Control platform personnel, permissions, and monitor security events.</p>
              </div>
            </div>
          </div>

          {/* iOS-Style Segmented Tabs using Framer Motion */}
          <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-max backdrop-blur-xl border border-slate-200 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors z-10 ${
                    isActive ? 'text-red-700' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="admin-active-tab"
                      className="absolute inset-0 bg-white rounded-xl shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-slate-100"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-2">
                    <Icon size={16} className={isActive ? "text-red-500" : ""} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Content Area */}
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
