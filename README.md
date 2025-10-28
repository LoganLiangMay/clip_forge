# ClipForge - Desktop Video Editor

Cross-platform desktop video editor built with Electron & React. Record screens/webcams, edit on multi-track timeline, control audio with waveform visualization, and export in multiple formats. Perfect for content creators, educators, and professionals.

A powerful desktop video editor built with Electron, React, TypeScript, and FFmpeg.

## Features (MVP)

- **Media Import**: Support for all major video formats (MP4, MOV, AVI, WebM, MKV, FLV)
- **Multi-track Timeline**: 3 video tracks and 3 audio tracks
- **Screen & Webcam Recording**: Built-in recording capabilities
- **Timeline Editing**: Drag-and-drop clips, trim, split, and arrange
- **Audio Editing**: Volume control, fade in/out, waveform visualization
- **Properties Panel**: Adjust clip properties including transform, audio, and effects
- **Auto-save**: Automatic project saving every 2 minutes
- **Dark Theme**: Professional dark UI optimized for video editing

## Project Structure

```
clip_forge/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts        # Main entry point
│   │   ├── ipc/           # IPC handlers
│   │   ├── menu/          # Application menu
│   │   ├── windows/       # Window management
│   │   └── ffmpeg/        # FFmpeg operations
│   ├── renderer/          # React application
│   │   ├── components/    # UI components
│   │   │   ├── panels/    # Main panel components
│   │   │   ├── timeline/  # Timeline components
│   │   │   └── common/    # Shared components
│   │   ├── store/         # Zustand state management
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # Global styles
│   └── preload/           # Preload scripts
├── public/                # Static assets
└── dist/                  # Build output
```

## Tech Stack

- **Electron**: Cross-platform desktop framework
- **React 18**: UI components and rendering
- **TypeScript**: Type safety and better DX
- **Vite**: Fast build tooling
- **FFmpeg**: Video/audio processing
- **Zustand**: State management
- **Tailwind CSS**: Styling
- **Lucide React**: Icons

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- FFmpeg (automatically installed via @ffmpeg-installer/ffmpeg)

### Installation

```bash
# Clone the repository
git clone https://github.com/LoganLiangMay/clip_forge.git
cd clip_forge

# Install dependencies
npm install
```

### Running in Development

```bash
# Start the development server (Vite + Electron)
npm run dev
```

This will:
1. Start the Vite development server for the React app
2. Launch Electron with hot reload enabled

### Building

```bash
# Build for production
npm run build

# Package for distribution
npm run dist        # All platforms
npm run dist:mac    # macOS only
npm run dist:win    # Windows only
npm run dist:linux  # Linux only
```

## Usage

1. **Import Media**: Click the Import button in the toolbar or drag files to the Media Library
2. **Add to Timeline**: Drag media from the library to timeline tracks
3. **Edit Clips**: Select clips on the timeline to adjust properties in the Properties panel
4. **Preview**: Use the preview panel to see your edits in real-time
5. **Export**: File > Export Video to render your final video

## Keyboard Shortcuts

- **Ctrl/Cmd + N**: New Project
- **Ctrl/Cmd + O**: Open Project
- **Ctrl/Cmd + S**: Save Project
- **Ctrl/Cmd + I**: Import Media
- **Ctrl/Cmd + E**: Export Video
- **Space**: Play/Pause
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z**: Redo

## Roadmap (Phase 2)

- AI-powered features
- Advanced effects and transitions
- Color grading tools
- Motion tracking
- Audio effects and mixing
- Plugin system

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details