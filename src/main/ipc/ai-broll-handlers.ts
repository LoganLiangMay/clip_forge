import { ipcMain, BrowserWindow, app } from 'electron';
import { AIBrollService } from '../services/ai-broll.service';
import { getFFmpegPaths } from '../ffmpeg/handlers';
import path from 'path';
import os from 'os';

// Lazy load electron-store (ES Module)
let storeInstance: any = null;

async function getStore() {
  if (!storeInstance) {
    // Use Function constructor to avoid TypeScript transpiling import() to require()
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const Store = (await dynamicImport('electron-store')).default;
    storeInstance = new Store();
  }
  return storeInstance;
}

export function setupAIBrollHandlers() {
  // Settings handlers
  ipcMain.handle('ai:get-settings', async () => {
    try {
      const store = await getStore();
      return {
        success: true,
        data: {
          openai_api_key: store.get('openai_api_key', ''),
          serpapi_key: store.get('serpapi_key', ''),
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:save-settings', async (event, settings) => {
    try {
      const store = await getStore();
      if (settings.openai_api_key) {
        store.set('openai_api_key', settings.openai_api_key);
      }
      if (settings.serpapi_key) {
        store.set('serpapi_key', settings.serpapi_key);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // AI B-roll generation handlers
  ipcMain.handle('ai:analyze-content', async (event, script: string) => {
    try {
      const store = await getStore();
      const openaiKey = store.get('openai_api_key') as string;
      const serpApiKey = store.get('serpapi_key') as string;

      if (!openaiKey || !serpApiKey) {
        return {
          success: false,
          error: 'API keys not configured. Please set them in Settings.',
        };
      }

      const service = new AIBrollService(openaiKey, serpApiKey);
      const scenes = await service.analyzeContent(script);

      return { success: true, data: scenes };
    } catch (error) {
      console.error('[AI Broll] Analyze content error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:search-media', async (event, scenes: any[]) => {
    try {
      const store = await getStore();
      const openaiKey = store.get('openai_api_key') as string;
      const serpApiKey = store.get('serpapi_key') as string;

      if (!openaiKey || !serpApiKey) {
        return {
          success: false,
          error: 'API keys not configured. Please set them in Settings.',
        };
      }

      const service = new AIBrollService(openaiKey, serpApiKey);
      const mediaResults = await service.searchMedia(scenes);

      return { success: true, data: mediaResults };
    } catch (error) {
      console.error('[AI Broll] Search media error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:download-media', async (event, mediaResults: any[], projectPath: string) => {
    try {
      const store = await getStore();
      const openaiKey = store.get('openai_api_key') as string;
      const serpApiKey = store.get('serpapi_key') as string;
      const mainWindow = BrowserWindow.getFocusedWindow();

      if (!openaiKey || !serpApiKey) {
        return {
          success: false,
          error: 'API keys not configured. Please set them in Settings.',
        };
      }

      if (!mainWindow) {
        return {
          success: false,
          error: 'No active window',
        };
      }

      // Determine download directory: use Downloads folder if no project path provided
      let downloadDir;
      if (projectPath && projectPath !== 'null') {
        // Use project directory if project is saved
        downloadDir = path.dirname(projectPath);
        console.log(`[AI Broll] Project path: ${projectPath}`);
        console.log(`[AI Broll] Project directory: ${downloadDir}`);
      } else {
        // Use Downloads folder as default
        downloadDir = path.join(os.homedir(), 'Downloads');
        console.log(`[AI Broll] No project path, using Downloads: ${downloadDir}`);
      }

      const service = new AIBrollService(openaiKey, serpApiKey);
      const downloadedFiles = await service.downloadMedia(mediaResults, downloadDir, mainWindow);

      return { success: true, data: downloadedFiles };
    } catch (error) {
      console.error('[AI Broll] Download media error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:insert-timeline', async (event, downloadedFiles: any[], scenes: any[]) => {
    try {
      const store = await getStore();
      const openaiKey = store.get('openai_api_key') as string;
      const serpApiKey = store.get('serpapi_key') as string;

      if (!openaiKey || !serpApiKey) {
        return {
          success: false,
          error: 'API keys not configured. Please set them in Settings.',
        };
      }

      const service = new AIBrollService(openaiKey, serpApiKey);
      const timelineInsertions = await service.insertToTimeline(downloadedFiles, scenes);

      return { success: true, data: timelineInsertions };
    } catch (error) {
      console.error('[AI Broll] Insert timeline error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Audio extraction and transcription handlers
  ipcMain.handle('ai:extract-audio', async (event, clips: any[]) => {
    try {
      const store = await getStore();
      const openaiKey = store.get('openai_api_key') as string;
      const serpApiKey = store.get('serpapi_key') as string;

      if (!openaiKey || !serpApiKey) {
        return {
          success: false,
          error: 'API keys not configured. Please set them in Settings.',
        };
      }

      const service = new AIBrollService(openaiKey, serpApiKey);

      // Get FFmpeg path
      const ffmpegPaths = getFFmpegPaths();
      const ffmpegPath = ffmpegPaths.ffmpeg;

      const audioPath = await service.extractAudioFromTimeline(
        clips,
        ffmpegPath,
        (progress) => {
          // Send progress updates to renderer
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('ai:extraction-progress', progress);
          }
        }
      );

      return { success: true, data: audioPath };
    } catch (error) {
      console.error('[AI Broll] Extract audio error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:transcribe-audio', async (event, audioPath: string) => {
    try {
      const store = await getStore();
      const openaiKey = store.get('openai_api_key') as string;
      const serpApiKey = store.get('serpapi_key') as string;

      if (!openaiKey || !serpApiKey) {
        return {
          success: false,
          error: 'API keys not configured. Please set them in Settings.',
        };
      }

      const service = new AIBrollService(openaiKey, serpApiKey);

      const transcript = await service.transcribeAudio(
        audioPath,
        (progress) => {
          // Send progress updates to renderer
          const focusedWindow = BrowserWindow.getFocusedWindow();
          if (focusedWindow) {
            focusedWindow.webContents.send('ai:transcription-progress', progress);
          }
        }
      );

      return { success: true, data: transcript };
    } catch (error) {
      console.error('[AI Broll] Transcribe audio error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('[AI Broll] IPC handlers registered');
}
