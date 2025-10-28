# ClipForge - Product Requirements Document (PRD)
## Desktop Video Editor with AI

**Version:** 1.0  
**Date:** October 27, 2025  
**Project:** Gauntlet AI - Desktop Video Editor  
**Status:** MVP Planning Phase

---

## Executive Summary

ClipForge is a desktop video editing application that enables users to record, import, edit, and export video content with an intuitive timeline-based interface. The MVP focuses on delivering core video editing functionality with a robust architecture that supports future AI-powered features in Phase 2.

**Target Users:** Content creators, educators, and professionals who need a straightforward desktop video editing solution with screen/webcam recording capabilities.

---

## User Stories

### Persona 1: Content Creator (Sarah)
**Background:** YouTube creator who makes tutorial videos and needs to combine screen recordings with webcam footage.

**User Stories:**
- As a content creator, I want to record my screen and webcam simultaneously so that I can create engaging tutorial videos.
- As a content creator, I want to arrange multiple clips on a timeline so that I can structure my video narrative.
- As a content creator, I want to trim and split clips precisely so that I can remove mistakes and dead air.
- As a content creator, I want to add transitions between clips so that my videos flow smoothly.
- As a content creator, I want to export my final video in high quality so that I can upload it to YouTube.

### Persona 2: Educator (Mr. Johnson)
**Background:** High school teacher creating instructional videos for remote learning.

**User Stories:**
- As an educator, I want to record my screen while presenting slides so that students can review lectures later.
- As an educator, I want to import existing video clips so that I can supplement my recordings with educational content.
- As an educator, I want to adjust audio levels so that my voice is clear and consistent throughout.
- As an educator, I want to save my projects so that I can work on videos across multiple sessions.
- As an educator, I want a simple interface so that I can focus on content, not learning complex tools.

### Persona 3: Business Professional (Marcus)
**Background:** Product manager creating demo videos and presentation recordings.

**User Stories:**
- As a professional, I want to record specific application windows so that I can create focused product demos.
- As a professional, I want to add multiple audio tracks so that I can include background music and narration.
- As a professional, I want to preview my edits in real-time so that I can make quick adjustments.
- As a professional, I want reliable auto-save so that I never lose my work.
- As a professional, I want to export in multiple formats so that I can share videos across different platforms.

---

## MVP Core Features

### 1. Recording Capabilities ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Screen recording with selectable region (full screen, window, custom area)
- Webcam recording with device selection
- Simultaneous screen + webcam recording (picture-in-picture mode)
- Audio input selection (system audio, microphone, or both)
- Recording controls (start/stop, pause/resume)
- Real-time recording preview
- Recording saved as clips in supported formats

**Acceptance Criteria:**
- User can select recording source before starting
- Recording creates video file in project directory
- Recorded clips automatically appear in media library
- Recording stops cleanly without corruption
- System audio and microphone can be recorded separately or together

---

### 2. Media Import & Management ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Import video files (MP4, MOV, AVI, WebM, MKV, FLV)
- Import audio files (MP3, WAV, AAC, OGG, M4A)
- Import image files (PNG, JPG, GIF)
- Drag-and-drop import support
- Media library/bin for organizing imported assets
- Thumbnail previews for all media
- Media file information display (duration, resolution, format, size)
- Remove media from library (without deleting source files)

**Acceptance Criteria:**
- All major video formats can be imported without transcoding
- Import handles various codecs gracefully
- Corrupted files show error messages instead of crashing
- Media library updates in real-time as files are added

---

### 3. Timeline-Based Editing Interface ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Multi-track timeline (minimum 3 video tracks, 3 audio tracks)
- Drag clips from media library to timeline
- Snap-to-grid functionality for precise alignment
- Zoom in/out on timeline (zoom slider + keyboard shortcuts)
- Scrubbing/playhead control with frame-accurate positioning
- Timeline ruler showing timecodes
- Track visibility toggles (show/hide tracks)
- Track height adjustment for better visibility
- Clip thumbnail previews on timeline
- Clip labels/names visible on timeline

**Acceptance Criteria:**
- Timeline updates smoothly without lag (60fps target)
- Clips can be placed on any track without restrictions
- Playhead can be dragged or clicked to any position
- Timeline handles projects up to 1 hour duration without performance issues

---

### 4. Video Editing Operations ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- **Trimming:** Adjust clip in/out points on timeline
- **Splitting:** Cut clips at playhead position
- **Deleting:** Remove clips from timeline
- **Moving:** Reposition clips on same track or between tracks
- **Ripple Delete:** Remove clip and close gap automatically
- **Copy/Paste:** Duplicate clips on timeline
- **Undo/Redo:** Full history stack (minimum 50 actions)

