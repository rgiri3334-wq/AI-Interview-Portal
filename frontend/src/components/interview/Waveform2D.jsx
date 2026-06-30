import React, { useEffect, useRef } from 'react';

const Waveform2D = ({ isSpeaking, getAudioFrequency, theme = 'dark' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Handle high DPI displays for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Number of bars to render
    const numBars = 32;
    const gap = 4;
    const barWidth = (width - gap * (numBars - 1)) / numBars;
    
    let animationFrameId;
    let time = 0;
    
    // Smoothing array for each bar
    const barHeights = new Array(numBars).fill(0);

    const isDark = theme === 'dark';
    // Sterling Red (#DC2626) when speaking, Slate (#64748B) or White when idle
    const colorIdle = isDark ? '#FFFFFF' : '#64748B';
    const colorSpeaking = '#DC2626';

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, width, height);

      // Get real audio frequency (0-255 roughly)
      const rawFreq = (typeof getAudioFrequency === 'function' && isSpeaking) ? getAudioFrequency() : 0;
      const intensity = Math.min(rawFreq / 100, 1.0); // 0.0 to 1.0

      ctx.fillStyle = isSpeaking ? colorSpeaking : colorIdle;

      for (let i = 0; i < numBars; i++) {
        // Create a symmetric bell curve shape so the center bars are taller
        const centerOffset = Math.abs(i - numBars / 2) / (numBars / 2); // 0 at center, 1 at edges
        const bellCurve = Math.max(0, 1 - centerOffset * centerOffset);
        
        let targetHeight = 4; // minimum height
        
        if (isSpeaking) {
          // Add some dynamic noise based on audio intensity and time
          const noise = Math.sin(time * 2 + i * 0.5) * 0.5 + 0.5; // 0 to 1
          const maxBarHeight = height * 0.8;
          targetHeight = 4 + (intensity * bellCurve * noise * maxBarHeight);
        } else {
          // Gentle idle breathing
          const breathe = Math.sin(time + i * 0.2) * 0.5 + 0.5;
          targetHeight = 4 + (breathe * bellCurve * height * 0.1);
        }

        // Smooth transition to target height
        barHeights[i] += (targetHeight - barHeights[i]) * 0.2;

        const h = Math.max(4, barHeights[i]);
        const x = i * (barWidth + gap);
        const y = (height - h) / 2; // Center vertically

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
    };
  }, [isSpeaking, getAudioFrequency, theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default Waveform2D;
