import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Waveform, useWaveform } from './Waveform';
import { useProjectStore, TimelineClip as TimelineClipType } from '../../store/projectStore';

interface TimelineClipProps {
  clip: TimelineClipType;
  pixelsPerSecond: number;
  isSelected: boolean;
  trackType: 'video' | 'audio';
  onSelect: () => void;
}

type TrimMode = 'none' | 'start' | 'end';
type CursorType = 'default' | 'move' | 'trim-start' | 'trim-end';

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  pixelsPerSecond,
  isSelected,
  trackType,
  onSelect,
}) => {
  const { mediaFiles, moveClip, trimClipStart, trimClipEnd } = useProjectStore();
  const media = mediaFiles.find(f => f.id === clip.mediaId);
  const [isDragging, setIsDragging] = useState(false);
  const [trimMode, setTrimMode] = useState<TrimMode>('none');
  const [cursorType, setCursorType] = useState<CursorType>('default');
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);
  const clipRef = useRef<HTMLDivElement>(null);
  const originalClipStart = useRef(0);
  const originalClipDuration = useRef(0);

  if (!media) return null;

  const clipWidth = clip.duration * pixelsPerSecond;
  const { peaks } = useWaveform(trackType === 'audio' ? media.path : '');
  const TRIM_HANDLE_WIDTH = 10; // Width in pixels for trim detection

  // Handle mouse movement to detect trim zones
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || trimMode !== 'none') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Check if near the edges for trimming
    if (x <= TRIM_HANDLE_WIDTH) {
      setCursorType('trim-start');
    } else if (x >= rect.width - TRIM_HANDLE_WIDTH) {
      setCursorType('trim-end');
    } else {
      setCursorType('move');
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging && trimMode === 'none') {
      setCursorType('default');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && trimMode === 'none') {
      onSelect();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    dragStartX.current = e.clientX;

    // Determine the action based on cursor position
    if (cursorType === 'trim-start') {
      setTrimMode('start');
      originalClipStart.current = clip.startTime;
      originalClipDuration.current = clip.duration;
      handleTrimStart();
    } else if (cursorType === 'trim-end') {
      setTrimMode('end');
      originalClipDuration.current = clip.duration;
      handleTrimEnd();
    } else {
      setIsDragging(true);
      dragStartTime.current = clip.startTime;
      handleDragMove();
    }
  };

  const handleTrimStart = () => {
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const deltaTime = deltaX / pixelsPerSecond;

      // Calculate new start time
      // Can expand back to original in-point (0) or contract up to end - 0.1s
      const newStartTime = originalClipStart.current + deltaTime;
      const maxStartTime = originalClipStart.current + originalClipDuration.current - 0.1; // Keep minimum 0.1s duration

      // Allow expanding back to original clip start (in-point 0)
      const minStartTime = originalClipStart.current - clip.inPoint; // Can go back to original media start
      const clampedStartTime = Math.max(minStartTime, Math.min(newStartTime, maxStartTime));

      // Update the clip by trimming the start
      trimClipStart(clip.id, clampedStartTime);
    };

    const handleMouseUp = () => {
      // Auto-snap adjacent clips after trimming start
      const currentState = useProjectStore.getState();
      const currentTrack = currentState.tracks.find(t =>
        t.clips.some(c => c.id === clip.id)
      );

      if (currentTrack) {
        const currentClip = currentTrack.clips.find(c => c.id === clip.id);
        if (currentClip) {
          const newStartTime = currentClip.startTime;
          const timeDiff = newStartTime - originalClipStart.current;

          // Find clips that were connected to this clip's start (their end connects to our original start)
          const connectedClips = currentTrack.clips.filter(c =>
            c.id !== clip.id && Math.abs((c.startTime + c.duration) - originalClipStart.current) < 0.01
          );

          // Move connected clips to maintain the connection
          if (connectedClips.length > 0 && Math.abs(timeDiff) > 0.01) {
            useProjectStore.setState((state) => ({
              tracks: state.tracks.map(track => {
                if (track.id === currentTrack.id) {
                  return {
                    ...track,
                    clips: track.clips.map(c => {
                      // Check if this clip was connected to the trimmed clip's start
                      if (connectedClips.some(cc => cc.id === c.id)) {
                        // Adjust the connected clip's duration to maintain connection
                        const oldEndTime = c.startTime + c.duration;
                        const newDuration = newStartTime - c.startTime;
                        return {
                          ...c,
                          duration: Math.max(0.1, newDuration), // Ensure minimum duration
                        };
                      }
                      return c;
                    }),
                  };
                }
                return track;
              }),
            }));
          }

          // Apply magnetic timeline after trimming
          const updatedState = useProjectStore.getState();
          const updatedTrack = updatedState.tracks.find(t => t.id === currentTrack.id);
          if (updatedTrack && updatedTrack.clips.length > 0) {
            // Find the minimum start time across all clips
            const minStartTime = Math.min(...updatedTrack.clips.map(c => c.startTime));

            // If leftmost clip is not at 0, shift all clips left
            if (minStartTime !== 0) {
              useProjectStore.setState((state) => ({
                tracks: state.tracks.map(track => {
                  if (track.id === updatedTrack.id) {
                    return {
                      ...track,
                      clips: track.clips.map(c => ({
                        ...c,
                        startTime: c.startTime - minStartTime,
                      })),
                    };
                  }
                  return track;
                }),
              }));
            }
          }
        }
      }

      setTrimMode('none');
      setCursorType('default');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTrimEnd = () => {
    const originalEndTime = clip.startTime + clip.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const deltaTime = deltaX / pixelsPerSecond;

      // Get the original media duration from mediaFiles
      const originalMediaDuration = media ? media.duration : originalClipDuration.current;

      // Calculate new end time
      const newEndTime = clip.startTime + originalClipDuration.current + deltaTime;
      const minEndTime = clip.startTime + 0.1; // Keep minimum 0.1s duration

      // Allow expanding back to original media duration
      const maxEndTime = clip.startTime + (originalMediaDuration - clip.inPoint);
      const clampedEndTime = Math.max(minEndTime, Math.min(newEndTime, maxEndTime));

      // Update the clip by trimming the end
      trimClipEnd(clip.id, clampedEndTime);
    };

    const handleMouseUp = () => {
      // Auto-snap adjacent clips after trimming
      const currentState = useProjectStore.getState();
      const currentTrack = currentState.tracks.find(t =>
        t.clips.some(c => c.id === clip.id)
      );

      if (currentTrack) {
        const currentClip = currentTrack.clips.find(c => c.id === clip.id);
        if (currentClip) {
          const newEndTime = currentClip.startTime + currentClip.duration;
          const timeDiff = newEndTime - originalEndTime;

          // Find clips that were connected to the original end position
          const connectedClips = currentTrack.clips.filter(c =>
            c.id !== clip.id && Math.abs(c.startTime - originalEndTime) < 0.01
          );

          // Move connected clips to maintain the connection
          if (connectedClips.length > 0 && Math.abs(timeDiff) > 0.01) {
            useProjectStore.setState((state) => ({
              tracks: state.tracks.map(track => {
                if (track.id === currentTrack.id) {
                  return {
                    ...track,
                    clips: track.clips.map(c => {
                      // Check if this clip was connected to the trimmed clip
                      if (connectedClips.some(cc => cc.id === c.id)) {
                        return {
                          ...c,
                          startTime: newEndTime, // Snap to new end position
                        };
                      }
                      return c;
                    }),
                  };
                }
                return track;
              }),
            }));
          }
        }
      }

      setTrimMode('none');
      setCursorType('default');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragMove = () => {
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;
      const deltaTime = deltaX / pixelsPerSecond;
      let newStartTime = dragStartTime.current + deltaTime;

      const currentState = useProjectStore.getState();
      const currentTrack = currentState.tracks.find(t =>
        t.clips.some(c => c.id === clip.id)
      );

      if (!currentTrack) return;

      // Check for edge snapping with other clips on the same track
      const SNAP_THRESHOLD = 1.0; // 1 second snap threshold for easier alignment
      let snappedTime = newStartTime;
      let closestDistance = SNAP_THRESHOLD;

      for (const otherClip of currentTrack.clips) {
        if (otherClip.id === clip.id) continue; // Skip self

        const otherClipEnd = otherClip.startTime + otherClip.duration;
        const thisClipEnd = newStartTime + clip.duration;

        // Snap this clip's start to other clip's end
        const distanceToOtherEnd = Math.abs(newStartTime - otherClipEnd);
        if (distanceToOtherEnd < closestDistance) {
          closestDistance = distanceToOtherEnd;
          snappedTime = otherClipEnd;
        }

        // Snap this clip's end to other clip's start
        const distanceToOtherStart = Math.abs(thisClipEnd - otherClip.startTime);
        if (distanceToOtherStart < closestDistance) {
          closestDistance = distanceToOtherStart;
          snappedTime = otherClip.startTime - clip.duration;
        }
      }

      newStartTime = snappedTime;

      // Update the dragged clip position first
      useProjectStore.setState((state) => ({
        tracks: state.tracks.map(track => ({
          ...track,
          clips: track.clips.map(c =>
            c.id === clip.id ? { ...c, startTime: newStartTime } : c
          ),
        })),
      }));

      // Apply magnetic timeline: only prevent clips from going negative
      const updatedState = useProjectStore.getState();
      const updatedTrack = updatedState.tracks.find(t => t.id === currentTrack.id);

      if (updatedTrack && updatedTrack.clips.length > 0) {
        // Find the minimum start time across all clips
        const minStartTime = Math.min(...updatedTrack.clips.map(c => c.startTime));

        // If any clip is before 0, shift all clips right so the leftmost is at 0
        if (minStartTime < 0) {
          const shiftAmount = -minStartTime;
          useProjectStore.setState((state) => ({
            tracks: state.tracks.map(track => {
              if (track.id === currentTrack.id) {
                return {
                  ...track,
                  clips: track.clips.map(c => ({
                    ...c,
                    startTime: c.startTime + shiftAmount,
                  })),
                };
              }
              return track;
            }),
          }));
        }
        // Don't shift clips left if they're already after 0 - allow positioning anywhere
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      // Now commit the move with history
      const currentState = useProjectStore.getState();
      const currentClip = currentState.tracks
        .flatMap(t => t.clips)
        .find(c => c.id === clip.id);

      if (currentClip && currentClip.startTime !== dragStartTime.current) {
        // Move clip will save to history
        moveClip(clip.id, currentClip.startTime);
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Get the appropriate cursor style
  const getCursorStyle = () => {
    switch (cursorType) {
      case 'trim-start':
        return 'col-resize';
      case 'trim-end':
        return 'col-resize';
      case 'move':
        return 'move';
      default:
        return 'default';
    }
  };

  return (
    <div
      ref={clipRef}
      className={cn(
        "timeline-clip",
        isSelected && "selected",
        isDragging && "dragging",
        trimMode !== 'none' && "trimming"
      )}
      style={{
        left: `${clip.startTime * pixelsPerSecond}px`,
        width: `${clipWidth}px`,
        cursor: getCursorStyle(),
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-full overflow-hidden">
        {/* Waveform for audio clips */}
        {trackType === 'audio' && peaks.length > 0 && (
          <div className="absolute inset-0">
            <Waveform
              audioPath={media.path}
              width={clipWidth}
              height={52}
              peaks={peaks}
              color={isSelected ? '#93c5fd' : '#60a5fa'}
            />
          </div>
        )}

        {/* Clip info overlay */}
        <div className="absolute inset-0 px-2 py-1 flex flex-col justify-between">
          <p className="text-xs truncate font-medium">{media.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDuration(clip.duration)}
          </p>
        </div>

        {/* Trim handles - more visible when hovering near edges */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 transition-all",
            cursorType === 'trim-start' || trimMode === 'start'
              ? "bg-blue-500 w-2"
              : "bg-primary/30"
          )}
          style={{ pointerEvents: 'none' }}
        />
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1 transition-all",
            cursorType === 'trim-end' || trimMode === 'end'
              ? "bg-blue-500 w-2"
              : "bg-primary/30"
          )}
          style={{ pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}