**Keyboard Shortcuts:**
- Space: Play/Pause
- S: Split at playhead
- Delete: Remove selected clip
- Ctrl+Z/Cmd+Z: Undo
- Ctrl+Shift+Z/Cmd+Shift+Z: Redo
- Ctrl+C/Cmd+C: Copy
- Ctrl+V/Cmd+V: Paste
- Ctrl+S/Cmd+S: Save project

**Acceptance Criteria:**
- All operations execute within 100ms
- Undo/redo works for all editing operations
- Splitting preserves original clip properties
- Trimming updates in real-time with preview

---

### 5. Audio Editing ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Separate audio from video clips (detach audio to separate track)
- Volume adjustment per clip (0-200% range)
- Fade in/fade out effects (configurable duration)
- Mute/unmute tracks
- Audio waveform visualization on timeline
- Audio level meters during playback
- Trim and split audio clips independently

**Acceptance Criteria:**
- Audio waveforms render within 2 seconds for clips up to 10 minutes
- Volume changes apply in real-time during playback
- Fade effects are smooth (no clicking/popping)
- Audio stays in sync with video throughout editing

---

### 6. Transitions & Effects
**Priority:** Must-Have (Basic set)

**Transitions (between clips):**
- Fade (dissolve)
- Cut (no transition)
- Crossfade (audio)

**Visual Effects (per clip):**
- Opacity/transparency adjustment
- Speed control (0.25x - 4x)
- Reverse playback
- Rotation (90°, 180°, 270°)

**Acceptance Criteria:**
- Transitions can be dragged between clips on timeline
- Transition duration is adjustable (0.5s - 3s default range)
- Effects apply without requiring re-encoding during editing
- Speed changes maintain audio pitch (optional pitch preservation toggle)

---

### 7. Preview & Playback ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Real-time preview window showing timeline output
- Play/pause/stop controls
- Frame-by-frame navigation (arrow keys)
- Playback speed control (0.25x, 0.5x, 1x, 1.5x, 2x)
- Full-screen preview mode
- Loop playback toggle
- Preview resolution options (quarter, half, full for performance)

**Acceptance Criteria:**
- Playback starts within 500ms of pressing play
- Preview maintains 24fps minimum on recommended hardware
- Audio stays in sync with video (±50ms tolerance)
- Seeking to any point in timeline takes less than 1 second

---

### 8. Export Functionality ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Export presets:
  - YouTube (1080p, H.264, MP4)
  - High Quality (4K if source supports, H.264, MP4)
  - Web (720p, H.264, MP4)
  - Audio Only (MP3, 320kbps)
- Custom export settings:
  - Resolution (480p, 720p, 1080p, 1440p, 2160p)
  - Frame rate (24, 30, 60 fps)
  - Bitrate (1-50 Mbps)
  - Format (MP4, MOV, WebM)
  - Codec (H.264, H.265/HEVC, VP9)
- Export progress indicator with time remaining
- Export queue (export multiple versions)
- Cancel export option
- Open output folder when complete

**Acceptance Criteria:**
- Exports complete without errors for valid settings
- Export progress updates at least every 2 seconds
- Exported files playback correctly in standard media players
- Export can be cancelled cleanly without corrupted files

---

### 9. Project Management ⭐ CRITICAL
**Priority:** Must-Have

**Features:**
- Auto-save every 2 minutes to prevent data loss
- Save project as .clipforge file (JSON-based format storing timeline state)
- Load existing projects
- New project creation
- Project settings:
  - Default resolution
  - Default frame rate
  - Project name and location
- Recent projects list (last 10)

**Auto-save Behavior:**
- Non-intrusive background saves
- Save indicator in UI (last saved timestamp)
- Recovery from crash (restore last auto-save on launch)

**Acceptance Criteria:**
- Auto-save completes in background without interrupting work
- Projects load within 3 seconds for typical 10-minute timelines
- Project files are portable (relative paths for media when possible)
- Crash recovery successfully restores last auto-saved state

---

### 10. User Interface ⭐ CRITICAL
**Priority:** Must-Have

**Layout Requirements:**
- **Top Menu Bar:** File, Edit, View, Help
- **Toolbar:** Quick access to recording, import, common tools
- **Media Library Panel:** (left side, resizable)
- **Preview Window:** (center-top, resizable)
- **Timeline Panel:** (center-bottom, resizable, expandable)
- **Properties Panel:** (right side, collapsible) - shows selected clip properties and effects

