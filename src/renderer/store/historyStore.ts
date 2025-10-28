import { create } from 'zustand';
import { useProjectStore } from './projectStore';

interface HistoryState {
  past: any[];
  future: any[];
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  saveState: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  saveState: () => {
    const currentState = useProjectStore.getState();
    const { past } = get();

    // Create snapshot of current state
    const snapshot = {
      projectName: currentState.projectName,
      mediaFiles: JSON.parse(JSON.stringify(currentState.mediaFiles)),
      tracks: JSON.parse(JSON.stringify(currentState.tracks)),
      currentTime: currentState.currentTime,
      duration: currentState.duration,
      selectedClipId: currentState.selectedClipId,
    };

    // Add to history, limit size
    const newPast = [...past, snapshot].slice(-MAX_HISTORY);

    set({
      past: newPast,
      future: [], // Clear future when new action is performed
      canUndo: true,
      canRedo: false,
    });
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;

    const currentState = useProjectStore.getState();

    // Save current state to future
    const currentSnapshot = {
      projectName: currentState.projectName,
      mediaFiles: JSON.parse(JSON.stringify(currentState.mediaFiles)),
      tracks: JSON.parse(JSON.stringify(currentState.tracks)),
      currentTime: currentState.currentTime,
      duration: currentState.duration,
      selectedClipId: currentState.selectedClipId,
    };

    // Get last state from past
    const previousState = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const newFuture = [currentSnapshot, ...future];

    // Restore previous state
    useProjectStore.setState({
      ...previousState,
      isDirty: true,
    });

    set({
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;

    const currentState = useProjectStore.getState();

    // Save current state to past
    const currentSnapshot = {
      projectName: currentState.projectName,
      mediaFiles: JSON.parse(JSON.stringify(currentState.mediaFiles)),
      tracks: JSON.parse(JSON.stringify(currentState.tracks)),
      currentTime: currentState.currentTime,
      duration: currentState.duration,
      selectedClipId: currentState.selectedClipId,
    };

    // Get next state from future
    const nextState = future[0];
    const newPast = [...past, currentSnapshot];
    const newFuture = future.slice(1);

    // Restore next state
    useProjectStore.setState({
      ...nextState,
      isDirty: true,
    });

    set({
      past: newPast,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },

  clearHistory: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));