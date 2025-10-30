import { contextBridge, ipcRenderer } from 'electron';

console.log('[Preload] Loading preload script...');
console.log('[Preload] contextBridge available:', !!contextBridge);
console.log('[Preload] ipcRenderer available:', !!ipcRenderer);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  platform: process.platform,

  // Dialog API
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  openFiles: () => ipcRenderer.invoke('dialog:open-files'),
  saveFile: (defaultName?: string) => ipcRenderer.invoke('dialog:save-file', defaultName),

  // Project API
  saveProject: (filePath: string, data: any) =>
    ipcRenderer.invoke('project:save', { filePath, data }),
  loadProject: (filePath: string) =>
    ipcRenderer.invoke('project:load', filePath),

  // FFmpeg API
  getMetadata: (filePath: string) =>
    ipcRenderer.invoke('ffmpeg:get-metadata', filePath),
  generateThumbnail: (params: any) =>
    ipcRenderer.invoke('ffmpeg:generate-thumbnail', params),
  extractWaveform: (filePath: string) =>
    ipcRenderer.invoke('ffmpeg:extract-waveform', filePath),
  trimVideo: (params: any) =>
    ipcRenderer.invoke('ffmpeg:trim-video', params),
  exportVideo: (params: any) =>
    ipcRenderer.invoke('ffmpeg:export-video', params),
  concatVideos: (params: any) =>
    ipcRenderer.invoke('ffmpeg:concat-videos', params),

  // Desktop Capturer API
  getDesktopSources: () =>
    ipcRenderer.invoke('desktop:get-sources'),

  // Overlay Window API
  createCameraBubbleOverlay: (position?: { x: number; y: number }) =>
    ipcRenderer.invoke('overlay:create-camera-bubble', position),
  createControlsOverlay: () =>
    ipcRenderer.invoke('overlay:create-controls'),
  closeAllOverlays: () =>
    ipcRenderer.invoke('overlay:close-all'),
  closeCameraBubble: () =>
    ipcRenderer.invoke('overlay:close-camera-bubble'),
  updateCameraPosition: (x: number, y: number) =>
    ipcRenderer.invoke('overlay:update-camera-position', { x, y }),
  moveWindow: (deltaX: number, deltaY: number) =>
    ipcRenderer.invoke('window:move', { deltaX, deltaY }),

  // File System API
  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, data: any) =>
    ipcRenderer.invoke('fs:write-file', { filePath, data }),
  ensureDir: (dirPath: string) =>
    ipcRenderer.invoke('fs:ensure-dir', dirPath),

  // Media Library API
  addMediaToLibrary: (mediaFile: any) =>
    ipcRenderer.invoke('media:add-to-library', mediaFile),
  onMediaFileAdded: (callback: (mediaFile: any) => void) => {
    ipcRenderer.on('media:add-file', (event, mediaFile) => callback(mediaFile));
  },

  // AI B-roll API
  getSettings: () =>
    ipcRenderer.invoke('ai:get-settings'),
  saveSettings: (settings: any) =>
    ipcRenderer.invoke('ai:save-settings', settings),
  aiAnalyzeContent: (script: string) =>
    ipcRenderer.invoke('ai:analyze-content', script),
  aiSearchMedia: (scenes: any[]) =>
    ipcRenderer.invoke('ai:search-media', scenes),
  aiDownloadMedia: (mediaResults: any[], projectPath: string) =>
    ipcRenderer.invoke('ai:download-media', mediaResults, projectPath),
  aiInsertToTimeline: (downloadedFiles: any[], scenes: any[]) =>
    ipcRenderer.invoke('ai:insert-timeline', downloadedFiles, scenes),

  // Menu Events
  onMenuAction: (callback: (action: string) => void) => {
    const events = [
      'menu-new-project',
      'menu-open-project',
      'menu-save-project',
      'menu-save-project-as',
      'menu-import-media',
      'menu-export-video',
      'menu-undo',
      'menu-redo',
      'menu-cut',
      'menu-copy',
      'menu-paste',
      'menu-delete',
      'menu-split-clip',
      'menu-select-all',
      'menu-zoom-in',
      'menu-zoom-out',
      'menu-fit-timeline',
    ];

    // Create listener function
    const listeners = new Map<string, () => void>();

    events.forEach(event => {
      const listener = () => callback(event);
      listeners.set(event, listener);
      ipcRenderer.on(event, listener);
    });

    // Return cleanup function
    return () => {
      listeners.forEach((listener, event) => {
        ipcRenderer.removeListener(event, listener);
      });
    };
  },

  // Auto-save
  startAutoSave: () => ipcRenderer.send('start-auto-save'),
  stopAutoSave: () => ipcRenderer.send('stop-auto-save'),
  onAutoSave: (callback: () => void) => {
    ipcRenderer.on('trigger-auto-save', callback);
  },

  // Progress Events
  onFFmpegProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('ffmpeg:progress', (event, progress) => callback(progress));
  },
  onExportProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('ffmpeg:export-progress', (event, progress) => callback(progress));
  },
});

console.log('[Preload] electronAPI exposed to window');

// Add type declarations
declare global {
  interface Window {
    electronAPI: {
      platform: string;
      openFile: () => Promise<any>;
      openFiles: () => Promise<any>;
      saveFile: (defaultName?: string) => Promise<any>;
      saveProject: (filePath: string, data: any) => Promise<any>;
      loadProject: (filePath: string) => Promise<any>;
      getMetadata: (filePath: string) => Promise<any>;
      generateThumbnail: (params: any) => Promise<any>;
      extractWaveform: (filePath: string) => Promise<any>;
      trimVideo: (params: any) => Promise<any>;
      exportVideo: (params: any) => Promise<any>;
      concatVideos: (params: any) => Promise<any>;
      getDesktopSources: () => Promise<any>;
      createCameraBubbleOverlay: (position?: { x: number; y: number }) => Promise<any>;
      createControlsOverlay: () => Promise<any>;
      closeAllOverlays: () => Promise<any>;
      closeCameraBubble: () => Promise<any>;
      updateCameraPosition: (x: number, y: number) => Promise<any>;
      moveWindow: (deltaX: number, deltaY: number) => Promise<any>;
      readFile: (filePath: string) => Promise<any>;
      writeFile: (filePath: string, data: any) => Promise<any>;
      ensureDir: (dirPath: string) => Promise<any>;
      addMediaToLibrary: (mediaFile: any) => Promise<any>;
      onMediaFileAdded: (callback: (mediaFile: any) => void) => void;
      getSettings: () => Promise<any>;
      saveSettings: (settings: any) => Promise<any>;
      aiAnalyzeContent: (script: string) => Promise<any>;
      aiSearchMedia: (scenes: any[]) => Promise<any>;
      aiDownloadMedia: (mediaResults: any[], projectPath: string) => Promise<any>;
      aiInsertToTimeline: (downloadedFiles: any[], scenes: any[]) => Promise<any>;
      onMenuAction: (callback: (action: string) => void) => (() => void);
      startAutoSave: () => void;
      stopAutoSave: () => void;
      onAutoSave: (callback: () => void) => void;
      onFFmpegProgress: (callback: (progress: any) => void) => void;
      onExportProgress: (callback: (progress: any) => void) => void;
    };
  }
}