**Design Principles:**
- Clean, modern interface with dark theme (easier on eyes for long editing sessions)
- Intuitive icons with tooltips
- Consistent spacing and alignment
- Responsive layout that adapts to window resizing
- Keyboard-first workflow with comprehensive shortcuts

**Accessibility:**
- Keyboard navigation for all primary functions
- Focus indicators on interactive elements
- Tooltips for all toolbar buttons
- Resizable panels for different screen sizes

**Acceptance Criteria:**
- UI remains responsive during video playback
- Panel resize operations are smooth (no lag)
- All buttons have clear hover states
- Application looks professional and polished

---

## Technical Stack

### Core Framework
**Electron** (Latest stable version)
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ Mature ecosystem with extensive documentation
- ✅ Native OS integrations (file dialogs, system tray, menus)
- ✅ Strong community support
- ⚠️ Larger app size (~150-200MB base)
- ⚠️ Higher memory usage than native apps

### Frontend Framework
**React 18+** with TypeScript
- Component-based architecture for complex UI
- Excellent state management options
- Large ecosystem of UI libraries
- TypeScript for type safety and better developer experience

**Alternative Consideration:** Svelte (lighter and faster but smaller ecosystem)

### Video Processing Engine
**FFmpeg** (via fluent-ffmpeg wrapper for Node.js)
- ✅ Industry-standard video processing
- ✅ Supports all major codecs and formats
- ✅ Hardware acceleration support (NVIDIA NVENC, Intel Quick Sync)
- ✅ Well-documented with extensive community support
- ⚠️ Large binary size (~60-100MB)
- ⚠️ Must bundle FFmpeg binaries with application

**Implementation Approach:**
```
- Use @ffmpeg-installer/ffmpeg for bundling
- Run FFmpeg operations in separate process (not blocking main thread)
- Stream processing for large files to avoid memory issues
- Use worker threads for thumbnail generation
```

### Screen Recording
**Electron's desktopCapturer API** + **MediaRecorder API**
- Native screen capture without external dependencies
- Supports window and screen selection
- Built-in audio capture options

**Alternative:** Robotjs (for more advanced control but adds complexity)

### Video Timeline & Playback
**HTML5 Video Element** + **Canvas API**
- Native browser video playback
- Canvas for compositing multiple layers
- WebGL for GPU-accelerated effects (future)

**Timeline Rendering Library:** Custom implementation with:
- React for UI components
- Canvas for waveform visualization
- RAF (requestAnimationFrame) for smooth playback

**Alternative Libraries to Consider:**
- Remotion (React-based video composition) - may be overkill for MVP
- Video.js - for enhanced playback controls

### State Management
**Zustand** or **Redux Toolkit**
- Zustand: Lighter, simpler API (recommended for MVP)
- Redux Toolkit: More powerful for complex state, extensive devtools

**State Structure:**
```
- Project state (settings, metadata)
- Timeline state (tracks, clips, playhead position)
- Media library state (imported files)
- UI state (panel sizes, selected elements)
- Export state (progress, queue)
```

### File System & Storage
**Node.js fs module** + **electron-store** for preferences
- Direct file system access via Electron's Node integration
- electron-store for persisting user preferences (JSON-based)
- Project files saved as JSON with relative paths to media

### Audio Visualization
**WaveSurfer.js** or **Canvas API**
- WaveSurfer.js: Pre-built waveform rendering (easier)
- Custom Canvas: More control but more development time

**Recommendation:** Start with Canvas API for tighter integration

### UI Component Library
**shadcn/ui** (Radix UI + Tailwind CSS)
- Accessible components out of the box
- Customizable with Tailwind
- No runtime dependency (copy-paste components)

**Alternative:** Ant Design, Material-UI (more opinionated)

### Build & Development Tools
- **Vite:** Fast development server and build tool
- **Electron Builder:** Package application for distribution
- **TypeScript:** Type safety across the codebase
- **ESLint + Prettier:** Code quality and formatting

---

## Technology Stack - Potential Pitfalls & Considerations

### 1. Electron Bundle Size
**Issue:** Electron apps are large (150-250MB minimum)
**Mitigation:**
- Use electron-builder with compression
- Lazy load non-critical modules
- Don't bundle development dependencies
- Consider Electron Forge for optimized builds

### 2. FFmpeg Integration Challenges
**Issue:** FFmpeg is powerful but complex; wrong usage = poor performance
**Mitigation:**
- Use fluent-ffmpeg for simpler API
- Always run FFmpeg in separate process (spawn, not exec)
- Implement proper error handling for codec mismatches
- Use hardware acceleration flags when available (-hwaccel)
- Stream processing for files > 1GB

