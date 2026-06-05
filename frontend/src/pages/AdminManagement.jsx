import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import { Users, UserPlus, Lock, Mail, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
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

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Users size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Management</h1>
              <p className="text-slate-500 mt-1 font-medium text-sm">Manage system administrators and platform access</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Add New Admin Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
            >
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
            </motion.div>

            {/* List of Current Admins */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col"
            >
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
                    </div>
                  ))
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
