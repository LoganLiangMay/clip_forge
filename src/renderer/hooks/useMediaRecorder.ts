import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';

export interface RecordingOptions {
  sourceId?: string;
  webcam?: boolean;
  audio?: boolean;
  screen?: boolean;
  includeCamera?: boolean; // PiP camera overlay
  bubblePosition?: { x: number; y: number }; // Custom bubble position
}

// Helper function to create PiP stream with canvas composition
const createPiPStream = async (
  screenStream: MediaStream,
  cameraStream: MediaStream,
  audioStream: MediaStream, // Stream containing all audio tracks (system + microphone)
  bubblePosition?: { x: number; y: number }
): Promise<MediaStream> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Set canvas size to match screen stream
  const screenTrack = screenStream.getVideoTracks()[0];
  const settings = screenTrack.getSettings();
  canvas.width = settings.width || 1920;
  canvas.height = settings.height || 1080;

  // Create video elements for compositing
  const screenVideo = document.createElement('video');
  const cameraVideo = document.createElement('video');

  screenVideo.srcObject = screenStream;
  cameraVideo.srcObject = cameraStream;
  screenVideo.play();
  cameraVideo.play();

  // PiP bubble size and position
  const pipWidth = Math.floor(canvas.width / 5); // 20% of screen width
  const pipHeight = Math.floor(pipWidth * 0.75); // 4:3 aspect ratio
  const pipRadius = 12; // Rounded corners

  // Use custom position if provided, otherwise default to bottom-left
  const pipX = bubblePosition ? bubblePosition.x : 20;
  const pipY = bubblePosition ? bubblePosition.y : (canvas.height - pipHeight - 20);

  // Render loop
  const render = () => {
    // Draw screen (full canvas)
    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

    // Draw camera bubble (rounded rectangle in bottom-left)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pipX + pipRadius, pipY);
    ctx.lineTo(pipX + pipWidth - pipRadius, pipY);
    ctx.quadraticCurveTo(pipX + pipWidth, pipY, pipX + pipWidth, pipY + pipRadius);
    ctx.lineTo(pipX + pipWidth, pipY + pipHeight - pipRadius);
    ctx.quadraticCurveTo(pipX + pipWidth, pipY + pipHeight, pipX + pipWidth - pipRadius, pipY + pipHeight);
    ctx.lineTo(pipX + pipRadius, pipY + pipHeight);
    ctx.quadraticCurveTo(pipX, pipY + pipHeight, pipX, pipY + pipHeight - pipRadius);
    ctx.lineTo(pipX, pipY + pipRadius);
    ctx.quadraticCurveTo(pipX, pipY, pipX + pipRadius, pipY);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(cameraVideo, pipX, pipY, pipWidth, pipHeight);
    ctx.restore();

    // Draw border around camera bubble
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pipX + pipRadius, pipY);
    ctx.lineTo(pipX + pipWidth - pipRadius, pipY);
    ctx.quadraticCurveTo(pipX + pipWidth, pipY, pipX + pipWidth, pipY + pipRadius);
    ctx.lineTo(pipX + pipWidth, pipY + pipHeight - pipRadius);
    ctx.quadraticCurveTo(pipX + pipWidth, pipY + pipHeight, pipX + pipWidth - pipRadius, pipY + pipHeight);
    ctx.lineTo(pipX + pipRadius, pipY + pipHeight);
    ctx.quadraticCurveTo(pipX, pipY + pipHeight, pipX, pipY + pipHeight - pipRadius);
    ctx.lineTo(pipX, pipY + pipRadius);
    ctx.quadraticCurveTo(pipX, pipY, pipX + pipRadius, pipY);
    ctx.stroke();

    requestAnimationFrame(render);
  };
  render();

  // Capture canvas stream
  const canvasStream = canvas.captureStream(30); // 30fps

  // Add all audio tracks from the combined audio stream (includes system audio + microphone)
  audioStream.getAudioTracks().forEach(track => {
    canvasStream.addTrack(track);
    console.log('Added audio track to canvas stream:', track.label);
  });

  return canvasStream;
};

