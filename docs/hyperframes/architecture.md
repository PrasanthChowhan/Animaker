# HyperFrames Architecture & Schema Reference

This document outlines the internal architecture and data serialization patterns of HyperFrames, as discovered from the `@hyperframes/core` and `@hyperframes/engine` source code.

## 1. Project Structure

A standard HyperFrames project consists of the following:

- **`hyperframes.json`**: The project manifest.
  - Defines registry links and paths for blocks (compositions), components, and assets.
- **`index.html`**: The entry point/bootstrap file.
  - Responsibility: Orchestrates the loading of compositions.
  - Key Attributes:
    - `data-composition-id`: Unique identifier for the root composition.
    - `data-composition-src`: Path to the composition template file.
    - `data-width`, `data-height`, `data-duration`: Canonical dimensions and timing.
- **`compositions/`**: Directory containing scene templates.
  - Files are `.html` but follow a specific template structure.

## 2. Composition File Schema (`.html`)

Composition files are not standard HTML documents; they are **Template Containers**.

### The `<template>` Wrapper
Every composition is wrapped in a `<template>` tag with a unique ID:
```html
<template id="my-comp-template">
  <div data-composition-id="my-comp" data-width="1920" data-height="1080" data-duration="15">
    <!-- Scene Elements -->
  </div>
  <style>/* Scoped Styles */</style>
  <script>/* GSAP Animation Logic */</script>
</template>
```

### Data Serialization (Data Attributes)
HyperFrames uses standard HTML5 `data-` attributes to serialize its internal state. This allows the files to be "stateless" and easily parsed by both the browser and CLI tools.

| Attribute | Purpose | Value Example |
|-----------|---------|---------------|
| `data-start` | Element start time (sec) | `2.5` |
| `data-end` | Element end time (sec) | `7.0` |
| `data-duration` | Fallback duration | `5.0` |
| `data-layer` | Z-index / stacking order | `10` |
| `data-name` | Human-readable name | `"Background Video"` |
| `data-keyframes` | JSON-encoded animation data | `"[{\"time\":0, \"props\":{...}}]"` |
| `data-composition-variables` | Component customization schema | JSON string |
| `data-variable-values` | Instance-specific overrides | JSON string |

## 3. Runtime & Animation Contract

HyperFrames relies on a specific "handshake" between the host page and the rendered content to allow seeking and previewing.

### The GSAP Bridge
Animations MUST be registered on `window.__timelines` to be seekable.
```javascript
const tl = gsap.timeline({ paused: true });
// ... define animations ...
window.__timelines = window.__timelines || {};
window.__timelines["my-composition-id"] = tl;
```

### The Player Bridge (`__hf`)
The player (or CLI renderer) communicates with the page via a global bridge:
- **`seek(time)`**: Manually sets the `totalTime` of all registered GSAP timelines and manages element visibility based on `data-start/end`.
- **`renderReady`**: A signal (often a console log or window flag) that the page has finished initializing and is ready for capture.

## 4. Integration Strategy for Animaker

To properly integrate with HyperFrames, the Animaker application must:
1. **Tracks as Compositions**: Each track in the Animaker timeline corresponds to a composition in the HyperFrames system.
2. **Clips as Elements**: Clips within tracks are mapped to elements inside those compositions, utilizing the `data-start` and `data-end` attributes for timing.
3. **Template Compilation**: When generating code, Animaker must produce valid `<template>` structures that follow the GSAP registration contract.
