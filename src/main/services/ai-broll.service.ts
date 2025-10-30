import axios from 'axios';
import { OpenAI } from 'openai';
import fs from 'fs/promises';
import path from 'path';
import type { BrowserWindow } from 'electron';
import os from 'os';
import { spawn } from 'child_process';
import { File } from 'buffer';

// Polyfill File for OpenAI SDK
if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = File;
}

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

interface TimelineClip {
  id: string;
  filePath: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  trackType: string;
}

export class AIBrollService {
  private openai: OpenAI;
  private serpApiKey: string;

  constructor(openaiKey: string, serpApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.serpApiKey = serpApiKey;
  }

  /**
   * Step 0a: Extract audio from timeline clips
   */
  async extractAudioFromTimeline(
    clips: TimelineClip[],
    ffmpegPath: string,
    onProgress?: (progress: string) => void
  ): Promise<string> {
    const tempDir = os.tmpdir();
    const outputAudioPath = path.join(tempDir, `timeline_audio_${Date.now()}.mp3`);

    console.log('[AIBrollService] Extracting audio from timeline clips...');

    try {
      // Filter only video/audio clips
      const audioClips = clips.filter(c => c.trackType === 'video' || c.trackType === 'audio');

      if (audioClips.length === 0) {
        throw new Error('No audio clips found on timeline');
      }

      // If single clip, extract directly
      if (audioClips.length === 1) {
        const clip = audioClips[0];
        return await this.extractSingleAudio(clip, ffmpegPath, outputAudioPath, onProgress);
      }

      // Multiple clips: extract each and concat
      const extractedFiles: string[] = [];

      for (let i = 0; i < audioClips.length; i++) {
        const clip = audioClips[i];
        const tempFile = path.join(tempDir, `clip_audio_${i}_${Date.now()}.mp3`);

        if (onProgress) {
          onProgress(`Extracting audio from clip ${i + 1}/${audioClips.length}...`);
        }

        await this.extractSingleAudio(clip, ffmpegPath, tempFile);
        extractedFiles.push(tempFile);
      }

      // Concatenate all audio files
      if (onProgress) {
        onProgress('Combining audio tracks...');
      }

      await this.concatenateAudioFiles(extractedFiles, ffmpegPath, outputAudioPath);

      // Cleanup temp files
      for (const file of extractedFiles) {
        await fs.unlink(file).catch(() => {});
      }

      console.log(`[AIBrollService] Audio extracted to: ${outputAudioPath}`);
      return outputAudioPath;
    } catch (error) {
      console.error('[AIBrollService] Audio extraction error:', error);
      throw new Error(`Failed to extract audio: ${(error as Error).message}`);
    }
  }

