# HyperFrames Design System & Determinism

HyperFrames projects follow a specific visual identity and a strict set of "Deterministic" rules to ensure high-quality, reproducible video renders.

## 1. Visual Identity (The "HyperFrames Look")

### Color Palette (Warm Neutrals)
HyperFrames avoids pure grays or blacks, opting for a warm "editorial" feel.

- **Backgrounds**: `#f6f5f1` (Cream/Beige) or `#0a0a0a` (Near-Black).
- **Surfaces**: `#ffffff` (White) or `#141414` (Dark panel).
- **Accents**: 
  - Blue: `#2563eb` (Links/Info)
  - Purple: `#7c3aed` (Highlights)
  - Green: `#1a7a0a` (Success)

### Typography
- **Headlines**: `'ABC Solar Display'` (Bold, high contrast).
- **Body**: `'Inter'` (Clean, legible sans-serif).
- **Mono**: `'IBM Plex Mono'` (Technical labels).

### Aesthetic Principles
- **Borders over Shadows**: Use 1px solid borders for depth instead of heavy box-shadows.
- **Grid-based Layouts**: Heavily inspired by Swiss design and The New York Times editorial style.

## 2. The Golden Rules of Determinism
Because HyperFrames renders by capturing frames in a headless browser, the code must be **fully deterministic**. If a script produces different results on two separate runs, the video will "flicker."

1. **No `Date.now()`**: Use the timeline time provided by the bridge or frame count.
2. **No `Math.random()`**: Use a seeded random number generator (e.g., `d3-random` or a simple PRNG) so the "random" values are the same every time you render.
3. **No Network Fetches**: All data and assets must be local or pre-cached. The renderer will not wait for `fetch()` calls during the capture loop.
4. **Paused GSAP**: Timelines must start paused. The HyperFrames engine will manually "tick" the timeline forward to the exact time needed for each frame.
