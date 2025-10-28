import { app, BrowserWindow, Menu, ipcMain, protocol, net } from 'electron';
import path from 'path';
import { createApplicationMenu } from './menu/applicationMenu';
import { setupFFmpegHandlers } from './ffmpeg/handlers';
import { setupIpcHandlers } from './ipc/handlers';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

// Disable state restoration to prevent crash on macOS
app.disableHardwareAcceleration();
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-features', 'RestoredState');
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
    },
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 12 } : undefined,
    icon: process.platform === 'win32'
      ? path.join(__dirname, '../../public/icon.ico')
      : path.join(__dirname, '../../public/icon.png'),
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
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  // Intercept file:// protocol for video files to add range support
  protocol.handle('file', async (request) => {
    // Get the file path from the URL
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname);

    console.log('[Main] File protocol request:', request.url);
    console.log('[Main] Decoded path:', filePath);

    // Only handle video files with our custom handler
    if (!filePath.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      // For non-video files, use the default file handler
      return net.fetch(request.url);
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