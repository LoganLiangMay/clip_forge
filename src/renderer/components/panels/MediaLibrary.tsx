import React, { useState } from 'react';
import { Folder, Film, Music, Image, Search, Plus, Grid, List } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../utils/cn';

export const MediaLibrary: React.FC = () => {
  const { mediaFiles, addClipToTimeline } = useProjectStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredFiles = mediaFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      default:
        return <Folder className="w-4 h-4" />;
    }
  };

  const handleImportMedia = async () => {
    const result = await window.electronAPI.openFiles();
    if (!result.canceled) {
      for (const filePath of result.filePaths) {
        const metadata = await window.electronAPI.getMetadata(filePath);
        useProjectStore.getState().addMediaFile({
          id: Date.now().toString(),
          path: filePath,
          name: filePath.split('/').pop() || 'Untitled',
          type: metadata.format.format_name?.includes('mp4') ? 'video' : 'audio',
          duration: parseFloat(metadata.format.duration || '0'),
          metadata,
        });
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, mediaId: string) => {
    e.dataTransfer.setData('mediaId', mediaId);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold mb-3">Media Library</h2>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 bg-secondary text-sm rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleImportMedia}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            <Plus className="w-3 h-3" />
            Import
          </button>

          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1 rounded",
                viewMode === 'grid' ? 'bg-secondary' : 'hover:bg-secondary/50'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1 rounded",
                viewMode === 'list' ? 'bg-secondary' : 'hover:bg-secondary/50'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Media Items */}
      <div className="flex-1 overflow-auto p-2">
        {filteredFiles.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No media files</p>
            <p className="text-xs mt-1">Import files to get started</p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-1'
          )}>
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, file.id)}
                className={cn(
                  "cursor-pointer hover:bg-secondary/50 rounded transition-colors",
                  viewMode === 'grid'
                    ? 'p-2 flex flex-col items-center text-center'
                    : 'p-2 flex items-center gap-2'
                )}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="w-full aspect-video bg-secondary/50 rounded flex items-center justify-center mb-1">
                      {file.thumbnail ? (
                        <img src={file.thumbnail} alt={file.name} className="w-full h-full object-cover rounded" />
                      ) : (
                        getFileIcon(file.type)
                      )}
                    </div>
                    <span className="text-xs truncate w-full">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(file.duration)}
                    </span>
                  </>
                ) : (
                  <>
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(file.duration)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}