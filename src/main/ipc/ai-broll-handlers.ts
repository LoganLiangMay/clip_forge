import { ipcMain, BrowserWindow } from 'electron';
import { AIBrollService } from '../services/ai-broll.service';

// Use require for electron-store to avoid TypeScript issues
const Store = require('electron-store');
const store = new Store();

export function setupAIBrollHandlers() {
  // Settings handlers
  ipcMain.handle('ai:get-settings', async () => {
    try {
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

      const service = new AIBrollService(openaiKey, serpApiKey);
      const downloadedFiles = await service.downloadMedia(mediaResults, projectPath, mainWindow);

      return { success: true, data: downloadedFiles };
    } catch (error) {
      console.error('[AI Broll] Download media error:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('ai:insert-timeline', async (event, downloadedFiles: any[], scenes: any[]) => {
    try {
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

  console.log('[AI Broll] IPC handlers registered');
}
