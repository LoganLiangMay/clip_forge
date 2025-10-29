import { useState, useRef, useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';

export interface RecordingOptions {
  sourceId?: string;
  webcam?: boolean;
  audio?: boolean;
  screen?: boolean;
}

export const useMediaRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingDurationRef = useRef<number>(0); // Store final duration

  const startRecording = useCallback(async (options: RecordingOptions) => {
    try {
      let stream: MediaStream;

      if (options.screen && options.sourceId) {
        // Screen recording with audio
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

        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints,
        });

        // Get audio separately if needed
        if (options.audio) {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });

          stream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
        } else {
          stream = videoStream;
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

      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000, // 8 Mbps
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });

          // Get the actual recording duration in seconds
          const durationInSeconds = recordingDurationRef.current / 1000;

          console.log('Recording stopped. Duration:', durationInSeconds, 'seconds');

          // Ask user where to save the recording
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `recording_${timestamp}.webm`;
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
            return;
          }

          const savePath = result.filePath;

          // Convert blob to Uint8Array (browser-compatible, no Buffer needed)
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          // Save the file via IPC
          const writeResult = await window.electronAPI.writeFile(savePath, uint8Array);

          if (!writeResult.success) {
            throw new Error(`Failed to save recording: ${writeResult.error}`);
          }

          // Get metadata from the actual video file to ensure accuracy
          const metadata = await window.electronAPI.getMetadata(savePath);
          const actualDuration = metadata?.format?.duration || durationInSeconds;

          console.log('Recording metadata:', {
            timerDuration: durationInSeconds,
            actualDuration: actualDuration
          });

          // Add to media library with actual duration from metadata
          useProjectStore.getState().addMediaFile({
            id: Date.now().toString(),
            path: savePath,
            name: fileName,
            type: 'video',
            duration: actualDuration,
            metadata,
          });

          console.log('Recording saved successfully:', savePath, 'Duration:', actualDuration);

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