import { AnimakerProject, Clip } from '../types/project';

export function compileProjectToHTML(project: AnimakerProject): string {
  const clips = project.tracks.flatMap((track) => track.clips);
  
  const elements = clips.map((clip) => compileClipToHTML(clip)).join('\n');

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
        ${clips.map(c => c.metadata.animation?.generatedCss || '').join('\n')}
    </style>
</head>
<body>
    <div id="canvas" 
         data-composition-id="main" 
         data-width="${project.width}" 
         data-height="${project.height}"
         data-start="0">
        ${elements}
    </div>
    <script>
        // Standard HyperFrames timeline registration
        window.__timelines = window.__timelines || {};
        window.__timelines["main"] = {
            duration: ${project.duration},
            fps: ${project.fps}
        };

        // HyperFrames Bridge for CLI rendering
        window.__hf = {
            duration: ${project.duration},
            seek: async (time) => {
                // Control all GSAP animations
                gsap.globalTimeline.pause();
                gsap.globalTimeline.totalTime(time);
                
                // Visibility management based on timeline
                const clips = ${JSON.stringify(clips.map(c => ({ id: c.id, start: c.start, duration: c.duration })))};
                clips.forEach(clip => {
                    const el = document.getElementById('clip-' + clip.id);
                    if (el) {
                        if (time >= clip.start && time < (clip.start + clip.duration)) {
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

        // Initialize animations on load (but paused for the renderer to take control)
        window.addEventListener('load', () => {
            gsap.globalTimeline.pause();
            ${clips.map(c => c.metadata.animation?.generatedJs || '').join('\n')}
            
            // Signal readiness to HyperFrames (optional but good practice)
            console.log('HyperFrames Runtime Ready');
        });
    </script>
</body>
</html>
  `.trim();
}

function compileClipToHTML(clip: Clip): string {
  if (clip.type === 'smart' && clip.metadata.animation?.generatedHtml) {
    return `
      <div id="clip-${clip.id}" class="clip-element">
        ${clip.metadata.animation.generatedHtml}
      </div>
    `;
  }

  return `
    <div id="clip-${clip.id}" class="clip-element" 
         style="color: white; font-family: sans-serif; font-size: 48px; display: flex; align-items: center; justify-content: center;">
      ${clip.content}
    </div>
  `;
}