**Critical:** Never load entire video into memory; use streams

### 3. Video Playback Performance
**Issue:** Multiple video tracks playing simultaneously can be CPU-intensive
**Mitigation:**
- Implement "preview quality" mode (lower resolution during editing)
- Pre-generate proxy files for 4K content
- Use requestAnimationFrame for smooth timeline updates
- Debounce timeline scrubbing to reduce re-renders
- Consider Web Workers for heavy computations

### 4. Timeline State Complexity
**Issue:** Timeline state is complex (clips, tracks, effects, transitions)
**Mitigation:**
- Use immutable state updates (Immer library)
- Implement undo/redo with command pattern
- Store timeline as normalized data structure
- Use memoization (React.memo, useMemo) to prevent unnecessary re-renders

### 5. Cross-Platform File Paths
**Issue:** Windows uses backslashes, macOS/Linux use forward slashes
**Mitigation:**
- Always use `path.join()` from Node.js
- Store relative paths in project files when possible
- Use `path.normalize()` when loading external paths

### 6. Audio/Video Sync
**Issue:** Audio can drift out of sync during editing and export
**Mitigation:**
- Use consistent timebase across all operations
- Set explicit framerate and sample rate
- Test on different hardware configurations
- Use FFmpeg's `-async` flag during export

### 7. Memory Management
**Issue:** Long editing sessions can cause memory leaks
**Mitigation:**
- Properly cleanup video elements when unmounted
- Cancel ongoing FFmpeg processes when closing project
- Implement periodic garbage collection hints
- Monitor memory usage in development

### 8. Auto-Save Complexity
**Issue:** Auto-saving during playback or export can cause conflicts
**Mitigation:**
- Queue auto-saves when user is actively editing
- Skip auto-save during export operations
- Use debounced save (only save after 2 minutes of no changes)
- Implement file locking to prevent corruption

### 9. Export Queue Management
**Issue:** Multiple concurrent exports can overwhelm system
**Mitigation:**
- Limit concurrent exports to 1 (or 2 on high-end systems)
- Queue additional exports
- Show clear progress for each export job
- Allow cancellation without corrupting other exports

### 10. Native Module Compilation
**Issue:** Some Node modules need compilation for Electron version
**Mitigation:**
- Use electron-rebuild automatically
- Pin Electron version to avoid breaking changes
- Test on all target platforms regularly
- Prefer pure JavaScript libraries when available

---

## Phase 2 Features (AI & Advanced - NOT in MVP)

These features are explicitly **OUT OF SCOPE** for MVP but planned for future iterations:

### AI-Powered Features
1. **Auto-Captions/Subtitles**
   - Speech-to-text using Whisper API or Web Speech API
   - Automatic subtitle generation with timestamps
   - Editable caption track

2. **Smart Trimming**
   - Detect and remove silence/dead air automatically
   - Identify and highlight best takes

3. **Scene Detection**
   - Automatically detect scene changes
   - Suggest cut points

4. **Audio Enhancement**
   - Noise reduction using ML models
   - Audio normalization and EQ suggestions

5. **Smart Export**
   - Suggest optimal export settings based on content
   - Auto-detect vertical vs. horizontal format

**Tech Stack for AI (Phase 2):**
- TensorFlow.js or ONNX Runtime for in-browser ML
- Hugging Face Transformers.js for lightweight models
- OpenAI Whisper API for transcription
- Alternatively: Run Python ML services locally via child_process

---

## Explicitly NOT in MVP

### Features:
- ❌ Color grading/correction
- ❌ Advanced text/title editor (kinetic typography)
- ❌ Green screen/chroma keying
- ❌ Motion tracking
- ❌ 3D effects or animations
- ❌ Multi-camera editing
- ❌ Collaboration/cloud sync
- ❌ Plugin system/extensions
- ❌ Advanced audio mixing (EQ, compression, reverb)
- ❌ DVD/Blu-ray authoring
- ❌ Live streaming integration
- ❌ Social media direct upload
- ❌ Built-in stock media library
- ❌ Automatic backups to cloud
- ❌ Video stabilization

### Technical Debt Acceptable in MVP:
- Limited codec support (focus on common formats)
- No GPU rendering pipeline (use CPU for MVP)
- Basic error handling (can improve later)
- Limited localization (English only)
- No analytics/telemetry
- Basic installer (no auto-update)

---

## Success Metrics for MVP

