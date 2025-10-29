import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';

export const useVideoComposition = (videoElement: HTMLVideoElement | null) => {
  const { tracks, currentTime, setCurrentTime, mediaFiles } = useProjectStore();
  const [currentClip, setCurrentClip] = useState<any>(null);
  const [isComposing, setIsComposing] = useState(false);
  const isPlayingRef = useRef(false);
  const updatingFromVideoRef = useRef(false);
  const justLoadedRef = useRef(false);
  const lastSeekTimeRef = useRef<number>(0);
  const isSeekingRef = useRef(false);
  const shouldPlayAfterSeekRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const lastProcessedTimeRef = useRef<number>(-1);
  const loadingClipIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    // Skip if update is coming from video playback itself (but not during transitions)
    if (updatingFromVideoRef.current && !isTransitioningRef.current) {
      updatingFromVideoRef.current = false;
      return;
    }
    // Clear the flag if we're transitioning
    if (isTransitioningRef.current && updatingFromVideoRef.current) {
      updatingFromVideoRef.current = false;
    }

    // Skip small time changes during normal playback, but allow during transitions
    if (isPlayingRef.current && !isTransitioningRef.current) {
      const timeDiff = Math.abs(currentTime - lastSeekTimeRef.current);
      if (timeDiff < 0.5) {
        // Small change, likely from playback - skip
        return;
      }
      // Large change, user seeked manually - continue to seek
    }

    // During transitions, always allow the effect to run to load the next clip
    if (isTransitioningRef.current) {
      console.log('Processing transition at time:', currentTime, 'currentClip:', currentClip?.id);
      // During transition, we need to load the new clip
      // Don't skip the effect during transitions
    }

    lastSeekTimeRef.current = currentTime;

    // Find the active clip at the current time
    const findActiveClip = () => {
      for (const track of tracks) {
        if (track.type === 'video') {
          // Sort clips by start time to handle them in order
          const sortedClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);

          // During transitions, prioritize clips that are starting
          if (isTransitioningRef.current) {
            // Look for a clip starting at the current time
            for (const clip of sortedClips) {
              if (Math.abs(clip.startTime - currentTime) < 0.1) {
                console.log('Found clip for transition:', clip.id, 'start:', clip.startTime, 'currentTime:', currentTime);
                return { clip, track };
              }
            }
          }

          // Normal case: find clips that contain the current time
          for (const clip of sortedClips) {
            const clipStart = clip.startTime;
            const clipEnd = clip.startTime + clip.duration;

            // Use small epsilon for floating point comparison
            const epsilon = 0.001;

            // Check if current time falls within this clip
            if (currentTime >= clipStart - epsilon && currentTime < clipEnd - epsilon) {
              return { clip, track };
            }
          }

          // Fallback: find clip starting at or very close to current time
          for (const clip of sortedClips) {
            if (Math.abs(clip.startTime - currentTime) < 0.1) {
              console.log('Found clip at boundary:', clip.id, 'start:', clip.startTime, 'currentTime:', currentTime);
              return { clip, track };
            }
          }
        }
      }

      return null;
    };

    const activeClipData = findActiveClip();

    if (!activeClipData && isTransitioningRef.current) {
      console.log('No active clip found during transition at time:', currentTime);
      // Log all clips for debugging
      tracks.forEach(track => {
        if (track.type === 'video') {
          track.clips.forEach(clip => {
            console.log('  Clip:', clip.id, 'start:', clip.startTime, 'end:', clip.startTime + clip.duration);
          });
        }
      });
    }

    if (activeClipData) {
      const { clip, track } = activeClipData;
      const media = mediaFiles.find(f => f.id === clip.mediaId);

      if (media && currentClip?.id !== clip.id && loadingClipIdRef.current !== clip.id) {
        // Switch to new clip
        console.log('Switching to new clip:', clip.id, 'at time:', currentTime, 'from clip:', currentClip?.id, 'media:', media.name, 'isTransitioning:', isTransitioningRef.current);
        loadingClipIdRef.current = clip.id;
        setCurrentClip(clip);

        // Save the current playing state before pausing
        // During transitions, we want to keep playing
        const wasPlayingBeforeSwitch = isPlayingRef.current || isTransitioningRef.current;

        // Pause before changing source to avoid AbortError
        videoElement.pause();
        // Keep the playing state so we can resume after loading
        // During transitions, keep playing state as true
        if (isTransitioningRef.current) {
          isPlayingRef.current = true;
        } else {
          isPlayingRef.current = wasPlayingBeforeSwitch;
        }
        justLoadedRef.current = true;

        // Use file:// URLs directly since we have webSecurity disabled
        // Properly format the file URL for local files
        const fileUrl = `file://${media.path}`;

        console.log('Loading video with URL:', fileUrl, 'from path:', media.path);

        // Add error handler to track loading issues
        const onError = (e: Event) => {
          console.error('Video failed to load');
          console.error('Path:', media.path);
          console.error('URL:', fileUrl);
          console.error('Error:', videoElement.error);
          loadingClipIdRef.current = null; // Clear loading state on error
        };
        videoElement.addEventListener('error', onError, { once: true });

        videoElement.src = fileUrl;

        // Set initial position and volume once video is ready
        const onLoadedMetadata = async () => {
          videoElement.removeEventListener('error', onError);

          const offsetInClip = currentTime - clip.startTime;
          // Ensure we don't seek beyond the clip's duration
          const clampedOffset = Math.min(offsetInClip, clip.duration - 0.01);
          const videoTime = clip.inPoint + clampedOffset;

          // Also ensure we don't seek beyond the clip's out-point
          const clipOutPoint = clip.inPoint + clip.duration;
          const clampedVideoTime = Math.min(videoTime, clipOutPoint);

          console.log('Video metadata loaded. Setting position:', {
            currentTime,
            clipStartTime: clip.startTime,
            offsetInClip,
            videoTime: clampedVideoTime,
            videoDuration: videoElement.duration
          });

          // Seek to the correct position in the new clip
          const wasPlaying = isPlayingRef.current && !videoElement.paused;
          isSeekingRef.current = true;
          videoElement.currentTime = clampedVideoTime;

          // Verify the seek was successful
          setTimeout(() => {
            console.log('After seek - video.currentTime:', videoElement.currentTime, 'expected:', clampedVideoTime, 'isPlaying:', isPlayingRef.current, 'paused:', videoElement.paused);

            // Resume playback if it was playing before clip transition
            if (isPlayingRef.current && videoElement.paused) {
              console.log('Resuming playback after clip transition');
              videoElement.play().catch(err => {
                if (err.name !== 'AbortError') {
                  console.error('Error resuming playback:', err);
                }
              });
            }
          }, 100);

          // Apply volume based on track mute state and clip volume
          videoElement.volume = track.muted ? 0 : clip.volume;
          justLoadedRef.current = false;
          isTransitioningRef.current = false;
          loadingClipIdRef.current = null;

          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
        };

        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
      } else if (media && currentClip?.id === clip.id && !justLoadedRef.current) {
        // Seek when user manually changed timeline position
        const offsetInClip = currentTime - clip.startTime;

        // Make sure we don't seek beyond the clip's duration
        const maxOffset = Math.min(offsetInClip, clip.duration - 0.01); // Small buffer to prevent edge cases
        const videoTime = clip.inPoint + maxOffset;

        // Also ensure we don't seek beyond the clip's out-point
        const clipOutPoint = clip.inPoint + clip.duration;
        const clampedVideoTime = Math.min(videoTime, clipOutPoint);

        // Only seek if there's a significant difference (avoid jitter)
        if (Math.abs(videoElement.currentTime - clampedVideoTime) > 0.1) {
          // Temporarily pause if playing to avoid interruption
          const wasPlaying = !videoElement.paused;
          if (wasPlaying) {
            videoElement.pause();
            shouldPlayAfterSeekRef.current = true;
          }

          isSeekingRef.current = true;

          // Make sure we don't seek beyond video duration or clip out-point
          const safeVideoTime = Math.min(clampedVideoTime, videoElement.duration || clampedVideoTime);
          videoElement.currentTime = safeVideoTime;
        }

        // Apply volume based on track mute state and clip volume
        videoElement.volume = track.muted ? 0 : clip.volume;
      }
    } else {
      // No active clip - pause video but don't clear src to avoid errors
      if (videoElement.src && videoElement.src !== 'about:blank' && currentClip) {
        videoElement.pause();
        // Instead of clearing src which causes errors, just pause and hide
        // The video element will retain its last frame
        setCurrentClip(null);
        isPlayingRef.current = false;
        // Remove the src only if absolutely necessary (never loaded any video)
        // videoElement.removeAttribute('src'); // Don't set empty string
      }
    }
  }, [currentTime, tracks, mediaFiles, videoElement, currentClip]);

  // Handle video time updates
  useEffect(() => {
    if (!videoElement) return;

    const handlePlay = () => {
      // If we're currently seeking, pause and defer playback until seek completes
      if (isSeekingRef.current) {
        videoElement.pause();
        shouldPlayAfterSeekRef.current = true;
        return;
      }

      // Check if video position matches timeline position
      if (currentClip) {
        const offsetInClip = currentTime - currentClip.startTime;
        // Ensure we don't seek beyond the clip's duration
        const clampedOffset = Math.min(offsetInClip, currentClip.duration - 0.01);
        const expectedVideoTime = currentClip.inPoint + clampedOffset;

        // Also ensure we don't seek beyond the clip's out-point
        const clipOutPoint = currentClip.inPoint + currentClip.duration;
        const clampedExpectedTime = Math.min(expectedVideoTime, clipOutPoint);

        // If video is not at the expected position, seek first
        if (Math.abs(videoElement.currentTime - clampedExpectedTime) > 0.1) {
          isSeekingRef.current = true;
          shouldPlayAfterSeekRef.current = true;
          videoElement.currentTime = clampedExpectedTime;
          return;
        }
      }

      isPlayingRef.current = true;
    };

    const handlePause = () => {
      isPlayingRef.current = false;
    };

    const handleError = (e: Event) => {
      // Only log meaningful errors, skip empty src errors
      if (videoElement.error && videoElement.error.code !== 4) {
        console.error('Video error:', videoElement.error);
      } else if (videoElement.error && videoElement.error.code === 4) {
        // Code 4 is MEDIA_SRC_NOT_SUPPORTED - usually empty src
        // This can happen during transitions, not a real error
        console.debug('Video src cleared or not supported (expected during clip transitions)');
      }
    };

    const handleTimeUpdate = () => {
      // Don't update timeline position while seeking
      if (isSeekingRef.current) {
        return;
      }

      // If we're transitioning, don't process time updates from the old video
      if (isTransitioningRef.current) {
        return;
      }

      if (currentClip && !isComposing) {
        const clipStart = currentClip.startTime;
        const clipEnd = currentClip.startTime + currentClip.duration;
        const videoTime = videoElement.currentTime;
        const timelineTime = clipStart + (videoTime - currentClip.inPoint);

        // Check if we've reached the out-point of the trimmed clip
        const clipOutPoint = currentClip.inPoint + currentClip.duration;
        if (videoTime >= clipOutPoint - 0.1) { // Small buffer to prevent repeated triggers
          // Prevent this from triggering multiple times
          if (isTransitioningRef.current) {
            return;
          }

          // Clip ended - move to next clip or stop
          console.log('Clip ended at videoTime:', videoTime, 'clipOutPoint:', clipOutPoint);

          // Check if there's a next clip on the same track to continue playing
          const currentTrack = tracks.find(t =>
            t.clips.some(c => c.id === currentClip.id)
          );

          if (currentTrack) {
            // Find next clip that starts at or after current clip end
            const nextClip = currentTrack.clips
              .filter(c => c.startTime >= clipEnd - 0.01) // Small tolerance
              .sort((a, b) => a.startTime - b.startTime)[0];

            if (nextClip && Math.abs(nextClip.startTime - clipEnd) < 0.01) {
              // Next clip is directly connected - continue playing
              console.log('Continuing to next clip at', clipEnd, 'nextClip:', nextClip.id);

              // Mark as transitioning immediately
              isTransitioningRef.current = true;
              loadingClipIdRef.current = null; // Clear loading ref to allow next clip to load

              // Clear current clip to force reload of next clip
              const oldClipId = currentClip.id;
              setCurrentClip(null);

              // Keep playing state true so the next clip auto-plays
              const wasPlaying = isPlayingRef.current;
              isPlayingRef.current = true;

              // Pause the current video to stop triggering time updates
              videoElement.pause();

              // Update the timeline position to the start of the next clip
              // Don't set updatingFromVideoRef during transitions - we need the effect to run
              setCurrentTime(clipEnd);

              console.log('Transition setup complete, moving from clip:', oldClipId, 'to time:', clipEnd);

              // Clear transition flag after a delay to allow the effect to process
              setTimeout(() => {
                isTransitioningRef.current = false;
              }, 500);
            } else {
              // No connected clip - pause playback
              console.log('No connected clip found - pausing');
              videoElement.pause();
              isPlayingRef.current = false;
              updatingFromVideoRef.current = true;
              setCurrentTime(clipEnd);
            }
          } else {
            videoElement.pause();
            isPlayingRef.current = false;
            updatingFromVideoRef.current = true;
            setCurrentTime(clipEnd);
          }
        } else if (timelineTime >= clipStart && timelineTime < clipEnd) {
          // Update timeline position if within clip bounds
          updatingFromVideoRef.current = true;
          setCurrentTime(timelineTime);
        }
      }
    };

    const handleEnded = () => {
      // Video clip ended, move to next clip or stop
      if (currentClip) {
        const clipEnd = currentClip.startTime + currentClip.duration;
        updatingFromVideoRef.current = true;
        setCurrentTime(clipEnd);
      }
      isPlayingRef.current = false;
    };

    const handleSeeking = () => {
      console.log('Seeking started. Target position:', videoElement.currentTime);
    };

    const handleSeeked = () => {
      // Seeking completed
      console.log('Seek completed. Current video position:', videoElement.currentTime);
      isSeekingRef.current = false;

      // Resume playback if we need to
      if (shouldPlayAfterSeekRef.current) {
        shouldPlayAfterSeekRef.current = false;
        console.log('Resuming playback after seek...');
        videoElement.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Resume play after seek error:', err);
          }
        });
      }
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);
    videoElement.addEventListener('seeking', handleSeeking);
    videoElement.addEventListener('seeked', handleSeeked);

    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
      videoElement.removeEventListener('seeking', handleSeeking);
      videoElement.removeEventListener('seeked', handleSeeked);
    };
  }, [videoElement, currentClip, currentTime, isComposing, setCurrentTime, setCurrentClip, tracks]);

  return {
    currentClip,
    isComposing,
  };
};