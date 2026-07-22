/**
 * frontend/src/workers/visionWorker.js
 * ═══════════════════════════════════════════════════════════════════════════
 * Offloads MediaPipe FaceLandmarker from the main UI thread.
 * Receives ImageBitmaps, runs inference, and returns metrics.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarker = null;
let isInitializing = false;

async function initLandmarker() {
  if (landmarker || isInitializing) return;
  isInitializing = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
    );
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU" // Uses WebGL in worker
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "IMAGE", // We process discrete ImageBitmaps in the worker
      numFaces: 2
    });
    self.postMessage({ type: 'INIT_SUCCESS' });
  } catch (error) {
    self.postMessage({ type: 'INIT_ERROR', error: error.message });
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e) => {
  const { type, imageBitmap, timestamp } = e.data;

  if (type === 'INIT') {
    initLandmarker();
  } 
  else if (type === 'PROCESS_FRAME') {
    if (!landmarker) {
      // Not ready yet, just discard the frame to avoid memory leaks
      if (imageBitmap) imageBitmap.close();
      return;
    }

    try {
      // Run inference
      const results = landmarker.detect(imageBitmap);
      
      // Close the bitmap to free memory immediately! (Crucial for Worker performance)
      imageBitmap.close();

      self.postMessage({
        type: 'FRAME_RESULTS',
        timestamp,
        results: {
          faceLandmarks: results.faceLandmarks,
          faceBlendshapes: results.faceBlendshapes,
          facialTransformationMatrixes: results.facialTransformationMatrixes
        }
      });
    } catch (err) {
      if (imageBitmap) imageBitmap.close();
      self.postMessage({ type: 'FRAME_ERROR', error: err.message });
    }
  }
  else if (type === 'CLOSE') {
    if (landmarker) {
      landmarker.close();
      landmarker = null;
    }
    self.close(); // Terminate worker
  }
};
