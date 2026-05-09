---

## Problem Statement

Non-technical video editors and content creators increasingly need high-quality motion graphics and explainers, but current tools force them into one of two painful options:

- Learn complex motion design tools (After Effects, advanced DaVinci Fusion workflows) that have steep learning curves and are not aligned with how they already edit video

- Use rigid template-based tools that do not respect real editorial workflows (timelines, tracks, precise sync to voiceover) and are hard to integrate into their existing editing pipeline.


They also cannot easily leverage AI + “video as code” systems like Hyperframes because these require HTML/CSS/JS skills and CLI usage that most editors do not have

---

## Solution

Provide a desktop animation editor, inspired by DaVinci Resolve’s timeline UX, that uses Hyperframes under the hood to turn HTML/CSS/JS into deterministic video—but exposes this through a visual timeline, inspector, and preset gallery instead of code.

Key properties of the solution from the user’s perspective:

- It feels like a familiar NLE: projects, timelines, tracks, preview monitor, and export presets

- They can drop “AI clips” onto the timeline, describe the animation in natural language, pick a visual preset (from curated CodePen-based animations), and see it preview instantly

- They can import existing audio/video (e.g., voiceover or talking-head footage), and let the tool auto-sync animations to spoken content within the clip’s time range using transcription + word-level timing from Hyperframes’ HTML semantics

- Rendering happens locally on their GPU using Hyperframes and headless Chrome, preserving privacy and avoiding cloud rendering latency or per-render fees


---

## User Stories

1. As a video editor, I want to create a new project with a familiar project manager screen, so that I can organize multiple explainer videos like I do in DaVinci Resolve

2. As a video editor, I want to choose a platform preset (YouTube, Instagram, etc.) and aspect ratio when creating a project, so that my canvas matches my distribution channel.

3. As a video editor, I want the project to use a directory-based structure containing project.json, media, clips, and exports, so that I can easily back up, version, and move entire projects between machines.

4. As a creator, I want to see my projects in a visual grid with thumbnails and metadata, so that I can quickly identify which explainer I want to open.

5. As a creator, I want auto-save to happen in the background, so that I never lose progress due to crashes or forgetting to save.

6. As a video editor, I want a DaVinci-like timeline with tracks, a playhead, and a preview monitor, so that I can use my existing mental model without learning a new paradigm

7. As a user, I want to add an “AI animation clip” by placing an empty block on the timeline at a chosen time and duration, so that I can design structure first and content later.

8. As a user, I want 2–4 animation tracks plus one media track, so that I can layer background, main content, and overlay elements like I do with regular video.

9. As a user, I want simple layer stacking where higher tracks visually overlay lower tracks, so that compositing behaves exactly like my NLE.

10. As a user, I want to drag and trim clip edges to shorten animations (but not stretch them), so that I can fine-tune timing like I do with video clips.

11. As a user, I want a collapsible inspector panel on the right, so that I can tune clip settings while keeping maximum space for the timeline when needed.

12. As a user, I want to type a natural-language prompt for an AI clip (e.g., “3 bullet points about our key features”), so that I can specify intent without writing code.

13. As a user, I want to choose a visual animation preset from a hover-preview grid of curated CodePen-based animations, so that I can quickly find a look that matches my brand

14. As a user, I want presets to be grouped into categories (Text, Charts, Backgrounds, Transitions, etc.) with search, so that I can find relevant styles quickly.

15. As a user, I want to adjust text and colors for each preset, so that I can adapt generic animations to my specific content and branding.

16. As a user, I want the system to use an LLM to generate or combine HTML/CSS/JS based on my prompt and selected presets, so that I can create new animations beyond static templates

17. As a user, I want the HTML, CSS, and JS to be stored modularly (like CodePen tabs) per clip, so that the system can regenerate only the broken part (e.g., CSS) without wasting tokens or touching working code.

18. As a power user, I want an advanced inspector mode to view/edit HTML/CSS/JS for a clip, so that I can manually fix or refine generated animations.

19. As a user, I want to regenerate an animation while keeping a small version history (e.g., 3–5 versions), so that I can experiment without losing good previous results.

