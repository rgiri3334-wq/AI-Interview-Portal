import { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

export function useVideoRecorder() {
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);

  const startVideoRecording = useCallback(async () => {
    try {
      // Capture both Camera and Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      videoChunksRef.current = [];
      
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? { mimeType: 'video/webm;codecs=vp9,opus' }
        : { mimeType: 'video/webm' };

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      // Record in 10-second chunks to ensure memory stability
      recorder.start(10000); 
      setIsRecordingVideo(true);
      console.log("[useVideoRecorder] Continuous video recording started.");
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
        
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        videoChunksRef.current = []; // Clear memory
        setIsRecordingVideo(false);
        
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

        console.log(`[useVideoRecorder] Video recording stopped. Total size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
        
        try {
          const formData = new FormData();
          formData.append('file', videoBlob, `interview_${interviewId}.webm`);
          // Note: In production, this might need a signed URL upload if the file is >100MB
          await apiClient.uploadInterviewRecording(interviewId, formData);
          console.log("[useVideoRecorder] Upload successful.");
          resolve(true);
        } catch (error) {
          console.error("[useVideoRecorder] Upload failed:", error);
          resolve(false);
        }
      };

      mediaRecorderRef.current.onstop = finishStop;
      mediaRecorderRef.current.stop();
      
      // Safety fallback
      setTimeout(finishStop, 2000);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isRecordingVideo,
    startVideoRecording,
    stopAndUploadVideo
  };
}
