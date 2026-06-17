const fs = require('fs');
const filePath = 'c:\\Users\\Niraj Singh\\OneDrive\\Documents\\Desktop\\Interview portal\\frontend\\src\\pages\\AdminPanel.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetStart = <AnimatePresence mode="wait">;
const targetEndStr =             ) : (
              /* Pipeline Dashboard Tab */
              <motion.div key="pipeline";

const replacement = <AnimatePresence mode="wait">
            {activeTab === 'company_context' && (
              <motion.div key="company_context" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                    <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200">
                      <FileText size={20} />
                    </div>
                    Global Context Intelligence Feed
                  </h3>
                  
                  <div className="flex gap-4 mb-8">
                    <textarea 
                      id="new-context-textarea"
                      rows={2} 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" 
                      placeholder="e.g. Sterling just launched an 800V battery platform. Weave this into the interview." 
                    />
                    <button 
                      onClick={() => {
                        const val = document.getElementById('new-context-textarea').value.trim();
                        if(val) {
                          const newContext = { id: Date.now().toString(), text: val, date: new Date().toISOString(), active: true, author: 'Admin' };
                          const updated = [newContext, ...companyContext];
                          handleSaveCompanyContext(updated);
                          document.getElementById('new-context-textarea').value = '';
                        }
                      }} 
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center shrink-0">
                      <Plus size={18} className="mr-2" /> Inject Context
                    </button>
                  </div>

                  <div className="space-y-4">
                    {companyContext.length === 0 ? (
                       <p className="text-slate-400 text-sm font-bold text-center py-10">No context injected yet.</p>
                    ) : companyContext.map((ctx) => (
                      <div key={ctx.id} className={\p-5 rounded-2xl border transition-all \\}>
                        <div className="flex justify-between items-start gap-4">
                           <div className="flex-1">
                             <p className="text-sm font-bold text-slate-800 leading-relaxed">{ctx.text}</p>
                             <div className="mt-2 text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-3">
                               <span>By {ctx.author}</span>
                               <span>{new Date(ctx.date).toLocaleString()}</span>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handleSaveCompanyContext(companyContext.map(c => c.id === ctx.id ? { ...c, active: !c.active } : c))}
                               className={\px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors \\}
                             >
                               {ctx.active ? 'Active' : 'Inactive'}
                             </button>
                             <button 
                               onClick={() => handleSaveCompanyContext(companyContext.filter(c => c.id !== ctx.id))}
                               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'role_architecture' && (
              <motion.div key="role_architecture" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                    <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                      <Settings2 size={20} />
                    </div>
                    Role & Persona Configuration
                  </h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Department</label>
                        <select value={roleConfigs.target_dept} onChange={handleTargetDeptChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-inner appearance-none cursor-pointer">
                          <option value="ALL">All Departments</option>
                          {Object.keys(companyStructure).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Role</label>
                        <select value={roleConfigs.job_role} onChange={e => {
                            const selectedRole = e.target.value;
                            setRoleConfigs({...roleConfigs, job_role: selectedRole});
                            setForm({...form, department: roleConfigs.target_dept === 'ALL' ? '' : roleConfigs.target_dept, role: selectedRole === 'ALL' ? '' : selectedRole});
                            if (selectedRole !== 'ALL') fetchPersonaForRole(selectedRole);
                        }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all shadow-inner appearance-none cursor-pointer">
                          <option value="ALL">All Roles</option>
                          {roleConfigs.target_dept !== 'ALL' && (companyStructure[roleConfigs.target_dept] || []).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                          {roleConfigs.target_dept === 'ALL' && Object.values(companyStructure).flat().map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mb-4">
                      <ManageableSelect 
                        label="AI Persona"
                        options={personas}
                        value={roleConfigs.persona}
                        onChange={e => setRoleConfigs({...roleConfigs, persona: e.target.value})}
                        onAdd={addPersona}
                        onDelete={deletePersona}
                      />
                    </div>
                    
                    {/* Sliders */}
                    <div className="pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Auto-Balancing Weights</label>
                        <span className={\	ext-xs font-black px-2 py-1 rounded-md tracking-wider \\}>
                          {currentTotalWeight}%
                        </span>
                      </div>
                      
                      <div className="space-y-6 mt-4">
                        {[
                          { label: 'Technical Skill', key: 'tech_weight' },
                          { label: 'Communication', key: 'comm_weight' },
                          { label: 'Emotional Intel (EQ)', key: 'eq_weight' },
                          { label: 'Confidence', key: 'conf_weight' }
                        ].map(s => (
                          <div key={s.key}>
                            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                              <span>{s.label}</span>
                              <span className="text-red-600">{roleConfigs[s.key]}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={roleConfigs[s.key]} onChange={e => handleWeightChange(s.key, e.target.value)} className="w-full accent-red-600" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveRoleConfig} 
                      disabled={currentTotalWeight !== 100}
                      className={\w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-6 \\}
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'question_bank' && (
              <motion.div key="question_bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                {/* Left Column: Bulk Import */}
                <div className="xl:col-span-1 space-y-6 sticky top-8">
                  {/* Bulk Import */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mr-4 border border-slate-200 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-100 transition-colors">
                        <UploadCloud size={20} />
                      </div>
                      Bulk Import
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">
                      Upload a CSV containing <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-bold border border-slate-200">dept, role, question, keywords, difficulty</span>. 
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
                      <button type="submit" disabled={!bulkFile || uploadingBulk} className={\w-full font-bold py-3 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 \\}>
                        {uploadingBulk ? 'Importing...' : 'Execute Import'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Question List & Add Form */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Add Form Horizontal */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-red-50 rounded-full blur-[80px] pointer-events-none" />
                    
                    <h3 className="relative z-10 text-xl font-extrabold text-slate-900 mb-6 flex items-center tracking-tight">
                      <div className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center mr-4 shadow-sm">
                        <Plus size={20} />
                      </div>
                      Append Evaluation Criteria
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ManageableSelect 
                          label="Department"
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
                          label="Job Role"
                          options={companyStructure[form.department] || []}
                          value={form.role}
                          onChange={e => setForm({...form, role: e.target.value})}
                          onAdd={addRole}
                          onDelete={deleteRole}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Question to Ask</label>
                        <textarea value={form.question} onChange={e => setForm({...form, question: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" placeholder="e.g. Explain how you would optimize..." />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Keywords (Comma separated)</label>
                          <textarea value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all resize-none shadow-inner" placeholder="e.g. Memory leak, Garbage collection..." />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Difficulty</label>
                          <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full h-[76px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-50 transition-all appearance-none shadow-inner cursor-pointer">
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
                      <button onClick={handleSeed} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors text-slate-700 shadow-sm">
                        <RefreshCw size={16} /> Seed Defaults
                      </button>
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
                        {questions
                          .filter(q => (roleConfigs.target_dept === 'ALL' || q.department === roleConfigs.target_dept) && (roleConfigs.job_role === 'ALL' || q.role === roleConfigs.job_role))
                          .map((q) => (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-red-300 hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="absolute left-0 top-0 w-1 h-full bg-slate-200 group-hover:bg-red-500 transition-colors" />
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-md">{q.department}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">{q.role}</span>
                                <span className={\	ext-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border \\}>{q.difficulty}</span>
                              </div>
                              <button onClick={() => handleDelete(q.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-100 opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <p className="text-slate-900 font-bold mb-4 text-base leading-snug">{q.question}</p>
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
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pipeline' && (
              /* Pipeline Dashboard Tab */
              <motion.div key="pipeline";

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEndStr, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('Error: Could not find target strings.');
} else {
  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex + targetEndStr.length);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Successfully replaced AdminPanel.jsx layout.');
}
