import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar3D from '../../../components/Avatar3D';
import CinematicCaptions from './CinematicCaptions';
import DraggablePipCamera from './DraggablePipCamera';

export default function CinematicAvatar({
  isSpeaking,
  isListening,
  loading,
  loadingStatus,
  phase,
  qIndex,
  warnings,
  getAudioFrequency,
  postureHint,
  isRecording,
  displayedQuestion,
  finalTranscript,
  interimTranscript,
  MAX_QUESTIONS,
  memoizedVideo,
  camOn,
  camError,
  micOn,
  setMicOn,
  setCamOn,
  textFallback,
  setTextFallback,
  handleSubmitAnswer
}) {
  // Determine dynamic glow colors based on state
  const glowColor = isSpeaking 
    ? 'rgba(239, 68, 68, 0.2)' // Red for speaking
    : isListening 
      ? 'rgba(255, 255, 255, 0.1)' // White for listening
      : 'rgba(0, 0, 0, 0.5)'; // Dark for idle

  const borderColor = isSpeaking 
    ? 'border-red-500/30' 
    : isListening 
      ? 'border-white/20' 
      : 'border-white/5';

  return (
    <div className={`relative bg-black rounded-3xl overflow-hidden shadow-[0_0_80px_var(--glow)] flex-1 min-h-[500px] flex flex-col justify-end group transition-all duration-700 ${borderColor} border`} style={{ '--glow': glowColor }}>
      
      {/* Background Cinematic Grain */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] pointer-events-none mix-blend-overlay z-0"></div>

      {/* The AI Avatar taking full width/height */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-zinc-900 to-black z-10">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.95 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-full h-full"
        >
          <Avatar3D
            getAudioFrequency={getAudioFrequency}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isLoading={loading}
            phase={phase}
            qIndex={qIndex}
            warnings={warnings}
          />
        </motion.div>
      </div>

      {/* Status Overlay (Top Left) */}
      <div className="absolute top-6 left-6 z-30 flex gap-3 items-center">
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-red-600/90 backdrop-blur-md text-white text-xs font-black tracking-widest px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-red-500/50"
          >
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
            REC
          </motion.div>
        )}
        {loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-black/60 backdrop-blur-md text-white text-xs font-bold tracking-widest px-4 py-2 rounded-full border border-white/10 flex items-center gap-2"
          >
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {loadingStatus}
          </motion.div>
        )}
        {isSpeaking && !loading && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-red-600/80 backdrop-blur-md text-white text-xs font-black tracking-widest px-4 py-2 rounded-full border border-red-500/50 flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
          >
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-1 bg-white h-1 animate-[pulse_1s_ease-in-out_infinite]"></div>
              <div className="w-1 bg-white h-2 animate-[pulse_1s_ease-in-out_infinite_0.2s]"></div>
              <div className="w-1 bg-white h-3 animate-[pulse_1s_ease-in-out_infinite_0.4s]"></div>
              <div className="w-1 bg-white h-1.5 animate-[pulse_1s_ease-in-out_infinite_0.6s]"></div>
            </div>
            AI SPEAKING
          </motion.div>
        )}
      </div>

      {/* Question Counter (Top Center) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
        <motion.span 
          key={qIndex}
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="bg-black/50 backdrop-blur-xl text-white/90 text-xs font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full border border-white/10 shadow-2xl"
        >
          Question {qIndex + 1} / {MAX_QUESTIONS}
        </motion.span>
      </div>

      {/* Picture-in-Picture Webcam (Top Right) */}
      <DraggablePipCamera 
        memoizedVideo={memoizedVideo}
        camOn={camOn}
        camError={camError}
        micOn={micOn}
        setMicOn={setMicOn}
        setCamOn={setCamOn}
        isListening={isListening}
      />

      {/* Posture Hint */}
      <AnimatePresence>
        {postureHint && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute top-24 right-6 z-30 flex items-center gap-3 bg-red-600/90 backdrop-blur-xl text-white text-xs font-bold tracking-widest px-5 py-3 rounded-2xl shadow-2xl border border-red-500 pointer-events-none max-w-xs text-right"
          >
            <span className="leading-snug">{postureHint}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Closed Captions */}
      <CinematicCaptions 
        loading={loading}
        loadingStatus={loadingStatus}
        displayedQuestion={displayedQuestion}
        finalTranscript={finalTranscript}
        interimTranscript={interimTranscript}
        isListening={isListening}
        isSpeaking={isSpeaking}
      />

      {/* Embedded Text Fallback Input (Floating just above the captions) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl z-30 px-4">
        <div className="bg-black/60 backdrop-blur-3xl border border-white/20 rounded-2xl p-2 shadow-2xl relative transition-all focus-within:border-red-500/50 focus-within:shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <input
            type="text"
            value={textFallback}
            onChange={(e) => setTextFallback(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitAnswer(); }}
            placeholder={(!isSpeaking && finalTranscript) ? "✓ Captured. Press Enter to submit." : "Type your response here..."}
            className="w-full bg-transparent border-none rounded-xl px-4 py-3 pr-24 text-sm text-white placeholder-white/40 focus:outline-none font-medium"
            disabled={loading || isSpeaking}
          />
          <AnimatePresence>
            {(!isSpeaking && finalTranscript && !loading) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmitAnswer}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-widest px-6 py-2.5 rounded-xl shadow-lg transition-colors border border-red-500/50"
              >
                SUBMIT
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
