// Shared types between main and renderer processes

export interface MediaFile {
  id: string;
  path: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  metadata?: any;
  thumbnail?: string;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  volume: number;
  effects: any[];
}

export interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  muted: boolean;
  locked: boolean;
  clips: TimelineClip[];
}

export interface ProjectData {
  projectName: string;
  projectPath: string | null;
  mediaFiles: MediaFile[];
  tracks: Track[];
  duration: number;
}