export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingDurationRef = useRef<number>(0); // Store final duration
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startRecording = useCallback(async (options: RecordingOptions) => {
    try {
      let stream: MediaStream;
      let screenStream: MediaStream | null = null;
      let cameraStream: MediaStream | null = null;

      // Check if we need PiP mode (screen + camera)
      const needsPiP = options.screen && options.includeCamera;

      if (options.screen && options.sourceId) {
        // Screen recording - get video and optionally audio
        const videoConstraints: any = {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: options.sourceId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
          },
        };

        // Try to get screen video with system audio first
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: options.sourceId,
            },
          } as any,
          video: videoConstraints,
        }).catch(async () => {
          // Fallback: screen without system audio
          console.log('Could not capture system audio, capturing screen video only');
          return navigator.mediaDevices.getUserMedia({
            audio: false,
            video: videoConstraints,
          });
        });

        // Get microphone audio separately if needed
        if (options.audio) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });

            console.log('Microphone audio captured:', audioStream.getAudioTracks().map(t => t.label));

            stream = new MediaStream([
              ...videoStream.getVideoTracks(),
              ...videoStream.getAudioTracks(), // System audio if captured
              ...audioStream.getAudioTracks(), // Microphone audio
            ]);

            console.log('Combined stream audio tracks:', stream.getAudioTracks().map(t => t.label));
          } catch (err) {
            console.warn('Could not capture microphone audio:', err);
            stream = videoStream;
          }
        } else {
          stream = videoStream;
        }

        screenStream = videoStream;

        // If PiP mode, get camera stream separately
        if (needsPiP) {
          try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
              audio: false, // Audio already captured from screen/mic
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
            });
            console.log('Camera stream for PiP:', cameraStream.getVideoTracks()[0]?.label);
          } catch (err) {
            console.warn('Could not capture camera for PiP:', err);
          }
        }
      } else if (options.webcam) {
        // Webcam recording
        stream = await navigator.mediaDevices.getUserMedia({
          audio: options.audio !== false,
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } else {
        throw new Error('No recording source specified');
      }

      // If we have both screen and camera, use Canvas for PiP composition
      if (needsPiP && screenStream && cameraStream) {
        // Use the combined stream (with all audio) if available, otherwise use screenStream
        const streamWithAudio = stream || screenStream;
        stream = await createPiPStream(
          screenStream,
          cameraStream,
          streamWithAudio, // Pass the stream with all audio tracks
          options.bubblePosition
        );
      }

      streamRef.current = stream;

      // Log stream tracks to verify video is present
      console.log('Stream tracks:', {
        video: stream.getVideoTracks().length,
        audio: stream.getAudioTracks().length,
        videoTrack: stream.getVideoTracks()[0]?.label,
        audioTrack: stream.getAudioTracks()[0]?.label,
      });

      // Check supported MIME types and use the best available
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps - more compatible
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Data chunk received:', event.data.size, 'bytes, type:', event.data.type);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started, state:', mediaRecorder.state);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });

          // Get the actual recording duration in seconds
          const durationInSeconds = recordingDurationRef.current / 1000;

          console.log('Recording stopped. Duration:', durationInSeconds, 'seconds');
          console.log('Blob created:', {
            size: blob.size,
            type: blob.type,
            chunks: chunksRef.current.length,
            totalChunkSize: chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
          });

          // Ask user where to save the recording
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `recording_${timestamp}.webm`;

          // Check if electronAPI is available
          if (!window.electronAPI || !window.electronAPI.saveFile) {
            console.error('[useMediaRecorder] electronAPI.saveFile is not available');
            throw new Error('electronAPI.saveFile is not available. Make sure the preload script is properly loaded.');
          }

          const result = await window.electronAPI.saveFile(fileName);

          if (result.canceled) {
            console.log('Recording save canceled by user');
            // Clean up streams but don't add to library
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            setIsRecording(false);
            setIsPaused(false);
            setRecordingTime(0);
            recordingDurationRef.current = 0;
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            // Close overlay windows after user cancels
            if (window.electronAPI && window.electronAPI.closeAllOverlays) {
              await window.electronAPI.closeAllOverlays();
            }
            return;
          }

          const savePath = result.filePath;
          // Extract the actual filename from the full path
          const actualFileName = savePath.split('/').pop() || fileName;

          console.log('[useMediaRecorder] Saving recording to:', savePath);
          console.log('[useMediaRecorder] Filename:', actualFileName);

          // Convert blob to Uint8Array (browser-compatible, no Buffer needed)
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Save the file via IPC
          const writeResult = await window.electronAPI.writeFile(savePath, uint8Array);

          if (!writeResult.success) {
            throw new Error(`Failed to save recording: ${writeResult.error}`);
          }

          console.log('[useMediaRecorder] File saved successfully, size:', blob.size, 'bytes');

          // Try to get metadata from the actual video file
          let metadata: any = null;
          let actualDuration = durationInSeconds;

          try {
            metadata = await window.electronAPI.getMetadata(savePath);
            // Check if metadata has valid duration
            if (metadata?.format?.duration && typeof metadata.format.duration === 'number') {
              actualDuration = metadata.format.duration;
            }
          } catch (error) {
            console.warn('Could not read metadata, using timer duration:', error);
          }

          console.log('Recording metadata:', {
            timerDuration: durationInSeconds,
            metadataDuration: metadata?.format?.duration,
            actualDuration: actualDuration
          });

          // Add to media library with actual duration
          useProjectStore.getState().addMediaFile({
            id: Date.now().toString(),
            path: savePath,
            name: actualFileName,
            type: 'video',
            duration: actualDuration,
            metadata: metadata || {
              format: {
                duration: actualDuration,
                format_name: 'webm',
              },
            },
          });

          console.log('Recording saved successfully:', savePath, 'Duration:', actualDuration, 'seconds');
          console.log('[useMediaRecorder] Added to Media Library:', actualFileName);

          // Close overlay windows after successful save
          if (window.electronAPI && window.electronAPI.closeAllOverlays) {
            await window.electronAPI.closeAllOverlays();
          }

        } catch (error) {
          console.error('Failed to save recording:', error);
          alert(`Failed to save recording: ${(error as Error).message}`);
        } finally {
          // Clean up streams
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          setIsRecording(false);
          setIsPaused(false);
          setRecordingTime(0);
          recordingDurationRef.current = 0;

          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Capture data every second
      setIsRecording(true);

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTime);
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, [recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Capture the current recording time before stopping
      recordingDurationRef.current = recordingTime;

      // Stop the timer immediately
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorderRef.current.stop();
    }
  }, [isRecording, recordingTime]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // Resume timer
      const pausedTime = recordingTime;
      const startTime = Date.now() - pausedTime;
      timerRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTime);
      }, 100);
    }
  }, [isRecording, isPaused, recordingTime]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
};