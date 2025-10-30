import { BrowserWindow, screen } from 'electron';
import path from 'path';

let cameraBubbleWindow: BrowserWindow | null = null;
let controlsWindow: BrowserWindow | null = null;

export function createCameraBubbleOverlay(position?: { x: number; y: number }) {
  // If camera bubble already exists, just focus it and return
  if (cameraBubbleWindow && !cameraBubbleWindow.isDestroyed()) {
    console.log('[OverlayWindows] Camera bubble already exists, focusing it');
    cameraBubbleWindow.focus();
    return cameraBubbleWindow;
  }

  const displays = screen.getAllDisplays();
  const primaryDisplay = displays[0];

  // Default position: bottom-left
  const defaultX = 20;
  const defaultY = primaryDisplay.workArea.height - 120 - 20;

  cameraBubbleWindow = new BrowserWindow({
    width: 160,
    height: 120,
    x: position?.x || defaultX,
    y: position?.y || defaultY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    hasShadow: true,
    vibrancy: 'fullscreen-ui', // macOS only
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      sandbox: false,
    },
  });

  // Make window stay on all workspaces (macOS)
  if (process.platform === 'darwin') {
    cameraBubbleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    cameraBubbleWindow.setAlwaysOnTop(true, 'floating', 1);
  }

  // Load the camera bubble UI
  if (process.env.NODE_ENV === 'development') {
    cameraBubbleWindow.loadURL('http://localhost:5173/#/camera-bubble');
  } else {
    cameraBubbleWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/camera-bubble',
    });
  }

  cameraBubbleWindow.on('closed', () => {
    cameraBubbleWindow = null;
  });

  return cameraBubbleWindow;
}

export function createControlsOverlay() {
  // If controls window already exists, just focus it and return
  if (controlsWindow && !controlsWindow.isDestroyed()) {
    console.log('[OverlayWindows] Controls window already exists, focusing it');
    controlsWindow.focus();
    return controlsWindow;
  }

  const displays = screen.getAllDisplays();
  const primaryDisplay = displays[0];

  // Position on right side of screen
  const windowWidth = 320;
  const windowHeight = 500;
  const x = primaryDisplay.workArea.width - windowWidth - 20;
  const y = (primaryDisplay.workArea.height - windowHeight) / 2;

  const preloadPath = path.join(__dirname, '../../preload/index.js');
  console.log('[OverlayWindows] Creating controls overlay with preload path:', preloadPath);
  console.log('[OverlayWindows] __dirname:', __dirname);
  console.log('[OverlayWindows] NODE_ENV:', process.env.NODE_ENV);

  controlsWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: true,
    hasShadow: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      sandbox: false,
    },
  });

  // Make window stay on all workspaces (macOS)
  if (process.platform === 'darwin') {
    controlsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    controlsWindow.setAlwaysOnTop(true, 'floating', 1);
  }

  // Load the controls UI
  if (process.env.NODE_ENV === 'development') {
    controlsWindow.loadURL('http://localhost:5173/#/recording-controls');
  } else {
    controlsWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/recording-controls',
    });
  }

  // Handle close event - when user clicks X or window.close() is called
  controlsWindow.on('close', (event) => {
    console.log('[OverlayWindows] Controls window close event triggered');
    // Don't prevent the default close behavior
    // But also close the camera bubble when controls window is closed
    if (cameraBubbleWindow && !cameraBubbleWindow.isDestroyed()) {
      console.log('[OverlayWindows] Closing camera bubble from controls close event');
      try {
        // Stop camera stream first
        if (cameraBubbleWindow.webContents && !cameraBubbleWindow.webContents.isDestroyed()) {
          cameraBubbleWindow.webContents.executeJavaScript(`
            if (window.stream) {
              window.stream.getTracks().forEach(track => track.stop());
            }
          `).catch(() => {});
        }
        cameraBubbleWindow.destroy();
        cameraBubbleWindow = null;
      } catch (error) {
        console.error('[OverlayWindows] Error closing camera bubble:', error);
      }
    }
  });

  controlsWindow.on('closed', () => {
    console.log('[OverlayWindows] Controls window closed event triggered');
    controlsWindow = null;
  });

  return controlsWindow;
}

export function getCameraBubbleWindow() {
  return cameraBubbleWindow;
}

export function getControlsWindow() {
  return controlsWindow;
}

export function closeAllOverlays() {
  console.log('[OverlayWindows] closeAllOverlays called');
  console.log('[OverlayWindows] cameraBubbleWindow:', cameraBubbleWindow ? 'exists' : 'null', cameraBubbleWindow && !cameraBubbleWindow.isDestroyed() ? 'not destroyed' : 'destroyed');
  console.log('[OverlayWindows] controlsWindow:', controlsWindow ? 'exists' : 'null', controlsWindow && !controlsWindow.isDestroyed() ? 'not destroyed' : 'destroyed');

  // Close controls window first
  if (controlsWindow && !controlsWindow.isDestroyed()) {
    console.log('[OverlayWindows] Closing controls window');
    try {
      controlsWindow.close();
      controlsWindow = null;
    } catch (error) {
      console.error('[OverlayWindows] Error closing controls window:', error);
    }
  }

  // Close camera bubble - use destroy instead of close to avoid cleanup issues
  if (cameraBubbleWindow && !cameraBubbleWindow.isDestroyed()) {
    console.log('[OverlayWindows] Destroying camera bubble window');
    try {
      // First stop the camera stream by destroying the webContents
      if (cameraBubbleWindow.webContents && !cameraBubbleWindow.webContents.isDestroyed()) {
        cameraBubbleWindow.webContents.executeJavaScript(`
          if (window.stream) {
            window.stream.getTracks().forEach(track => track.stop());
          }
        `).catch(() => {
          // Ignore errors
        });
      }

      // Use destroy() instead of close() - it's more forceful and doesn't wait for cleanup
      cameraBubbleWindow.destroy();
      cameraBubbleWindow = null;
      console.log('[OverlayWindows] Camera bubble window destroyed');
    } catch (error) {
      console.error('[OverlayWindows] Error destroying camera bubble:', error);
    }
  }

  console.log('[OverlayWindows] closeAllOverlays completed');
}

export function updateCameraBubblePosition(x: number, y: number) {
  if (cameraBubbleWindow && !cameraBubbleWindow.isDestroyed()) {
    cameraBubbleWindow.setPosition(x, y);
  }
}

export function closeCameraBubble() {
  console.log('[OverlayWindows] closeCameraBubble called');
  if (cameraBubbleWindow && !cameraBubbleWindow.isDestroyed()) {
    console.log('[OverlayWindows] Destroying camera bubble window');
    try {
      // Stop camera stream first
      if (cameraBubbleWindow.webContents && !cameraBubbleWindow.webContents.isDestroyed()) {
        cameraBubbleWindow.webContents.executeJavaScript(`
          if (window.stream) {
            window.stream.getTracks().forEach(track => track.stop());
          }
        `).catch(() => {});
      }
      cameraBubbleWindow.destroy();
      cameraBubbleWindow = null;
      console.log('[OverlayWindows] Camera bubble window destroyed');
    } catch (error) {
      console.error('[OverlayWindows] Error destroying camera bubble:', error);
    }
  }
}
