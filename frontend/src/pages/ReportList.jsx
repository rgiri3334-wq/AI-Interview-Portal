import PageWrapper from '../components/Layout/PageWrapper';
import { Award, Filter } from 'lucide-react';

export default function ReportList() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const lbResponse = await apiClient.getLeaderboard();
        const lb = lbResponse.candidates || lbResponse || [];
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

  const getScoreTier = (score, isProct) => {
    if (isProct) return { label: 'PROCT-FAIL', bg: 'bg-red-100 text-red-800 border-red-300' };
    if (score >= 90) return { label: 'TIER S', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (score >= 80) return { label: 'TIER A', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (score >= 70) return { label: 'TIER B', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'TIER C', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
  };

  const departments = ['ALL', 'Engineering', 'Customer Support', 'Finance', 'Human Resources', 'IT', 'Operations', 'Sales'];

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.job_role || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || (c.department || c.department_id || '').toLowerCase().includes(selectedDept.toLowerCase());
    return matchesSearch && matchesDept;
  });

  const isProctoringAct = (c) => c.termination_reason === 'PROCTORING_ACT' || c.hiring_decision === 'PROCTORING_ACT';

  return (
    <PageWrapper className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Candidate <span className="text-red-700">Reports</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              All interviews — categorized by AI Score Tiers &amp; Departments
            </p>
          </div>

          <div className="flex items-center gap-3">
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
        </div>

        {/* Quick Department Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {dept}
            </button>
          ))}
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
            <p className="text-slate-500 font-medium">No interview sessions found matching filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredCandidates.map((cand, idx) => {
              const isProct = isProctoringAct(cand);
              const tier = getScoreTier(cand.global_score || 0, isProct);

              return (
                <button
                  key={`${cand.id}-${cand.interview_id || idx}`}
                  onClick={() => navigate(`/report/${cand.id}`)}
                  className={`flex flex-col text-left p-6 rounded-3xl border bg-white transition-all group relative overflow-hidden ${
                    isProct
                      ? 'border-red-300 hover:shadow-xl hover:border-red-500'
                      : 'border-slate-200 hover:border-red-300 hover:shadow-xl'
                  }`}
                >
                  {/* Subtle top hover line accent */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-3 w-full gap-2">
                    <span className="font-extrabold text-lg text-slate-900 truncate group-hover:text-red-700 transition-colors">
                      {cand.name}
                    </span>

                    {/* Tier Badge */}
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 border ${tier.bg}`}>
                      {tier.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between w-full text-sm text-slate-500 font-medium mb-3">
                    <span className="truncate">{cand.job_role || 'Candidate'}</span>
                    {cand.session_timestamp && (
                      <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-2">{cand.session_timestamp}</span>
                    )}
                  </div>

                  {/* Proctoring ACT reason bar */}
                  {isProct && (
                    <div className="mb-3 px-3 py-2 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
                      <ShieldOff size={12} className="text-red-500 shrink-0" />
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Interview terminated by proctoring</p>
                    </div>
                  )}

                  <div className="mt-auto w-full flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Award size={14} className="text-red-500" /> Global Score
                    </span>
                    <span className={`font-black text-xl ${
                      isProct ? 'text-red-600' : 'text-slate-900'
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
    </PageWrapper>
  );
}
