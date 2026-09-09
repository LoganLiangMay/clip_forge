# ClipForge

**A modern desktop video editor built with Electron, React, and FFmpeg**

ClipForge is a professional video editing application featuring Loom-style recording, multi-track timeline editing, AI-powered B-roll generation, and seamless export capabilities. Built for content creators, educators, and video professionals.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-32.2-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19.2-blue.svg)](https://reactjs.org/)

## ✨ Features

### Recording & Capture
- **Loom-Style Recording**: Picture-in-picture webcam overlay with drag-and-drop positioning
- **Multi-Source Capture**: Record screen, webcam, or both simultaneously
- **Audio Recording**: Built-in microphone support with audio mixing

### Timeline Editing
- **Multi-Track Timeline**: Unlimited video and audio tracks with drag-and-drop
- **Clip Operations**: Split (S key), trim, delete, and move clips with magnetic snapping
- **Real-Time Preview**: Instant playback with scrubbing and frame-accurate seeking
- **Waveform Visualization**: Audio waveforms for precise editing

### AI-Powered Features ✨
- **AI B-roll Finder**: Automatically analyze timeline audio, extract scenes, and insert relevant stock footage
- **Smart Search**: Powered by OpenAI Whisper transcription and GPT-4 analysis
- **Auto-Placement**: AI clips inserted with timestamps and visual distinction

### Export & Output
- **Professional Export**: Multiple format support (MP4, MOV, WebM, AVI, MKV)
- **Platform Presets**: YouTube (1080p, 720p, 4K), Instagram, Twitter, Web-optimized
- **Quality Control**: Customizable resolution, bitrate, and codec settings

### Workflow
- **Undo/Redo**: Full edit history (50 levels)
- **Auto-Save**: Projects saved every 2 minutes
- **Keyboard Shortcuts**: Fast editing with Space (play/pause), S (split), Delete (remove)
- **Dark Theme**: Professional dark UI optimized for video editing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm (included with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/LoganLiangMay/clip_forge.git
cd clip_forge

# Install dependencies
npm install

# Run in development mode
npm run dev
```

The app will launch automatically. If not, it will be available at `http://localhost:5173/`

### Building for Production

```bash
# Build all platforms
npm run dist

# Platform-specific builds
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

## 📋 Current Status

**✅ Production Ready - MVP Complete**

All core features are implemented and tested:
- ✅ Clean install and build process
- ✅ Screen and webcam recording
- ✅ Multi-track timeline editing
- ✅ Real-time preview and playback
- ✅ Professional video export
- ✅ AI B-roll generation
- ✅ Project save/load with auto-save
- ✅ Comprehensive undo/redo
- ✅ Dark theme UI

**Known Limitations:**
- AI features require OpenAI and SerpAPI keys (optional)
- GPU acceleration not yet implemented for preview
- Limited built-in effects (transform and audio only)

**Future Enhancements:**
- Advanced transitions and effects
- Color grading tools
- Motion tracking
- Audio effects library
- Plugin system

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop** | Electron 32.2 | Cross-platform runtime |
| **Frontend** | React 19.2 | UI framework |
| **Language** | TypeScript 5.9 | Type-safe development |
| **Build Tool** | Vite 6.4 | Fast dev server & bundler |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **State** | Zustand 5.0 | Lightweight state management |
| **Video** | FFmpeg | Video processing & encoding |
| **AI** | OpenAI Whisper + GPT-4 | Transcription & analysis |
| **Search** | SerpAPI | Stock footage search |

## 📚 Documentation

- **[Quick Start](SETUP.md)** - Detailed setup and troubleshooting guide
- **[AI B-roll Setup](#ai-b-roll-setup)** - Configure AI features (optional)

### AI B-roll Setup

To use AI B-roll features (optional):

1. Get API keys:
   - **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **SerpAPI**: [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key)

2. In ClipForge:
   - Click Settings (gear icon) in toolbar
   - Add your API keys
   - Click "AI B-roll" to analyze timeline or paste a script

**Cost:** ~$0.02-0.10 per AI generation (depends on audio length)

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Project | `Ctrl/Cmd + N` |
| Open Project | `Ctrl/Cmd + O` |
| Save Project | `Ctrl/Cmd + S` |
| Import Media | `Ctrl/Cmd + I` |
| Export Video | `Ctrl/Cmd + E` |
| Play/Pause | `Space` |
| Split Clip | `S` |
| Delete Clip | `Delete/Backspace` |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` |

## 🧪 Testing

```bash
# Run smoke test (verifies build)
npm test
```

## 🗂️ Project Structure

```
clip_forge/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── ipc/           # IPC handlers
│   │   ├── menu/          # Application menu
│   │   ├── windows/       # Window management
│   │   ├── ffmpeg/        # FFmpeg operations
│   │   └── services/      # AI services
│   ├── renderer/          # React application
│   │   ├── components/    # UI components
│   │   ├── store/         # Zustand state management
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   ├── preload/           # Preload scripts
│   └── shared/            # Shared types
├── dist/                  # Build output
└── test/                  # Test files
```

## 📝 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run preview` | Preview production build |

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [FFmpeg](https://ffmpeg.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI](https://openai.com/)

---

**Made with ❤️ for video creators**
