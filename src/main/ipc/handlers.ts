import { ipcMain, dialog, desktopCapturer, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import {
  createCameraBubbleOverlay,
  createControlsOverlay,
  closeAllOverlays,
  closeCameraBubble,
  updateCameraBubblePosition,
} from '../windows/overlayWindows';

export function setupIpcHandlers() {
  // Overlay window handlers
  ipcMain.handle('overlay:create-camera-bubble', async (event, position) => {
    try {
      const window = createCameraBubbleOverlay(position);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('overlay:create-controls', async () => {
    try {
      const window = createControlsOverlay();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('overlay:close-all', async () => {
    try {
      closeAllOverlays();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('overlay:close-camera-bubble', async () => {
    try {
      closeCameraBubble();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('overlay:update-camera-position', async (event, { x, y }) => {
    try {
      updateCameraBubblePosition(x, y);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Window movement handler (for draggable overlay windows)
  ipcMain.handle('window:move', async (event, { deltaX, deltaY }) => {
    try {
      const window = require('electron').BrowserWindow.fromWebContents(event.sender);
      if (window) {
        const [x, y] = window.getPosition();
        window.setPosition(x + deltaX, y + deltaY);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // File dialog handlers
  ipcMain.handle('dialog:open-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'ogg', 'm4a'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result;
  });

  ipcMain.handle('dialog:open-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media Files', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'mp3', 'wav', 'aac', 'ogg', 'm4a', 'jpg', 'jpeg', 'png', 'gif'] },
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'aac', 'ogg', 'm4a'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result;
  });

  ipcMain.handle('dialog:save-file', async (event, defaultName = 'untitled.webm') => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'WebM Video', extensions: ['webm'] },
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'MOV Video', extensions: ['mov'] },
        { name: 'AVI Video', extensions: ['avi'] },
        { name: 'MKV Video', extensions: ['mkv'] },
      ],
    });
    return result;
  });

  // Project file handlers
  ipcMain.handle('project:save', async (event, { filePath, data }) => {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('project:load', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return { success: true, data: JSON.parse(data) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Desktop capturer for screen recording
  ipcMain.handle('desktop:get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    }));
  });

  // File system operations
  ipcMain.handle('fs:read-file', async (event, filePath) => {
    try {
      const data = await fs.readFile(filePath);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('fs:write-file', async (event, { filePath, data }) => {
    try {
      console.log('[IPC] Writing file to:', filePath);
      console.log('[IPC] Data size:', data?.length || data?.byteLength || 0, 'bytes');

      // Convert Uint8Array to Buffer if needed (Node.js fs.writeFile accepts both)
      // Electron IPC automatically serializes Uint8Array properly
      const buffer = data instanceof Uint8Array ? Buffer.from(data) : data;
      await fs.writeFile(filePath, buffer);

      console.log('[IPC] File written successfully:', filePath);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error writing file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('fs:ensure-dir', async (event, dirPath) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}