import React, { useEffect, useRef } from 'react';

const Waveform2D = ({ isSpeaking, getAudioFrequency, theme = 'dark' }) => {
  const canvasRef = useRef(null);
  
  // Use refs to hold mutable state so the animation loop NEVER restarts
  const isSpeakingRef = useRef(isSpeaking);
  const getFreqRef = useRef(getAudioFrequency);
  const themeRef = useRef(theme);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    getFreqRef.current = getAudioFrequency;
  }, [getAudioFrequency]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let time = 0;
    const numBars = 32;
    const gap = 4;
    const barHeights = new Array(numBars).fill(0);
    
    // Resize observer to handle fullscreen / dynamic resizing properly
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = entry.contentRect.width * dpr;
        canvas.height = entry.contentRect.height * dpr;
      }
    });
    resizeObserver.observe(canvas);

    const render = () => {
      time += 0.05;
      
      const width = canvas.width;
      const height = canvas.height;
      
      // If width is 0 (not laid out yet), just wait
      if (width === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const cssWidth = width / dpr;
      const cssHeight = height / dpr;
      
      const barWidth = (cssWidth - gap * (numBars - 1)) / numBars;

      // Reset transform and clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.scale(dpr, dpr);

      const currentlySpeaking = isSpeakingRef.current;
      const freqFn = getFreqRef.current;
      
      // Get real audio frequency (0-255 roughly)
      const rawFreq = (typeof freqFn === 'function' && currentlySpeaking) ? freqFn() : 0;
      const intensity = Math.min(rawFreq / 100, 1.0); // 0.0 to 1.0

      const isDark = themeRef.current === 'dark';
      // Sterling Red (#DC2626) when speaking, Slate (#64748B) or White when idle
      ctx.fillStyle = currentlySpeaking ? '#DC2626' : (isDark ? '#FFFFFF' : '#64748B');

      for (let i = 0; i < numBars; i++) {
        // Create a symmetric bell curve shape so the center bars are taller
        const centerOffset = Math.abs(i - numBars / 2) / (numBars / 2); // 0 at center, 1 at edges
        const bellCurve = Math.max(0, 1 - Math.pow(centerOffset, 1.5)); // smooth rounded bell
        
        let targetHeight; // = 4; // minimum height
        
        if (currentlySpeaking) {
          // Add some dynamic noise based on audio intensity and time
          const noise = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5; // 0 to 1
          const maxBarHeight = cssHeight * 0.8;
          // When speaking loudly, expand massively. When quiet, still pulse slightly.
          targetHeight = 4 + (intensity * bellCurve * noise * maxBarHeight) + (bellCurve * cssHeight * 0.1);
        } else {
          // Gentle idle breathing
          const breathe = Math.sin(time + i * 0.2) * 0.5 + 0.5;
          targetHeight = 4 + (breathe * bellCurve * cssHeight * 0.1);
        }

        // Extremely smooth physics transition to target height
        barHeights[i] += (targetHeight - barHeights[i]) * 0.15;

        const h = Math.max(4, barHeights[i]);
        const x = i * (barWidth + gap);
        const y = (cssHeight - h) / 2; // Center vertically

        // Draw rounded rect (fallback to standard rect if roundRect not supported)
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, h, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, h);
        }
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []); // EMPTY DEPENDENCY ARRAY - Never tear down the loop!

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default Waveform2D;

// eslint-disable-next-line
console.log(typeof targetHeight !== "undefined" ? targetHeight : "");
