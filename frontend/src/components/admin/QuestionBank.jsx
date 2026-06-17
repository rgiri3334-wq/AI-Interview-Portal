import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, UploadCloud, Plus, Trash2, Edit3, Save, X, 
  Sparkles, Tag, AlertOctagon 
} from 'lucide-react';
import { API_BASE, customFetch } from '../../config/api';

const ManageableSelect = ({ label, options, value, onChange, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const handleAdd = () => {
    if (newVal.trim()) {
      onAdd(newVal.trim());
      setNewVal("");
      setIsAdding(false);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</label>
      {isAdding ? (
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={newVal} 
            onChange={e => setNewVal(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500"
            placeholder={`New ${label}...`}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button type="button" onClick={handleAdd} className="bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">Add</button>
          <button type="button" onClick={() => setIsAdding(false)} className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select 
              value={value || ''} 
              onChange={onChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
            >
              <option value="" disabled>Select {label}</option>
              {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => setIsAdding(true)} className="bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">+</button>
          {value && (
            <button type="button" onClick={() => onDelete(value)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">-</button>
          )}
        </div>
      )}
    </div>
  );
};

export default function QuestionBank({
  questions, setQuestions, loading, 
  handleDelete, handleSeed,
  companyStructure, addDepartment, deleteDepartment,
  addRole, deleteRole, showToast, roleConfigs
}) {
  const [form, setForm] = useState({ department: '', role: '', question: '', keywords: '', difficulty: 'Medium', anti_patterns: '', category: 'Technical' });
  
  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // AI Gen state
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.department || !form.role || !form.question || !form.keywords) {
      showToast("Please fill all fields.", "error");
      return;
    }
    try {
      const res = await customFetch(`${API_BASE}/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const added = await res.json();
        setQuestions([...questions, { id: added.id || Date.now(), ...form }]);
        setForm({ ...form, question: '', keywords: '', anti_patterns: '' });
        showToast("Criteria Appended.");
      } else throw new Error();
    } catch {
      showToast("Failed to save.", "error");
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFile) return showToast("Select a CSV file first.", "error");
    setUploadingBulk(true);
    
    const formData = new FormData();
    formData.append('file', bulkFile);
    try {
      const res = await customFetch(`${API_BASE}/admin/questions/bulk`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Bulk upload failed");
      const data = await res.json();
      showToast(`Imported ${data.inserted} questions successfully!`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingBulk(false);
      setBulkFile(null);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditForm({ ...q, anti_patterns: q.anti_patterns || '', category: q.category || 'Technical' });
  };

  const saveEdit = async () => {
    try {
      const res = await customFetch(`${API_BASE}/admin/questions/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error();
      setQuestions(questions.map(q => q.id === editingId ? editForm : q));
      setEditingId(null);
      showToast("Updated successfully.");
    } catch {
      showToast("Failed to update.", "error");
    }
  };

  const handleAIGenerate = async () => {
    if (!form.role) return showToast("Select a role first.", "error");
    setIsGenerating(true);
    // Simulated API call for generative AI
    setTimeout(() => {
      const newGen = [
        { id: Date.now()+1, department: form.department, role: form.role, category: 'Technical', difficulty: 'Hard', question: `How would you architect a highly scalable microservice for ${form.role} dealing with 10k RPS?`, keywords: 'Load balancing, Caching, Redis, Kafka', anti_patterns: 'Monolith, synchronous blocking, single point of failure' },
        { id: Date.now()+2, department: form.department, role: form.role, category: 'Behavioral', difficulty: 'Medium', question: `Tell me about a time you had to push back on a product requirement because of technical debt.`, keywords: 'Communication, Trade-offs, Stakeholder management', anti_patterns: 'Ignored debt, aggressive behavior' }
      ];
      setQuestions([...newGen, ...questions]);
      setIsGenerating(false);
      showToast(`AI generated 2 questions for ${form.role}`);
    }, 2500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start max-w-[1400px] mx-auto">
      
      {/* Left Column: Form & Bulk Import */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Department & Role Manager (Restored) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
            <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200">
              <Database size={20} />
            </div>
            Manage Departments & Roles
          </h3>
          <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">
            Manage your departments and job roles here. You must create a Department and a Role before adding questions.
          </p>
          
          <div className="space-y-6">
            <ManageableSelect 
              label="Select / Add Department"
              options={Object.keys(companyStructure)}
              value={form.department}
              onChange={e => {
                const newDept = e.target.value;
                setForm({...form, department: newDept, role: companyStructure[newDept]?.[0] || ''});
              }}
              onAdd={addDepartment}
              onDelete={deleteDepartment}
            />
            <ManageableSelect 
              label="Select / Add Job Role"
              options={companyStructure[form.department] || []}
              value={form.role}
              onChange={e => setForm({...form, role: e.target.value})}
              onAdd={addRole}
              onDelete={deleteRole}
            />
          </div>
        </div>

        {/* Bulk Import */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
            <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
              <UploadCloud size={20} />
            </div>
            Bulk CSV Import
          </h3>
          <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">
            Upload a CSV containing <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold border border-slate-200">dept, role, question, keywords, difficulty, category</span>. 
          </p>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                  <p className="text-xs text-slate-600 font-bold">
                    {bulkFile ? bulkFile.name : "Click to select CSV"}
                  </p>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={e => setBulkFile(e.target.files[0])} />
              </label>
            </div>
            <button type="submit" disabled={!bulkFile || uploadingBulk} className={`w-full font-bold py-3 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${bulkFile ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              {uploadingBulk ? 'Importing...' : 'Execute Import'}
            </button>
          </form>
        </div>

        {/* AI Generator Button */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
           <div className="absolute -right-10 -top-10 w-32 h-32 bg-purple-500 rounded-full blur-[50px] opacity-40" />
           <h3 className="text-lg font-extrabold mb-2 flex items-center gap-2">
             <Sparkles size={18} className="text-purple-300" />
             AI Auto-Generator
           </h3>
           <p className="text-xs text-indigo-200 mb-6">Let Gemini analyze the target role and generate highly specific, difficult technical questions automatically.</p>
           
           <button 
             onClick={handleAIGenerate}
             disabled={isGenerating}
             className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
           >
             {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16} />}
             {isGenerating ? 'Synthesizing...' : 'Generate 5 Questions'}
           </button>
        </div>

      </div>

      {/* Right Column: Question List & Add Form */}
      <div className="xl:col-span-2 space-y-8">
        
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full flex flex-col relative overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-50 rounded-full blur-[100px] opacity-60 pointer-events-none" />
          
          <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight relative z-10">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mr-4 border border-red-100">
              <Plus size={20} />
            </div>
            Add Interview Question
          </h3>
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Department</label>
                <select 
                  value={form.department}
                  onChange={e => {
                    const newDept = e.target.value;
                    setForm({...form, department: newDept, role: companyStructure[newDept]?.[0] || ''});
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Department</option>
                  {Object.keys(companyStructure).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Job Role</label>
                <select 
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Role</option>
                  {(companyStructure[form.department] || []).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Question to Ask</label>
              <textarea value={form.question} onChange={e => setForm({...form, question: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 transition-all resize-none shadow-inner" placeholder="e.g. Explain how you would optimize..." />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Keywords (Comma separated)</label>
                <textarea value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 transition-all resize-none shadow-inner" placeholder="e.g. Memory leak, Garbage collection..." />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><AlertOctagon size={12}/> Red Flags / Anti-Patterns</label>
                <textarea value={form.anti_patterns} onChange={e => setForm({...form, anti_patterns: e.target.value})} rows={2} className="w-full bg-red-50/50 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium text-red-900 focus:outline-none focus:border-red-500 transition-all resize-none shadow-inner placeholder-red-300" placeholder="e.g. Uses var, monolithic approach..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer">
                  <option>Technical</option>
                  <option>Behavioral</option>
                  <option>System Design</option>
                  <option>Culture Fit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Difficulty</label>
                <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 transition-all appearance-none cursor-pointer">
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgb(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <Database size={18} /> Append to Database
            </button>
          </form>
        </div>

        {/* Rubric List */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-[500px]">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
                <Database size={20} />
              </div> 
              Rubrics for {roleConfigs.job_role === 'ALL' ? 'All Roles' : (roleConfigs.job_role || 'Selected Role')}
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
               <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="font-bold text-sm uppercase tracking-widest">Loading Schemas...</p>
            </div>
          ) : questions.filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role)).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              <Database size={56} className="mb-4 opacity-50 text-slate-300" />
              <p className="font-bold">No rubrics defined for {roleConfigs.job_role === 'ALL' ? 'these filters' : roleConfigs.job_role}.</p>
              <p className="text-sm mt-1">Add one above or seed defaults.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {questions
                  .filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role))
                  .map((q) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-red-300 hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1.5 h-full bg-slate-200 group-hover:bg-red-500 transition-colors" />
                    
                    {editingId === q.id ? (
                      // Inline Edit Mode
                      <div className="space-y-4 ml-2">
                        <textarea value={editForm.question} onChange={e=>setEditForm({...editForm, question: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-bold" rows={2}/>
                        <input value={editForm.keywords} onChange={e=>setEditForm({...editForm, keywords: e.target.value})} className="w-full p-2 border rounded-lg text-xs" placeholder="Keywords"/>
                        <input value={editForm.anti_patterns} onChange={e=>setEditForm({...editForm, anti_patterns: e.target.value})} className="w-full p-2 border rounded-lg text-xs bg-red-50" placeholder="Red Flags"/>
                        <div className="flex gap-2 justify-end">
                           <button onClick={()=>setEditingId(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
                           <button onClick={saveEdit} className="p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg"><Save size={16}/></button>
                        </div>
                      </div>
                    ) : (
                      // Display Mode
                      <>
                        <div className="flex justify-between items-start mb-3 ml-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{q.role}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md flex items-center gap-1"><Tag size={10}/> {q.category || 'Technical'}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                              q.difficulty === 'Hard' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                              q.difficulty === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>{q.difficulty}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(q)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => handleDelete(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-100">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-900 font-bold mb-4 text-base leading-snug ml-2">{q.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Required Concept Triggers</span>
                            <div className="flex flex-wrap gap-2">
                              {q.keywords.split(',').map((k, i) => (
                                <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                  {k.trim()}
                                </span>
                              ))}
                            </div>
                          </div>
                          {q.anti_patterns && (
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-2">Red Flags</span>
                              <p className="text-xs text-red-800 bg-red-50 border border-red-100 p-2 rounded-lg font-medium">{q.anti_patterns}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

