import React from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, TerminalSquare, PhoneOff } from 'lucide-react';

const springTransition = { type: 'spring', stiffness: 500, damping: 30 };

export default function FloatingToolbar({
  micOn, setMicOn,
  camOn, setCamOn,
  isCodeWorkspaceOpen, setIsCodeWorkspaceOpen,
  onEndInterview
}) {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springTransition}
      className="flex justify-center mt-2 z-50 relative"
    >
      <div className="bg-black/80 backdrop-blur-3xl border border-white/20 rounded-full px-6 py-3 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Mic Toggle */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          onClick={() => setMicOn(!micOn)} 
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border border-white/10 ${micOn ? 'bg-white hover:bg-gray-200 text-black' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </motion.button>
        
        {/* Camera Toggle */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          onClick={() => setCamOn(!camOn)} 
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-lg border border-white/10 ${camOn ? 'bg-white hover:bg-gray-200 text-black' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          title={camOn ? "Stop Video" : "Start Video"}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </motion.button>

        <div className="w-[1px] h-8 bg-white/20 mx-2"></div>

        {/* Code Workspace Toggle */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
          onClick={() => setIsCodeWorkspaceOpen(!isCodeWorkspaceOpen)} 
          className={`px-6 h-12 rounded-full flex items-center gap-2 font-bold tracking-wide transition-colors shadow-lg border border-white/10 ${isCodeWorkspaceOpen ? 'bg-white text-black' : 'bg-black text-white hover:bg-white/10'}`}
        >
          <TerminalSquare size={18} />
          {isCodeWorkspaceOpen ? 'Close Editor' : 'Open Editor'}
        </motion.button>

        <div className="w-[1px] h-8 bg-white/20 mx-2"></div>

        {/* End Interview */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={springTransition}
          onClick={onEndInterview} 
          className="px-6 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 font-bold tracking-wide transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500/50"
        >
          <PhoneOff size={18} />
          End
        </motion.button>
      </div>
    </motion.div>
  );
}
