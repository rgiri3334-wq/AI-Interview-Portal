import { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

export function useVideoRecorder() {
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const videoElemRef = useRef(null);
  const rAFRef = useRef(null);
  const logoImageRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Preload logo
    const img = new Image();
    img.src = '/logo.png'; // Make sure this exists in public folder or fallback to text
    img.onload = () => { logoImageRef.current = img; };
  }, []);

  const startVideoRecording = useCallback(async () => {
    try {
      // 1. Get raw stream
      const rawStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      streamRef.current = rawStream;
      
      // 2. Setup hidden video and canvas
      const video = document.createElement('video');
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = rawStream;
      videoElemRef.current = video;

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;
      const ctx = canvas.getContext('2d', { alpha: false }); // Optimize

      // 3. Render Loop
      const drawFrame = () => {
        if (!video.paused && !video.ended) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Draw Watermark
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = 'bold 24px Inter, sans-serif';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 4;
          
          if (logoImageRef.current) {
            // Draw logo and text
            ctx.drawImage(logoImageRef.current, 20, canvas.height - 60, 40, 40);
            ctx.fillText("Spark-Hire", 70, canvas.height - 30);
          } else {
            // Just text
            ctx.fillText("Spark-Hire: Sterling E Mobility", 20, canvas.height - 30);
          }
        }
        rAFRef.current = requestAnimationFrame(drawFrame);
      };
      
      video.onplay = () => {
        drawFrame();
      };
      
      await video.play();

      // 4. Extract Canvas Stream
      const canvasStream = canvas.captureStream(30); // 30 FPS
      
      // 5. Multiplex Audio
      const audioTrack = rawStream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      // 6. Record
      videoChunksRef.current = [];
      const options = {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm',
        videoBitsPerSecond: 250000, 
        audioBitsPerSecond: 64000
      };

      const recorder = new MediaRecorder(canvasStream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.start(10000); 
      setIsRecordingVideo(true);
      console.log("[useVideoRecorder] Continuous watermarked video recording started.");
    } catch (err) {
      console.error("[useVideoRecorder] Failed to start video recording:", err);
      setIsRecordingVideo(false);
    }
  }, []);

  const stopAndUploadVideo = useCallback(async (interviewId) => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(false);
        return;
      }

      let triggered = false;
      const finishStop = async () => {
        if (triggered) return;
        triggered = true;
        
        // Cleanup resources
        if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }
        if (videoElemRef.current) {
          videoElemRef.current.srcObject = null;
        }

        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        videoChunksRef.current = []; // Clear memory
        setIsRecordingVideo(false);

        console.log(`[useVideoRecorder] Video recording stopped. Total size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
        
        try {
          if (videoBlob.size > 2 * 1024 * 1024) {
            await apiClient.uploadInterviewRecordingChunked(interviewId, videoBlob, (progress) => {
              console.log(`[useVideoRecorder] Chunk upload progress: ${Math.round(progress * 100)}%`);
            });
          } else {
            const formData = new FormData();
            formData.append('file', videoBlob, `interview_${interviewId}.webm`);
            await apiClient.uploadInterviewRecording(interviewId, formData);
          }
          console.log("[useVideoRecorder] Upload successful.");
          resolve(true);
        } catch (error) {
          console.error("[useVideoRecorder] Upload failed:", error);
          resolve(false);
        }
      };

      mediaRecorderRef.current.onstop = finishStop;
      mediaRecorderRef.current.stop();
      
      setTimeout(finishStop, 2000);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecordingVideo,
    startVideoRecording,
    stopAndUploadVideo
  };
}
