import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const springTransition = { type: 'spring', stiffness: 500, damping: 30 };

export default function DraggablePipCamera({
  memoizedVideo,
  camOn,
  camError,
  micOn,
  setMicOn,
  setCamOn,
  isListening
}) {
  return (
    <motion.div 
      drag 
      dragConstraints={{ left: -800, right: 0, top: 0, bottom: 600 }}
      dragElastic={0.1}
      dragMomentum={false}
      whileHover={{ scale: 1.02 }}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      transition={springTransition}
      className={`absolute top-5 right-5 z-40 w-64 h-40 bg-black/90 backdrop-blur-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] cursor-grab group transition-colors overflow-visible
        ${(micOn && isListening) ? 'border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'border border-white/20 hover:border-white/40'}
      `}
    >
      {/* Audio Reactive Border Pulse */}
      <AnimatePresence>
        {micOn && isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-[-4px] border-2 border-red-500 rounded-[18px] animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none opacity-20"
          ></motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-zinc-900">
        {memoizedVideo}
        {(!camOn || camError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-white/50 text-xs font-bold uppercase tracking-widest">
            Camera Offline
          </div>
        )}
      </div>

      {/* Hover Controls */}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 to-transparent flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); setMicOn(!micOn); }} 
          className={`p-2.5 rounded-full transition-colors shadow-lg ${micOn ? 'bg-white text-black' : 'bg-red-600 text-white'}`} 
          title={micOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {micOn ? '🎙️' : '🔇'}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); setCamOn(!camOn); }} 
          className={`p-2.5 rounded-full transition-colors shadow-lg ${camOn ? 'bg-white text-black' : 'bg-red-600 text-white'}`} 
          title={camOn ? "Stop Video" : "Start Video"}
        >
          {camOn ? '📹' : '📵'}
        </motion.button>
      </div>
      
      {/* Small internal audio visualizer */}
      {micOn && isListening && (
        <div className="absolute bottom-3 right-3 flex gap-0.5 items-end h-3 opacity-90 z-10 pointer-events-none">
          <div className="w-1 bg-red-500 rounded-t h-1 animate-[bounce_1s_ease-in-out_infinite]"></div>
          <div className="w-1 bg-red-500 rounded-t h-2 animate-[bounce_1s_ease-in-out_infinite_0.2s]"></div>
          <div className="w-1 bg-red-500 rounded-t h-3 animate-[bounce_1s_ease-in-out_infinite_0.4s]"></div>
        </div>
      )}
    </motion.div>
  );
}
