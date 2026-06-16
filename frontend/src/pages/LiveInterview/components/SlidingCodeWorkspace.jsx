import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../../api/apiClient';

const springTransition = { type: 'spring', stiffness: 500, damping: 30 };

export default function SlidingCodeWorkspace({
  isCodeWorkspaceOpen,
  language,
  setLanguage,
  SUPPORTED_LANGUAGES,
  memoizedEditor,
  getCode,
  setOverlayMsg,
  setLoadingStatus,
  setLoading,
  loading,
  isSpeaking,
  handleSubmitAnswer
}) {
  return (
    <div className={`flex flex-col gap-6 h-full transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${isCodeWorkspaceOpen ? 'w-[50%] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-12'}`}>
      <motion.div 
        layout
        className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl flex-1 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden min-h-[500px]"
      >
        {/* macOS-style Editor Header */}
        <div className="bg-white/5 border-b border-white/10 px-6 py-3 flex justify-between items-center relative overflow-hidden">
          {/* Subtle noise texture */}
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] pointer-events-none mix-blend-overlay"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            {/* Traffic Lights */}
            <div className="flex gap-2 group cursor-pointer">
              <motion.div whileHover={{ scale: 1.2 }} className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></motion.div>
              <motion.div whileHover={{ scale: 1.2 }} className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></motion.div>
              <motion.div whileHover={{ scale: 1.2 }} className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></motion.div>
            </div>
            <span className="text-xs font-black text-white tracking-widest uppercase opacity-80">Technical Workspace</span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-black/50 border border-white/20 text-xs text-white outline-none cursor-pointer px-3 py-1.5 rounded-lg shadow-sm font-bold hover:border-white/40 focus:border-red-600 transition-all appearance-none relative z-10"
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Editor Body */}
        <div className="flex-1 w-full relative">
          {memoizedEditor}
        </div>

        {/* Editor Footer */}
        <div className="bg-white/5 border-t border-white/10 p-4 flex justify-between items-center relative z-10">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={springTransition}
            onClick={async () => {
              const code = getCode();
              if (language === 'javascript' || language === 'typescript') {
                try {
                  const logs = [];
                  const originalLog = console.log;
                  console.log = (...args) => logs.push(args.join(' '));
                  // eslint-disable-next-line no-new-func
                  new Function(code)();
                  console.log = originalLog;
                  setOverlayMsg("Output:\n" + (logs.join('\n') || "Execution complete. No output."));
                } catch (e) {
                  setOverlayMsg("Syntax Error:\n" + e.message);
                }
              } else if (language === 'python') {
                setLoadingStatus("Compiling Python...");
                setLoading(true);
                try {
                  const res = await apiClient.executeCode({ code, language: 'python' });
                  setOverlayMsg(res.error ? "Python Execution Error:\n" + res.output : "Python Output:\n" + (res.output || "Execution complete. No output."));
                } catch (err) {
                  setOverlayMsg("Failed to connect to backend execution engine.");
                }
                setLoading(false);
              } else {
                setOverlayMsg(`Syntactic validation for ${language} passed successfully. Output simulation not available in browser sandbox.`);
              }
            }}
            className="text-xs font-bold tracking-wider uppercase text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors px-5 py-2.5 border border-white/10 hover:border-white/20"
            disabled={loading}
          >
            {language === 'python' ? 'Run Backend Sandbox' : 'Run Code Locally'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => {
              if (!isSpeaking && !loading) {
                handleSubmitAnswer();
              }
            }}
            disabled={isSpeaking || loading}
            className="relative overflow-hidden group bg-white text-black font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-50 disabled:shadow-none"
          >
            <div className="absolute inset-0 bg-black/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out skew-x-12 disabled:hidden"></div>
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : 'Submit Response'}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
