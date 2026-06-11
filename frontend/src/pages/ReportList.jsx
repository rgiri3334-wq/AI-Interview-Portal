import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldOff } from 'lucide-react';
import Sidebar from '../components/Layout/Sidebar';
import { apiClient } from '../api/apiClient';

export default function ReportList() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const lbResponse = await apiClient.getLeaderboard();
        const lb = lbResponse.candidates || lbResponse || [];
        // Show EVERY session — completed, proctoring-terminated, and pending
        // Exclude sessions that have literally never started (no interview_id)
        const visible = lb.filter(c =>
          c.interview_id !== null ||
          c.interview_status === 'completed' ||
          c.termination_reason === 'PROCTORING_ACT' ||
          c.global_score > 0
        );
        setCandidates(visible);
      } catch (e) {
        console.error("fetchCandidates error:", e);
        setError("Failed to fetch candidates leaderboard: " + (e.message || String(e)));
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const filteredCandidates = candidates.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isProctoringAct = (c) => c.termination_reason === 'PROCTORING_ACT' || c.hiring_decision === 'PROCTORING_ACT';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Candidate <span className="text-red-700">Reports</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              All interviews — including proctoring-terminated sessions
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search candidates..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all w-72" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center font-bold">
            {error}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 rounded-xl text-center shadow-sm">
            <p className="text-slate-500 font-medium">No interview sessions found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredCandidates.map((cand, idx) => {
              const isProct = isProctoringAct(cand);
              return (
                <button
                  key={`${cand.id}-${cand.interview_id || idx}`}
                  onClick={() => navigate(`/report/${cand.id}`)}
                  className={`flex flex-col text-left p-6 rounded-2xl border bg-white transition-all group ${
                    isProct
                      ? 'border-red-300 hover:shadow-lg hover:border-red-500'
                      : 'border-slate-200 hover:border-red-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 w-full gap-2">
                    <span className="font-extrabold text-lg text-slate-900 truncate group-hover:text-red-700 transition-colors">
                      {cand.name}
                    </span>
                    {isProct ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <ShieldOff size={10} /> PROCTORING ACT
                      </span>
                    ) : cand.hiring_decision ? (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                        cand.hiring_decision === 'HIRED' || cand.hiring_decision === 'SHORTLISTED' ? 'bg-green-100 text-green-700' :
                        cand.hiring_decision === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {cand.hiring_decision}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 bg-yellow-100 text-yellow-700">
                        REVIEW
                      </span>
                    )}
                  </div>

                  {/* Attempt label + timestamp */}
                  {cand.attempt_label && cand.attempt_label !== 'Interview' && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      {cand.attempt_label}
                    </span>
                  )}

                  <div className="flex items-center justify-between w-full text-sm text-slate-500 font-medium mb-3">
                    <span className="truncate">{cand.job_role || 'Candidate'}</span>
                    {cand.session_timestamp && (
                      <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-2">{cand.session_timestamp}</span>
                    )}
                  </div>

                  {/* Proctoring ACT reason bar */}
                  {isProct && (
                    <div className="mb-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                      <ShieldOff size={12} className="text-red-500 shrink-0" />
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Interview terminated by proctoring system</p>
                    </div>
                  )}

                  <div className="mt-auto w-full flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Score</span>
                    <span className={`font-black text-lg ${
                      isProct ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {isProct ? 'F' : (cand.global_score > 0 ? `${cand.global_score}` : '-')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
