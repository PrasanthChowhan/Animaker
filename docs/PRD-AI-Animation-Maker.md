## Problem Statement

Professional video editors want to leverage AI for complex animations (Hyperframes), but the current "vibe-coding" workflow is too complex and technical. It requires knowledge of HTML, CSS, and GSAP, and lacks the precision controls (Inspector, Timeline) that editors expect from professional software. Additionally, managing technical dependencies like Node.js and FFmpeg creates a high barrier to entry.

## Solution

The AI Animation Maker is a lightweight Tauri-based desktop application that bridges the gap between AI-generated animations and professional editing workflows. It provides:
1.  **AI Animator**: A natural-language interface that generates Hyperframes code using Claude 3.5.
2.  **Configuration-Driven Inspector**: A UI that dynamically exposes animation properties for fine-tuning via `data-inspect` hooks.
3.  **Simplified Playback Timeline**: A visual tool for adjusting the timing (`start` and `duration`) of clips.
4.  **Dual-Mode Preview**: A high-performance interactive preview for "vibing" and a frame-accurate render preview for final export.
5.  **Pro Asset Management**: A referenced-based system with a Relinking Manager to handle large media libraries without duplicating files.
6.  **Zero-Config Bundle**: A single installer that includes Node.js and FFmpeg as sidecars.

## User Stories

1.  As a video editor, I want to describe an animation in natural language, so that I can generate complex Hyperframes code without writing it myself.
2.  As a video editor, I want a visual Inspector with sliders, so that I can fine-tune positions, colors, and opacities after the AI generates the initial animation.
3.  As a video editor, I want to drag and resize clips on a timeline, so that I can precisely control the rhythm and timing of the animation.
4.  As a video editor, I want to import high-resolution assets by reference, so that I don't fill my hard drive with duplicate files.
5.  As a video editor, I want a "Relinking Manager", so that I can easily find and reconnect assets if I move them on my disk.
6.  As a video editor, I want a real-time preview, so that I can see my changes instantly as I move sliders in the Inspector.
7.  As a video editor, I want a frame-accurate render preview, so that I know exactly what the final exported video will look like.
8.  As a video editor, I want the app to work "out of the box", so that I don't have to manually install Node.js or FFmpeg.
9.  As a video editor, I want the project source code to be updated when I use the Inspector, so that my project remains portable and code-centric.

## Implementation Decisions

### Modules & Architecture
- **Tauri Core (Rust)**: Manages the windowing, file system access, and orchestration of sidecar binaries.
- **Frontend (React/TypeScript)**: The main UI hosting the Inspector, Timeline, and Preview components.
- **Sidecar Manager**: A Rust-based module to execute and manage the bundled Node.js and FFmpeg processes.
- **AI Animator Bridge**: A service to communicate with the Claude 3.5 API, sending system-prompt-wrapped requests to generate `buildTimeline` factory functions.
- **Hyperframes Workspace**: A module to manage the local project structure (`index.html`, `meta.json`, `config.json`).
- **Surgical Code Updater**: A module that parses and updates the `config.json` (Configuration-Driven Sync) when the Inspector UI changes.

### Core Patterns
- **Timeline Factory Pattern**: AI generates a JS function that accepts a `config` object to rebuild the GSAP timeline.
- **Inspector Hook Pattern**: UI scans the DOM for `data-inspect` attributes to auto-generate controls.
- **Referenced Asset Protocol**: Assets are addressed via absolute paths, checked on project load by the Relinking Manager.

## Testing Decisions

- **AI Bridge Tests**: Mocking Claude API responses to ensure the AI Animator produces valid Hyperframes code.
- **Configuration Sync Tests**: Verifying that slider movements in the UI correctly update the `config.json` and trigger the Factory Function without errors.
- **Relinking Logic**: Unit tests to verify that "Media Offline" states are correctly detected and resolved via the Relinking Manager.
- **Tauri/Sidecar Integration**: Integration tests to ensure the bundled Node.js can successfully execute the `hyperframes` CLI.

## Out of Scope
- **Multi-Track Audio Editing**: The app focuses on animation; complex audio mixing should be handled in a dedicated NLE.
- **3D Rendering**: Strictly 2D HTML/CSS/GSAP animations (Hyperframes).
- **In-App Video Recording**: Focus is on rendering/exporting via FFmpeg.

## Further Notes
- The app will initially target Windows (WebView2) and macOS (WebKit).
- Future versions may explore local LLM integration if performance and setup requirements allow.
