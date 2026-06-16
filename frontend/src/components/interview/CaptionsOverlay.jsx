import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CaptionsOverlay({ 
  isSpeaking, 
  loading, 
  loadingStatus, 
  displayedQuestion, 
  finalTranscript, 
  interimTranscript, 
  isListening,
  theme = 'dark' 
}) {
  const isDark = theme === 'dark';
  
  // Theme styling (Dark = Black/Red, Light = White/Red)
  const panelClasses = isDark 
    ? "bg-black/60 backdrop-blur-2xl border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.15)]" 
    : "bg-white/80 backdrop-blur-2xl border border-red-300 shadow-[0_0_30px_rgba(220,38,38,0.1)]";
  
  const textClasses = isDark ? "text-white" : "text-black";
  const tagClasses = "text-red-500";
  const mutedTextClasses = isDark ? "text-white/60" : "text-black/60";

  return (
    <div className="absolute inset-x-0 bottom-24 z-20 w-full px-8 pointer-events-none flex justify-between items-end gap-8">
      
      {/* LEFT PANEL: AI Speech */}
      <div className="w-1/2 flex flex-col justify-end items-start">
        <AnimatePresence mode="wait">
          {(isSpeaking || loading || displayedQuestion) && (
            <motion.div 
              key="ai-speech"
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`rounded-3xl rounded-bl-sm p-6 w-full max-w-xl ${panelClasses} relative overflow-hidden`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-red-900/40'}`}></div>
                <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${tagClasses}`}>
                  AI Interviewer
                </span>
              </div>
              <p className={`text-[17px] leading-relaxed font-medium ${textClasses} min-h-[44px]`}>
                {loading ? loadingStatus : displayedQuestion}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT PANEL: Candidate Speech */}
      <div className="w-1/2 flex flex-col justify-end items-end">
        <AnimatePresence mode="wait">
          {(finalTranscript || interimTranscript || isListening) && !loading && (
            <motion.div 
              key="candidate-speech"
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`rounded-3xl rounded-br-sm p-6 w-full max-w-xl ${panelClasses} relative overflow-hidden`}
            >
              <div className="flex items-center gap-3 mb-3 justify-end">
                <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${tagClasses}`}>
                  You (Candidate)
                </span>
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-red-900/40'}`}></div>
              </div>
              <div className={`text-[17px] leading-relaxed font-medium min-h-[44px] text-right ${textClasses}`}>
                {finalTranscript && <span>{finalTranscript} </span>}
                {interimTranscript && <span className={`${mutedTextClasses} italic`}>{interimTranscript}</span>}
                {!finalTranscript && !interimTranscript && isListening && (
                  <span className={`${tagClasses} opacity-60 italic flex items-center justify-end gap-2`}>
                    Listening
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                    </span>
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
