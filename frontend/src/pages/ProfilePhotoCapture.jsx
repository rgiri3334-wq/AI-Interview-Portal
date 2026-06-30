import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, RefreshCcw, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../api/apiClient';

export default function KycCapture() {
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
    
    // Draw the video frame to the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Return base64 JPEG
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
      // API call to the backend
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
    // Navigate to interview. 
    // The LiveInterview component will check if KYC is completed via state/session or DB.
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-4xl w-full bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col md:flex-row relative z-10">
        
        {/* Left Side: Camera Feed */}
        <div className="md:w-[60%] relative bg-black flex items-center justify-center min-h-[400px]">
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${(step === 'uploading' || step === 'success' || step === 'error') ? 'opacity-30 blur-sm' : ''}`}
          />

          {/* Overlays */}


          {step === 'selfie' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-64 h-80 border-4 border-red-500/80 rounded-full relative">
                <div className="absolute -top-10 left-0 w-full text-center text-white font-bold tracking-widest uppercase drop-shadow-md">
                  Position Your Face
                </div>
              </div>
            </div>
          )}

          {/* State Overlays */}
          <AnimatePresence>
            {step === 'uploading' && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Loader2 size={64} className="animate-spin text-red-500 mb-4" />
                <h3 className="text-2xl font-bold">Saving Profile Photo...</h3>
                <p className="text-slate-400">Uploading securely.</p>
              </motion.div>
            )}
            {step === 'success' && (
              <motion.div initial={{opacity:0, scale: 0.9}} animate={{opacity:1, scale: 1}} className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <ShieldCheck size={80} className="text-green-500 mb-4" />
                <h3 className="text-3xl font-bold">Profile Photo Saved</h3>
                <p className="text-slate-400">Photo successfully uploaded.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Instructions & Controls */}
        <div className="md:w-[40%] p-8 flex flex-col bg-slate-800 text-white border-l border-slate-700">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30">
              <Camera size={20} className="text-red-400" />
            </div>
            <span className="text-red-400 font-bold tracking-widest uppercase text-sm">Step 3 of 3</span>
          </div>

          <div className="flex-1">

            {step === 'selfie' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-2xl font-black mb-4">Live Selfie</h2>
                <p className="text-slate-400 leading-relaxed mb-6">Look directly into the camera. Ensure you are in a well-lit environment.</p>
                <button 
                  onClick={handleCaptureSelfie}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide"
                >
                  <Camera size={20} /> Capture Face
                </button>
              </motion.div>
            )}

            {step === 'uploading' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-2xl font-black mb-4">Processing...</h2>
                <p className="text-slate-400 leading-relaxed">Securely transmitting data. Please wait.</p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-2xl font-black mb-4 text-red-400">Verification Failed</h2>
                <p className="text-slate-400 leading-relaxed mb-6">{verificationError}</p>
                <button 
                  onClick={handleRetry}
                  className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide"
                >
                  <RefreshCcw size={20} /> Try Again
                </button>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                <h2 className="text-2xl font-black mb-4 text-green-400">All Set!</h2>
                <p className="text-slate-400 leading-relaxed mb-6">Your profile photo has been saved. You may now enter the live interview environment.</p>
                <button 
                  onClick={handleProceed}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide shadow-lg shadow-green-600/20"
                >
                  <CheckCircle size={20} /> Enter Interview
                </button>
              </motion.div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
