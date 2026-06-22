import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Users, XCircle, CheckCircle, Search, Mail, Filter, Clock } from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';

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
  const [listFilter, setListFilter] = useState('Pending'); // 'Pending', 'Confirmed', 'Canceled', 'Auto-Canceled'
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
      const data = await apiClient.adminGetCandidates();
      setCandidates(data);
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
      await apiClient.adminInviteCandidate({
        name, email, department_id: department, role_id: role
      });
      setToast({ type: 'success', message: 'Invitation sent successfully!' });
      setName(''); setEmail(''); setDepartment(''); setRole('');
      fetchCandidates();
      setActiveTab('list');
      setListFilter('Pending');
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (candidate_email, candidate_name, department_id, role_id) => {
    setLoading(true);
    try {
      await apiClient.adminResendInvite({ email: candidate_email, name: candidate_name, department_id, role_id });
      setToast({ type: 'success', message: 'Invitation resent successfully!' });
    } catch (e) {
      setToast({ type: 'error', message: e.message || 'An error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = candidates.filter(c => c.invitation_status === 'Pending').length;
  
  const filteredCandidates = candidates.filter(c => c.invitation_status === listFilter);

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar />
      <div className="flex-1 relative flex flex-col min-h-screen">
        {/* Red Gradient Banner - Fixed height & positioning to not cut off awkwardly */}
        <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-br from-red-600 via-red-800 to-black z-0"></div>
        <div className="absolute top-0 left-0 w-full h-[320px] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-0 mix-blend-overlay"></div>

        <div className="relative z-10 p-8 flex-1">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex items-center justify-between text-white mt-4">
              <div>
                <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                  <UserPlus className="text-red-300" size={36} /> Candidate Registration
                </h1>
                <p className="text-red-100/80 font-medium mt-2 text-lg">
                  Securely invite candidates and track registration status.
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('invite')}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'invite' 
                    ? 'bg-white text-red-600 shadow-xl scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'
                }`}
              >
                <UserPlus size={18} /> Invite Candidate
              </button>
              <button 
                onClick={() => setActiveTab('list')}
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all relative ${
                  activeTab === 'list' 
                    ? 'bg-white text-slate-800 shadow-xl scale-105' 
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'
                }`}
              >
                <Users size={18} /> Candidate List
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-md ring-2 ring-white">
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
                  className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100/50 relative overflow-hidden"
                >
                  {/* Decorative element */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-50 to-transparent rounded-bl-full z-0 opacity-50 pointer-events-none"></div>

                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                      <Mail size={24} className="text-red-500" /> Send Magic Invitation Link
                    </h2>
                    <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Doe" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-shadow" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@example.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-shadow" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                        <select value={department} onChange={e => setDepartment(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-shadow">
                          <option value="">Select Department...</option>
                          {Object.keys(DEFAULT_STRUCTURE).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Job Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} required disabled={!department} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50 transition-shadow">
                          <option value="">Select Role...</option>
                          {availableRoles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 pt-6 flex justify-end">
                        <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 flex items-center gap-2">
                          {loading ? 'Sending...' : <><Mail size={18} /> Send Invitation</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {activeTab === 'list' && (
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100/50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <Filter size={24} className="text-slate-500" /> Candidate List Overview
                    </h2>
                    
                    {/* Sub-Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                      {['Pending', 'Confirmed', 'Canceled', 'Auto-Canceled'].map((filterTab) => (
                        <button
                          key={filterTab}
                          onClick={() => setListFilter(filterTab)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            listFilter === filterTab 
                              ? 'bg-white text-slate-800 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                          }`}
                        >
                          {filterTab}
                          {filterTab === 'Pending' && pendingCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">
                              {pendingCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4 px-6">Candidate</th>
                          <th className="py-4 px-6">Role</th>
                          {(listFilter === 'Canceled' || listFilter === 'Auto-Canceled') ? (
                            <>
                              <th className="py-4 px-6">Reason</th>
                              <th className="py-4 px-6">Timestamp</th>
                            </>
                          ) : (
                            <th className="py-4 px-6">Status</th>
                          )}
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center">
                              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-slate-300">
                                <Clock size={32} />
                              </div>
                              <h3 className="text-lg font-bold text-slate-600">No {listFilter.toLowerCase()} candidates</h3>
                              <p className="text-slate-400">There are currently no candidates in this list.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredCandidates.map((cand) => (
                            <tr key={cand.candidate_id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-800">{cand.name}</div>
                                <div className="text-xs text-slate-500">{cand.email}</div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-sm font-semibold text-slate-700">{cand.role_id || 'N/A'}</div>
                                <div className="text-xs text-slate-400">{cand.department_id || 'N/A'}</div>
                              </td>
                              
                              {(listFilter === 'Canceled' || listFilter === 'Auto-Canceled') ? (
                                <>
                                  <td className="py-4 px-6 text-sm text-slate-600 max-w-[200px] truncate" title={cand.cancellation_reason || 'No reason provided'}>
                                    {cand.cancellation_reason || 'No reason provided'}
                                  </td>
                                  <td className="py-4 px-6 text-sm text-slate-500">
                                    {formatDate(cand.status_updated_at)}
                                  </td>
                                </>
                              ) : (
                                <td className="py-4 px-6">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                                    cand.invitation_status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    cand.invitation_status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    {cand.invitation_status}
                                  </span>
                                </td>
                              )}

                              <td className="py-4 px-6 text-right">
                                {cand.invitation_status === 'Pending' && (
                                  <button onClick={() => handleResend(cand.email, cand.name, cand.department_id, cand.role_id)} disabled={loading} className="text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                                    Resend Invite
                                  </button>
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
