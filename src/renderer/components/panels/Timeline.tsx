import React, { useRef, useState, useEffect } from 'react';
import { Scissors, Lock, Unlock, Volume2, VolumeX, ZoomIn, ZoomOut, Maximize, Video, Music } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';
import { TimelineClip } from '../timeline/TimelineClip';

export const Timeline: React.FC = () => {
  const { tracks, currentTime, duration, selectedClipId, selectClip, addClipToTimeline, updateClip, setCurrentTime, toggleTrackMute, toggleTrackLock } = useProjectStore();
  const { timelineZoom, setTimelineZoom, isPlaying, togglePlayback } = useUIStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragEndTime, setDragEndTime] = useState<number | null>(null);
  const wasPlayingBeforeDrag = useRef(false);

  useEffect(() => {
    const updateTimelineWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth);
      }
    };

    updateTimelineWidth();
    window.addEventListener('resize', updateTimelineWidth);
    return () => window.removeEventListener('resize', updateTimelineWidth);
  }, []);

  const handleDrop = (e: React.DragEvent, trackId?: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event from bubbling to parent containers
    const mediaId = e.dataTransfer.getData('mediaId');
    if (mediaId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const scrollLeft = timelineContentRef.current?.parentElement?.scrollLeft || 0;
      const adjustedX = x + scrollLeft;
      const time = adjustedX / pixelsPerSecond;
      console.log(`Drop: trackId=${trackId}, time=${time}, x=${x}, scrollLeft=${scrollLeft}`);
      addClipToTimeline(mediaId, trackId || '', time);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleZoomIn = () => {
    setTimelineZoom(timelineZoom * 1.2);
  };

  const handleZoomOut = () => {
    setTimelineZoom(timelineZoom / 1.2);
  };

  const handleFitTimeline = () => {
    setTimelineZoom(1);
  };

  // Calculate pixels per second based on actual duration, with a minimum display of 30 seconds
  const displayDuration = Math.max(duration, 30);
  const pixelsPerSecond = (timelineWidth * timelineZoom) / displayDuration;

  // Handle clicking on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingPlayhead) return;
    if (!timelineContentRef.current) return;

    const rect = timelineContentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineContentRef.current.parentElement!.scrollLeft;
    const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));
    setCurrentTime(newTime);
  };

  // Handle playhead drag
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Pause video during drag and remember if it was playing
    wasPlayingBeforeDrag.current = isPlaying;
    if (isPlaying) {
      togglePlayback();
    }

    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineContentRef.current) return;

      const rect = timelineContentRef.current.getBoundingClientRect();
      const scrollLeft = timelineContentRef.current.parentElement?.scrollLeft || 0;
      const x = e.clientX - rect.left + scrollLeft;
      const newTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));

      setCurrentTime(newTime);
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Store the final drag position
      if (timelineContentRef.current) {
        const rect = timelineContentRef.current.getBoundingClientRect();
        const scrollLeft = timelineContentRef.current.parentElement?.scrollLeft || 0;
        const x = e.clientX - rect.left + scrollLeft;
        const finalTime = Math.max(0, Math.min(duration, x / pixelsPerSecond));

        setDragEndTime(finalTime);
      }

      setIsDraggingPlayhead(false);

      // Resume playback if it was playing before drag
      if (wasPlayingBeforeDrag.current) {
        // Toggle playback - the video composition hook will handle seeking before playback
        if (!isPlaying) {
          togglePlayback();
        }
        wasPlayingBeforeDrag.current = false;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, duration, pixelsPerSecond, setCurrentTime, togglePlayback, isPlaying]);

  // Ensure video seeks to position after drag ends
  useEffect(() => {
    if (dragEndTime !== null) {
      setCurrentTime(dragEndTime);
      // Clear after a short delay
      setTimeout(() => {
        setDragEndTime(null);
      }, 200);
    }
  }, [dragEndTime, setCurrentTime]);

  const renderRuler = () => {
    const intervals = [];
    const step = getTimeStep(pixelsPerSecond);

    for (let i = 0; i <= duration; i += step) {
      const x = i * pixelsPerSecond;
      intervals.push(
        <div
          key={i}
          className="absolute top-0 h-full"
          style={{ left: `${x}px` }}
        >
          <div className="h-2 w-px bg-border" />
          <span className="text-xs text-muted-foreground absolute top-2 -translate-x-1/2">
            {formatTime(i)}
          </span>
        </div>
      );
    }
    return intervals;
  };

  const renderPlayhead = () => {
    const x = currentTime * pixelsPerSecond;
    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-ew-resize"
        style={{ left: `${x}px` }}
        onMouseDown={handlePlayheadMouseDown}
      >
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 cursor-ew-resize"
          onMouseDown={handlePlayheadMouseDown}
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Timeline Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <h2 className="text-sm font-semibold">Timeline</h2>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-secondary rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitTimeline}
            className="p-1 hover:bg-secondary rounded"
            title="Fit Timeline"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-secondary rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers */}
        <div className="w-32 border-r border-border flex-shrink-0">
          <div className="h-8 border-b border-border" /> {/* Spacer for ruler */}
          {tracks.length === 0 ? (
            <div className="h-32 flex items-center justify-center px-2">
              <p className="text-xs text-muted-foreground text-center">
                Drag media here to create tracks
              </p>
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                className="h-16 border-b border-border px-2 py-1 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {track.type === 'video' ? (
                    <Video className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Music className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-0.5 hover:bg-secondary rounded"
                    title={track.muted ? "Unmute" : "Mute"}
                    onClick={() => toggleTrackMute(track.id)}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    className="p-0.5 hover:bg-secondary rounded"
                    title={track.locked ? "Unlock" : "Lock"}
                    onClick={() => toggleTrackLock(track.id)}
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 overflow-auto" ref={timelineRef}>
          <div
            ref={timelineContentRef}
            className="relative"
            style={{ width: `${Math.max(timelineWidth, (duration + 10) * pixelsPerSecond)}px`, minHeight: '160px' }}
            onClick={handleTimelineClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* Time Ruler */}
            <div className="h-8 border-b border-border relative">
              {renderRuler()}
            </div>

            {/* Empty state or tracks */}
            {tracks.length === 0 ? (
              <div
                className="h-32 flex items-center justify-center border border-dashed border-border rounded-sm m-2"
              >
                <p className="text-sm text-muted-foreground">
                  Drop media here to start editing
                </p>
              </div>
            ) : (
              <>
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="timeline-track relative"
                    style={{ height: '64px' }}
                    onDrop={(e) => handleDrop(e, track.id)}
                    onDragOver={handleDragOver}
                  >
                    {track.clips.map((clip) => (
                      <TimelineClip
                        key={clip.id}
                        clip={clip}
                        pixelsPerSecond={pixelsPerSecond}
                        isSelected={selectedClipId === clip.id}
                        trackType={track.type}
                        onSelect={() => selectClip(clip.id)}
                      />
                    ))}
                  </div>
                ))}
                {/* Drop zone below all tracks for creating new tracks */}
                <div
                  className="h-16 opacity-0 hover:opacity-100 transition-opacity"
                  style={{ minHeight: '64px' }}
                >
                  {/* Empty drop zone - will create new track */}
                </div>
              </>
            )}

            {/* Playhead */}
            {renderPlayhead()}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  return formatTime(seconds);
}

function getTimeStep(pixelsPerSecond: number): number {
  // Calculate minimum spacing between labels (in pixels)
  const minLabelSpacing = 80; // Minimum 80px between time labels

  // Calculate the minimum time interval based on pixel spacing
  const minTimeInterval = minLabelSpacing / pixelsPerSecond;

  // Round to nice intervals: 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, etc.
  const niceIntervals = [1, 2, 3, 5, 10, 15, 30, 60, 120, 180, 300, 600, 900, 1800, 3600];

  // Find the smallest nice interval that's larger than our minimum
  for (const interval of niceIntervals) {
    if (interval >= minTimeInterval) {
      return interval;
    }
  }

  // For very zoomed out views, use hour-based intervals
  return Math.ceil(minTimeInterval / 3600) * 3600;
}