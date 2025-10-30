import React, { useState, useEffect } from 'react';
import { Circle, Square, Pause, Play, X, Monitor, Camera, Mic } from 'lucide-react';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { cn } from '../../utils/cn';

export const RecordingControlsOverlay: React.FC = () => {
  const {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useMediaRecorder();

  // Options state (before recording)
  const [includeScreen, setIncludeScreen] = useState(true);
  const [includeCamera, setIncludeCamera] = useState(false);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Check if electronAPI is available
    console.log('[RecordingControlsOverlay] electronAPI available:', !!window.electronAPI);
    console.log('[RecordingControlsOverlay] electronAPI.saveFile available:', !!(window.electronAPI?.saveFile));
    console.log('[RecordingControlsOverlay] electronAPI.closeAllOverlays available:', !!(window.electronAPI?.closeAllOverlays));

    // Load screen sources
    loadSources();
  }, []);

  // Monitor audio levels when audio is enabled (before recording starts)
  useEffect(() => {
    if (!includeAudio || isRecording) {
      setAudioLevel(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let rafId: number | null = null;
    let stream: MediaStream | null = null;

    const setupAudioMonitoring = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
          if (!analyser) return;

          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedLevel = Math.min(100, (average / 255) * 100);
          setAudioLevel(normalizedLevel);

          rafId = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (error) {
        console.error('Failed to setup audio monitoring:', error);
      }
    };

    setupAudioMonitoring();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (microphone) microphone.disconnect();
      if (audioContext) audioContext.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [includeAudio, isRecording]);

  const loadSources = async () => {
    try {
      const availableSources = await window.electronAPI.getDesktopSources();
      setSources(availableSources);
      if (availableSources.length > 0) {
        setSelectedSource(availableSources[0]);
      }
    } catch (error) {
      console.error('Failed to load sources:', error);
    }
  };

  const handleStartRecording = async () => {
    // If no source is selected yet, use the first available one or entire screen
    const sourceId = selectedSource?.id || (sources.length > 0 ? sources[0].id : 'screen:0:0');

    await startRecording({
      screen: includeScreen,
      sourceId: sourceId,
      audio: includeAudio,
      includeCamera,
    });
  };

  const handleStop = async () => {
    console.log('[RecordingControlsOverlay] Stop button clicked');
    // Stop the recording - this will trigger the save dialog and close overlays
    stopRecording();
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isRecording) {
    // Show options before recording
    return (
      <div className="w-full h-full bg-gray-900 rounded-xl flex flex-col">
        {/* Header - Draggable with clickable close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 rounded-t-xl cursor-move" style={{ WebkitAppRegion: 'drag' } as any}>
          <h2 className="text-white font-semibold select-none">Recording Options</h2>
          <button
            onClick={() => {
              console.log('[RecordingControlsOverlay] Close button clicked');
              // Close this window, which will trigger the close event in main process
              // The close event handler will also close the camera bubble
              window.close();
            }}
            className="p-1 hover:bg-gray-800 rounded"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Options Content */}
        <div className="flex-1 p-4 flex flex-col" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Options */}
          <div className="flex-1 space-y-3">
            {/* Screen */}
            <button
              onClick={() => setIncludeScreen(!includeScreen)}
              className={cn(
                "w-full p-3 rounded-lg border-2 transition-colors text-left flex items-center gap-3",
                includeScreen
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-gray-700 hover:border-gray-600'
              )}
            >
              <Monitor className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {selectedSource?.name || 'Full screen'}
                </p>
                <p className="text-xs text-green-600">{includeScreen ? 'On' : 'Off'}</p>
              </div>
            </button>

            {/* Camera */}
            <button
              onClick={() => {
                console.log('[RecordingControlsOverlay] Camera toggle clicked, current state:', includeCamera);
                const newCameraState = !includeCamera;
                setIncludeCamera(newCameraState);
                console.log('[RecordingControlsOverlay] New camera state:', newCameraState);

                // Send message to main window to control camera bubble
                if (typeof window !== 'undefined' && window.electronAPI) {
                  if (newCameraState) {
                    console.log('[RecordingControlsOverlay] Creating camera bubble...');
                    window.electronAPI.createCameraBubbleOverlay().catch((error: any) => {
                      console.error('[RecordingControlsOverlay] Failed to create camera bubble:', error);
                    });
                  } else {
                    console.log('[RecordingControlsOverlay] Closing camera bubble...');
                    window.electronAPI.closeCameraBubble().catch((error: any) => {
                      console.error('[RecordingControlsOverlay] Failed to close camera bubble:', error);
                    });
                  }
                } else {
                  console.error('[RecordingControlsOverlay] electronAPI not available');
                }
              }}
              className={cn(
                "w-full p-3 rounded-lg border-2 transition-colors text-left flex items-center gap-3",
                includeCamera
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-gray-700 hover:border-gray-600'
              )}
            >
              <Camera className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">FaceTime HD Camera</p>
                <p className="text-xs text-green-600">{includeCamera ? 'On' : 'Off'}</p>
              </div>
            </button>

            {/* Microphone */}
            <button
              onClick={() => setIncludeAudio(!includeAudio)}
              className={cn(
                "w-full p-3 rounded-lg border-2 transition-colors text-left flex items-center gap-3",
                includeAudio
                  ? 'border-blue-600 bg-blue-600/10'
                  : 'border-gray-700 hover:border-gray-600'
              )}
            >
              <Mic className="w-5 h-5 text-white" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Internal Microphone</p>
                <p className="text-xs text-green-600">{includeAudio ? 'On' : 'Off'}</p>
                {includeAudio && !isRecording && (
                  <div className="mt-2 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-green-500 h-full transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Start Recording Button */}
          <button
            onClick={handleStartRecording}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors mt-auto"
          >
            Start Recording
          </button>
        </div>
      </div>
    );
  }

  // Show recording controls
  return (
    <div className="w-full h-full bg-gray-900 rounded-xl flex flex-col">
      {/* Draggable Header */}
      <div
        className="flex items-center justify-center px-4 py-3 border-b border-gray-800 rounded-t-xl cursor-move"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <h2 className="text-white font-semibold select-none">Recording</h2>
      </div>

      {/* Recording Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Recording Time */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-600/20 rounded-full mb-4">
            <Circle className="w-3 h-3 fill-red-600 text-red-600 animate-pulse" />
            <span className="text-3xl font-mono font-medium text-white">
              {formatTime(recordingTime)}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {isPaused ? 'Recording paused' : 'Recording...'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6 text-white" />}
          </button>
          <button
            onClick={handleStop}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            title="Stop Recording"
          >
            <Square className="w-6 h-6 fill-current text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
