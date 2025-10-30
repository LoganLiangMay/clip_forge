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

  // Use actual trimmed duration for visual width
  const trimmedDuration = clip.outPoint - clip.inPoint;
  const clipWidth = trimmedDuration * pixelsPerSecond;

  const { peaks } = useWaveform(trackType === 'audio' ? media.path : '');
  const TRIM_HANDLE_WIDTH = 15; // Width in pixels for trim detection - increased for easier grabbing

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
      console.log('[TimelineClip] Clip selected:', clip.id);
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
      // Store actual trimmed duration for accurate calculations
      originalClipDuration.current = clip.outPoint - clip.inPoint;
      handleTrimStart();
    } else if (cursorType === 'trim-end') {
      setTrimMode('end');
      // Store actual trimmed duration for accurate calculations
      originalClipDuration.current = clip.outPoint - clip.inPoint;
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

      // Update the clip by trimming the start - immediate feedback, no throttling
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
          // Find clips that END before/at the new start position (auto-snap - always connect clips)
          const nearbyClips = currentTrack.clips.filter(c => {
            const clipEnd = c.startTime + (c.outPoint - c.inPoint);
            // Snap any clip whose end is before or near our new start
            return c.id !== clip.id && clipEnd <= newStartTime + 0.1;
          }).sort((a, b) => {
            // Sort by end time, get the rightmost clip
            const aEnd = a.startTime + (a.outPoint - a.inPoint);
            const bEnd = b.startTime + (b.outPoint - b.inPoint);
            return bEnd - aEnd; // Descending order
          });

          // Snap to the rightmost clip before us
          const clipToSnap = nearbyClips[0];

          // Snap the previous clip (extend its end to meet new start)
          if (clipToSnap) {
            console.log(`[trimClipStart] Auto-snapping previous clip ${clipToSnap.id} to connect at ${newStartTime.toFixed(3)}`);
            useProjectStore.setState((state) => ({
              tracks: state.tracks.map(track => {
                if (track.id === currentTrack.id) {
                  return {
                    ...track,
                    clips: track.clips.map(c => {
                      // Only extend the clip immediately before us
                      if (c.id === clipToSnap.id) {
                        // Extend this clip's outPoint to connect to new start
                        const newDuration = newStartTime - c.startTime;
                        const newOutPoint = c.inPoint + newDuration;
                        if (newDuration >= 0.1) {
                          console.log(`[trimClipStart] Extending clip from ${(c.outPoint - c.inPoint).toFixed(3)}s to ${newDuration.toFixed(3)}s`);
                          return {
                            ...c,
                            duration: newDuration,
                            outPoint: newOutPoint,
                          };
                        }
                      }
                      return c;
                    }),
                  };
                }
                return track;
              }),
            }));
          }

          // Apply magnetic timeline for LEFTMOST clip
          // Always snap the first clip to 00:00 after left-edge trim
          const updatedState = useProjectStore.getState();
          const updatedTrack = updatedState.tracks.find(t => t.id === currentTrack.id);
          if (updatedTrack && updatedTrack.clips.length > 0) {
            // Find the leftmost clip (smallest startTime)
            const sortedClips = [...updatedTrack.clips].sort((a, b) => a.startTime - b.startTime);
            const leftmostClip = sortedClips[0];

            // If this is the leftmost clip and it's not at 0, snap it to 0
            if (leftmostClip.id === currentClip.id && leftmostClip.startTime !== 0) {
              console.log(`[trimClipStart-magnetic] Leftmost clip detected, snapping to 0 from ${leftmostClip.startTime}`);

              const shiftAmount = leftmostClip.startTime;

              useProjectStore.setState((state) => {
                const updatedTracks = state.tracks.map(track => {
                  if (track.id === updatedTrack.id) {
                    return {
                      ...track,
                      clips: track.clips.map(c => ({
                        ...c,
                        startTime: c.startTime - shiftAmount, // Shift all clips left
                      })),
                    };
                  }
                  return track;
                });

                // Recalculate project duration after magnetic snap
                const clipDurations = updatedTracks.flatMap(t => t.clips.map(c => {
                  const trimmedDuration = c.outPoint - c.inPoint;
                  const endTime = c.startTime + trimmedDuration;
                  return endTime;
                }));
                const maxEndTime = Math.max(0, ...clipDurations);
                console.log(`[trimClipStart-magnetic] New project duration after snap to 0: ${maxEndTime}`);

                return {
                  tracks: updatedTracks,
                  duration: maxEndTime,
                };
              });
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
    // Use trimmed duration for original end time
    const originalEndTime = clip.startTime + (clip.outPoint - clip.inPoint);
    console.log(`[handleTrimEnd] Starting trim from right edge: originalEndTime=${originalEndTime.toFixed(3)}s`);

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

      // Calculate expected new width
      const expectedDuration = clampedEndTime - clip.startTime;
      const expectedWidth = expectedDuration * pixelsPerSecond;
      console.log(`[handleTrimEnd] deltaX=${deltaX.toFixed(2)}px, newEndTime=${clampedEndTime.toFixed(3)}s, expectedWidth=${expectedWidth.toFixed(2)}px`);

      // Update the clip by trimming the end - immediate feedback, no throttling
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
          // Use trimmed duration for new end time
          const newEndTime = currentClip.startTime + (currentClip.outPoint - currentClip.inPoint);
          const timeDiff = newEndTime - originalEndTime;

          // Find clips that START after the new end position (auto-snap - always connect clips)
          const nextClips = currentTrack.clips.filter(c =>
            c.id !== clip.id && c.startTime >= newEndTime - 0.1
          ).sort((a, b) => a.startTime - b.startTime); // Ascending order

          // Snap to the leftmost clip after us
          const clipToSnap = nextClips[0];

          // Snap the next clip to maintain connection
          if (clipToSnap) {
            console.log(`[trimClipEnd] Auto-snapping next clip ${clipToSnap.id} from ${clipToSnap.startTime.toFixed(3)} to ${newEndTime.toFixed(3)}`);
            useProjectStore.setState((state) => ({
              tracks: state.tracks.map(track => {
                if (track.id === currentTrack.id) {
                  return {
                    ...track,
                    clips: track.clips.map(c => {
                      // Only move the clip immediately after us
                      if (c.id === clipToSnap.id) {
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

        // Use trimmed duration for accurate snapping
        const otherClipEnd = otherClip.startTime + (otherClip.outPoint - otherClip.inPoint);
        const thisClipDuration = clip.outPoint - clip.inPoint;
        const thisClipEnd = newStartTime + thisClipDuration;

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
          snappedTime = otherClip.startTime - thisClipDuration;
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
          useProjectStore.setState((state) => {
            const updatedTracks = state.tracks.map(track => {
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
            });

            // Recalculate project duration after magnetic snap
            const clipDurations = updatedTracks.flatMap(t => t.clips.map(c => {
              const trimmedDuration = c.outPoint - c.inPoint;
              const endTime = c.startTime + trimmedDuration;
              return endTime;
            }));
            const maxEndTime = Math.max(0, ...clipDurations);

            return {
              tracks: updatedTracks,
              duration: maxEndTime,
            };
          });
        }
        // Don't shift clips left if they're already after 0 - allow positioning anywhere
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      // Now commit the move with history
      const currentState = useProjectStore.getState();
      const currentTrack = currentState.tracks.find(t =>
        t.clips.some(c => c.id === clip.id)
      );
      const currentClip = currentState.tracks
        .flatMap(t => t.clips)
        .find(c => c.id === clip.id);

      if (currentClip && currentClip.startTime !== dragStartTime.current) {
        // Check if this is the only clip on the track
        const isOnlyClip = currentTrack && currentTrack.clips.length === 1;

        // If it's the only clip, auto-snap to 0
        const finalStartTime = isOnlyClip ? 0 : currentClip.startTime;

        if (isOnlyClip && currentClip.startTime !== 0) {
          console.log(`[moveClip] Single clip detected - auto-snapping to 0`);
        }

        // Move clip will save to history
        moveClip(clip.id, finalStartTime);
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

  // Check if this is an AI-generated clip
  const isAIClip = clip.id.startsWith('ai-');

  return (
    <div
      ref={clipRef}
      className={cn(
        "timeline-clip",
        isSelected && "selected",
        isDragging && "dragging",
        trimMode !== 'none' && "trimming",
        isAIClip && "ai-clip"
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
            {formatDuration(trimmedDuration)}
          </p>
        </div>

        {/* Trim handles - more visible when hovering near edges */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 transition-all",
            cursorType === 'trim-start' || trimMode === 'start'
              ? "bg-blue-500 w-3"
              : "bg-primary/40"
          )}
          style={{ pointerEvents: 'none' }}
        />
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1.5 transition-all",
            cursorType === 'trim-end' || trimMode === 'end'
              ? "bg-blue-500 w-3"
              : "bg-primary/40"
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