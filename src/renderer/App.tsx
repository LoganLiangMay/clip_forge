import React, { useEffect, useState } from 'react';
import { MediaLibrary } from './components/panels/MediaLibrary';
import { Preview } from './components/panels/Preview';
import { Timeline } from './components/panels/Timeline';
import { Properties } from './components/panels/Properties';
import { TitleBar } from './components/common/TitleBar';
import { Toolbar } from './components/common/Toolbar';
import { ExportDialog } from './components/common/ExportDialog';
import { useProjectStore } from './store/projectStore';
import { useUIStore } from './store/uiStore';

function App() {
  const { loadProject, saveProject, createNewProject } = useProjectStore();
  const { showSidePanel, showPropertiesPanel } = useUIStore();
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Handle menu actions
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanupMenuActions = window.electronAPI.onMenuAction((action) => {
      switch (action) {
        case 'menu-new-project':
          createNewProject();
          break;
        case 'menu-open-project':
          handleOpenProject();
          break;
        case 'menu-save-project':
          handleSaveProject();
          break;
        case 'menu-save-project-as':
          handleSaveProjectAs();
          break;
        case 'menu-import-media':
          handleImportMedia();
          break;
        case 'menu-export-video':
          handleExportVideo();
          break;
        case 'menu-delete':
          handleDeleteClip();
          break;
        case 'menu-split-clip':
          handleSplitClip();
          break;
        // Add more menu handlers as needed
      }
    });

    // Setup auto-save
    window.electronAPI.startAutoSave();
    window.electronAPI.onAutoSave(() => {
      handleAutoSave();
    });

    return () => {
      if (cleanupMenuActions) {
        cleanupMenuActions();
      }
      window.electronAPI.stopAutoSave();
    };
  }, [createNewProject]);

  const handleOpenProject = async () => {
    const result = await window.electronAPI.openFile();
    if (!result.canceled && result.filePaths.length > 0) {
      const projectData = await window.electronAPI.loadProject(result.filePaths[0]);
      if (projectData.success) {
        loadProject(projectData.data);
      }
    }
  };

  const handleSaveProject = async () => {
    const projectState = useProjectStore.getState();
    if (projectState.projectPath) {
      await window.electronAPI.saveProject(projectState.projectPath, projectState);
    } else {
      handleSaveProjectAs();
    }
  };

  const handleSaveProjectAs = async () => {
    const result = await window.electronAPI.saveFile('project.clipforge');
    if (!result.canceled) {
      const projectState = useProjectStore.getState();
      await window.electronAPI.saveProject(result.filePath, projectState);
      useProjectStore.setState({ projectPath: result.filePath });
    }
  };

  const handleImportMedia = async () => {
    const result = await window.electronAPI.openFiles();
    if (!result.canceled) {
      // Import media files to the project
      for (const filePath of result.filePaths) {
        // Get metadata and add to media library
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

  const handleExportVideo = async () => {
    setShowExportDialog(true);
  };

  const handleAutoSave = async () => {
    const projectState = useProjectStore.getState();
    if (projectState.projectPath && projectState.isDirty) {
      await window.electronAPI.saveProject(projectState.projectPath, projectState);
      useProjectStore.setState({ isDirty: false });
    }
  };

  const handleDeleteClip = () => {
    const { selectedClipId, removeClipFromTimeline } = useProjectStore.getState();
    if (selectedClipId) {
      removeClipFromTimeline(selectedClipId);
    }
  };

  const handleSplitClip = () => {
    const { selectedClipId, splitClip, currentTime } = useProjectStore.getState();
    if (selectedClipId) {
      splitClip(selectedClipId, currentTime);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Dialogs */}
      <ExportDialog isOpen={showExportDialog} onClose={() => setShowExportDialog(false)} />

      {/* Title Bar - Draggable area with traffic lights */}
      <TitleBar />

      {/* Toolbar - Not draggable */}
      <Toolbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Media Library Panel */}
        {showSidePanel && (
          <>
            <div className="w-64 min-w-[200px] border-r border-border flex-shrink-0">
              <MediaLibrary />
            </div>
            <div className="panel-resizer" />
          </>
        )}

        {/* Center Content - Flexible, adjusts to window width */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Panel */}
          <div className="flex-1 min-h-0">
            <Preview />
          </div>

          <div className="panel-resizer-horizontal" />

          {/* Timeline Panel */}
          <div className="h-80 min-h-[200px] border-t border-border">
            <Timeline />
          </div>
        </div>

        {/* Properties Panel - Always visible */}
        <div className="panel-resizer" />
        <div className="w-80 min-w-[280px] border-l border-border flex-shrink-0">
          <Properties />
        </div>
      </div>
    </div>
  );
}

export default App;