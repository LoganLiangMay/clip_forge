import React, { useState } from 'react';
import {
  Save, FolderOpen, Film, Scissors, Undo, Redo,
  Play, Pause, Square, Circle, Monitor, Camera, Download
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUIStore } from '../../store/uiStore';
import { useHistoryStore } from '../../store/historyStore';
import { RecordingDialog } from './RecordingDialog';

interface ToolbarProps {
  onExport?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onExport }) => {
  const { isDirty } = useProjectStore();
  const { isPlaying, togglePlayback } = useUIStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const [showRecordingDialog, setShowRecordingDialog] = useState(false);

  const handleSave = async () => {
    const state = useProjectStore.getState();

    // Extract only serializable data (no functions)
    const projectData = {
      projectName: state.projectName,
      projectPath: state.projectPath,
      mediaFiles: state.mediaFiles,
      tracks: state.tracks,
      currentTime: state.currentTime,
      duration: state.duration,
      selectedClipId: state.selectedClipId,
    };

    if (state.projectPath) {
      await window.electronAPI.saveProject(state.projectPath, projectData);
      useProjectStore.setState({ isDirty: false });
    } else {
      const result = await window.electronAPI.saveFile('project.clipforge');
      if (!result.canceled) {
        await window.electronAPI.saveProject(result.filePath, projectData);
        useProjectStore.setState({ projectPath: result.filePath, isDirty: false });
      }
    }
  };

  const handleOpen = async () => {
    const result = await window.electronAPI.openFile();
    if (!result.canceled && result.filePaths.length > 0) {
      const projectData = await window.electronAPI.loadProject(result.filePaths[0]);
      if (projectData.success) {
        useProjectStore.getState().loadProject(projectData.data);
      }
    }
  };

  const handleImport = async () => {
    const result = await window.electronAPI.openFiles();
    if (!result.canceled) {
      for (const filePath of result.filePaths) {
        const metadata = await window.electronAPI.getMetadata(filePath);
        useProjectStore.getState().addMediaFile({
          id: Date.now().toString(),
          path: filePath,
          name: filePath.split('/').pop() || 'Untitled',
          type: metadata.format.format_name?.includes('mp4') ? 'video' : 'audio',
          duration: parseFloat(metadata.format.duration || '0'),
          metadata,
        });
      }
    }
  };

  return (
    <>
      <RecordingDialog
        isOpen={showRecordingDialog}
        onClose={() => setShowRecordingDialog(false)}
      />
      <div className="h-12 bg-background border-b border-border flex items-center px-4 gap-2">
      {/* File Operations */}
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <button
          onClick={handleOpen}
          className="p-2 hover:bg-background rounded transition-colors"
          title="Open Project"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          className="p-2 hover:bg-background rounded transition-colors relative"
          title="Save Project"
        >
          <Save className="w-4 h-4" />
          {isDirty && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
          )}
        </button>
        <button
          onClick={onExport}
          className="p-2 hover:bg-background rounded transition-colors"
          title="Export Video (Cmd+E)"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Operations */}
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 hover:bg-background rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 hover:bg-background rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const { selectedClipId, splitClip, currentTime } = useProjectStore.getState();
            if (selectedClipId) {
              splitClip(selectedClipId, currentTime);
            }
          }}
          className="p-2 hover:bg-background rounded transition-colors"
          title="Split Clip (Ctrl+K)"
        >
          <Scissors className="w-4 h-4" />
        </button>
      </div>

      {/* Media Operations */}
      <div className="flex items-center gap-1 pr-2 border-r border-border">
        <button
          onClick={handleImport}
          className="p-2 hover:bg-background rounded transition-colors"
          title="Import Media"
        >
          <Film className="w-4 h-4" />
        </button>
        <button
          onClick={async () => {
            // Create overlay windows immediately (Loom-style)
            await window.electronAPI.createCameraBubbleOverlay({ x: 20, y: window.innerHeight - 140 });
            await window.electronAPI.createControlsOverlay();
          }}
          className="p-2 hover:bg-background rounded transition-colors"
          title="Record Screen/Webcam"
        >
          <Circle className="w-4 h-4" />
        </button>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={togglePlayback}
          className="p-2 hover:bg-background rounded transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      {/* Project Name */}
      <div className="ml-auto text-sm text-muted-foreground">
        {useProjectStore.getState().projectName}
        {isDirty && ' *'}
      </div>
    </div>
    </>
  );
};