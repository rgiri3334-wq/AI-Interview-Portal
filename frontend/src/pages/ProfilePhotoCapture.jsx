/**
 * ProfilePhotoCapture.jsx
 * KYC Face Capture page with Cyber-Industrial Dark Glassmorphic styling.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, RefreshCcw, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/apiClient';
import PageWrapper from '../components/Layout/PageWrapper';

export default function ProfilePhotoCapture() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isMountedRef = useRef(true);
  
  const [stream, setStream] = useState(null);
  const [step, setStep] = useState('selfie'); // 'selfie', 'uploading', 'success', 'error'
  const [selfieImage, setSelfieImage] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setVerificationError("Camera access denied. Please allow camera permissions to proceed.");
      setStep('error');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleCaptureSelfie = () => {
    const img = captureFrame();
    if (img) {
      setSelfieImage(img);
      uploadProfilePhoto(img);
    }
  };

  const uploadProfilePhoto = async (selfieBase64) => {
    setStep('uploading');
    try {
      const res = await apiClient.uploadProfilePhoto({
        candidate_id: sessionStorage.getItem('candidateId') || 'DEMO-001',
        selfie_image: selfieBase64
      });

      if (res.verified) {
        setStep('success');
      } else {
        setVerificationError(res.detail || "Upload failed.");
        setStep('error');
      }
    } catch (error) {
      console.error(error);
      setVerificationError("Upload service is currently unavailable or returned an error.");
      setStep('error');
    }
  };

  const handleRetry = () => {
    setSelfieImage(null);
    setVerificationError('');
    setStep('selfie');
  };

  const handleProceed = () => {
    navigate('/interview');
  };

  return (
    <PageWrapper className="flex items-center justify-center p-6">
      
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-4xl w-full bg-slate-950/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row relative z-10">
        
        {/* Left Side: Camera Feed */}
        <div className="md:w-[60%] relative bg-black flex items-center justify-center min-h-[400px]">
          
          {selfieImage ? (
            <img 
              src={selfieImage} 
              alt="Captured Selfie" 
              className={`w-full h-full object-cover ${(step === 'uploading' || step === 'success' || step === 'error') ? 'opacity-30 blur-sm' : ''}`}
            />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          )}
          
          {stream?.active && !selfieImage && (
            <div className="absolute top-4 left-4 bg-red-600/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              Live
            </div>
          )}

          {step === 'selfie' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-60 h-72 border-2 border-dashed border-red-500/80 rounded-full relative shadow-[0_0_30px_rgba(225,29,72,0.3)]">
                <div className="absolute -top-10 left-0 w-full text-center text-white text-xs font-mono font-bold tracking-widest uppercase drop-shadow-md">
                  Align Face Inside Ring
                </div>
              </div>
            </div>
          )}

          {/* State Overlays */}
          <AnimatePresence>
            {step === 'uploading' && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Loader2 size={56} className="animate-spin text-red-500 mb-4" />
                <h3 className="text-xl font-bold">Uploading Profile Photo...</h3>
                <p className="text-slate-400 text-xs mt-1">Transmitting via encrypted connection.</p>
              </motion.div>
            )}
            {step === 'success' && (
              <motion.div initial={{opacity:0, scale: 0.9}} animate={{opacity:1, scale: 1}} className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <ShieldCheck size={72} className="text-emerald-400 mb-4" />
                <h3 className="text-2xl font-bold">Verification Complete</h3>
                <p className="text-slate-400 text-xs mt-1">Profile photo verified successfully.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Controls */}
        <div className="md:w-[40%] p-8 flex flex-col bg-slate-950 text-white border-l border-white/10">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30">
              <Camera size={18} className="text-red-400" />
            </div>
            <span className="text-red-400 font-bold tracking-widest uppercase text-xs">Step 3 of 3</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">

            {step === 'selfie' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-2xl font-black mb-3">Identity Capture</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">Look directly into the camera. Ensure ambient lighting is clear and your face is centered.</p>
                <button 
                  onClick={handleCaptureSelfie}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-xs shadow-lg shadow-red-600/30 active:scale-[0.99]"
                >
                  <Camera size={18} /> Capture Photo
                </button>
              </motion.div>
            )}

            {step === 'uploading' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-xl font-bold mb-2">Processing Capture...</h2>
                <p className="text-xs text-slate-400 leading-relaxed">Checking image parameters. Please hold position.</p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-xl font-bold mb-2 text-red-400">Capture Error</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">{verificationError}</p>
                <button 
                  onClick={handleRetry}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-xs"
                >
                  <RefreshCcw size={18} /> Try Again
                </button>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-2xl font-black mb-2 text-emerald-400">Verification Passed</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">Your identity photo is registered. You are ready to enter the autonomous assessment workspace.</p>
                <button 
                  onClick={handleProceed}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 active:scale-[0.99]"
                >
                  <CheckCircle size={18} /> Enter Interview Workspace →
                </button>
              </motion.div>
            )}
          </div>
          
        </div>
      </div>
    </PageWrapper>
  );
}
