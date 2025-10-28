import React, { useRef, useEffect } from 'react';

interface WaveformProps {
  audioPath: string;
  width: number;
  height: number;
  peaks?: number[];
  color?: string;
}

export const Waveform: React.FC<WaveformProps> = ({
  audioPath,
  width,
  height,
  peaks,
  color = '#60a5fa',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !peaks || peaks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    const barWidth = width / peaks.length;
    const halfHeight = height / 2;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;

    peaks.forEach((peak, index) => {
      const barHeight = peak * halfHeight;
      const x = index * barWidth;

      // Draw top half
      ctx.fillRect(x, halfHeight - barHeight, barWidth, barHeight);
      // Draw bottom half (mirrored)
      ctx.fillRect(x, halfHeight, barWidth, barHeight);
    });

    ctx.globalAlpha = 1.0;
  }, [peaks, width, height, color]);

  return <canvas ref={canvasRef} className="waveform-canvas" />;
};

// Hook to extract waveform data
export const useWaveform = (audioPath: string) => {
  const [peaks, setPeaks] = React.useState<number[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    if (!audioPath) return;

    const extractWaveform = async () => {
      setIsLoading(true);
      try {
        // Use FFmpeg to extract waveform data
        const result = await window.electronAPI.extractWaveform(audioPath);

        // For now, generate dummy peaks since FFmpeg integration needs more work
        // In production, parse the result from FFmpeg
        const dummyPeaks = generateDummyPeaks(100);
        setPeaks(dummyPeaks);
      } catch (error) {
        console.error('Failed to extract waveform:', error);
        // Generate dummy peaks as fallback
        const dummyPeaks = generateDummyPeaks(100);
        setPeaks(dummyPeaks);
      } finally {
        setIsLoading(false);
      }
    };

    extractWaveform();
  }, [audioPath]);

  return { peaks, isLoading };
};

// Generate dummy peaks for visualization (temporary)
function generateDummyPeaks(count: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    // Create a more realistic waveform pattern
    const base = Math.sin(i / 10) * 0.5 + 0.5;
    const variation = Math.random() * 0.3;
    peaks.push(Math.min(1, base + variation));
  }
  return peaks;
}