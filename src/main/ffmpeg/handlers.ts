import { app, ipcMain } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// Function to get FFmpeg paths that work in both development and production
function getFFmpegPaths() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    try {
      // In development, use the npm packages
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
      const ffprobePath = require('@ffprobe-installer/ffprobe');
      return {
        ffmpeg: ffmpegPath.path,
        ffprobe: ffprobePath.path
      };
    } catch (error) {
      console.warn('Could not load ffmpeg-installer in dev mode:', error);
    }
  }

  // In production, try to find ffmpeg in the app's resources or use system ffmpeg
  const platform = process.platform;
  const arch = process.arch;

  // The app path in a packaged Electron app
  const appPath = app.getAppPath();

  // Possible locations for ffmpeg and ffprobe binaries
  const ffmpegPossiblePaths = [
    // In packaged app (no asar)
    path.join(appPath, 'node_modules', '@ffmpeg-installer', `${platform}-${arch}`, 'ffmpeg'),
    path.join(appPath, 'node_modules', '@ffmpeg-installer', 'darwin-x64', 'ffmpeg'),
    // System paths (fallback)
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg'
  ];

  const ffprobePossiblePaths = [
    // In packaged app (no asar)
    path.join(appPath, 'node_modules', '@ffprobe-installer', `${platform}-${arch}`, 'ffprobe'),
    path.join(appPath, 'node_modules', '@ffprobe-installer', 'darwin-x64', 'ffprobe'),
    // System paths (fallback)
    '/usr/local/bin/ffprobe',
    '/usr/bin/ffprobe'
  ];

  let ffmpegPath = 'ffmpeg';
  let ffprobePath = 'ffprobe';

  // Find ffmpeg
  for (const possiblePath of ffmpegPossiblePaths) {
    if (fs.existsSync(possiblePath)) {
      ffmpegPath = possiblePath;
      console.log('Found ffmpeg at:', ffmpegPath);
      // Make sure it's executable
      try {
        fs.chmodSync(ffmpegPath, 0o755);
      } catch (e) {
        console.warn('Could not set executable permission for ffmpeg:', e);
      }
      break;
    }
  }

  // Find ffprobe
  for (const possiblePath of ffprobePossiblePaths) {
    if (fs.existsSync(possiblePath)) {
      ffprobePath = possiblePath;
      console.log('Found ffprobe at:', ffprobePath);
      // Make sure it's executable
      try {
        fs.chmodSync(ffprobePath, 0o755);
      } catch (e) {
        console.warn('Could not set executable permission for ffprobe:', e);
      }
      break;
    }
  }

  return { ffmpeg: ffmpegPath, ffprobe: ffprobePath };
}

// Set FFmpeg and FFprobe paths
const ffmpegPaths = getFFmpegPaths();
ffmpeg.setFfmpegPath(ffmpegPaths.ffmpeg);
ffmpeg.setFfprobePath(ffmpegPaths.ffprobe);

console.log('[FFmpeg] Using paths:', ffmpegPaths);

