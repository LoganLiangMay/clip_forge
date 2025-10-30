import React, { useState, useEffect } from 'react';
import { Monitor, Camera, Mic, MicOff, X, Circle, Square, Pause, Play, Video, VideoOff, Home } from 'lucide-react';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { cn } from '../../utils/cn';

interface RecordingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordingDialog: React.FC<RecordingDialogProps> = ({ isOpen, onClose }) => {
  const [includeCamera, setIncludeCamera] = useState(false);
  const [includeScreen, setIncludeScreen] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = React.useRef<HTMLVideoElement>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 16, y: 16 }); // bottom-left by default
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const bubbleRef = React.useRef<HTMLDivElement>(null);

  const {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useMediaRecorder();

  useEffect(() => {
    if (isOpen && includeScreen) {
      loadSources();
    }
  }, [isOpen, includeScreen]);

  // Start/stop camera preview when includeCamera changes
  useEffect(() => {
    let mounted = true;

    if (includeCamera && !isRecording) {
      console.log('[RecordingDialog] Starting camera preview...');
      // Start camera preview
      navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
        .then(stream => {
          if (!mounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          console.log('[RecordingDialog] Camera stream obtained:', stream.getVideoTracks()[0]?.label);
          console.log('[RecordingDialog] Video tracks active:', stream.getVideoTracks()[0]?.enabled, stream.getVideoTracks()[0]?.readyState);
          setCameraStream(stream);

          // Use a small delay to ensure video element is mounted
          setTimeout(() => {
            if (cameraVideoRef.current && mounted) {
              console.log('[RecordingDialog] Setting srcObject on video element');
              cameraVideoRef.current.srcObject = stream;
              cameraVideoRef.current.play().then(() => {
                console.log('[RecordingDialog] Camera preview playing');
              }).catch(err => {
                console.error('[RecordingDialog] Failed to play video:', err);
              });
            } else {
              console.error('[RecordingDialog] Video ref is null!');
            }
          }, 100);
        })
        .catch(err => {
          console.error('[RecordingDialog] Failed to start camera preview:', err);
          alert(`Camera access denied: ${err.message}. Please check your permissions.`);
        });
    } else if (!includeCamera && cameraStream) {
      // Stop camera preview only if we have a stream
      console.log('[RecordingDialog] Stopping camera preview');
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    return () => {
      mounted = false;
    };
  }, [includeCamera, isRecording]);

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
    try {
      // Validate inputs
      if (!includeScreen && !includeCamera) {
        alert('Please select at least one video source (Screen or Camera)');
        return;
      }

      if (includeScreen && !selectedSource) {
        alert('Please select a screen or window to record');
        return;
      }

      // Create overlay windows for Loom-style recording
      if (includeCamera) {
        await window.electronAPI.createCameraBubbleOverlay(bubblePosition);
      }
      await window.electronAPI.createControlsOverlay();

      // Close the main recording dialog
      onClose();

      // Start recording based on selected options
      if (includeScreen && !includeCamera) {
        // Screen only
        await startRecording({
          screen: true,
          sourceId: selectedSource.id,
          audio: includeAudio,
          includeCamera: false,
        });
      } else if (includeCamera && !includeScreen) {
        // Camera only
        await startRecording({
          webcam: true,
          audio: includeAudio,
        });
      } else {
        // Both screen and camera (PiP mode with camera bubble at custom position)
        await startRecording({
          screen: true,
          sourceId: selectedSource.id,
          audio: includeAudio,
          includeCamera: true,
          bubblePosition: bubblePosition, // Pass the custom position
        });
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check your permissions.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    onClose();
  };

  // Drag handlers for camera bubble
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!bubbleRef.current) return;
    setIsDragging(true);

    const rect = bubbleRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // Calculate new position relative to viewport
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setBubblePosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-2xl shadow-xl max-w-sm w-full mx-4 relative">
        {/* Camera Preview Bubble (draggable) */}
        {includeCamera && !isRecording && (
          <div
            ref={bubbleRef}
            onMouseDown={handleMouseDown}
            className="fixed w-32 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-2xl z-[60] bg-gray-900 cursor-move"
            style={{
              left: `${bubblePosition.x}px`,
              top: `${bubblePosition.y}px`,
              userSelect: 'none',
            }}
          >
            {cameraStream ? (
              <video
                ref={cameraVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1] pointer-events-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                Loading...
              </div>
            )}
          </div>
        )}

        {!isRecording ? (
          <>
            {/* Header with close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button
                onClick={onClose}
                className="p-1 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1" />
            </div>

            {/* Recording Options */}
            <div className="px-4 pt-4 pb-4">
              {/* Full Screen Selection */}
              <div className="mb-3">
                {showSourceSelect ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => setShowSourceSelect(false)}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      ← Back
                    </button>
                    {sources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => {
                          setSelectedSource(source);
                          setIncludeScreen(true);
                          setShowSourceSelect(false);
                        }}
                        className={cn(
                          "w-full p-3 rounded-xl border-2 transition-colors text-left flex items-center gap-3",
                          selectedSource?.id === source.id
                            ? 'border-border bg-secondary'
                            : 'border-border hover:bg-secondary/50'
                        )}
                      >
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-16 aspect-video object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{source.name}</p>
                          {selectedSource?.id === source.id && (
                            <p className="text-xs text-green-600 mt-0.5">On</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSourceSelect(true)}
                    className="w-full p-3 rounded-xl border-2 border-border hover:bg-secondary/50 transition-colors text-left flex items-center gap-3"
                  >
                    <Monitor className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {selectedSource ? selectedSource.name : 'Full screen'}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {includeScreen ? 'On' : 'Off'}
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* FaceTime HD Camera Selection */}
              <div className="mb-3">
                <button
                  onClick={() => setIncludeCamera(!includeCamera)}
                  className="w-full p-3 rounded-xl border-2 border-border hover:bg-secondary/50 transition-colors text-left flex items-center gap-3"
                >
                  <Camera className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">FaceTime HD Camera</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {includeCamera ? 'On' : 'Off'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Audio Source Selection */}
              <div className="mb-4">
                <button
                  onClick={() => setIncludeAudio(!includeAudio)}
                  className="w-full p-3 rounded-xl border-2 border-border hover:bg-secondary/50 transition-colors text-left flex items-center gap-3"
                >
                  <Mic className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Default - Internal Microphone</p>
                    <p className="text-xs text-green-600 mt-0.5">{includeAudio ? 'On' : 'Off'}</p>
                  </div>
                </button>
              </div>

              {/* Start Recording Button */}
              <button
                onClick={handleStartRecording}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-semibold transition-colors"
              >
                Start recording
              </button>
            </div>
          </>
        ) : (
            <>
              {/* Recording Status */}
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-600/20 rounded-full mb-6">
                  <Circle className="w-3 h-3 fill-red-600 text-red-600 animate-pulse" />
                  <span className="text-2xl font-mono font-medium">
                    {formatTime(recordingTime)}
                  </span>
                </div>

                {/* Recording Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="p-4 bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                  >
                    {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                  >
                    <Square className="w-6 h-6 fill-current" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mt-4">
                  {isPaused ? 'Recording paused' : 'Recording in progress...'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
  );
};