import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useProjectStore } from '../../store/projectStore';

interface AIBrollDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIBrollDialog: React.FC<AIBrollDialogProps> = ({ isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [preferVideos, setPreferVideos] = useState(true);

  const { projectPath, addMediaFile, tracks, mediaFiles } = useProjectStore();

  // Listen for progress updates from main process
  useEffect(() => {
    const extractionProgress = (prog: string) => setProgress(prog);
    const transcriptionProgress = (prog: string) => setProgress(prog);

    window.electronAPI.onExtractionProgress(extractionProgress);
    window.electronAPI.onTranscriptionProgress(transcriptionProgress);
  }, []);

  const handleAnalyzeTimeline = async () => {
    // Get all clips from timeline
    const allClips = tracks.flatMap(track => track.clips);

    if (allClips.length === 0) {
      setError('No clips found on timeline. Add some media to the timeline first.');
      return;
    }

    // Map clips to include file paths from media files
    const clipsWithPaths = allClips
      .map(clip => {
        const mediaFile = mediaFiles.find(mf => mf.id === clip.mediaId);
        if (!mediaFile) return null;

        return {
          id: clip.id,
          filePath: mediaFile.path,
          startTime: clip.startTime,
          duration: clip.duration,
          inPoint: clip.inPoint,
          outPoint: clip.outPoint,
          trackType: mediaFile.type,
        };
      })
      .filter(Boolean);

    if (clipsWithPaths.length === 0) {
      setError('No valid clips found. Make sure your clips have associated media files.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setProgress('Extracting audio from timeline...');

    try {
      // Step 1: Extract audio from timeline clips
      const extractResult = await window.electronAPI.aiExtractAudio(clipsWithPaths);

      if (!extractResult.success) {
        throw new Error(extractResult.error || 'Failed to extract audio');
      }

      const audioPath = extractResult.data;
      console.log('[AIBrollDialog] Audio extracted:', audioPath);

      // Step 2: Transcribe audio with Whisper
      setProgress('Transcribing audio with OpenAI Whisper...');
      const transcribeResult = await window.electronAPI.aiTranscribeAudio(audioPath);

      if (!transcribeResult.success) {
        throw new Error(transcribeResult.error || 'Failed to transcribe audio');
      }

      const transcript = transcribeResult.data;
      console.log('[AIBrollDialog] Transcript:', transcript);

      // Step 3: Analyze transcript with GPT-4
      setProgress('Analyzing content with AI...');
      const analyzeResult = await window.electronAPI.aiAnalyzeContent(transcript);

      if (!analyzeResult.success) {
        throw new Error(analyzeResult.error || 'Failed to analyze content');
      }

      const scenes = analyzeResult.data;
      console.log('[AIBrollDialog] Scenes extracted:', scenes);

      if (!scenes || scenes.length === 0) {
        throw new Error('No B-roll scenes identified. Try adding more descriptive audio to your timeline.');
      }

      setProgress(`Found ${scenes.length} scenes. Searching for media...`);

      // Step 4: Search for media
      const searchResult = await window.electronAPI.aiSearchMedia(scenes);

      if (!searchResult.success) {
        throw new Error(searchResult.error || 'Failed to search for media');
      }

      const mediaResults = searchResult.data;
      console.log('[AIBrollDialog] Media results:', mediaResults);

      if (!mediaResults || mediaResults.length === 0) {
        throw new Error('No media found for your scenes. Try different content.');
      }

      setProgress(`Found ${mediaResults.length} media files. Downloading...`);

      // Step 5: Download media to Downloads folder (simple default location)
      const downloadResult = await window.electronAPI.aiDownloadMedia(mediaResults, null);

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Failed to download media');
      }

      const downloadedFiles = downloadResult.data;
      console.log('[AIBrollDialog] Downloaded files:', downloadedFiles);

      if (!downloadedFiles || downloadedFiles.length === 0) {
        throw new Error('Failed to download media files');
      }

      setProgress('Adding B-roll to Media Library...');

      // Add downloaded files to media library with B-roll category
      for (const file of downloadedFiles) {
        // Extract filename from path (browser-compatible way)
        const fileName = file.path.split('/').pop() || file.path.split('\\').pop() || 'untitled';

        const mediaFile = {
          id: `ai-broll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          path: file.path,
          name: fileName,
          type: file.type as 'video' | 'image',
          duration: file.type === 'video' ? 5000 : 3000, // Default durations
          metadata: {
            isBroll: true,
            topic: file.topic,
            source: 'ai-generated',
          },
        };
        addMediaFile(mediaFile);
      }

      setProgress(`✓ Complete! Added ${downloadedFiles.length} B-roll clips to Media Library`);

      setTimeout(() => {
        onClose();
        setProgress('');
      }, 2000);

    } catch (err) {
      console.error('[AIBrollDialog] Generation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            AI B-roll Finder
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-full transition-colors"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Instructions */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <p className="text-sm text-purple-100">
              <strong>How it works:</strong> The AI will extract audio from your timeline,
              transcribe it using Whisper, analyze the content, and automatically find relevant
              stock footage to add to your Media Library.
            </p>
          </div>

          {/* Timeline Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Timeline Status</p>
            <div className="bg-secondary border border-border rounded-lg p-4">
              <p className="text-sm">
                {tracks.flatMap(t => t.clips).length > 0
                  ? `✓ ${tracks.flatMap(t => t.clips).length} clips found on timeline`
                  : '⚠ No clips on timeline - add media to timeline first'}
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Options</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferVideos}
                onChange={(e) => setPreferVideos(e.target.checked)}
                disabled={isGenerating}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm">Prefer video clips over images</span>
            </label>

            <p className="text-xs text-muted-foreground">
              💡 B-roll will be added to your Media Library. Manually drag clips to timeline as needed.
            </p>
          </div>

          {/* Progress */}
          {progress && (
            <div className="bg-secondary border border-border rounded-lg p-4 flex items-center gap-3">
              {isGenerating && <Loader2 className="w-5 h-5 animate-spin text-purple-500" />}
              <span className="text-sm">{progress}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-100">{error}</p>
                {error.includes('API keys') && (
                  <p className="text-xs text-red-200 mt-2">
                    Go to Settings (gear icon) to configure your API keys
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyzeTimeline}
            disabled={isGenerating || tracks.flatMap(t => t.clips).length === 0}
            className={cn(
              "px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2",
              "disabled:bg-gray-600 disabled:cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Timeline
              </>
            )}
          </button>
        </div>

        {/* API Key Notice */}
        {!isGenerating && (
          <div className="px-6 pb-4">
            <p className="text-xs text-muted-foreground">
              💡 Requires OpenAI and SerpAPI keys. Configure in Settings if not already set.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