20. As a user, I want to switch between versions from a simple dropdown, so that I can compare options and revert easily.

21. As a user, I want the preview monitor to show real-time playback of my timeline, so that I can judge composition, timing, and transitions.

22. As a user, I want playback and scrubbing to feel smooth (30+ fps) even when multiple animated layers are active, so that the UX feels professional.

23. As a user, I want canvas-based compositing for multiple tracks, so that what I see during preview closely matches the final export.

24. As a user, I want HTML/CSS to run live in a browser-like environment for preview, so that I get instant feedback without waiting for video renders.

25. As a user, I want to import existing audio (e.g., recorded VO) into a media track, so that I can sync animations to narration.

26. As a user, I want to import existing video (e.g., a talking head) with audio, so that I can overlay animations on top of real footage.

27. As a user, I want the app to accept most common media formats via FFmpeg, so that I don’t have to pre-convert files manually.

28. As a user, I want to trim, split, and move imported media clips on a dedicated Track 0, so that I can structure my base narrative before adding animation.

29. As a user, I want to see an audio waveform for imported audio, so that I can visually align animation timing to speech patterns.

30. As a user, I want the tool to optionally transcribe imported audio and generate word-level timing, so that it can understand what is being said when

31. As a user, I want a transcript view that can be floated or docked (inspired by DaVinci), so that I can work on multi-monitor setups or dock it below the timeline.

32. As a user, I want to enable a “Sync to audio below” checkbox per clip, so that only certain clips automatically sync to the underlying speech.

33. As a user, I want that checkbox to default off but appear when relevant audio exists below the clip, so that the feature is discoverable without being surprising.

34. As a user, I want clips with audio sync enabled to show a small icon/badge, so that I can see which animations are speech-driven at a glance.

35. As a user, I want, when “Sync to audio below” is enabled, the system to read transcription only within that clip’s time range, so that each animation is scoped to its own audio segment.

36. As a user, I want to steer AI behavior via the prompt (e.g., “3 bullets,” “highlight numbers”), while the tool extracts actual phrases and timing from the transcript, so that outputs are aligned with what I say but follow my intent.

37. As a user, I want the system to detect key phrases (like bullet points) in the audio segment and map each bullet’s entrance to the corresponding spoken words, so that bullet animations feel naturally timed.

38. As a user, I want to see a summary of detected bullets/phrases before generation, so that I can confirm or tweak what the system inferred from my speech.

39. As a user, I want an export dialog with platform presets (YouTube, Instagram feed, Stories, LinkedIn), so that I don’t need to manually manage resolution, aspect ratio, and codec settings.

40. As a user, I want to export to MP4 (H.264) locally using my GPU, so that renders are fast and do not require cloud services

41. As a user, I want export progress feedback (e.g., “Rendering clip 3/7… Compositing final video…”), so that I understand what’s happening and how long it might take.

42. As a user, I want exported videos to include imported audio/video plus composited animations, so that I can use the output directly or drop it into my NLE as a finished segment.

43. As a user, I want a minimal placeholder on a clip while generation/export is happening, so that I know it’s in progress without unnecessary visual clutter.

44. As a user, I want to continue editing other clips while some clips are “generating,” so that I am never blocked waiting for the AI.

45. As a user, I want clear error messages and recovery paths if generation fails (e.g., invalid CSS), so that I can retry or modify the prompt without losing work.

46. As a prototype user, I want a slimmed-down MVP with one project, a simple timeline, a few presets, and basic export, so that I can test the core idea quickly.

47. As a product owner, I want detailed logging of LLM token usage per generation, so that I can determine realistic unit economics and pricing

48. As a product owner, I want to run user tests with 5–10 editors and collect qualitative feedback, so that I can validate whether this workflow actually fits their needs.


(You can keep extending this list as you add features like markers, blend modes, collaboration, etc.)

---

## UI/UX Layout Details

### The Edit Page Layout
The Edit page is designed for precision assembly. Its layout is structured around a central timeline with supporting panels for assets and metadata.

