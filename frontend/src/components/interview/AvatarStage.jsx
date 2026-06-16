import React from 'react';
import { motion } from 'framer-motion';
import Avatar3D from '../Avatar3D';
import CaptionsOverlay from './CaptionsOverlay';

export default function AvatarStage({
  phase,
  qIndex,
  warnings,
  isSpeaking,
  isListening,
  loading,
  loadingStatus,
  displayedQuestion,
  finalTranscript,
  interimTranscript,
  theme,
  isCodeOpen
}) {
  const isDark = theme === 'dark';

  return (
    <motion.div
      layout
      className={`absolute inset-0 flex flex-col justify-center items-center overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-[#000000]' : 'bg-slate-50'
      }`}
    >
      {/* 3D Canvas Container */}
      <motion.div 
        layout
        className={`relative z-10 overflow-hidden shadow-2xl transition-colors duration-500 ${
          isDark ? 'border-red-500/20 shadow-[0_0_80px_rgba(220,38,38,0.05)]' : 'border-red-200 shadow-[0_0_80px_rgba(220,38,38,0.1)]'
        } ${isCodeOpen ? 'rounded-[40px] border' : ''}`}
        style={{
          width: isCodeOpen ? '90%' : '100%',
          height: isCodeOpen ? '85%' : '100%',
          maxWidth: isCodeOpen ? '1200px' : '100%',
        }}
        animate={{
          scale: isCodeOpen ? 0.95 : 1,
          x: isCodeOpen ? '-15%' : '0%', // Shift left when code drawer opens
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      >
        <Avatar3D 
          isSpeaking={isSpeaking} 
          isListening={isListening} 
          isLoading={loading} 
          phase={phase} 
          qIndex={qIndex} 
          warnings={warnings} 
        />
        
        {/* Dual-panel captions overlay the Avatar */}
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
    </motion.div>
  );
}
