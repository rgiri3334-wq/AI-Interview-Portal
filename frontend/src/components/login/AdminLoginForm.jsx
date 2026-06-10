import React from 'react';
import { motion } from 'framer-motion';

export default function AdminLoginForm({ email, setEmail, password, setPassword, error, loading, handleLogin }) {
  const inputVariants = {
    initial: { borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
    focus: { borderBottomColor: '#EF4444', backgroundColor: '#FEF2F2', transition: { duration: 0.3 } },
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
    >
      <div className="relative z-10 p-8 sm:p-12 bg-white/80 backdrop-blur-2xl rounded-3xl border border-red-100 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.3)]">
        <div className="mb-10 text-center">
          <motion.h3 
            className="text-4xl font-black text-slate-900 tracking-tighter mb-3 relative inline-block"
            whileHover={{ scale: 1.02 }}
          >
            Admin <span className="text-red-500">Portal</span>
            <motion.div 
              className="absolute -bottom-2 left-0 h-1 bg-red-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.6, duration: 0.8, ease: "circOut" }}
            />
          </motion.h3>
          <p className="text-slate-500 font-medium">Securely access your dashboard.</p>
        </div>

        <form className="space-y-8" onSubmit={handleLogin}>
          <div className="flex flex-col text-left group">
            <label className="text-slate-500 font-bold text-sm mb-2 px-1 transition-colors group-focus-within:text-red-500">
              Corporate Email
            </label>
            <div className="relative">
              <motion.input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 border-b-2 border-slate-200 bg-slate-50/50 text-slate-900 font-bold focus:outline-none"
                placeholder="Enter your email"
                variants={inputVariants}
                initial="initial"
                whileFocus="focus"
              />
              <motion.div 
                className="absolute bottom-0 left-0 h-[2px] bg-red-500 origin-left"
                initial={{ scaleX: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scaleX: 1 }}
              />
            </div>
          </div>

          <div className="flex flex-col text-left group">
            <label className="text-slate-500 font-bold text-sm mb-2 px-1 transition-colors group-focus-within:text-red-500">
              Password
            </label>
            <div className="relative">
              <motion.input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border-b-2 border-slate-200 bg-slate-50/50 text-slate-900 font-bold focus:outline-none"
                placeholder="Enter password"
                variants={inputVariants}
                initial="initial"
                whileFocus="focus"
              />
              <motion.div 
                className="absolute bottom-0 left-0 h-[2px] bg-red-500 origin-left"
                initial={{ scaleX: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ scaleX: 1 }}
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border-l-4 border-red-500 font-bold flex items-center gap-3 shadow-inner"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            className="relative w-full group overflow-hidden py-4 px-6 rounded-xl font-bold text-lg text-white bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_-10px_rgba(239,68,68,0.8)]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Authenticate Access'}
            </span>
            <div className="absolute inset-0 h-full w-0 bg-red-600 transition-all duration-300 ease-out group-hover:w-full z-0"></div>
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
