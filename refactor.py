import os

file_path = 'frontend/src/pages/Report.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Split the content
imports_and_utils = content.split('export default function Report() {')[0]
component_body = content.split('export default function Report() {')[1]

# We need to extract the parts of the component body
# The end of early returns is right before `const c = report.candidate;`
rest_of_body = component_body.split('const c = report.candidate;')[1]

# The handleExport is inside rest_of_body. 
# The return ( is at the end of handleExport
export_func_end = rest_of_body.split('return (')[0]
jsx_return = rest_of_body.split('return (')[1]

# The jsx_return has `<div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">`
# and ends with `);`
# We just need the inner content inside `<main className="flex-1 p-8 overflow-y-auto">`
main_content = jsx_return.split('<main className="flex-1 p-8 overflow-y-auto">')[1].rsplit('</main>', 1)[0]

new_component_body = """export default function Report() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [activeTabId, setActiveTabId] = useState(localStorage.getItem('candidate_id'));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const lb = await apiClient.getLeaderboard();
        const completed = lb.filter(c => c.interview_status === 'completed' || c.global_score > 0);
        setCandidates(completed);
        
        if (completed.length > 0) {
          const storedId = localStorage.getItem('candidate_id');
          if (!storedId || !completed.find(c => c.id === storedId)) {
            setActiveTabId(completed[0].id);
          } else {
            setActiveTabId(storedId);
          }
        } else {
          setLoading(false);
          setError("No candidates have completed their interviews yet.");
        }
      } catch (e) {
        setError("Failed to fetch candidates leaderboard.");
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!activeTabId) return;
      setLoading(true);
      setError(null);
      try {
        const r = await apiClient.getCandidateReport(activeTabId);
        if (!r || !r.candidate) throw new Error("Invalid report data");
        setReport(r);
        localStorage.setItem('candidate_id', activeTabId);
      } catch (e) {
        setError("Failed to retrieve report for this candidate.");
      }
      setLoading(false);
    };
    fetchReport();
  }, [activeTabId]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 font-bold tracking-wide uppercase">Compiling AI Analytics...</p>
          </div>
        </div>
      );
    }

    if (error || !report) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
          <AlertCircle size={48} className="text-red-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Unavailable</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">{error || "Could not load report."}</p>
          {candidates.length === 0 && (
            <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 mx-auto">
              Return to Dashboard
            </button>
          )}
        </div>
      );
    }

    const c = report.candidate;
    const iv = report.interview;
    const radarData = radarFromReport(iv);
""" + export_func_end + """
    return (
      <div className="p-8">
""" + main_content + """
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Candidate Tabs Navigation */}
        <div className="bg-white border-b border-slate-200 px-8 flex gap-8 overflow-x-auto shrink-0 z-10 shadow-sm">
          {candidates.map(cand => (
            <button
              key={cand.id}
              onClick={() => setActiveTabId(cand.id)}
              className={`py-4 px-2 whitespace-nowrap text-sm font-extrabold tracking-tight border-b-2 transition-colors relative ${
                activeTabId === cand.id 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {cand.name}
              {activeTabId === cand.id && (
                <motion.div layoutId="activeTab" className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-red-600" />
              )}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(imports_and_utils + new_component_body)
print("Updated successfully")
