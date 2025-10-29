import React, { useState } from 'react';
import { X, Film, Download } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../utils/cn';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportPreset {
  name: string;
  resolution: string;
  fps: number;
  bitrate: string;
  format: string;
}

const exportPresets: ExportPreset[] = [
  { name: 'YouTube 1080p', resolution: '1920x1080', fps: 30, bitrate: '8000k', format: 'mp4' },
  { name: 'YouTube 720p', resolution: '1280x720', fps: 30, bitrate: '5000k', format: 'mp4' },
  { name: 'YouTube 4K', resolution: '3840x2160', fps: 30, bitrate: '40000k', format: 'mp4' },
  { name: 'Instagram', resolution: '1080x1920', fps: 30, bitrate: '5000k', format: 'mp4' },
  { name: 'Twitter', resolution: '1280x720', fps: 30, bitrate: '5000k', format: 'mp4' },
  { name: 'Web Optimized', resolution: '1920x1080', fps: 30, bitrate: '4000k', format: 'mp4' },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { tracks, mediaFiles, duration } = useProjectStore();
  const [selectedPreset, setSelectedPreset] = useState(exportPresets[0]);
  const [customSettings, setCustomSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [outputPath, setOutputPath] = useState('');

  const handleExport = async () => {
    try {
      // Ask user for save location
      const result = await window.electronAPI.saveFile('export.mp4');
      if (result.canceled) return;

      setOutputPath(result.filePath);
      setExporting(true);
      setExportProgress(0);

      // Collect all clips from all tracks with full composition data
      const allClips = tracks.flatMap(track =>
        track.clips.map(clip => {
          const media = mediaFiles.find(f => f.id === clip.mediaId);

          // Calculate the actual trimmed duration for each clip
          const inPoint = clip.inPoint || 0;
          const outPoint = clip.outPoint !== undefined ? clip.outPoint : (inPoint + clip.duration);
          const trimmedDuration = outPoint - inPoint;

          console.log(`[ExportDialog] Clip ${clip.id}:`, {
            timelineDuration: clip.duration,
            inPoint,
            outPoint,
            trimmedDuration,
            startTime: clip.startTime
          });

          // IMPORTANT: Export needs the TRIMMED duration, not the timeline duration
          // The timeline duration (clip.duration) may be the original video duration
          // But we need to send the actual trimmed content duration
          const actualTrimmedDuration = trimmedDuration;

          return {
            id: clip.id,
            filePath: media?.path || '',
            startTime: clip.startTime,
            duration: actualTrimmedDuration,  // Use trimmed duration, not clip.duration!
            inPoint: clip.inPoint || 0,
            outPoint: clip.outPoint,
            volume: clip.volume || 1,
            trackType: track.type,
            muted: track.muted,
          };
        })
      );

      // Sort by startTime
      allClips.sort((a, b) => a.startTime - b.startTime);

      // Filter out clips without valid file paths
      const validClips = allClips.filter(clip => clip.filePath);

      if (validClips.length === 0) {
        alert('No valid clips to export');
        setExporting(false);
        return;
      }

      // Calculate the actual content duration (end time of last clip)
      // Must use trimmed duration, not timeline duration
      const sortedClips = [...validClips].sort((a, b) => a.startTime - b.startTime);
      const lastClip = sortedClips[sortedClips.length - 1];
      const lastClipInPoint = lastClip.inPoint || 0;
      const lastClipOutPoint = lastClip.outPoint !== undefined ? lastClip.outPoint : (lastClipInPoint + lastClip.duration);
      const lastClipTrimmedDuration = lastClipOutPoint - lastClipInPoint;

      // For timeline duration, we need to consider the actual timeline position and trimmed duration
      // If a clip is placed at timeline position X and has trimmed duration Y, the end is X + Y
      // NOT X + original duration
      const actualDuration = lastClip.startTime + lastClipTrimmedDuration;

      console.log('[ExportDialog] Exporting', validClips.length, 'clips');
      console.log('[ExportDialog] Timeline duration from store:', duration);
      console.log('[ExportDialog] Last clip details:', {
        startTime: lastClip.startTime,
        duration: lastClip.duration,
        inPoint: lastClipInPoint,
        outPoint: lastClipOutPoint,
        trimmedDuration: lastClipTrimmedDuration
      });
      console.log('[ExportDialog] Calculated actual duration:', actualDuration);
      console.log('[ExportDialog] All clips timeline positions:', sortedClips.map(c => ({
        id: c.id,
        start: c.startTime,
        duration: c.duration,
        inPoint: c.inPoint,
        outPoint: c.outPoint
      })));

      // Listen for export progress
      window.electronAPI.onExportProgress((progress: any) => {
        if (progress.percent) {
          setExportProgress(progress.percent);
        }
      });

      // Export video with proper composition data
      await window.electronAPI.exportVideo({
        clips: validClips,
        outputPath: result.filePath,
        format: selectedPreset.format,
        resolution: selectedPreset.resolution,
        fps: selectedPreset.fps,
        bitrate: selectedPreset.bitrate,
        audioChannels: 2,
        audioBitrate: '192k',
        duration: actualDuration,
      });

      setExporting(false);
      setExportProgress(100);

      // Show success message
      alert('Export completed successfully!');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error as Error).message);
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Export Video</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded"
            disabled={exporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!exporting ? (
            <>
              {/* Project Info */}
              <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 font-medium">{formatDuration(duration)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Clips:</span>
                    <span className="ml-2 font-medium">
                      {tracks.reduce((sum, t) => sum + t.clips.length, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Export Presets */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Export Preset</label>
                  <button
                    onClick={() => setCustomSettings(!customSettings)}
                    className="text-xs text-primary hover:underline"
                  >
                    {customSettings ? 'Use Preset' : 'Custom Settings'}
                  </button>
                </div>

                {!customSettings ? (
                  <div className="grid grid-cols-2 gap-3">
                    {exportPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => setSelectedPreset(preset)}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-colors text-left",
                          selectedPreset.name === preset.name
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <p className="text-sm font-medium mb-1">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {preset.resolution} · {preset.fps}fps · {preset.bitrate}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Resolution</label>
                        <input
                          type="text"
                          value={selectedPreset.resolution}
                          onChange={(e) =>
                            setSelectedPreset({ ...selectedPreset, resolution: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">FPS</label>
                        <input
                          type="number"
                          value={selectedPreset.fps}
                          onChange={(e) =>
                            setSelectedPreset({ ...selectedPreset, fps: parseInt(e.target.value) })
                          }
                          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Bitrate</label>
                        <input
                          type="text"
                          value={selectedPreset.bitrate}
                          onChange={(e) =>
                            setSelectedPreset({ ...selectedPreset, bitrate: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Format</label>
                        <select
                          value={selectedPreset.format}
                          onChange={(e) =>
                            setSelectedPreset({ ...selectedPreset, format: e.target.value })
                          }
                          className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-md"
                        >
                          <option value="mp4">MP4</option>
                          <option value="mov">MOV</option>
                          <option value="avi">AVI</option>
                          <option value="webm">WebM</option>
                          <option value="mkv">MKV</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="w-full py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                Export Video
              </button>
            </>
          ) : (
            <>
              {/* Export Progress */}
              <div className="text-center py-8">
                <div className="mb-6">
                  <Film className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
                  <h3 className="text-lg font-semibold mb-2">Exporting Video...</h3>
                  <p className="text-sm text-muted-foreground">{outputPath}</p>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden mb-4">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="text-lg font-mono font-medium">{Math.round(exportProgress)}%</p>

                <p className="text-xs text-muted-foreground mt-4">
                  This may take several minutes depending on your project size...
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}