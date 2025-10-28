# ClipForge - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run the Application
```bash
cd /Applications/Gauntlet/clip_forge
npm run dev
```

The application will:
1. Start the Vite development server
2. Launch the Electron window
3. Open with DevTools for debugging

### Step 2: Create Your First Video

#### Option A: Record Screen/Webcam
1. Click the **Record** button (circle icon) in the toolbar
2. Choose **Screen** or **Webcam**
3. Select your source (screen/window)
4. Toggle **Include Audio** if needed
5. Click **Start Recording**
6. When done, click **Stop** - video auto-saves to Media Library

#### Option B: Import Existing Media
1. Click **Import** button (film icon) or drag files to Media Library
2. Supported formats: MP4, MOV, AVI, WebM, MKV, FLV, MP3, WAV, etc.

### Step 3: Edit & Export

#### Add Clips to Timeline:
- Drag media from Media Library to timeline tracks
- Video tracks (V1, V2, V3) for video content
- Audio tracks (A1, A2, A3) for audio

#### Edit Your Video:
- **Split**: Select clip, position playhead, click scissors (Ctrl+K)
- **Trim**: Drag clip edges to adjust duration
- **Move**: Drag clips to new positions
- **Delete**: Select clip, press Delete or click delete button
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z

#### Export:
1. Click **File > Export Video** or Ctrl+E
2. Choose a preset (YouTube 1080p, 4K, Instagram, etc.)
3. Or use **Custom Settings** for full control
4. Click **Export Video**
5. Choose save location
6. Wait for export to complete

---

## 🎮 Keyboard Shortcuts

### Project
- `Ctrl+N` - New Project
- `Ctrl+O` - Open Project
- `Ctrl+S` - Save Project
- `Ctrl+I` - Import Media
- `Ctrl+E` - Export Video

### Editing
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` - Redo
- `Ctrl+K` - Split Clip
- `Delete` - Delete Selected Clip
- `Space` - Play/Pause

### Timeline
- `Ctrl++` - Zoom In Timeline
- `Ctrl+-` - Zoom Out Timeline
- `Ctrl+0` - Fit Timeline

### View
- `F11` - Toggle Fullscreen

---

## 🎯 Pro Tips

### Recording Tips:
- **Screen Recording**: Great for tutorials, gameplay, presentations
- **Webcam Recording**: Perfect for vlogs, talking heads, reactions
- **Audio**: Enable for voiceovers and commentary

### Timeline Tips:
- Use **3 video tracks** for overlays, picture-in-picture, or transitions
- Use **3 audio tracks** for music, dialogue, and sound effects
- **Zoom controls** help with precise editing
- **Snap-to-grid** makes alignment easy

### Editing Workflow:
1. Import all media first
2. Rough cut - add clips in order
3. Trim clips to remove unwanted parts
4. Fine-tune timing and transitions
5. Add audio tracks
6. Adjust clip properties (volume, fade, etc.)
7. Preview full timeline
8. Export

### Export Tips:
- **YouTube 1080p**: Best for general YouTube uploads
- **YouTube 4K**: For high-quality content
- **Web Optimized**: Smaller file size for websites
- **Custom**: Full control over all settings

---

## 📁 Project Management

### Auto-Save:
- Projects auto-save every **2 minutes**
- Look for the **asterisk (*)** next to project name for unsaved changes
- Manual save with Ctrl+S

### Project Files:
- Save as `.clipforge` files
- Contains timeline, clips, and settings
- Original media files are referenced, not included

---

## 🎨 Interface Overview

```
┌─────────────────────────────────────────────────┐
│  Toolbar (File, Edit, Record, Playback)        │
├──────────┬──────────────────────┬───────────────┤
│          │                      │               │
│  Media   │                      │  Properties   │
│ Library  │      Preview         │    Panel      │
│  (left)  │    (center-top)      │   (right)     │
│          │                      │               │
│          ├──────────────────────┤               │
│          │                      │               │
│          │     Timeline         │               │
│          │  (center-bottom)     │               │
│          │                      │               │
└──────────┴──────────────────────┴───────────────┘
```

### Panel Functions:
- **Media Library**: Browse and import media files
- **Preview**: Watch your video as you edit
- **Timeline**: Arrange clips on tracks
- **Properties**: Adjust selected clip settings

---

## ⚡ Quick Actions

### Import Media:
- Drag & drop files anywhere
- Click Import button
- File > Import Media

### Add Clip to Timeline:
- Drag from Media Library to timeline track
- Drop at desired position

### Play/Pause Preview:
- Click Play button
- Press Space bar
- Use timeline scrubber

### Select Clips:
- Click on clip in timeline
- Properties panel shows clip settings
- Blue border indicates selection

### Adjust Clip Properties:
1. Select clip on timeline
2. Use Properties panel on right
3. Adjust **Transform**, **Audio**, or **Effects** tabs

---

## 🔧 Troubleshooting

### App Won't Start:
```bash
# Rebuild everything
npm run build
npm run dev
```

### Import Issues:
- Ensure file format is supported
- Check file isn't corrupted
- Try smaller file first

### Playback Lag:
- Lower preview quality in settings
- Close other applications
- Reduce timeline zoom level

### Export Failed:
- Check enough disk space
- Ensure output path is valid
- Try simpler export preset

---

## 📚 Additional Resources

- **Full Documentation**: See README.md
- **Implementation Details**: See IMPLEMENTATION_SUMMARY.md
- **Report Issues**: Create GitHub issue
- **Feature Requests**: Submit via GitHub

---

## 🎉 You're Ready!

ClipForge is now set up and ready to use. Start creating amazing videos!

**Happy Editing! 🎬**