import React, { useState } from 'react';
import { X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useProjectStore } from '../../store/projectStore';
import path from 'path';

interface AIBrollDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIBrollDialog: React.FC<AIBrollDialogProps> = ({ isOpen, onClose }) => {
  const [script, setScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [preferVideos, setPreferVideos] = useState(true);
  const [autoPlace, setAutoPlace] = useState(true);
  const [addFades, setAddFades] = useState(true);

  const { projectPath, addMediaFile, addAIClipsToTimeline } = useProjectStore();

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('Please enter a script or description');
      return;
    }

    if (!projectPath) {
      setError('Please save your project first to download AI B-roll media');
      return;
    }

    setIsGenerating(true);
    setError('');
    setProgress('Analyzing your content...');

    try {
      // Step 1: Analyze content with OpenAI
      const analyzeResult = await window.electronAPI.aiAnalyzeContent(script);

      if (!analyzeResult.success) {
        throw new Error(analyzeResult.error || 'Failed to analyze content');
      }

      const scenes = analyzeResult.data;
      console.log('[AIBrollDialog] Scenes extracted:', scenes);

      if (!scenes || scenes.length === 0) {
        throw new Error('No scenes extracted from your content. Try providing more detailed descriptions.');
      }

      setProgress(`Found ${scenes.length} scenes. Searching for media...`);

      // Step 2: Search for media
      const searchResult = await window.electronAPI.aiSearchMedia(scenes);

      if (!searchResult.success) {
        throw new Error(searchResult.error || 'Failed to search for media');
      }

      const mediaResults = searchResult.data;
      console.log('[AIBrollDialog] Media results:', mediaResults);

      if (!mediaResults || mediaResults.length === 0) {
        throw new Error('No media found for your scenes. Try using different keywords.');
      }

      setProgress(`Found ${mediaResults.length} media files. Downloading...`);

      // Step 3: Download media
      const projectDir = path.dirname(projectPath);
      const downloadResult = await window.electronAPI.aiDownloadMedia(mediaResults, projectDir);

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Failed to download media');
      }

      const downloadedFiles = downloadResult.data;
      console.log('[AIBrollDialog] Downloaded files:', downloadedFiles);

      if (!downloadedFiles || downloadedFiles.length === 0) {
        throw new Error('Failed to download media files');
      }

      setProgress('Adding media to library...');

      // Add downloaded files to media library
      for (const file of downloadedFiles) {
        const mediaFile = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          path: file.path,
          name: path.basename(file.path),
          type: file.type as 'video' | 'image',
          duration: file.type === 'video' ? 5000 : 3000, // Default durations
        };
        addMediaFile(mediaFile);
      }

      // Step 4: Auto-place on timeline if enabled
      if (autoPlace) {
        setProgress('Placing clips on timeline...');

        const insertResult = await window.electronAPI.aiInsertToTimeline(downloadedFiles, scenes);

        if (insertResult.success) {
          const timelineInsertions = insertResult.data;
          console.log('[AIBrollDialog] Timeline insertions:', timelineInsertions);

          // Add clips to timeline via store
          addAIClipsToTimeline(timelineInsertions);
        }
      }

      setProgress(`✓ Complete! Added ${downloadedFiles.length} B-roll clips`);

      setTimeout(() => {
        onClose();
        setScript('');
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
              <strong>How it works:</strong> Describe your video content or paste your script.
              AI will analyze it, find relevant stock footage, and add it to your project automatically.
            </p>
          </div>

          {/* Script Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Video Script or Description
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Example: A morning routine tutorial. Start with sunrise and coffee brewing, then show healthy breakfast preparation. Include shots of exercise and planning the day with a planner."
              className="w-full h-40 px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about visual scenes and topics for best results
            </p>
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

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPlace}
                onChange={(e) => setAutoPlace(e.target.checked)}
                disabled={isGenerating}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm">Automatically place clips on timeline (Track V2)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addFades}
                onChange={(e) => setAddFades(e.target.checked)}
                disabled={isGenerating}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm">Add fade in/out transitions</span>
            </label>
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
            onClick={handleGenerate}
            disabled={!script.trim() || isGenerating || !projectPath}
            className={cn(
              "px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2",
              "disabled:bg-gray-600 disabled:cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate B-roll
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
