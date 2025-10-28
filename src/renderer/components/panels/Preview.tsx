import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, Maximize2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { useVideoComposition } from '../../hooks/useVideoComposition';

export const Preview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isPlaying, togglePlayback, playbackRate } = useUIStore();
  const { currentTime, setCurrentTime, duration } = useProjectStore();
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Use video composition hook
  const { currentClip } = useVideoComposition(videoRef.current);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playVideo = async () => {
      try {
        if (isPlaying) {
          if (!video.src) return;

          // Wait for video to be ready before playing
          if (video.readyState >= 2) {
            await video.play();
          } else {
            // Wait for canplay event
            const onCanPlay = async () => {
              try {
                await video.play();
              } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                  console.error('Play error:', err);
                }
              }
              video.removeEventListener('canplay', onCanPlay);
            };
            video.addEventListener('canplay', onCanPlay);
          }
        } else {
          video.pause();
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Play error:', err);
        }
      }
    };

    playVideo();
  }, [isPlaying]);

  // Note: currentTime sync is now handled by useVideoComposition hook

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // handleTimeUpdate is now handled by useVideoComposition hook

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h2 className="text-sm font-semibold">Preview</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            onClick={handleFullscreen}
            className="p-1 hover:bg-secondary rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="max-w-full max-h-full"
        >
          {/* Video source will be set dynamically by useVideoComposition hook */}
        </video>

        {/* No content placeholder */}
        {!duration && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-center">
            <div>
              <p className="text-sm mb-2">No preview available</p>
              <p className="text-xs">Import media and add clips to timeline</p>
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          {/* Playback Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayback}
              className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 hover:bg-secondary rounded"
            >
              <Volume2 className={`w-4 h-4 ${isMuted ? 'text-muted-foreground' : ''}`} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};