### Functional Requirements:
✅ User can record screen and webcam  
✅ User can import at least 5 common video formats  
✅ User can arrange clips on multi-track timeline  
✅ User can trim, split, and delete clips  
✅ User can add fade transitions  
✅ User can adjust audio levels with waveform visualization  
✅ User can export video in at least 3 quality presets  
✅ Project auto-saves every 2 minutes  
✅ Undo/redo works for all operations  
✅ Application doesn't crash during normal use  

### Performance Targets:
- Application launches in < 5 seconds
- Timeline editing operations complete in < 100ms
- Playback achieves 24fps minimum on recommended hardware
- Export processes at least 1x real-time speed (1 minute of video exports in ≤ 1 minute)
- Auto-save completes in < 500ms

### User Experience:
- Intuitive enough for new users to create a simple video within 15 minutes
- No data loss during normal operation
- Clear error messages when operations fail
- Professional-looking UI that doesn't feel "clunky"

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- Set up Electron + React + TypeScript project
- Implement basic UI layout (panels, menu bar)
- Set up FFmpeg integration
- Implement media import functionality

### Phase 2: Recording (Week 2-3)
- Implement screen recording with desktopCapturer
- Add webcam recording
- Create recording UI with controls

### Phase 3: Timeline Core (Week 3-5)
- Build timeline UI component
- Implement drag-and-drop to timeline
- Add playback controls
- Implement scrubbing/seeking

### Phase 4: Editing Operations (Week 5-6)
- Implement trim, split, delete
- Add undo/redo system
- Implement copy/paste

### Phase 5: Audio (Week 6-7)
- Add audio waveform visualization
- Implement volume controls
- Add fade in/out effects

### Phase 6: Export & Projects (Week 7-8)
- Implement export functionality with presets
- Add auto-save system
- Implement project save/load
- Final testing and bug fixes

---

## Hardware Requirements

### Minimum Specs:
- CPU: Intel Core i3 or equivalent (quad-core)
- RAM: 8GB
- Storage: 500MB for application + space for projects
- GPU: Integrated graphics with hardware video decode support
- OS: Windows 10+, macOS 11+, Ubuntu 20.04+

### Recommended Specs:
- CPU: Intel Core i5/i7 or AMD Ryzen 5/7 (6+ cores)
- RAM: 16GB+
- Storage: SSD with 50GB+ free space
- GPU: Dedicated GPU with H.264 encode/decode (NVIDIA GTX 1050+ or equivalent)
- OS: Latest versions of Windows 11, macOS 13+, Ubuntu 22.04+

---

## Risk Assessment

### High Risk:
1. **Performance with large projects** - Timeline with 100+ clips may lag
   - Mitigation: Implement virtualization for timeline rendering

2. **Cross-platform export consistency** - Different codecs on different OS
   - Mitigation: Bundle same FFmpeg version for all platforms

3. **Audio sync issues** - Complex to get right
   - Mitigation: Extensive testing, use consistent timebase

### Medium Risk:
1. **Memory leaks in long sessions** - Electron can be memory-hungry
   - Mitigation: Regular testing, proper cleanup

2. **File compatibility** - Exotic codecs may not work
   - Mitigation: Clear documentation on supported formats

### Low Risk:
1. **Auto-save conflicts** - Edge cases during save
   - Mitigation: File locking, debouncing

---

## Open Questions & Decisions Needed

1. **Monetization Strategy:** Will this be open-source, freemium, or paid?
   - Impact on export watermarks, feature restrictions, etc.

2. **Telemetry/Analytics:** Should we collect anonymous usage data to improve the product?
   - If yes, need to implement privacy-compliant analytics

3. **Update Mechanism:** Auto-update or manual download?
   - Electron-updater vs. manual downloads from website

4. **Licensing for Bundled Software:** FFmpeg is LGPL; need to comply with licensing
   - May need legal review depending on distribution model

5. **Target Market Priority:** Creators vs. Educators vs. Professionals?
   - Influences which features to prioritize in MVP

---

## Conclusion

ClipForge MVP focuses on delivering a solid, performant desktop video editor with essential features: recording, importing, timeline editing, and exporting. The technical stack (Electron + React + FFmpeg) provides a robust foundation while maintaining cross-platform compatibility. AI features are deliberately scoped for Phase 2 to ensure MVP quality and timely delivery.

The architecture supports future expansion while keeping the initial implementation manageable. Auto-save functionality and multi-track timeline support provide professional-grade usability from day one.

**Next Steps:**
1. Review and approve this PRD
2. Set up development environment
3. Create initial Electron + React + TypeScript boilerplate
4. Begin Phase 1 development

---

**Document Prepared By:** Logan Liang May  
**Date:** October 27, 2025  
**Version:** 1.0 - MVP Planning