export function setupFFmpegHandlers() {
  // Get video metadata
  ipcMain.handle('ffmpeg:get-metadata', async (event, filePath: string) => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  });

  // Generate video thumbnail
  ipcMain.handle('ffmpeg:generate-thumbnail', async (event, { inputPath, outputPath, timestamp = '00:00:01' }) => {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x180',
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject);
    });
  });

  // Extract audio waveform data
  ipcMain.handle('ffmpeg:extract-waveform', async (event, filePath: string) => {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(require('os').tmpdir(), `waveform_${Date.now()}.json`);

      ffmpeg(filePath)
        .audioCodec('pcm_s16le')
        .audioFrequency(8000)
        .audioChannels(1)
        .format('wav')
        .on('end', () => {
          // In production, we'd process the WAV file to extract peaks
          // For now, return a placeholder
          resolve({ peaks: [], duration: 0 });
        })
        .on('error', reject)
        .save(outputPath);
    });
  });

  // Trim video
  ipcMain.handle('ffmpeg:trim-video', async (event, { inputPath, outputPath, startTime, duration }) => {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .setStartTime(startTime)
        .duration(duration)
        .output(outputPath)
        .videoCodec('copy')
        .audioCodec('copy');

      command
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .on('progress', (progress: any) => {
          event.sender.send('ffmpeg:progress', progress);
        })
        .run();
    });
  });

  // Export video with settings - properly handles timeline composition
  ipcMain.handle('ffmpeg:export-video', async (event, params) => {
    return new Promise((resolve, reject) => {
      try {
        console.log('[Export] Received params type:', typeof params);
        console.log('[Export] Received params keys:', params ? Object.keys(params) : 'null');
        console.log('[Export] Received params:', JSON.stringify(params, null, 2));

        if (!params) {
          reject(new Error('No parameters provided'));
          return;
        }

        const {
          clips,
          outputPath,
          format = 'mp4',
          resolution = '1920x1080',
          fps = 30,
          bitrate = '8000k',
          audioChannels = 2,
          audioBitrate = '192k',
          duration
        } = params;

        if (!clips || clips.length === 0) {
          const error = new Error('No clips to export');
          console.error('[Export] Error:', error.message);
          reject(error);
          return;
        }

        console.log('[Export] Starting export with', clips.length, 'clips');
        console.log('[Export] Output:', outputPath);
        console.log('[Export] Duration:', duration);

      const command = ffmpeg();

      // Build complex filter for timeline composition
      let filterComplex = '';
      let videoInputs: Array<{ label: string; startTime: number; duration: number }> = [];
      let audioInputs: string[] = [];
      let inputIndex = 0;

      // Group clips by track to handle overlays properly
      console.log('[Export] Filtering clips by type...');
      console.log('[Export] All clips:', clips);
      const videoTracks = clips.filter((c: any) => c.trackType === 'video');
      const audioTracks = clips.filter((c: any) => c.trackType === 'audio');

      console.log('[Export] Video tracks:', videoTracks.length);
      console.log('[Export] Audio tracks:', audioTracks.length);

      if (videoTracks.length === 0) {
        reject(new Error('No video tracks to export'));
        return;
      }

      // Check if clips are contiguous (no gaps between them)
      const sortedVideoClips = [...videoTracks].sort((a, b) => a.startTime - b.startTime);
      let isContiguous = true;
      for (let i = 1; i < sortedVideoClips.length; i++) {
        const prevClipEnd = sortedVideoClips[i - 1].startTime + sortedVideoClips[i - 1].duration;
        const currentClipStart = sortedVideoClips[i].startTime;
        if (Math.abs(prevClipEnd - currentClipStart) > 0.01) {
          isContiguous = false;
          break;
        }
      }

      console.log('[Export] Clips are contiguous:', isContiguous);

      if (isContiguous && sortedVideoClips[0].startTime < 0.01) {
        // Simple case: clips are contiguous and start at 0
        // Use two-pass approach: encode each clip separately, then concat
        console.log('[Export] Using two-pass concatenation for contiguous clips');

        const os = require('os');
        const tempFiles: string[] = [];

        // Process each clip individually to ensure consistent format
        const processClip = (clip: any, index: number): Promise<string> => {
          return new Promise((resolveClip, rejectClip) => {
            const tempOutput = path.join(os.tmpdir(), `clip_${Date.now()}_${index}.mp4`);
            tempFiles.push(tempOutput);

            const trimStart = clip.inPoint || 0;
            const trimDuration = clip.duration;

            // Build filter for this single clip
            let clipFilter = `[0:v]trim=start=${trimStart}:duration=${trimDuration},setpts=PTS-STARTPTS,scale=${resolution},fps=${fps}[v];`;

            if (!clip.muted) {
              clipFilter += `[0:a]atrim=start=${trimStart}:duration=${trimDuration},asetpts=PTS-STARTPTS,volume=${clip.volume || 1}[a]`;
            } else {
              clipFilter += `anullsrc=channel_layout=stereo:sample_rate=44100:duration=${trimDuration}[a]`;
            }

            ffmpeg(clip.filePath)
              .complexFilter(clipFilter)
              .outputOptions([
                '-map [v]',
                '-map [a]',
                // Ensure consistent encoding for concatenation
                '-pix_fmt yuv420p',
                '-preset fast',
                '-g 30', // Keyframe every 30 frames (1 second at 30fps)
                '-sc_threshold 0', // Disable scene change detection
                '-force_key_frames expr:gte(t,n_forced*1)' // Force keyframe every 1 second
              ])
              .videoCodec('libx264')
              .videoBitrate(bitrate)
              .audioCodec('aac')
              .audioChannels(2)
              .audioFrequency(44100)
              .audioBitrate(audioBitrate)
              .format('mp4')
              .on('start', (commandLine) => {
                console.log(`[Export] Processing clip ${index}:`);
                console.log(`[Export] FFmpeg command: ${commandLine}`);
              })
              .on('progress', (progress: any) => {
                const percent = ((index + (progress.percent || 0) / 100) / videoTracks.length) * 100;
                console.log(`[Export] Clip ${index} progress: ${progress.percent}% (Overall: ${percent.toFixed(1)}%)`);
                event.sender.send('ffmpeg:export-progress', { percent });
              })
              .on('end', () => {
                console.log(`[Export] Clip ${index} processed: ${tempOutput}`);
                resolveClip(tempOutput);
              })
              .on('error', (err: any) => {
                console.error(`[Export] Error processing clip ${index}:`, err.message);
                rejectClip(err);
              })
              .save(tempOutput);
          });
        };

        // Process all clips in sequence
        const processAllClips = async () => {
          const processedFiles: string[] = [];
          for (let i = 0; i < videoTracks.length; i++) {
            const tempFile = await processClip(videoTracks[i], i);
            processedFiles.push(tempFile);
          }
          return processedFiles;
        };

        processAllClips()
          .then((processedFiles) => {
            // Now concatenate the processed files using concat demuxer
            const listFile = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
            const fileContent = processedFiles.map((p: string) => `file '${p}'`).join('\n');
            fs.writeFileSync(listFile, fileContent);

            console.log('[Export] Concatenating processed clips');
            console.log('[Export] Concat list contents:', fs.readFileSync(listFile, 'utf-8'));

            ffmpeg()
              .input(listFile)
              .inputOptions([
                '-f concat',
                '-safe 0'
              ])
              .outputOptions([
                '-c:v libx264',
                '-c:a aac',
                '-b:v ' + bitrate,
                '-b:a ' + audioBitrate,
                '-vsync cfr', // Constant frame rate
                '-async 1' // Audio sync
              ])
              .videoCodec('libx264')
              .audioCodec('aac')
              .on('start', (commandLine) => {
                console.log('[Export] Concat FFmpeg command:', commandLine);
              })
              .on('progress', (progress: any) => {
                console.log('[Export] Concat progress:', progress.percent || progress.timemark);
                event.sender.send('ffmpeg:export-progress', { percent: progress.percent || 99 });
              })
              .on('end', () => {
                console.log('[Export] Export completed successfully');
                // Clean up temp files
                tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
                try { fs.unlinkSync(listFile); } catch (e) {}
                resolve(outputPath);
              })
              .on('error', (err: any) => {
                console.error('[Export] Error concatenating:', err.message);
                // Clean up temp files
                tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
                try { fs.unlinkSync(listFile); } catch (e) {}
                reject(err);
              })
              .save(outputPath);
          })
          .catch((err) => {
            console.error('[Export] Error in two-pass processing:', err);
            // Clean up temp files
            tempFiles.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
            reject(err);
          });

        // Return early since we're handling the promise resolution in the async chain
        return;
      } else {
        // Complex case: clips have gaps or don't start at 0, use overlay approach
        console.log('[Export] Using overlay approach for non-contiguous clips');

        videoTracks.forEach((clip: any, i: number) => {
          command.input(clip.filePath);

          const trimStart = clip.inPoint || 0;
          const trimDuration = clip.duration;

          filterComplex += `[${inputIndex}:v]trim=start=${trimStart}:duration=${trimDuration},setpts=PTS-STARTPTS,scale=${resolution},fps=${fps}[v${i}];`;

          if (!clip.muted) {
            filterComplex += `[${inputIndex}:a]atrim=start=${trimStart}:duration=${trimDuration},asetpts=PTS-STARTPTS,volume=${clip.volume || 1}[a${i}];`;
            audioInputs.push(`[a${i}]`);
          }

          videoInputs.push({ label: `[v${i}]`, startTime: clip.startTime, duration: clip.duration });
          inputIndex++;
        });

        // Create background video for the timeline duration
        filterComplex += `color=c=black:s=${resolution}:r=${fps}:d=${duration}[bg];`;

        // Overlay clips at their timeline positions
        let lastOutput = '[bg]';
        videoInputs.forEach((input, i) => {
          const outputLabel = i === videoInputs.length - 1 ? '[vout]' : `[tmp${i}]`;
          filterComplex += `${lastOutput}${input.label}overlay=enable='between(t,${input.startTime},${input.startTime + input.duration})'${outputLabel};`;
          lastOutput = outputLabel;
        });

        // Mix audio
        if (audioInputs.length > 0) {
          filterComplex += `${audioInputs.join('')}amix=inputs=${audioInputs.length}:duration=longest:dropout_transition=2[aout]`;
        } else {
          filterComplex += `anullsrc=channel_layout=stereo:sample_rate=44100:duration=${duration}[aout]`;
        }
      }

      console.log('[Export] Filter complex:', filterComplex);

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map [vout]',
          '-map [aout]'
        ])
        .videoCodec('libx264')
        .videoBitrate(bitrate)
        .audioCodec('aac')
        .audioChannels(audioChannels)
        .audioBitrate(audioBitrate)
        .format(format)
        .on('start', (commandLine) => {
          console.log('[Export] FFmpeg command:', commandLine);
        })
        .on('progress', (progress: any) => {
          console.log('[Export] Progress:', progress.percent || progress.timemark);
          event.sender.send('ffmpeg:export-progress', progress);
        })
        .on('end', () => {
          console.log('[Export] Export completed successfully');
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          console.error('[Export] Error:', err.message);
          reject(err);
        })
        .save(outputPath);
      } catch (err) {
        console.error('[Export] Error during export:', err);
        reject(err);
      }
    });
  });

  // Concatenate videos
  ipcMain.handle('ffmpeg:concat-videos', async (event, { inputPaths, outputPath }) => {
    return new Promise((resolve, reject) => {
      const listFile = path.join(require('os').tmpdir(), `concat_${Date.now()}.txt`);
      const fileContent = inputPaths.map((p: string) => `file '${p}'`).join('\n');

      fs.writeFileSync(listFile, fileContent);

      ffmpeg()
        .input(listFile)
        .inputOptions(['-f concat', '-safe 0'])
        .videoCodec('copy')
        .audioCodec('copy')
        .on('end', () => {
          fs.unlinkSync(listFile);
          resolve(outputPath);
        })
        .on('error', (err: any) => {
          fs.unlinkSync(listFile);
          reject(err);
        })
        .save(outputPath);
    });
  });
}