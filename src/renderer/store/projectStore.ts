import { create } from 'zustand';
import { useHistoryStore } from './historyStore';

export interface MediaFile {
  id: string;
  path: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  metadata?: any;
  thumbnail?: string;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  volume: number;
  effects: any[];
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  muted: boolean;
  locked: boolean;
  clips: TimelineClip[];
}

interface ProjectState {
  projectName: string;
  projectPath: string | null;
  isDirty: boolean;
  mediaFiles: MediaFile[];
  tracks: Track[];
  currentTime: number;
  duration: number;
  selectedClipId: string | null;

  // Actions
  createNewProject: () => void;
  loadProject: (data: any) => void;
  saveProject: () => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  addClipToTimeline: (mediaId: string, trackId: string, startTime: number) => void;
  removeClipFromTimeline: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  setCurrentTime: (time: number) => void;
  selectClip: (clipId: string | null) => void;
  markDirty: () => void;
  splitClip: (clipId: string, splitTime: number) => void;
  trimClipStart: (clipId: string, newStartTime: number) => void;
  trimClipEnd: (clipId: string, newEndTime: number) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  duplicateClip: (clipId: string) => void;
  createTrack: (type: 'video' | 'audio', index?: number) => string;
  removeEmptyTracks: () => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  addAIClipsToTimeline: (insertions: any[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: 'Untitled Project',
  projectPath: null,
  isDirty: false,
  mediaFiles: [],
  tracks: [], // Start with empty tracks - dynamically created
  currentTime: 0,
  duration: 0,
  selectedClipId: null,

  createNewProject: () => set({
    projectName: 'Untitled Project',
    projectPath: null,
    isDirty: false,
    mediaFiles: [],
    tracks: [], // Start with empty tracks
    currentTime: 0,
    duration: 0,
    selectedClipId: null,
  }),

  loadProject: (data) => set(data),

  saveProject: () => {
    // Saving is handled in the App component
    set({ isDirty: false });
  },

  addMediaFile: (file) => set((state) => ({
    mediaFiles: [...state.mediaFiles, file],
    isDirty: true,
  })),

  removeMediaFile: (id) => set((state) => ({
    mediaFiles: state.mediaFiles.filter(f => f.id !== id),
    isDirty: true,
  })),

  addClipToTimeline: (mediaId, trackId, startTime) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
      const media = state.mediaFiles.find(f => f.id === mediaId);
      if (!media) return state;

      const mediaType = media.type === 'audio' ? 'audio' : 'video';
      let targetTrackId = trackId;
      let finalStartTime = startTime;
      let updatedTracks = [...state.tracks];

      // Get all existing clips across all tracks of this media type
      const allClipsOfType = updatedTracks
        .filter(t => t.type === mediaType)
        .flatMap(t => t.clips);

      // FIRST CLIP LOGIC: If this is the first clip of this type, force it to start at 00:00
      if (allClipsOfType.length === 0) {
        finalStartTime = 0;

        // Create the first track for this type
        const tracksOfType = updatedTracks.filter(t => t.type === mediaType);
        const trackNumber = tracksOfType.length + 1;
        const trackName = mediaType === 'video' ? `Video ${trackNumber}` : `Audio ${trackNumber}`;
        targetTrackId = `${mediaType.charAt(0)}${Date.now()}`;

        const newTrack: Track = {
          id: targetTrackId,
          name: trackName,
          type: mediaType,
          muted: false,
          locked: false,
          clips: [],
        };

        // Insert video tracks at the beginning, audio tracks at the end
        if (mediaType === 'video') {
          updatedTracks = [newTrack, ...updatedTracks];
        } else {
          updatedTracks = [...updatedTracks, newTrack];
        }
      } else {
        // SUBSEQUENT CLIPS: Respect user's drop position, but find appropriate track
        const tracksOfType = updatedTracks.filter(t => t.type === mediaType);
        const SNAP_THRESHOLD = 30.0; // Snap within 30 seconds - very generous like CapCut

        console.log(`addClipToTimeline: trackId=${trackId}, startTime=${finalStartTime}, mediaType=${mediaType}`);

        // If trackId is provided and valid, use it (user dropped on specific track)
        if (trackId && tracksOfType.some(t => t.id === trackId)) {
          targetTrackId = trackId;
          console.log(`Track found: ${trackId}`);

          // ALWAYS snap clips end-to-end on the same track
          const targetTrack = tracksOfType.find(t => t.id === trackId);
          console.log(`Target track has ${targetTrack?.clips.length || 0} clips`);

          if (targetTrack && targetTrack.clips.length > 0) {
            // Sort clips by start time to find the rightmost clip
            const sortedClips = [...targetTrack.clips].sort((a, b) => a.startTime - b.startTime);
            const rightmostClip = sortedClips[sortedClips.length - 1];
            // Use actual trimmed duration
            const rightmostEnd = rightmostClip.startTime + (rightmostClip.outPoint - rightmostClip.inPoint);

            // ALWAYS place new clip at the end of the last clip
            console.log(`Auto-snapping to end of last clip at ${rightmostEnd}`);
            finalStartTime = rightmostEnd;
          } else {
            // Empty track - place at the drop position or start
            finalStartTime = Math.max(0, finalStartTime);
          }
        } else if (!trackId) {
          // Otherwise, try to place on an existing track where it fits without overlap
          let placedOnExistingTrack = false;
          for (const track of tracksOfType) {
            // Check if clip would overlap with any existing clips on this track
            const wouldOverlap = track.clips.some(existingClip => {
              const newEnd = finalStartTime + media.duration;
              // Use actual trimmed duration for existing clips
              const existingEnd = existingClip.startTime + (existingClip.outPoint - existingClip.inPoint);
              return !(newEnd <= existingClip.startTime || finalStartTime >= existingEnd);
            });

            if (!wouldOverlap) {
              targetTrackId = track.id;
              placedOnExistingTrack = true;
              break;
            }
          }

          // If no existing track works, create a new track
          if (!placedOnExistingTrack) {
            const trackNumber = tracksOfType.length + 1;
            const trackName = mediaType === 'video' ? `Video ${trackNumber}` : `Audio ${trackNumber}`;
            targetTrackId = `${mediaType.charAt(0)}${Date.now()}`;

            const newTrack: Track = {
              id: targetTrackId,
              name: trackName,
              type: mediaType,
              muted: false,
              locked: false,
              clips: [],
            };

            // Insert new track right after the last track of the same type
            const lastTrackIndex = updatedTracks.map(t => t.type).lastIndexOf(mediaType);
            if (lastTrackIndex >= 0) {
              updatedTracks = [
                ...updatedTracks.slice(0, lastTrackIndex + 1),
                newTrack,
                ...updatedTracks.slice(lastTrackIndex + 1),
              ];
            } else {
              // If no tracks of this type exist (shouldn't happen), add appropriately
              if (mediaType === 'video') {
                updatedTracks = [newTrack, ...updatedTracks];
              } else {
                updatedTracks = [...updatedTracks, newTrack];
              }
            }
          }
        }
      }

      // Validate media duration before creating clip
      const validDuration = isFinite(media.duration) && media.duration > 0 ? media.duration : 10; // Default to 10s if invalid
      if (!isFinite(media.duration) || media.duration <= 0) {
        console.warn(`Media ${media.name} has invalid duration (${media.duration}), using default of 10s`);
      }

      // Create the new clip
      const newClip: TimelineClip = {
        id: Date.now().toString(),
        mediaId,
        trackId: targetTrackId,
        startTime: finalStartTime,
        duration: validDuration,
        inPoint: 0,
        outPoint: validDuration,
        volume: 1,
        effects: [],
      };

      // Add clip to the target track
      updatedTracks = updatedTracks.map(track => {
        if (track.id === targetTrackId) {
          return {
            ...track,
            clips: [...track.clips, newClip].sort((a, b) => a.startTime - b.startTime),
          };
        }
        return track;
      });

      // Update project duration - ensure it's at least as long as all clips
      // Always calculate from trim points to ensure accuracy
      const maxEndTime = Math.max(
        0,
        ...updatedTracks.flatMap(t => t.clips.map(c => c.startTime + (c.outPoint - c.inPoint)))
      );

      console.log(`Project duration update: maxEndTime=${maxEndTime}, current duration=${state.duration}`);

      return {
        tracks: updatedTracks,
        duration: maxEndTime, // Always set to actual max end time, not just if it's larger
        isDirty: true,
      };
    });
  },

  removeClipFromTimeline: (clipId) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
      // Remove clip from tracks
      const tracksAfterRemoval = state.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.id !== clipId),
      }));

      // Auto-cleanup: Remove empty tracks
      const tracksWithClips = tracksAfterRemoval.filter(track => track.clips.length > 0);

      return {
        tracks: tracksWithClips,
        isDirty: true,
      };
    });
  },

  updateClip: (clipId, updates) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      ),
    })),
    isDirty: true,
  })),

  setCurrentTime: (time) => set({ currentTime: time }),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  markDirty: () => set({ isDirty: true }),

  // Clip editing operations
  splitClip: (clipId: string, splitTime: number) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
    const updatedTracks = state.tracks.map(track => {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      const relativeTime = splitTime - clip.startTime;

      // Create two new clips
      const clip1: TimelineClip = {
        ...clip,
        id: Date.now().toString(),
        duration: relativeTime,
        outPoint: clip.inPoint + relativeTime,
      };

      const clip2: TimelineClip = {
        ...clip,
        id: (Date.now() + 1).toString(),
        startTime: splitTime,
        duration: clip.duration - relativeTime,
        inPoint: clip.inPoint + relativeTime,
      };

      const newClips = [
        ...track.clips.slice(0, clipIndex),
        clip1,
        clip2,
        ...track.clips.slice(clipIndex + 1),
      ];

      return { ...track, clips: newClips };
    });

    return { tracks: updatedTracks, isDirty: true };
    });
  },

  trimClipStart: (clipId: string, newStartTime: number) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
    // First pass: Update the trimmed clip and calculate duration change
    let startTimeChange = 0;
    let trimmedClipTrackId = '';
    let oldStartTime = 0;

    const updatedTracks = state.tracks.map(track => {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      trimmedClipTrackId = track.id;
      oldStartTime = clip.startTime;

      console.log(`[trimClipStart] BEFORE: clipId=${clipId}, startTime=${clip.startTime}, duration=${clip.duration}, inPoint=${clip.inPoint}, outPoint=${clip.outPoint}`);
      console.log(`[trimClipStart] newStartTime=${newStartTime}`);

      const timeDiff = newStartTime - clip.startTime;
      const newDuration = clip.duration - timeDiff;
      const newInPoint = clip.inPoint + timeDiff;

      console.log(`[trimClipStart] Calculated: timeDiff=${timeDiff}, newDuration=${newDuration}, newInPoint=${newInPoint}`);

      // Allow expanding back to original (in-point can go down to 0)
      // but don't allow negative duration
      if (newDuration <= 0 || newInPoint < 0) return track;

      startTimeChange = newStartTime - oldStartTime;
      console.log(`[trimClipStart-RIPPLE] startTimeChange=${startTimeChange.toFixed(3)}`);

      const updatedClip = {
        ...clip,
        startTime: newStartTime,
        duration: newDuration,
        inPoint: newInPoint,
      };

      return {
        ...track,
        clips: track.clips.map(c => c.id === clipId ? updatedClip : c)
      };
    });

    // Update project duration after trimming (no ripple during drag)
    // Always calculate from trim points to ensure accuracy
    const clipDurations = updatedTracks.flatMap(t => t.clips.map(c => {
      const trimmedDuration = c.outPoint - c.inPoint;
      const endTime = c.startTime + trimmedDuration;
      return endTime;
    }));
    const maxEndTime = Math.max(0, ...clipDurations);

    // Auto-adjust currentTime if it's beyond the new clip end
    let adjustedCurrentTime = state.currentTime;
    const trimmedClip = updatedTracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (trimmedClip) {
      const clipEnd = trimmedClip.startTime + (trimmedClip.outPoint - trimmedClip.inPoint);
      if (state.currentTime > clipEnd) {
        adjustedCurrentTime = clipEnd;
      }
    }

    return {
      tracks: updatedTracks,
      duration: maxEndTime,
      currentTime: adjustedCurrentTime,
      isDirty: true
    };
    });
  },

  trimClipEnd: (clipId: string, newEndTime: number) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
    // First pass: Update the trimmed clip and calculate duration change
    let durationChange = 0;
    let trimmedClipTrackId = '';
    let oldEndTime = 0;

    const updatedTracks = state.tracks.map(track => {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      trimmedClipTrackId = track.id;

      console.log(`[trimClipEnd] BEFORE: clipId=${clipId}, startTime=${clip.startTime}, duration=${clip.duration}, inPoint=${clip.inPoint}, outPoint=${clip.outPoint}`);
      console.log(`[trimClipEnd] newEndTime=${newEndTime}`);

      const newDuration = newEndTime - clip.startTime;
      const newOutPoint = clip.inPoint + newDuration;

      console.log(`[trimClipEnd] Calculated: newDuration=${newDuration}, newOutPoint=${newOutPoint}`);

      // Validate that outPoint is greater than inPoint (minimum 0.1s clip)
      if (newOutPoint <= clip.inPoint + 0.1) {
        console.warn(`Cannot trim clip to less than 0.1s duration`);
        return track;
      }

      // Find the media to check against original duration
      const media = state.mediaFiles.find(m => m.id === clip.mediaId);
      const maxDuration = media && isFinite(media.duration) ? media.duration - clip.inPoint : newDuration;

      if (newDuration <= 0 || newDuration > maxDuration) return track;

      // Calculate how much the duration changed (for ripple)
      oldEndTime = clip.startTime + (clip.outPoint - clip.inPoint);
      const newEndTimeActual = clip.startTime + newDuration;
      durationChange = oldEndTime - newEndTimeActual;

      console.log(`[trimClipEnd-RIPPLE] oldEndTime=${oldEndTime.toFixed(3)}, newEndTime=${newEndTimeActual.toFixed(3)}, durationChange=${durationChange.toFixed(3)}`);

      // Update the trimmed clip
      const updatedClip = {
        ...clip,
        duration: newDuration,
        outPoint: newOutPoint,
      };

      return {
        ...track,
        clips: track.clips.map(c => c.id === clipId ? updatedClip : c)
      };
    });

    // Update project duration after trimming (no ripple during drag)
    // Always calculate from trim points to ensure accuracy
    const clipDurations = updatedTracks.flatMap(t => t.clips.map(c => {
      const trimmedDuration = c.outPoint - c.inPoint;
      const endTime = c.startTime + trimmedDuration;
      return endTime;
    }));
    const maxEndTime = Math.max(0, ...clipDurations);

    // Auto-adjust currentTime if it's beyond the new clip end
    let adjustedCurrentTime = state.currentTime;
    const trimmedClip = updatedTracks.flatMap(t => t.clips).find(c => c.id === clipId);
    if (trimmedClip) {
      const clipEnd = trimmedClip.startTime + (trimmedClip.outPoint - trimmedClip.inPoint);
      if (state.currentTime > clipEnd) {
        adjustedCurrentTime = clipEnd;
      }
    }

    return {
      tracks: updatedTracks,
      duration: maxEndTime,
      currentTime: adjustedCurrentTime,
      isDirty: true
    };
    });
  },

  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
    let clipToMove: TimelineClip | null = null;
    let sourceTrackId: string | null = null;

    // Find and remove clip from source track
    const tracksWithoutClip = state.tracks.map(track => {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        clipToMove = clip;
        sourceTrackId = track.id;
        return {
          ...track,
          clips: track.clips.filter(c => c.id !== clipId),
        };
      }
      return track;
    });

    if (!clipToMove) return state;

    // Add clip to target track
    const targetTrackId = newTrackId || sourceTrackId;
    const updatedTracks = tracksWithoutClip.map(track => {
      if (track.id === targetTrackId) {
        const movedClip = { ...clipToMove!, startTime: newStartTime };
        return {
          ...track,
          clips: [...track.clips, movedClip].sort((a, b) => a.startTime - b.startTime),
        };
      }
      return track;
    });

    // Update project duration
    // Always calculate from trim points to ensure accuracy
    const maxEndTime = Math.max(
      ...updatedTracks.flatMap(t => t.clips.map(c => c.startTime + (c.outPoint - c.inPoint)))
    );

    return {
      tracks: updatedTracks,
      duration: Math.max(state.duration, maxEndTime),
      isDirty: true,
    };
    });
  },

  duplicateClip: (clipId: string) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
    const updatedTracks = state.tracks.map(track => {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        const duplicatedClip: TimelineClip = {
          ...clip,
          id: Date.now().toString(),
          // Place after original using actual trimmed duration
          startTime: clip.startTime + (clip.outPoint - clip.inPoint),
        };
        return {
          ...track,
          clips: [...track.clips, duplicatedClip].sort((a, b) => a.startTime - b.startTime),
        };
      }
      return track;
    });

    return { tracks: updatedTracks, isDirty: true };
    });
  },

  createTrack: (type: 'video' | 'audio', index?: number) => {
    let trackId = '';
    set((state) => {
      const tracksOfType = state.tracks.filter(t => t.type === type);
      const trackNumber = tracksOfType.length + 1;
      const trackName = type === 'video' ? `Video ${trackNumber}` : `Audio ${trackNumber}`;
      trackId = `${type.charAt(0)}${Date.now()}`;

      const newTrack: Track = {
        id: trackId,
        name: trackName,
        type,
        muted: false,
        locked: false,
        clips: [],
      };

      let updatedTracks: Track[];
      if (index !== undefined) {
        // Insert at specific index
        updatedTracks = [
          ...state.tracks.slice(0, index),
          newTrack,
          ...state.tracks.slice(index),
        ];
      } else {
        // Add at end
        updatedTracks = [...state.tracks, newTrack];
      }

      return {
        tracks: updatedTracks,
        isDirty: true,
      };
    });
    return trackId;
  },

  removeEmptyTracks: () => {
    set((state) => ({
      tracks: state.tracks.filter(track => track.clips.length > 0),
      isDirty: true,
    }));
  },

  toggleTrackMute: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
      isDirty: true,
    }));
  },

  toggleTrackLock: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map(track =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      ),
      isDirty: true,
    }));
  },

  addAIClipsToTimeline: (insertions: any[]) => {
    // Save state before action
    const historyStore = useHistoryStore.getState();
    historyStore.saveState();

    set((state) => {
      let updatedTracks = [...state.tracks];

      // Find or create V2 track (second video track)
      const videoTracks = updatedTracks.filter(t => t.type === 'video');
      let v2Track = videoTracks.find(t => t.name === 'Video 2');

      if (!v2Track) {
        // Create V2 track
        const trackId = `v${Date.now()}`;
        v2Track = {
          id: trackId,
          name: 'Video 2',
          type: 'video',
          muted: false,
          locked: false,
          clips: [],
        };

        // Insert V2 track after Video 1
        const video1Index = updatedTracks.findIndex(t => t.name === 'Video 1');
        if (video1Index >= 0) {
          updatedTracks = [
            ...updatedTracks.slice(0, video1Index + 1),
            v2Track,
            ...updatedTracks.slice(video1Index + 1),
          ];
        } else {
          updatedTracks = [v2Track, ...updatedTracks];
        }
      }

      // Add AI clips to V2 track
      const newClips: TimelineClip[] = insertions.map((insertion, index) => {
        // Find the media file for this insertion
        const mediaFile = state.mediaFiles.find(m => m.path === insertion.filePath);

        if (!mediaFile) {
          console.warn(`[addAIClipsToTimeline] Media file not found: ${insertion.filePath}`);
          return null;
        }

        return {
          id: `ai-${Date.now()}-${index}`,
          mediaId: mediaFile.id,
          trackId: v2Track!.id,
          startTime: insertion.startTime,
          duration: insertion.duration,
          inPoint: 0,
          outPoint: insertion.duration,
          volume: 1,
          effects: insertion.effects || [],
        };
      }).filter((clip): clip is TimelineClip => clip !== null);

      // Update the V2 track with new clips
      updatedTracks = updatedTracks.map(track => {
        if (track.id === v2Track!.id) {
          return {
            ...track,
            clips: [...track.clips, ...newClips].sort((a, b) => a.startTime - b.startTime),
          };
        }
        return track;
      });

      // Update project duration
      const maxEndTime = Math.max(
        0,
        ...updatedTracks.flatMap(t => t.clips.map(c => c.startTime + (c.outPoint - c.inPoint)))
      );

      console.log(`[addAIClipsToTimeline] Added ${newClips.length} AI clips to V2 track`);

      return {
        tracks: updatedTracks,
        duration: Math.max(state.duration, maxEndTime),
        isDirty: true,
      };
    });
  },
}));