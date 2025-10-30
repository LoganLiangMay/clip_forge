import axios from 'axios';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import type { BrowserWindow } from 'electron';

interface Scene {
  topic: string;
  timestamp: string; // "M:SS" or "H:MM:SS" format
  description: string;
}

interface MediaResult {
  url: string;
  type: 'video' | 'image';
  source: string;
  topic: string;
}

interface DownloadedFile {
  path: string;
  topic: string;
  type: string;
}

interface TimelineInsertion {
  filePath: string;
  track: string;
  startTime: number;
  duration: number;
  effects: string[];
  label: string;
}

export class AIBrollService {
  private openai: OpenAI;
  private serpApiKey: string;

  constructor(openaiKey: string, serpApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.serpApiKey = serpApiKey;
  }

  /**
   * Step 1: Analyze content and extract scenes using GPT-4 Turbo
   */
  async analyzeContent(userScript: string): Promise<Scene[]> {
    const prompt = `You are a video editing assistant. Analyze the following video description and extract key visual scenes that would benefit from B-roll footage.

For each scene, provide:
1. A search-friendly topic (2-4 words)
2. Suggested timestamp in the video (estimate based on context)
3. Brief description

User's content:
"""
${userScript}
"""

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "scenes": [
    {
      "topic": "sunset beach",
      "timestamp": "0:05",
      "description": "Opening scene showing serene beach at sunset"
    }
  ]
}

Extract 5-10 scenes maximum. Focus on visual, searchable topics like "coffee brewing", "city skyline", "mountain hiking", etc.`;

    try {
      console.log('[AIBrollService] Analyzing content with GPT-4...');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"scenes":[]}');
      console.log(`[AIBrollService] Extracted ${result.scenes?.length || 0} scenes`);

      return result.scenes || [];
    } catch (error) {
      console.error('[AIBrollService] OpenAI API error:', error);
      throw new Error(`Failed to analyze content: ${(error as Error).message}`);
    }
  }

  /**
   * Step 2: Search for media using SerpAPI (Pexels)
   */
  async searchMedia(scenes: Scene[]): Promise<MediaResult[]> {
    const allResults: MediaResult[] = [];

    console.log(`[AIBrollService] Searching media for ${scenes.length} scenes...`);

    for (const scene of scenes) {
      try {
        // Try videos first
        const videoResults = await this.searchPexelsVideos(scene.topic);

        // Fallback to images if no videos found
        const imageResults = videoResults.length === 0
          ? await this.searchPexelsImages(scene.topic)
          : [];

        const mediaResults = [...videoResults, ...imageResults]
          .slice(0, 2) // Top 2 results per scene
          .map(url => ({
            url,
            type: (url.includes('.mp4') || url.includes('video')) ? 'video' as const : 'image' as const,
            source: 'pexels',
            topic: scene.topic,
          }));

        allResults.push(...mediaResults);
        console.log(`[AIBrollService] Found ${mediaResults.length} results for "${scene.topic}"`);
      } catch (error) {
        console.error(`[AIBrollService] Failed to search for "${scene.topic}":`, error);
        // Continue with other scenes
      }
    }

    console.log(`[AIBrollService] Total media found: ${allResults.length}`);
    return allResults;
  }

  /**
   * Search Pexels Videos via SerpAPI
   */
  private async searchPexelsVideos(query: string): Promise<string[]> {
    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'pexels_videos',
          query,
          api_key: this.serpApiKey,
        },
      });

      const videos = response.data.videos || [];
      return videos
        .slice(0, 3)
        .map((v: any) => {
          // Try to get HD quality first, fallback to first available
          const hdFile = v.video_files?.find((f: any) => f.quality === 'hd');
          return hdFile?.link || v.video_files?.[0]?.link;
        })
        .filter(Boolean);
    } catch (error) {
      console.error(`[AIBrollService] Pexels video search error:`, error);
      return [];
    }
  }

  /**
   * Search Pexels Images via SerpAPI
   */
  private async searchPexelsImages(query: string): Promise<string[]> {
    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'pexels',
          query,
          api_key: this.serpApiKey,
        },
      });

      const images = response.data.images || [];
      return images
        .slice(0, 3)
        .map((img: any) => img.original)
        .filter(Boolean);
    } catch (error) {
      console.error(`[AIBrollService] Pexels image search error:`, error);
      return [];
    }
  }

  /**
   * Step 3: Download media to project folder
   */
  async downloadMedia(
    mediaResults: MediaResult[],
    projectPath: string,
    window: BrowserWindow
  ): Promise<DownloadedFile[]> {
    // Dynamically import electron-dl (ES Module)
    const { download } = await import('electron-dl');

    const downloadedFiles: DownloadedFile[] = [];
    const mediaFolder = path.join(projectPath, 'ai-broll');

    console.log(`[AIBrollService] Creating media folder: ${mediaFolder}`);

    // Create folder if doesn't exist
    await fs.mkdir(mediaFolder, { recursive: true });

    console.log(`[AIBrollService] Downloading ${mediaResults.length} files...`);

    for (const media of mediaResults) {
      try {
        const sanitizedTopic = media.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const extension = media.type === 'video' ? '.mp4' : '.jpg';
        const filename = `${sanitizedTopic}_${Date.now()}${extension}`;

        console.log(`[AIBrollService] Downloading: ${filename}`);

        const downloadResult = await download(window, media.url, {
          directory: mediaFolder,
          filename,
          overwrite: true,
        });

        const filepath = downloadResult.getSavePath();

        downloadedFiles.push({
          path: filepath,
          topic: media.topic,
          type: media.type,
        });

        console.log(`[AIBrollService] Downloaded: ${filepath}`);
      } catch (error) {
        console.error(`[AIBrollService] Failed to download ${media.url}:`, error);
        // Continue with other downloads
      }
    }

    console.log(`[AIBrollService] Successfully downloaded ${downloadedFiles.length} files`);
    return downloadedFiles;
  }

  /**
   * Step 4: Generate timeline insertion data
   */
  async insertToTimeline(
    downloadedFiles: DownloadedFile[],
    scenes: Scene[]
  ): Promise<TimelineInsertion[]> {
    console.log('[AIBrollService] Generating timeline insertions...');

    const timelineInsertions: TimelineInsertion[] = scenes
      .map((scene, index) => {
        const file = downloadedFiles.find(f => f.topic === scene.topic);
        if (!file) {
          console.warn(`[AIBrollService] No file found for scene: ${scene.topic}`);
          return null;
        }

        return {
          filePath: file.path,
          track: 'V2', // Place on second video track
          startTime: this.parseTimestamp(scene.timestamp),
          duration: 5000, // 5 seconds default
          effects: ['fadeIn', 'fadeOut'],
          label: `AI: ${scene.topic}`,
        };
      })
      .filter((insertion): insertion is TimelineInsertion => insertion !== null);

    console.log(`[AIBrollService] Generated ${timelineInsertions.length} timeline insertions`);
    return timelineInsertions;
  }

  /**
   * Helper: Parse timestamp string to milliseconds
   */
  private parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':').map(Number);

    if (parts.length === 2) {
      // M:SS or MM:SS
      const [minutes, seconds] = parts;
      return (minutes * 60 + seconds) * 1000;
    } else if (parts.length === 3) {
      // H:MM:SS
      const [hours, minutes, seconds] = parts;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    console.warn(`[AIBrollService] Invalid timestamp format: ${timestamp}`);
    return 0;
  }
}
