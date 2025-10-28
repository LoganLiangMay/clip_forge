import { create } from 'zustand';

interface UIState {
  showSidePanel: boolean;
  showPropertiesPanel: boolean;
  timelineZoom: number;
  playbackRate: number;
  isPlaying: boolean;
  isRecording: boolean;

  // Actions
  toggleSidePanel: () => void;
  togglePropertiesPanel: () => void;
  setTimelineZoom: (zoom: number) => void;
  setPlaybackRate: (rate: number) => void;
  togglePlayback: () => void;
  startRecording: () => void;
  stopRecording: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showSidePanel: true,
  showPropertiesPanel: true,
  timelineZoom: 1,
  playbackRate: 1,
  isPlaying: false,
  isRecording: false,

  toggleSidePanel: () => set((state) => ({ showSidePanel: !state.showSidePanel })),

  togglePropertiesPanel: () => set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel })),

  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.1, Math.min(10, zoom)) }),

  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  startRecording: () => set({ isRecording: true, isPlaying: false }),

  stopRecording: () => set({ isRecording: false }),
}));