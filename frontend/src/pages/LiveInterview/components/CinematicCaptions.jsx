import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Split text into words for staggered animation
const AnimatedText = ({ text, className }) => {
  if (!text) return null;
  const words = text.split(' ');
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', damping: 15, stiffness: 400 },
    },
    hidden: {
      opacity: 0,
      y: 10,
      transition: { type: 'spring', damping: 15, stiffness: 400 },
    },
  };

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span variants={child} key={index} className="inline-block mr-2">
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
};

export default function CinematicCaptions({
  loading,
  loadingStatus,
  displayedQuestion,
  finalTranscript,
  interimTranscript,
  isListening,
  isSpeaking
}) {
  return (
    <div className="relative z-20 w-full px-12 pb-12 pt-40 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center pointer-events-none">
      
      {/* AI TTS Caption */}
      <AnimatePresence mode="wait">
        <motion.div
          key={loading ? 'loading' : displayedQuestion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="text-3xl md:text-4xl text-white font-bold leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,1)] text-center max-w-4xl mx-auto tracking-wide"
        >
          {loading ? loadingStatus : <AnimatedText text={displayedQuestion} />}
        </motion.div>
      </AnimatePresence>
      
      {/* Candidate SST Caption */}
      <div className="mt-8 text-center min-h-[40px] flex items-center justify-center max-w-3xl">
        <AnimatePresence>
          {finalTranscript && (
            <motion.span 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="text-green-400 font-bold text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] bg-black/80 border border-white/10 px-6 py-2 rounded-2xl shadow-2xl backdrop-blur-md"
            >
              {finalTranscript}
            </motion.span>
          )}
          {interimTranscript && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-400/60 italic text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,1)] bg-black/40 px-6 py-2 rounded-2xl ml-2"
            >
              {interimTranscript}
            </motion.span>
          )}
        </AnimatePresence>
        
        {!finalTranscript && !interimTranscript && !isListening && !isSpeaking && !loading && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/30 text-base font-bold tracking-widest uppercase bg-black/40 px-6 py-2 rounded-2xl border border-white/5"
          >
            Listening...
          </motion.span>
        )}
      </div>
    </div>
  );
}
