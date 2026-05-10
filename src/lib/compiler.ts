import { AnimakerProject, Clip, Track } from '../types/project';

export function compileProjectToHTML(project: AnimakerProject): string {
  const tracks = project.tracks || [];
  
  const compositionTemplates = tracks.map((track, index) => compileTrackToTemplate(track, index, project)).join('\n');
  const trackInstances = tracks.map((track, index) => `
    <div data-composition-id="${track.id}" 
         data-composition-template="#${track.id}-template"
         data-layer="${index}"
         data-start="0"
         data-end="${project.duration}">
    </div>
  `).join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: ${project.width}px;
            height: ${project.height}px;
            background-color: transparent;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
        }
        #canvas {
            position: relative;
            width: ${project.width}px;
            height: ${project.height}px;
            overflow: hidden;
        }
        .clip-element {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
        }
    </style>
</head>
<body>
    <div id="canvas" 
         data-composition-id="root" 
         data-width="${project.width}" 
         data-height="${project.height}"
         data-duration="${project.duration}">
        ${trackInstances}
    </div>

    ${compositionTemplates}

    <script>
        // Seeded random for determinism
        (function() {
            let seed = 12345;
            Math.random = function() {
                seed = (seed * 1664525 + 1013904223) % 4294967296;
                return seed / 4294967296;
            };
        })();

        // Standard HyperFrames timeline registration
        window.__timelines = window.__timelines || {};

        // HyperFrames Bridge for CLI rendering
        window.__hf = {
            duration: ${project.duration},
            seek: async (time) => {
                // 1. Update all registered GSAP timelines
                Object.values(window.__timelines).forEach(tl => {
                    if (tl && typeof tl.totalTime === 'function') {
                        tl.totalTime(time);
                    }
                });
                
                // 2. Visibility management based on data-start/data-end
                document.querySelectorAll('[data-start]').forEach(el => {
                    const start = parseFloat(el.getAttribute('data-start'));
                    const end = parseFloat(el.getAttribute('data-end'));
                    
                    if (!isNaN(start) && !isNaN(end)) {
                        if (time >= start && time < end) {
                            el.style.display = 'block';
                        } else {
                            el.style.display = 'none';
                        }
                    }
                });

                // Wait for next frame to ensure browser has painted
                return new Promise(resolve => requestAnimationFrame(() => resolve()));
            }
        };

        // Initialize compositions on load
        window.addEventListener('load', () => {
            // Signal readiness to HyperFrames
            console.log('HyperFrames Runtime Ready');
        });
    </script>
</body>
</html>
  `.trim();
}

function compileTrackToTemplate(track: Track, index: number, project: AnimakerProject): string {
  const elements = track.clips.map((clip) => compileClipToHTML(clip, index)).join('\n');
  const animations = track.clips.map(c => c.metadata.animation?.generatedJs || '').filter(Boolean).join('\n');
  const styles = track.clips.map(c => c.metadata.animation?.generatedCss || '').filter(Boolean).join('\n');

  return `
<template id="${track.id}-template">
  <div data-composition-id="${track.id}" 
       data-width="${project.width}" 
       data-height="${project.height}" 
       data-duration="${project.duration}">
    ${elements}
  </div>
  <style>
    ${styles}
  </style>
  <script>
    (function() {
      const tl = gsap.timeline({ paused: true });
      
      // Register animations for this track
      ${animations}

      window.__timelines = window.__timelines || {};
      window.__timelines["${track.id}"] = tl;
    })();
  </script>
</template>
  `;
}

function compileClipToHTML(clip: Clip, trackIndex: number): string {
  const commonAttrs = `
    id="clip-${clip.id}" 
    class="clip-element"
    data-name="${clip.content.substring(0, 20)}"
    data-start="${clip.start}" 
    data-end="${clip.start + clip.duration}"
    data-layer="${trackIndex}"
  `.trim();

  if (clip.clip_type === 'smart' && clip.metadata.animation?.generatedHtml) {
    return `
      <div ${commonAttrs}>
        ${clip.metadata.animation.generatedHtml}
      </div>
    `;
  }

  return `
    <div ${commonAttrs} 
         style="color: white; font-family: sans-serif; font-size: 48px; display: flex; align-items: center; justify-content: center;">
      ${clip.content}
    </div>
  `;
}
