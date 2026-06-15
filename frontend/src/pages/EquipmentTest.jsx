import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Video, Mic, Wifi, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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

    const testEquipment = async () => {
      // 1. Network Test (Simulated quick ping for now)
      try {
        const t0 = performance.now();
        await fetch('https://httpbin.org/get', { cache: 'no-store' });
        const t1 = performance.now();
        if (t1 - t0 < 800) setNetStatus('success');
        else setNetStatus('error');
      } catch (e) {
        setNetStatus('error');
      }

      // 2. Camera & Mic Test
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setMicVolume(avg);
          
          if (avg > 10) {
            setMicStatus('success');
          }
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();

      } catch (err) {
        console.error("Equipment error:", err);
        setCamStatus('error');
        setMicStatus('error');
      }
    };

    testEquipment();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContext) audioContext.close();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const allPassed = camStatus === 'success' && micStatus === 'success' && netStatus === 'success';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Video Preview */}
        <div className="md:w-1/2 bg-slate-900 p-6 flex flex-col relative">
          <div className="absolute top-8 left-8 flex items-center gap-2 text-white/80 font-bold text-sm tracking-widest uppercase z-10">
            <Shield size={16} className="text-red-500" /> System Check
          </div>
          <div className="flex-1 flex items-center justify-center relative rounded-2xl overflow-hidden bg-black mt-12 border border-slate-700">
            {camStatus === 'success' ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="text-slate-500 flex flex-col items-center">
                <Video size={48} className="mb-4 opacity-50" />
                <p>Waiting for camera access...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Status Checklist */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Hardware Check</h2>
          <p className="text-slate-500 mb-8 font-medium">Please ensure your equipment is functioning correctly before proceeding.</p>

          <div className="space-y-6 mb-10">
            {/* Camera */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className={`p-3 rounded-xl ${camStatus === 'success' ? 'bg-green-100 text-green-600' : camStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-400'}`}>
                <Video size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">Webcam</h4>
                <p className="text-sm text-slate-500">Video feed detected</p>
              </div>
              {camStatus === 'success' && <CheckCircle className="text-green-500" size={24} />}
              {camStatus === 'error' && <AlertCircle className="text-red-500" size={24} />}
            </div>

            {/* Mic */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className={`p-3 rounded-xl ${micStatus === 'success' ? 'bg-green-100 text-green-600' : micStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-400'}`}>
                <Mic size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">Microphone</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-75" style={{ width: `${Math.min(micVolume * 2, 100)}%` }}></div>
                  </div>
                </div>
              </div>
              {micStatus === 'success' && <CheckCircle className="text-green-500" size={24} />}
              {micStatus === 'error' && <AlertCircle className="text-red-500" size={24} />}
            </div>

            {/* Network */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className={`p-3 rounded-xl ${netStatus === 'success' ? 'bg-green-100 text-green-600' : netStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-400'}`}>
                <Wifi size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-900">Network Stability</h4>
                <p className="text-sm text-slate-500">Checking latency</p>
              </div>
              {netStatus === 'success' && <CheckCircle className="text-green-500" size={24} />}
              {netStatus === 'error' && <AlertCircle className="text-red-500" size={24} />}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: allPassed ? 1.02 : 1 }}
            whileTap={{ scale: allPassed ? 0.98 : 1 }}
            disabled={!allPassed}
            onClick={() => navigate('/kyc-guidelines')}
            className={`w-full py-4 px-6 rounded-xl font-bold uppercase tracking-widest transition-all ${allPassed ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {allPassed ? 'Proceed to Guidelines' : 'Testing Equipment...'}
          </motion.button>

        </div>
      </div>
    </div>
  );
}
