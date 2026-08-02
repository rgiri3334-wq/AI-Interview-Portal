
import { motion } from 'framer-motion';
import { Mic, MicOff, Code2, Moon, Sun, PhoneOff, Video, VideoOff, Send } from 'lucide-react';

export default function BottomControlBar({
  isListening,
  micOn,
  toggleMic,
  camOn,
  toggleCam,
  theme,
  toggleTheme,
  isCodeOpen,
  toggleCode,
  endInterview,
  submitAnswer
}) {
  const isDark = theme === 'dark';

  const barClasses = isDark
    ? "bg-[#020617]/50 backdrop-blur-3xl border border-sky-500/20 shadow-[0_0_40px_rgba(14,165,233,0.15)]"
    : "bg-white/60 backdrop-blur-3xl border border-sky-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.1)]";

  const btnClasses = isDark
    ? "bg-[#0f172a]/80 hover:bg-sky-500/10 text-sky-100 border border-sky-500/30 hover:border-sky-400/50 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]"
    : "bg-white hover:bg-sky-50 text-slate-800 border-slate-200 shadow-sm";

  const activeBtnClasses = isDark
    ? "bg-sky-500/20 text-sky-300 border border-sky-400/60 shadow-[0_0_25px_rgba(14,165,233,0.5)]"
    : "bg-sky-50 text-sky-600 border-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.2)]";

  const errorBtnClasses = isDark
    ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
    : "bg-red-50 text-red-600 border-red-200 shadow-sm";

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
      className={`absolute bottom-36 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full border flex items-center gap-6 z-40 ${barClasses}`}
    >
      {/* Mic Status */}
      <div className="flex flex-col items-center gap-1 group relative">
        <button 
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${micOn ? btnClasses : errorBtnClasses}`}
        >
          {micOn ? <Mic size={20} className={isListening ? 'animate-pulse text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]' : ''} /> : <MicOff size={20} />}
        </button>
        <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Mic {micOn ? 'Active' : 'Muted'}
        </span>
      </div>

      {/* Cam Status */}
      <div className="flex flex-col items-center gap-1 group relative">
        <button 
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${camOn ? btnClasses : errorBtnClasses}`}
        >
          {camOn ? <Video size={20} className="text-blue-500" /> : <VideoOff size={20} />}
        </button>
        <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Camera {camOn ? 'Active' : 'Off'}
        </span>
      </div>

      <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>

      {/* Code Editor Toggle */}
      <div className="flex flex-col items-center gap-1 group relative">
        <button 
          onClick={toggleCode}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${isCodeOpen ? activeBtnClasses : btnClasses}`}
        >
          <Code2 size={20} />
        </button>
        <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {isCodeOpen ? 'Close Code' : 'Open Code'}
        </span>
      </div>

      {/* Theme Toggle */}
      <div className="flex flex-col items-center gap-1 group relative">
        <button 
          onClick={toggleTheme}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${btnClasses} overflow-hidden relative`}
        >
          <motion.div
            initial={false}
            animate={{ y: isDark ? 0 : 40, opacity: isDark ? 1 : 0 }}
            className="absolute"
          >
            <Moon size={20} />
          </motion.div>
          <motion.div
            initial={false}
            animate={{ y: isDark ? -40 : 0, opacity: isDark ? 0 : 1 }}
            className="absolute text-amber-500"
          >
            <Sun size={20} />
          </motion.div>
        </button>
        <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      </div>

      <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>

      {/* Submit Answer */}
      <div className="flex flex-col items-center gap-1 group relative">
        <button 
          onClick={submitAnswer}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.1)]'}`}
        >
          <Send size={18} className="ml-1" />
        </button>
        <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          Submit Answer
        </span>
      </div>

      <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>

      {/* End Interview */}
      <div className="flex flex-col items-center gap-1 group relative">
        <button 
          onClick={endInterview}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${errorBtnClasses} hover:bg-red-500 hover:text-white`}
        >
          <PhoneOff size={20} />
        </button>
        <span className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          End Interview
        </span>
      </div>
    </motion.div>
  );
}
