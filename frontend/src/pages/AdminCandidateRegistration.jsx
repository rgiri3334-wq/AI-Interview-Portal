import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Clock, XCircle, CheckCircle, Search, Mail, Building, Briefcase } from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEFAULT_STRUCTURE = {
  "Customer Support": ["Customer Success Manager"],
  "Engineering": ["Embedded Systems Engineer", "BMS Engineer", "Motor Control Engineer", "Power Electronics Engineer", "Software Engineer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Data Scientist", "AI/ML Engineer"],
  "Finance": ["Financial Analyst", "Accounts Manager"],
  "Human Resources": ["HR Specialist", "Talent Acquisition Specialist", "HR Manager", "Learning and Development Specialist", "Payroll Specialist"],
  "IT": ["Cybersecurity Analyst", "System Administrator"],
  "Marketing": ["Marketing Specialist", "Brand Manager"],
  "Operations": ["Operations Manager", "Supply Chain Analyst"],
  "Sales": ["Sales Executive", "Sales Manager"]
};

export default function AdminCandidateRegistration() {
  const [activeTab, setActiveTab] = useState('invite');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');

  const availableRoles = department ? DEFAULT_STRUCTURE[department] || [] : [];

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/candidates`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!name || !email || !department || !role) {
      setToast({ type: 'error', message: 'Please fill in all fields.' });
      return;
    }
    setLoading(true);
    try {
      // In a real scenario, map department/role to actual IDs or adjust backend
      const res = await fetch(`${API_BASE}/api/admin/candidates/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          name, email, department_id: department, role_id: role
        })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', message: 'Invitation sent successfully!' });
        setName(''); setEmail(''); setDepartment(''); setRole('');
        fetchCandidates();
        setActiveTab('queue');
      } else {
        setToast({ type: 'error', message: data.detail || 'Failed to send invite.' });
      }
    } catch (e) {
      setToast({ type: 'error', message: 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (candidate_email, candidate_name, department_id, role_id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/candidates/invite/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ email: candidate_email, name: candidate_name, department_id, role_id })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', message: 'Invitation resent successfully!' });
      } else {
        setToast({ type: 'error', message: data.detail || 'Failed to resend invite.' });
      }
    } catch (e) {
      setToast({ type: 'error', message: 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = candidates.filter(c => c.invitation_status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar />
      <div className="flex-1 ml-64 overflow-hidden relative flex flex-col">
        {/* Red Gradient Banner */}
        <div className="h-64 bg-gradient-to-br from-red-600 via-red-800 to-black absolute top-0 left-0 w-full z-0 opacity-90"></div>
        <div className="absolute top-0 left-0 w-full h-64 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-0 mix-blend-overlay"></div>

        <div className="relative z-10 p-8 flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between text-white mb-8">
              <div>
                <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                  <UserPlus className="text-red-300" size={36} /> Candidate Registration
                </h1>
                <p className="text-red-100/80 font-medium mt-2">
                  Securely invite candidates and track registration status.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setActiveTab('invite')}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'invite' 
                    ? 'bg-white text-red-600 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
                }`}
              >
                <UserPlus size={18} /> Invite Candidate
              </button>
              <button 
                onClick={() => setActiveTab('queue')}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all relative ${
                  activeTab === 'queue' 
                    ? 'bg-white text-slate-800 shadow-lg' 
                    : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-md'
                }`}
              >
                <Clock size={18} /> Registration Queue
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm ring-2 ring-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'invite' && (
                <motion.div 
                  key="invite"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
                >
                  <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Mail size={20} className="text-red-500" /> Send Magic Invitation Link
                  </h2>
                  <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@example.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                      <select value={department} onChange={e => setDepartment(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none">
                        <option value="">Select Department...</option>
                        {Object.keys(DEFAULT_STRUCTURE).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Job Role</label>
                      <select value={role} onChange={e => setRole(e.target.value)} required disabled={!department} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50">
                        <option value="">Select Role...</option>
                        {availableRoles.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-slate-100 flex justify-end">
                      <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? 'Sending...' : <><Mail size={18} /> Send Invitation</>}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeTab === 'queue' && (
                <motion.div 
                  key="queue"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={20} className="text-slate-500" /> Pending & Past Invitations
                    </h2>
                    <button onClick={fetchCandidates} className="text-slate-500 hover:text-slate-800">
                      <Search size={18} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-sm font-bold uppercase tracking-wider">
                          <th className="py-3 pr-4">Candidate</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {candidates.filter(c => c.invitation_status).length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-slate-400">No invitations found.</td>
                          </tr>
                        ) : (
                          candidates.filter(c => c.invitation_status).map((cand) => (
                            <tr key={cand.candidate_id} className="hover:bg-slate-50">
                              <td className="py-4 pr-4">
                                <div className="font-bold text-slate-800">{cand.name}</div>
                                <div className="text-xs text-slate-500">{cand.email}</div>
                              </td>
                              <td className="py-4 px-4 text-sm font-medium text-slate-600">
                                {cand.role_id || 'N/A'} <br />
                                <span className="text-xs text-slate-400">{cand.department_id || 'N/A'}</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                  cand.invitation_status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                  cand.invitation_status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {cand.invitation_status}
                                </span>
                              </td>
                              <td className="py-4 pl-4 text-right">
                                {cand.invitation_status === 'Pending' && (
                                  <button onClick={() => handleResend(cand.email, cand.name, cand.department_id, cand.role_id)} disabled={loading} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50">Resend</button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 z-50 ${
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            {toast.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} className="text-green-400" />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100"><XCircle size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