- **Top Bar (Interface Toolbar):** A thin horizontal strip at the very top. On the left, it contains toggle buttons for the Media Pool (asset storage) and Effects Library. On the right, it has toggles for the Mixer, Metadata Editor, and Inspector.
- **Asset Zone (Top-Left Quadrant):** This area displays the Media Pool by default. It’s a list or grid view of video/audio clips. It can be toggled to show the Effects Library or the Edit Index (a list of all edits made).
- **Dual Viewers (Top-Center):** Two large video monitors sit side-by-side. The Source Viewer (Left) shows individual clips from your bin before they are edited. The Timeline Viewer (Right) shows what is currently on your active timeline. Both viewers have transport controls (Play, Pause, Jog) and timecode displays directly underneath them.
- **Inspector Panel (Top-Right Quadrant):** A vertical panel used to adjust the properties of a selected clip, such as its position, zoom, volume, or effect parameters.
- **Central Toolbar:** A thin horizontal bar sitting between the viewers and the timeline. It contains primary edit tools: the Selection tool (arrow), Blade (razor), Snapping (magnet), and Linked Selection.
- **Timeline Area (Bottom Half):** A wide, multi-track workspace. Video tracks stack vertically (V1, V2), and audio tracks sit below them (A1, A2). A vertical red line, the Playhead, indicates the current moment in time.

### The Export (Deliver) Page Layout
The Deliver page is where you finalize output settings. Its layout shifts from assembly to queue management.

- **Render Settings (Left Sidebar):** A dedicated vertical column for choosing formats. It features a row of Presets at the top (YouTube, Vimeo, H.264) followed by granular tabs for Video, Audio, and File settings underneath.
- **Master Viewer (Top-Center):** A single large video monitor for reviewing the final project before rendering.
- **Mini-Timeline (Bottom-Center):** A simplified version of your timeline showing markers and clip boundaries, used to set the In/Out points for the render range.
- **Render Queue (Right Sidebar):** A vertical list that holds "Jobs." When you finish settings on the left, you add them here to start the final encoding process.

### Common Global Elements
- **Bottom Page Bar:** A persistent horizontal strip at the absolute bottom of the screen. It features icons for switching between the seven pages: Media, Cut, Edit, Fusion, Color, Fairlight, and Deliver.
- **System Status:** Small icons at the bottom-right for Project Settings (gear icon) and the Project Manager (house icon).

---

## Implementation Decisions

- **Platform & Stack**

 - Use a **desktop app** built with React + Tauri, targeting Windows/macOS initially, to align with video editors’ existing environment and enable local GPU usage

 - Use a **Rust backend** (via Tauri) for file I/O, FFmpeg orchestration, Hyperframes integration, and LLM calls

- **Rendering Architecture**

 - Use **Hyperframes locally** to turn HTML/CSS/JS into deterministic video via a headless browser + Chrome DevTools protocol

 - **Preview:** render **live HTML/CSS** in a webview/canvas environment (no video encoding) until export is requested.

 - **Export:** sequentially render each animation clip to video, then composite tracks via FFmpeg overlay filters into a final MP4

 - Implement **canvas-based compositing** for preview to ensure smooth playback and consistent visual output with final renders.

- **Code Structure for Clips**

 - Follow **CodePen-like separation**: each clip stores HTML, CSS, and JS as separate units, not one self-contained file, to reduce LLM token usage and allow component-wise regeneration.

 - Persist clip metadata (prompt, preset ID, customizations, sync flags, version history) in a `project.json` structure inside the project directory.

- **LLM Integration**

 - Use a **hosted LLM API (e.g., Claude)** for generating/modifying HTML/CSS/JS given:

 - One or more curated CodePen templates

 - User prompt

 - Customization fields (text, colors)

 - Avoid re-sending unchanged code where possible; for fixes, send only the relevant part (e.g., CSS) plus necessary context

- **Presets & Templates**

 - Manually curate **40–60 CodePen animations** with appropriate licensing (MIT/CC0/permission), focusing on explainer-relevant styles (text, charts, backgrounds, transitions)

 - Tag variable placeholders in curated templates (e.g., `{{MAIN_TEXT}}`, `{{PRIMARY_COLOR}}`) for deterministic substitution by the app and/or LLM.

