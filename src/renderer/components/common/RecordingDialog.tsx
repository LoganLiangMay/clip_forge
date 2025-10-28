import React, { useState, useEffect } from 'react';
import { Monitor, Camera, Mic, MicOff, X, Circle, Square, Pause, Play } from 'lucide-react';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { cn } from '../../utils/cn';

interface RecordingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecordingDialog: React.FC<RecordingDialogProps> = ({ isOpen, onClose }) => {
  const [recordingType, setRecordingType] = useState<'screen' | 'webcam'>('screen');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [showSourceSelect, setShowSourceSelect] = useState(false);

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
    if (isOpen && recordingType === 'screen') {
      loadSources();
    }
  }, [isOpen, recordingType]);

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
      if (recordingType === 'screen') {
        if (!selectedSource) {
          alert('Please select a screen or window to record');
          return;
        }
        await startRecording({
          screen: true,
          sourceId: selectedSource.id,
          audio: includeAudio,
        });
      } else {
        await startRecording({
          webcam: true,
          audio: includeAudio,
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
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isRecording ? 'Recording...' : 'New Recording'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded"
            disabled={isRecording}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isRecording ? (
            <>
              {/* Recording Type */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Recording Type</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setRecordingType('screen')}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 transition-colors",
                      recordingType === 'screen'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Monitor className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">Screen</p>
                  </button>
                  <button
                    onClick={() => setRecordingType('webcam')}
                    className={cn(
                      "flex-1 p-4 rounded-lg border-2 transition-colors",
                      recordingType === 'webcam'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Camera className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">Webcam</p>
                  </button>
                </div>
              </div>

              {/* Source Selection for Screen Recording */}
              {recordingType === 'screen' && (
                <div className="mb-6">
                  <label className="text-sm font-medium mb-3 block">Select Source</label>
                  {showSourceSelect ? (
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {sources.map((source) => (
                        <button
                          key={source.id}
                          onClick={() => {
                            setSelectedSource(source);
                            setShowSourceSelect(false);
                          }}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-colors text-left",
                            selectedSource?.id === source.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <img
                            src={source.thumbnail}
                            alt={source.name}
                            className="w-full aspect-video object-cover rounded mb-2"
                          />
                          <p className="text-xs truncate">{source.name}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSourceSelect(true)}
                      className="w-full p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors"
                    >
                      {selectedSource ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={selectedSource.thumbnail}
                            alt={selectedSource.name}
                            className="w-24 aspect-video object-cover rounded"
                          />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{selectedSource.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Click to change source
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click to select source</p>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Audio Option */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-secondary"
                  />
                  <span className="text-sm font-medium flex items-center gap-2">
                    {includeAudio ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    Include Audio
                  </span>
                </label>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartRecording}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Circle className="w-5 h-5 fill-current" />
                Start Recording
              </button>
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
    </div>
  );
};