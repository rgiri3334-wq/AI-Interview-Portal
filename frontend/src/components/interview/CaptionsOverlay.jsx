
import { motion, AnimatePresence } from 'framer-motion';

export default function CaptionsOverlay({ 
  isSpeaking, 
  loading, 
  loadingStatus, 
  displayedQuestion, 
  finalTranscript, 
  interimTranscript, 
  isListening
}) {
  
  // HUD Neon styling for AI (Crimson Red)
  const aiPanelClasses = "bg-black/40 backdrop-blur-3xl border border-red-500/50 shadow-[0_0_50px_rgba(220,38,38,0.25)]";
  const aiTextClasses = "text-white drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] font-medium";
  const aiTagClasses = "text-red-400 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]";

  // HUD Neon styling for Candidate (Azure Blue)
  const userPanelClasses = "bg-black/40 backdrop-blur-3xl border border-sky-500/50 shadow-[0_0_50px_rgba(14,165,233,0.25)]";
  const userTextClasses = "text-white drop-shadow-[0_0_15px_rgba(14,165,233,0.8)] font-medium";
  const userTagClasses = "text-sky-400 drop-shadow-[0_0_8px_rgba(14,165,233,0.8)]";

  return (
    <div className="absolute inset-x-0 bottom-24 z-20 w-full px-8 pointer-events-none flex justify-between items-end gap-8">
      
      {/* LEFT PANEL: AI Speech (Crimson) */}
      <div className="w-1/2 flex flex-col justify-end items-start">
        <AnimatePresence mode="wait">
          {(isSpeaking || loading || displayedQuestion) && (
            <motion.div 
              key="ai-speech"
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`rounded-[2rem] rounded-bl-none p-6 w-full max-w-xl ${aiPanelClasses} relative overflow-hidden`}
            >
              {/* Scanline Sweep for Holographic effect */}
              <motion.div
                animate={{ top: ['-50%', '150%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-1/3 pointer-events-none bg-gradient-to-b from-transparent via-red-500/10 to-transparent"
              />

              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-red-400 animate-pulse shadow-[0_0_12px_#ef4444]' : 'bg-red-900/40'}`}></div>
                <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${aiTagClasses}`}>
                  AI Engine
                </span>
              </div>
              <p className={`text-[17px] leading-relaxed min-h-[44px] relative z-10 ${aiTextClasses}`}>
                {loading ? loadingStatus : displayedQuestion}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT PANEL: Candidate Speech (Azure) */}
      <div className="w-1/2 flex flex-col justify-end items-end">
        <AnimatePresence mode="wait">
          {(finalTranscript || interimTranscript || isListening) && !loading && (
            <motion.div 
              key="candidate-speech"
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`rounded-[2rem] rounded-br-none p-6 w-full max-w-xl ${userPanelClasses} relative overflow-hidden`}
            >
              {/* Scanline Sweep for Holographic effect */}
              <motion.div
                animate={{ top: ['-50%', '150%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute left-0 right-0 h-1/3 pointer-events-none bg-gradient-to-b from-transparent via-sky-500/10 to-transparent"
              />

              <div className="flex items-center gap-3 mb-3 justify-end relative z-10">
                <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${userTagClasses}`}>
                  You (Candidate)
                </span>
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-sky-400 animate-pulse shadow-[0_0_12px_#0ea5e9]' : 'bg-sky-900/40'}`}></div>
              </div>
              <div className={`text-[17px] leading-relaxed min-h-[44px] text-right relative z-10 ${userTextClasses}`}>
                {finalTranscript && <span>{finalTranscript} </span>}
                {interimTranscript && <span className="text-white/70 italic">{interimTranscript}</span>}
                {!finalTranscript && !interimTranscript && isListening && (
                  <span className={`${userTagClasses} opacity-60 italic flex items-center justify-end gap-2`}>
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