- **Timeline**

 - Implement a **custom React timeline** with:

 - Track 0 reserved for imported media (audio/video)

 - 2–4 animation tracks (stacking behavior only)

 - Custom clip blocks with drag, trim, and selection interactions

 - Implement word-level audio sync by reading transcript segments for each clip’s time range.

- **Media & Projects**

 - Use **directory-based projects** with a root folder containing project.json, media/, clips/, transcripts/, and exports/.

 - Use FFmpeg to accept a wide range of formats and transcode them into standardized internal formats for consistent playback and export.

- **Prototype vs. Full Product**

 - MVP prototype will **exclude** audio import, transcript, and multi-track compositing initially; focus on one project, 2 tracks, a small preset set, and basic HTML→video rendering to measure feasibility and token usage.

 - Logging layer will capture **tokens per generation, prompt types, and errors**, feeding into unit economics analysis


---

## Testing Decisions

- **Good Test Principles**

 - Test **external behavior**, not internal implementation details:

 - Timeline operations: adding, moving, trimming clips

 - Inspector behavior: changing prompts, presets, colors, toggles

 - Preview: that playback shows the expected animation at the expected times

 - Export: that the final MP4 includes correct composited content

 - Avoid over-coupling tests to specific HTML/CSS implementation; focus on “a valid video is produced and plays correctly” rather than exact DOM structure.

- **Modules to Test**

 - **Timeline module**:

 - Unit tests for state updates (adding/removing clips, track stacking logic).

 - Integration tests that simulate user interactions (drag, trim, select) and verify resulting state.

 - **Inspector & generation pipeline**:

 - Tests that given a prompt + preset + customizations, a generation request is formed correctly.

 - Mocked LLM/Hyperframes calls to validate that responses are stored and previewed correctly.

 - **Preview rendering**:

 - Tests that correct HTML/CSS/JS is passed to the preview canvas for a given playhead position.

 - **Export pipeline**:

 - Integration tests that run a small sample project through render + composite and validate:

 - Exit codes from headless Chrome and FFmpeg

 - Output file exists and matches expected duration/resolution

 - **Transcription/audio sync** (post-MVP):

 - Tests that clips with “Sync to audio below” enabled read only their time range from transcript.

 - Tests that toggling sync changes animation timing while leaving other properties unchanged.

- **Prior Art**

 - Use patterns from testing media apps and timeline editors (e.g., seek/play state machines, FFmpeg wrapper tests) and adapt from existing best practices in video-editing UIs and CLI pipelines


---

## Out of Scope

For the initial PRD/prototype, the following are explicitly out of scope:

- Collaborative editing (multi-user, real-time, or cloud-synced projects).

- Web/SaaS version of the editor (initial focus is desktop / local).

- Full After Effects–style keyframe controls, curves, or arbitrary parameter graph editing.

- Blend modes, advanced per-clip opacity controls, and complex color grading tools.

- Built-in AI voice generation or text-to-speech; focus is on using imported audio.

- Marketplace of community presets or user-shared animation packs (beyond curated CodePen library).

- Complex project/version management beyond a simple project grid and local folders.

- Mobile apps or touch-first UI.


---

## Further Notes

- Hyperframes is an open-source HTML-to-video framework under Apache 2.0, built specifically for AI agents and deterministic rendering; this aligns perfectly with the LLM + local rendering architecture

- The long-term vision is to become the **“Hyperframes front-end for humans”**: AI agents and coders can use Hyperframes directly, while non-technical editors use this timeline-based UI that still outputs deterministic HTML-driven video

- The prototype should aggressively log real-world token usage so that pricing (freemium vs. pro tiers vs. credit packs) can be grounded in actual cost per generated clip

- Matching DaVinci’s layout and interaction patterns as closely as reasonable is a deliberate onboarding strategy: video editors should feel “at home” within minutes


---

## Status

- [x] **MVP Slice 1: Project Dashboard & File Persistence**
- [x] **MVP Slice 2: Timeline Clip Management**
- [x] **MVP Slice 3: AI Clip Inspector & Prompting**
- [x] **MVP Slice 4: LLM Generation Pipeline**
- [x] **MVP Slice 5: Live Timeline Preview**
- [ ] MVP Slice 6: Local MP4 Export