  private async extractSingleAudio(
    clip: TimelineClip,
    ffmpegPath: string,
    outputPath: string,
    onProgress?: (progress: string) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if values are in milliseconds or seconds
      // If outPoint is less than 1000, it's likely in seconds already
      const isInSeconds = clip.outPoint < 1000 && clip.outPoint > 0;

      const startSeconds = isInSeconds ? clip.inPoint : clip.inPoint / 1000;
      const durationSeconds = isInSeconds
        ? (clip.outPoint - clip.inPoint)
        : (clip.outPoint - clip.inPoint) / 1000;

      console.log(`[AIBrollService] Extracting audio from clip:`, {
        filePath: clip.filePath,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
        isInSeconds,
        startSeconds,
        durationSeconds,
      });

      const args = [
        '-i', clip.filePath,
        '-ss', startSeconds.toString(),
        '-t', durationSeconds.toString(),
        '-vn',
        '-acodec', 'libmp3lame',
        '-b:a', '128k',
        '-ar', '44100',
        '-y',
        outputPath
      ];

      console.log(`[AIBrollService] FFmpeg command: ${ffmpegPath} ${args.join(' ')}`);

      const ffmpeg = spawn(ffmpegPath, args);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`[AIBrollService] Audio extraction successful`);
          resolve(outputPath);
        } else {
          console.error(`[AIBrollService] FFmpeg stderr:`, stderr);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async concatenateAudioFiles(
    files: string[],
    ffmpegPath: string,
    outputPath: string
  ): Promise<void> {
    // Create concat file list
    const tempDir = os.tmpdir();
    const concatFile = path.join(tempDir, `concat_${Date.now()}.txt`);
    const fileList = files.map(f => `file '${f}'`).join('\n');
    await fs.writeFile(concatFile, fileList);

    return new Promise((resolve, reject) => {
      const args = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatFile,
        '-c', 'copy',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args);

      ffmpeg.on('close', async (code) => {
        await fs.unlink(concatFile).catch(() => {});

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg concat exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Step 0b: Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(audioPath: string, onProgress?: (progress: string) => void): Promise<string> {
    try {
      console.log('[AIBrollService] Transcribing audio with Whisper...');

      if (onProgress) {
        onProgress('Transcribing audio with OpenAI Whisper...');
      }

      // Use OpenAI's toFile helper for Node.js file uploads (Function constructor to prevent TypeScript transpilation)
      const dynamicImport = new Function('modulePath', 'return import(modulePath)');
      const { toFile } = await dynamicImport('openai/uploads');
      const audioFile = await toFile(require('fs').createReadStream(audioPath), path.basename(audioPath));

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
      });

      console.log('[AIBrollService] Transcription complete');
      console.log('[AIBrollService] Transcript:', transcription);

      // Cleanup audio file
      await fs.unlink(audioPath).catch(() => {});

      return transcription as string;
    } catch (error) {
      console.error('[AIBrollService] Whisper transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${(error as Error).message}`);
    }
  }

  /**
   * Step 1: Analyze transcript and extract B-roll scenes using GPT-4 Turbo
   */
  async analyzeContent(transcript: string): Promise<Scene[]> {
    const prompt = `You are a video editing assistant. Analyze the following video transcript and identify moments that would benefit from B-roll footage overlay.

For each identified moment, provide:
1. A search-friendly B-roll topic (2-4 words) - what visual would enhance this moment
2. Estimated timestamp (format: "M:SS")
3. Brief description of why this B-roll would work

Video Transcript:
"""
${transcript}
"""

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "scenes": [
    {
      "topic": "coffee brewing",
      "timestamp": "0:15",
      "description": "B-roll of coffee being brewed to overlay narration about morning routine"
    }
  ]
}

Extract 5-10 B-roll opportunities maximum. Focus on:
- Visual concepts mentioned in the audio
- Topics that would enhance storytelling
- Searchable stock footage keywords (e.g., "city skyline", "typing laptop", "mountain hiking", "cooking food")
- Moments where visuals would add context or interest`;

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
   * Search Google Images via SerpAPI (fallback since Pexels not supported)
   */
  private async searchPexelsVideos(query: string): Promise<string[]> {
    // Pexels videos not supported via SerpAPI, return empty for now
    console.log(`[AIBrollService] Pexels videos not supported via SerpAPI, skipping video search`);
    return [];
  }

  /**
   * Search Google Images via SerpAPI
   */
  private async searchPexelsImages(query: string): Promise<string[]> {
    try {
      console.log(`[AIBrollService] Searching Google Images for: "${query}"`);

      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google_images',
          q: query,
          api_key: this.serpApiKey,
          num: 5,
        },
      });

      const images = response.data.images_results || [];
      console.log(`[AIBrollService] Found ${images.length} image results`);

      return images
        .slice(0, 3)
        .map((img: any) => img.original)
        .filter(Boolean);
    } catch (error) {
      console.error(`[AIBrollService] Google Images search error:`, error);
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
    // Dynamically import electron-dl (ES Module) using Function constructor to prevent TypeScript transpilation
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const { download } = await dynamicImport('electron-dl');

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

        // Add timeout to prevent hanging on bad URLs (30 seconds)
        const downloadPromise = download(window, media.url, {
          directory: mediaFolder,
          filename,
          overwrite: true,
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Download timeout after 30s')), 30000)
        );

        const downloadResult = await Promise.race([downloadPromise, timeoutPromise]) as any;

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
