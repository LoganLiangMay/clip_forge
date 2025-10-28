import React, { useState, useEffect } from 'react';
import { Sliders, Play, Volume2, Palette, Move, Maximize2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../utils/cn';

export const Properties: React.FC = () => {
  const { selectedClipId, tracks, updateClip } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'transform' | 'audio' | 'effects'>('transform');

  // Find the selected clip
  const selectedClip = tracks
    .flatMap(track => track.clips)
    .find(clip => clip.id === selectedClipId);

  const media = selectedClip
    ? useProjectStore.getState().mediaFiles.find(f => f.id === selectedClip.mediaId)
    : null;

  if (!selectedClip || !media) {
    return (
      <div className="h-full flex flex-col bg-background p-4">
        <h2 className="text-sm font-semibold mb-4">Properties</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Sliders className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No clip selected</p>
            <p className="text-xs mt-1">Select a clip to view properties</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Properties</h2>
        <p className="text-xs text-muted-foreground mt-1">{media.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('transform')}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === 'transform'
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Transform
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === 'audio'
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Audio
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === 'effects'
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Effects
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'transform' && (
          <TransformPanel clip={selectedClip} updateClip={updateClip} />
        )}
        {activeTab === 'audio' && (
          <AudioPanel clip={selectedClip} updateClip={updateClip} />
        )}
        {activeTab === 'effects' && (
          <EffectsPanel clip={selectedClip} updateClip={updateClip} />
        )}
      </div>
    </div>
  );
};

const TransformPanel: React.FC<{ clip: any; updateClip: any }> = ({ clip, updateClip }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium mb-1 block">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-muted-foreground">X</span>
            <input
              type="number"
              defaultValue={0}
              className="w-full px-2 py-1 text-xs bg-secondary border border-border rounded"
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Y</span>
            <input
              type="number"
              defaultValue={0}
              className="w-full px-2 py-1 text-xs bg-secondary border border-border rounded"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Scale</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="200"
            defaultValue={100}
            className="flex-1"
          />
          <input
            type="number"
            defaultValue={100}
            className="w-16 px-2 py-1 text-xs bg-secondary border border-border rounded"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Rotation</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="-180"
            max="180"
            defaultValue={0}
            className="flex-1"
          />
          <input
            type="number"
            defaultValue={0}
            className="w-16 px-2 py-1 text-xs bg-secondary border border-border rounded"
          />
          <span className="text-xs text-muted-foreground">°</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Opacity</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            defaultValue={100}
            className="flex-1"
          />
          <input
            type="number"
            defaultValue={100}
            className="w-16 px-2 py-1 text-xs bg-secondary border border-border rounded"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>
    </div>
  );
};

const AudioPanel: React.FC<{ clip: any; updateClip: any }> = ({ clip, updateClip }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium mb-1 block">Volume</label>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <input
            type="range"
            min="0"
            max="200"
            defaultValue={100}
            className="flex-1"
            onChange={(e) => updateClip(clip.id, { volume: parseFloat(e.target.value) / 100 })}
          />
          <input
            type="number"
            defaultValue={100}
            className="w-16 px-2 py-1 text-xs bg-secondary border border-border rounded"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Fade In</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            defaultValue={0}
            className="flex-1"
          />
          <input
            type="number"
            defaultValue={0}
            step="0.1"
            className="w-16 px-2 py-1 text-xs bg-secondary border border-border rounded"
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-1 block">Fade Out</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            defaultValue={0}
            className="flex-1"
          />
          <input
            type="number"
            defaultValue={0}
            step="0.1"
            className="w-16 px-2 py-1 text-xs bg-secondary border border-border rounded"
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium mb-2 block">Audio Channels</label>
        <div className="flex gap-2">
          <button className="flex-1 px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded">
            Stereo
          </button>
          <button className="flex-1 px-2 py-1 text-xs hover:bg-secondary rounded">
            Mono
          </button>
        </div>
      </div>
    </div>
  );
};

const EffectsPanel: React.FC<{ clip: any; updateClip: any }> = ({ clip, updateClip }) => {
  return (
    <div className="space-y-4">
      <div className="text-center py-8 text-muted-foreground">
        <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No effects applied</p>
        <p className="text-xs mt-1">Effects will be available in future updates</p>
      </div>
    </div>
  );
};