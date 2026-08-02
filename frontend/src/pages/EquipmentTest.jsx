/**
 * EquipmentTest.jsx
 * System Hardware Calibration page.
 * Cyber-Industrial Dark Glassmorphism.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Video, Mic, Wifi, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import PageWrapper from '../components/Layout/PageWrapper';

export default function EquipmentTest() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [camStatus, setCamStatus] = useState('testing'); // 'testing', 'success', 'error'
  const [micStatus, setMicStatus] = useState('testing');
  const [netStatus, setNetStatus] = useState('testing');
  const [micVolume, setMicVolume] = useState(0);
  
  useEffect(() => {
    let stream = null;
    let audioContext = null;
    let animationFrameId = null;
    let isMounted = true;

    const checkNetwork = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const t0 = performance.now();
        await fetch('https://www.gstatic.com/generate_204', { 
          cache: 'no-store',
          signal: controller.signal,
          mode: 'no-cors'
        });
        clearTimeout(timeoutId);
        
        const t1 = performance.now();
        if (isMounted) {
          if (t1 - t0 < 4000) setNetStatus('success');
          else setNetStatus('error');
        }
      } catch (e) {
        if (isMounted) setNetStatus('error');
      }
    };

    const checkMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) return;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCamStatus('success');

        // Mic Volume Analysis
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!isMounted) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setMicVolume(avg);
          
          if (avg > 5) {
            setMicStatus('success');
          }
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();

      } catch (err) {
        console.error("Equipment error:", err);
        if (isMounted) {
          setCamStatus('error');
          setMicStatus('error');
        }
      }
    };

    checkNetwork();
    checkMedia();

    return () => {
      isMounted = false;
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContext) audioContext.close();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const allPassed = camStatus === 'success' && micStatus === 'success' && netStatus === 'success';

  return (
    <PageWrapper className="flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-slate-950/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Video Preview */}
        <div className="md:w-1/2 bg-slate-950 p-6 flex flex-col relative border-r border-white/10">
          <div className="absolute top-6 left-6 flex items-center gap-2 text-white/80 font-bold text-xs tracking-widest uppercase z-10">
            <Shield size={14} className="text-red-500" /> Hardware Telemetry
          </div>
          <div className="flex-1 flex items-center justify-center relative rounded-2xl overflow-hidden bg-black mt-10 border border-white/10 min-h-[260px]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${camStatus === 'success' ? 'opacity-100' : 'opacity-0'}`}
            />
            {camStatus !== 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-black">
                <Video size={40} className="mb-3 opacity-50 animate-pulse text-red-500" />
                <p className="text-xs font-mono">Initializing Camera Feed...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Status Checklist */}
        <div className="md:w-1/2 p-8 flex flex-col justify-center">
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">Hardware Calibration</h2>
          <p className="text-xs text-slate-400 mb-6 font-medium">Verify video, microphone, and internet stability before launching.</p>

          <div className="space-y-4 mb-8">
            {/* Camera */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className={`p-3 rounded-xl ${camStatus === 'success' ? 'bg-emerald-950/60 text-emerald-400' : camStatus === 'error' ? 'bg-red-950/60 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <Video size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">Webcam Stream</h4>
                <p className="text-xs text-slate-400">Video feed status</p>
              </div>
              {camStatus === 'success' && <CheckCircle className="text-emerald-400" size={20} />}
              {camStatus === 'error' && <AlertCircle className="text-red-400" size={20} />}
            </div>

            {/* Mic */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className={`p-3 rounded-xl ${micStatus === 'success' ? 'bg-emerald-950/60 text-emerald-400' : micStatus === 'error' ? 'bg-red-950/60 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <Mic size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">Microphone Input</h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all duration-75" style={{ width: `${Math.min(micVolume * 2.5, 100)}%` }}></div>
                  </div>
                </div>
              </div>
              {micStatus === 'success' && <CheckCircle className="text-emerald-400" size={20} />}
              {micStatus === 'error' && <AlertCircle className="text-red-400" size={20} />}
            </div>

            {/* Network */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
              <div className={`p-3 rounded-xl ${netStatus === 'success' ? 'bg-emerald-950/60 text-emerald-400' : netStatus === 'error' ? 'bg-red-950/60 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <Wifi size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm">Network Ping</h4>
                <p className="text-xs text-slate-400">Verifying low latency</p>
              </div>
              {netStatus === 'success' && <CheckCircle className="text-emerald-400" size={20} />}
              {netStatus === 'error' && <AlertCircle className="text-red-400" size={20} />}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: allPassed ? 1.02 : 1 }}
            whileTap={{ scale: allPassed ? 0.98 : 1 }}
            disabled={!allPassed}
            onClick={() => navigate('/profile-photo-guidelines')}
            className={`w-full py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-xs transition-all ${allPassed ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
          >
            {allPassed ? 'Proceed to Identity Guidelines →' : 'Calibrating Equipment...'}
          </motion.button>

        </div>
      </div>
    </PageWrapper>
  );
}
