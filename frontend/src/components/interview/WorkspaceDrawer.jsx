import React, { Suspense } from 'react';
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
                ? 'bg-[#0f0f0f]/95 backdrop-blur-3xl border-red-500/20 shadow-[-20px_0_50px_rgba(220,38,38,0.1)]' 
                : 'bg-white/95 backdrop-blur-3xl border-red-200 shadow-[-20px_0_50px_rgba(220,38,38,0.1)]'
            } flex flex-col`}
          >
            {/* Header */}
            <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'border-white/10' : 'border-red-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-red-500/20 text-red-500' : 'bg-red-100 text-red-600'}`}>
                  <Code2 size={20} />
                </div>
                <div>
                  <h3 className={`font-bold text-lg tracking-wide ${isDark ? 'text-white' : 'text-black'}`}>Coding Workspace</h3>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-black/50'}`}>Live synchronized environment</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`text-sm font-semibold px-4 py-2 rounded-xl border outline-none cursor-pointer transition-colors ${
                    isDark 
                      ? 'bg-black/50 border-white/10 text-white hover:border-red-500/50 focus:border-red-500' 
                      : 'bg-slate-50 border-red-200 text-black hover:border-red-400 focus:border-red-500'
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
                  className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-red-50 text-slate-500 hover:text-red-600'}`}
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
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-bold uppercase tracking-widest">Loading Editor...</span>
                  </div>
                </div>
              }>
                {memoizedEditor}
              </Suspense>
            </div>

            {/* Action Bar (Run Code & Submit) */}
            <div className={`p-4 border-t flex justify-between items-center ${isDark ? 'border-white/10' : 'border-red-100'}`}>
              <button 
                onClick={runCode}
                disabled={loading}
                className={`text-sm font-bold tracking-wider uppercase px-6 py-2.5 rounded-xl transition-colors ${
                  isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-100 hover:bg-red-200 text-red-600'
                }`}
              >
                Run Code
              </button>
              
              <button
                onClick={handleSubmitAnswer}
                disabled={isSpeaking || loading}
                className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest px-8 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
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
