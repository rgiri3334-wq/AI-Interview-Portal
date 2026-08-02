import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, X } from 'lucide-react';
// NOTE: Monaco Editor is lazy-loaded in LiveInterview.jsx to prevent circular dep with @react-three/drei

export default function WorkspaceDrawer({
  isOpen,
  onClose,
  theme,
  language,
  setLanguage,
  memoizedEditor,
  runCode,
  handleSubmitAnswer,
  isSpeaking,
  loading
}) {
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 bottom-0 w-full max-w-[600px] z-50 border-l ${
              isDark 
                ? 'bg-[#020617]/50 backdrop-blur-3xl border-cyan-500/40 shadow-[-30px_0_80px_rgba(6,182,212,0.15)]' 
                : 'bg-white/60 backdrop-blur-3xl border-cyan-300 shadow-[-30px_0_80px_rgba(6,182,212,0.1)]'
            } flex flex-col`}
          >
            {/* Header */}
            <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'border-cyan-500/20' : 'border-cyan-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-600 border border-cyan-200'}`}>
                  <Code2 size={20} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg tracking-wide ${isDark ? 'text-cyan-50 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]' : 'text-slate-900'}`}>Holographic Workspace</h3>
                  <p className={`text-xs ${isDark ? 'text-cyan-400/60 font-semibold' : 'text-slate-500'}`}>Live synchronized environment</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`text-sm font-bold px-4 py-2 rounded-xl border outline-none cursor-pointer transition-all ${
                    isDark 
                      ? 'bg-[#0f172a]/80 border-cyan-500/30 text-cyan-100 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] focus:border-cyan-400' 
                      : 'bg-white border-cyan-200 text-slate-800 hover:border-cyan-300 focus:border-cyan-400 shadow-sm'
                  }`}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="sql">SQL</option>
                </select>
                <button 
                  onClick={onClose}
                  className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-cyan-500/20 text-cyan-500/50 hover:text-cyan-400' : 'hover:bg-cyan-50 text-slate-400 hover:text-cyan-600'}`}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 w-full relative">
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-black/50">
                  <div className="flex items-center gap-3 text-white/50">
                    <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-widest text-cyan-400">Loading Holographic Editor...</span>
                  </div>
                </div>
              }>
                {memoizedEditor}
              </Suspense>
            </div>

            {/* Action Bar (Run Code & Submit) */}
            <div className={`p-4 border-t flex justify-between items-center ${isDark ? 'border-cyan-500/20' : 'border-cyan-100'}`}>
              <button 
                onClick={runCode}
                disabled={loading}
                className={`text-sm font-bold tracking-wider uppercase px-6 py-2.5 rounded-xl transition-all ${
                  isDark ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-100 border border-cyan-500/30 hover:border-cyan-400/50' : 'bg-cyan-100/50 hover:bg-cyan-200 text-cyan-600'
                }`}
              >
                Run Code
              </button>
              
              <button
                onClick={handleSubmitAnswer}
                disabled={isSpeaking || loading}
                className={`font-bold uppercase tracking-widest px-8 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 ${
                  isDark ? 'bg-cyan-600/80 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/50' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {loading ? 'Analyzing...' : 'Submit'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
