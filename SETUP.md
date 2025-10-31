# ClipForge Setup Guide

Complete setup instructions for running and building ClipForge on your machine.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Building Production App](#building-production-app)
- [Features Overview](#features-overview)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Node.js** (v18 or higher)
  - Download from: https://nodejs.org/
  - Verify installation: `node --version`

- **npm** (comes with Node.js)
  - Verify installation: `npm --version`

- **Git**
  - Download from: https://git-scm.com/
  - Verify installation: `git --version`

### macOS Users
- Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/LoganLiangMay/clip_forge.git
cd clip_forge
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Electron
- React & Vite
- FFmpeg binaries
- Tailwind CSS
- Zustand (state management)
- And all other dependencies

### 3. Run Development Mode

```bash
npm run dev
```

This will:
- Start the Vite dev server (React frontend)
- Launch the Electron app in development mode
- Enable hot-reload for instant updates

The app should open automatically. If not, it will be available at `http://localhost:5173/`

---

## Development Setup

### Project Structure
```
clip_forge/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   ├── ffmpeg/        # FFmpeg handlers
│   │   ├── ipc/           # IPC handlers
│   │   └── services/      # Business logic
│   ├── preload/           # Electron preload scripts
│   │   └── index.ts       # Context bridge API
│   └── renderer/          # React frontend
│       ├── App.tsx        # Main app component
│       ├── components/    # React components
│       ├── hooks/         # Custom React hooks
│       └── store/         # Zustand stores
├── dist/                  # Built files (auto-generated)
├── release/               # Production builds (auto-generated)
└── public/                # Static assets
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run app in development mode |
| `npm run build` | Build both Electron and Vite |
| `npm run build:vite` | Build Vite frontend only |
| `npm run build:electron` | Build Electron main process only |
| `npm run package:mac` | Build macOS production app |

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Make Changes**
   - Edit files in `src/` directory
   - Changes will hot-reload automatically

3. **Test Features**
   - Screen recording
   - Timeline editing
   - Export functionality

4. **Build for Testing**
   ```bash
   npm run build
   ```

---

## Building Production App

### macOS

```bash
npm run package:mac
```

This will:
1. Build the Vite frontend (`dist/renderer/`)
2. Compile TypeScript Electron code (`dist/main/`)
3. Package everything into a macOS app
4. Output to: `release/ClipForge-darwin-x64/ClipForge.app`

### Post-Build

The production app will be located at:
```
release/ClipForge-darwin-x64/ClipForge.app
```

**To use the app:**
1. Navigate to `release/ClipForge-darwin-x64/`
2. Double-click `ClipForge.app` to launch
3. Optionally, drag to Applications folder for easy access

### Build Configuration

The build process is configured in:
- `package.json` - npm scripts and dependencies
- `tsconfig.json` - TypeScript config for renderer
- `tsconfig.electron.json` - TypeScript config for main process
- `vite.config.ts` - Vite build configuration

---

## Features Overview

### Screen Recording
- **Camera Overlay**: Record screen with optional webcam bubble
- **Audio Recording**: System audio + microphone support
- **Visual Feedback**: Real-time audio level indicator
- **Auto-Import**: Recordings automatically added to Media Library

**How to use:**
1. Click Record button in toolbar
2. Select screen source, toggle camera/audio options
3. Click "Start Recording"
4. Use overlay controls to pause/stop
5. Choose save location - video auto-imports to Media Library

### Timeline Editing
- **Multi-Track Support**: Video and audio tracks
- **Clip Trimming**: Adjust in/out points
- **Split Clips**: Press 'S' or use Edit menu
- **Delete Clips**: Press Delete/Backspace
- **Playback**: Press Space to play/pause

### Video Export
- **Mixed Format Support**: Export timelines with WebM, MP4, MOV clips
- **Quality Settings**: Adjustable resolution, bitrate, FPS
- **Progress Tracking**: Real-time export progress
- **Format Options**: Export as MP4, MOV, WebM, AVI, MKV

---

## Troubleshooting

### Common Issues

#### 1. `npm install` fails
**Solution:**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

#### 2. Electron app won't start
**Solution:**
- Rebuild Electron: `npm run build:electron`
- Check for port conflicts (Vite uses port 5173)
- Check console for errors

#### 3. FFmpeg not found
**Solution:**
- FFmpeg binaries are included in `node_modules`
- Re-run `npm install` to ensure they're installed
- Check: `node_modules/@ffmpeg-installer/darwin-x64/`

#### 4. Export fails with "Conversion failed"
**Solution:**
- This was fixed in the latest version
- Make sure you're using the latest code from main branch
- Try exporting clips individually first to isolate the issue

#### 5. Screen recording has no audio
**Solution:**
- Grant microphone permissions in System Preferences
- On macOS: System Preferences > Security & Privacy > Microphone
- Make sure "Internal Microphone" is toggled ON in recording options

#### 6. Camera bubble doesn't appear
**Solution:**
- Grant camera permissions in System Preferences
- On macOS: System Preferences > Security & Privacy > Camera
- Toggle camera option OFF then ON in recording options

### Getting Help

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/LoganLiangMay/clip_forge/issues)
2. Review console logs (View > Toggle Developer Tools)
3. Check terminal output where you ran `npm run dev`

---

## Additional Information

### System Requirements
- **macOS**: 10.14 (Mojave) or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for app, additional space for recordings

### Permissions Required
- **Screen Recording**: For capturing screen content
- **Camera**: For webcam overlay (optional)
- **Microphone**: For audio recording (optional)

### File Formats Supported
- **Import**: MP4, MOV, WebM, AVI, MKV, FLV, MP3, WAV, AAC, OGG, M4A
- **Export**: MP4, MOV, WebM, AVI, MKV
- **Recording**: WebM (with option to export as MP4)

### Performance Tips
- Close other applications during export
- Use SSD for better performance
- Export at lower resolution for faster processing
- Split large projects into smaller segments

---

## License

MIT License - See LICENSE file for details

---

## Support

For questions or issues:
- GitHub Issues: https://github.com/LoganLiangMay/clip_forge/issues
- Repository: https://github.com/LoganLiangMay/clip_forge
