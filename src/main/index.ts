// Polyfill File for OpenAI SDK - must be first!
import { File } from 'buffer';
if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = File;
}

import { app, BrowserWindow, Menu, ipcMain, protocol, net } from 'electron';
import path from 'path';
import { createApplicationMenu } from './menu/applicationMenu';
import { setupFFmpegHandlers } from './ffmpeg/handlers';
import { setupIpcHandlers } from './ipc/handlers';
import { closeAllOverlays } from './windows/overlayWindows';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import * as fs from 'fs';

// Fix for macOS state restoration crash
// This must be done before the app is ready
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-features', 'RestoredState');
  app.commandLine.appendSwitch('disable-features', 'ApplicationCache');
  // Disable GPU to avoid hardware acceleration issues
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

// Set the app user model ID for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.clipforge.app');
}

let mainWindow: BrowserWindow | null = null;

// No need to register custom protocols since we're intercepting file://
// The webSecurity: false setting allows us to use file:// URLs directly

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,  // Allows loading local files
      sandbox: false, // Disable sandbox to avoid permission issues
    },
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../../public/icon.ico')
      : path.join(__dirname, '../../public/icon.png'),
    show: false, // Don't show window immediately
  });

  // Show window after it's ready to prevent state restoration issues
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Set application menu
  const menu = createApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    // Close all overlay windows when main window closes
    closeAllOverlays();
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  // Intercept file:// protocol for video files to add range support
  protocol.handle('file', async (request) => {
    // Get the file path from the URL
    const url = new URL(request.url);
    let filePath = decodeURIComponent(url.pathname);

    // On Windows, remove the leading slash for absolute paths
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1);
    }

    console.log('[Main] File protocol request:', request.url);
    console.log('[Main] Decoded path:', filePath);

    // Only handle video files with our custom handler
    if (!filePath.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      // For non-video files, read and return the file directly
      try {
        const fileContent = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();

        // Determine MIME type for common file types
        const mimeTypes: { [key: string]: string } = {
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'text/javascript',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.eot': 'application/vnd.ms-fontobject'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';

        return new Response(fileContent, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(fileContent.length)
          }
        });
      } catch (error) {
        console.error('[Main] Error reading file:', error);
        return new Response('File not found', { status: 404 });
      }
    }

    try {
      // Get file stats for size information
      const stats = await stat(filePath);

      // Parse range header if present
      const rangeHeader = request.headers.get('range');
      let start = 0;
      let end = stats.size - 1;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        console.log(`[Main] Range request: ${start}-${end}/${stats.size}`);
      }

      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
      };

      // Create the response with appropriate headers
      const headers: Record<string, string> = {
        'Content-Type': mimeTypes[ext] || 'video/mp4',
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes',
      };

      if (rangeHeader) {
        headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
      }

      // Create a ReadableStream from the file
      const stream = createReadStream(filePath, { start, end });

      // Convert Node stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: string | Buffer) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
          });
          stream.on('end', () => {
            controller.close();
          });
          stream.on('error', (error) => {
            controller.error(error);
          });
        },
        cancel() {
          stream.destroy();
        }
      });

      return new Response(webStream, {
        status: rangeHeader ? 206 : 200,
        headers
      });
    } catch (error) {
      console.error('[Main] Error handling video request:', error);
      return new Response('File not found', { status: 404 });
    }
  });

  createWindow();

  // Setup IPC handlers
  setupIpcHandlers();
  setupFFmpegHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close all overlay windows
  closeAllOverlays();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle auto-save
let autoSaveInterval: NodeJS.Timeout | null = null;

ipcMain.on('start-auto-save', () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  autoSaveInterval = setInterval(() => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-auto-save');
    }
  }, 120000); // 2 minutes
});

ipcMain.on('stop-auto-save', () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
});