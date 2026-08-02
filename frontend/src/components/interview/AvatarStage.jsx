import React from 'react';
import { motion } from 'framer-motion';
import InterviewRobot from './InterviewRobot';
import Background from './Background';
import CaptionsOverlay from './CaptionsOverlay';

export default function AvatarStage({
  // eslint-disable-next-line no-unused-vars
  phase,
  // eslint-disable-next-line no-unused-vars
  qIndex,
  // eslint-disable-next-line no-unused-vars
  warnings,
  isSpeaking,
  isListening,
  loading,
  loadingStatus,
  displayedQuestion,
  finalTranscript,
  interimTranscript,
  theme,
  isCodeOpen,
  getAudioFrequency
}) {
  const isDark = theme === 'dark';

  return (
    <motion.div
      layout
      className={`absolute inset-0 flex flex-col justify-center items-center overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-[#000000]' : 'bg-slate-50'
      }`}
    >
      <Background theme={theme} />

      {/* Waveform Container */}
      <motion.div 
        layout
        className={`relative z-10 overflow-hidden shadow-2xl transition-colors duration-500 rounded-[40px] border ${
          isDark ? 'border-red-500/20 bg-black/40 backdrop-blur-md shadow-[0_0_80px_rgba(220,38,38,0.15)]' : 'border-red-300 bg-white/40 backdrop-blur-md shadow-[0_0_80px_rgba(220,38,38,0.15)]'
        }`}
        style={{
          width: isCodeOpen ? '85%' : '100%',
          height: isCodeOpen ? '85vh' : '100%',
          maxWidth: isCodeOpen ? '1000px' : '700px',
          maxHeight: isCodeOpen ? '100%' : '65vh',
          marginTop: isCodeOpen ? '0' : '-10vh' // Lift slightly up to leave room for captions below
        }}
        animate={{
          scale: isCodeOpen ? 0.95 : 1,
          x: isCodeOpen ? '-20%' : '0%', // Shift left when code drawer opens
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      >
        <InterviewRobot isSpeaking={isSpeaking} isListening={isListening} getAudioFrequency={getAudioFrequency} isCodeOpen={isCodeOpen} />
      </motion.div>

      {/* Dual-panel captions overlay the entire screen at the bottom */}
      <CaptionsOverlay 
        isSpeaking={isSpeaking}
        loading={loading}
        loadingStatus={loadingStatus}
        displayedQuestion={displayedQuestion}
        finalTranscript={finalTranscript}
        interimTranscript={interimTranscript}
        isListening={isListening}
        theme={theme}
      />
    </motion.div>
  );
}

// eslint-disable-next-line
console.log(typeof phase !== "undefined" ? phase : "");

// eslint-disable-next-line
console.log(typeof qIndex !== "undefined" ? qIndex : "");

// eslint-disable-next-line
console.log(typeof warnings !== "undefined" ? warnings : "");
