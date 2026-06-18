import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
// Lazy-load Avatar3D so @react-three/* stays in its own async chunk
const Avatar3D = React.lazy(() => import('../Avatar3D'));
import Background from './Background';
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
      <Background theme={theme} />

      {/* 3D Canvas Container (Now a framed window in the center) */}
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
        <Suspense fallback={<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:'12px',background:'#000'}}>Booting 3D Engine...</div>}>
          <Avatar3D 
            isSpeaking={isSpeaking} 
            isListening={isListening} 
            isLoading={loading} 
            phase={phase} 
            qIndex={qIndex} 
            warnings={warnings} 
          />
        </Suspense>
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
