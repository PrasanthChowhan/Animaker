import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { 
  LayoutPanelLeft, 
  Settings, 
  Home, 
  Scissors, 
  Film, 
  Wand2, 
  Palette, 
  Music, 
  Send,
  Play,
  SkipBack,
  SkipForward,
  MousePointer2,
  Magnet,
  Zap,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { AnimakerProject } from '../types/project';
import { compileProjectToHTML } from '../lib/compiler';

type Page = 'Media' | 'Cut' | 'Edit' | 'Fusion' | 'Color' | 'Fairlight' | 'Deliver';

export default function MainEditor({ project: initialProject, onBackToDashboard }: { project: AnimakerProject, onBackToDashboard: () => void }) {
  const [activePage, setActivePage] = useState<Page>('Edit');
  const [project, setProject] = useState<AnimakerProject>(initialProject);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);

  // Auto-save project on changes
  useEffect(() => {
    const save = async () => {
      try {
        await invoke('save_project', { project });
      } catch (err) {
        console.error('Failed to save project:', err);
      }
    };
    
    const timer = setTimeout(save, 1000);
    return () => clearTimeout(timer);
  }, [project]);

  const handleAddClip = (trackId: string) => {
    const newClip = {
      id: `clip_${Date.now()}`,
      clip_type: 'smart' as const,
      start: playheadPosition,
      duration: 5,
      content: 'New AI Clip',
      metadata: {
        animation: {
          prompt: '',
          presetId: 'default'
        }
      }
    };

    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => 
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      )
    }));
    setSelectedClipId(newClip.id);
  };

  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<any>) => {
    setProject(prev => ({
      ...prev,
      tracks: prev.tracks.map(t => 
        t.id === trackId 
          ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) } 
          : t
      )
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-[#111] text-[#e0e0e0] font-sans overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-10 border-b border-[#333] flex items-center justify-between px-4 bg-[#181818]">
        <div className="flex gap-4">
          <button className="flex items-center gap-2 hover:bg-[#2a2a2a] px-2 py-1 rounded text-sm text-cyan-400">
            <LayoutPanelLeft size={16} /> Media Pool
          </button>
          <button className="flex items-center gap-2 hover:bg-[#2a2a2a] px-2 py-1 rounded text-sm">
            <Zap size={16} /> Effects Library
          </button>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 hover:bg-[#2a2a2a] px-2 py-1 rounded text-sm font-medium">Mixer</button>
          <button className="flex items-center gap-2 hover:bg-[#2a2a2a] px-2 py-1 rounded text-sm font-medium">Metadata</button>
          <button className="flex items-center gap-2 bg-[#2a2a2a] px-2 py-1 rounded text-sm border border-[#444] font-medium">
            <Info size={16} /> Inspector
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activePage === 'Edit' && (
          <EditPage 
            project={project} 
            selectedClipId={selectedClipId} 
            onSelectClip={setSelectedClipId}
            onAddClip={handleAddClip}
            onUpdateClip={handleUpdateClip}
            playheadPosition={playheadPosition}
            onPlayheadChange={setPlayheadPosition}
          />
        )}
        {activePage === 'Deliver' && <DeliverPage project={project} />}
      </div>

      {/* Bottom Page Bar */}
      <div className="h-12 border-t border-[#333] flex items-center justify-between px-4 bg-[#181818]">
        <div className="flex-1 flex justify-center gap-8">
          <PageIcon icon={<LayoutPanelLeft size={20} />} label="Media" active={activePage === 'Media'} onClick={() => setActivePage('Media')} />
          <PageIcon icon={<Scissors size={20} />} label="Cut" active={activePage === 'Cut'} onClick={() => setActivePage('Cut')} />
          <PageIcon icon={<Film size={20} />} label="Edit" active={activePage === 'Edit'} onClick={() => setActivePage('Edit')} />
          <PageIcon icon={<Wand2 size={20} />} label="Fusion" active={activePage === 'Fusion'} onClick={() => setActivePage('Fusion')} />
          <PageIcon icon={<Palette size={20} />} label="Color" active={activePage === 'Color'} onClick={() => setActivePage('Color')} />
          <PageIcon icon={<Music size={20} />} label="Fairlight" active={activePage === 'Fairlight'} onClick={() => setActivePage('Fairlight')} />
          <PageIcon icon={<Send size={20} />} label="Deliver" active={activePage === 'Deliver'} onClick={() => setActivePage('Deliver')} />
        </div>
        <div className="flex gap-4 text-[#888]">
          <Settings size={20} className="hover:text-white cursor-pointer" />
          <Home size={20} className="hover:text-white cursor-pointer" onClick={onBackToDashboard} />
        </div>
      </div>
    </div>
  );
}

function EditPage({ 
  project, 
  selectedClipId, 
  onSelectClip, 
  onAddClip, 
  onUpdateClip,
  playheadPosition,
  onPlayheadChange
}: { 
  project: AnimakerProject, 
  selectedClipId: string | null,
  onSelectClip: (id: string | null) => void,
  onAddClip: (trackId: string) => void,
  onUpdateClip: (trackId: string, clipId: string, updates: Partial<any>) => void,
  playheadPosition: number,
  onPlayheadChange: (pos: number) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const selectedClip = project.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);

  const handleGenerate = async () => {
    if (!selectedClip) return;
    setIsGenerating(true);
    try {
      const result = await invoke<any>('generate_clip_code', {
        request: {
          prompt: selectedClip.metadata.animation?.prompt || selectedClip.content,
          preset_id: selectedClip.metadata.animation?.presetId || 'default',
          width: project.width,
          height: project.height,
          duration: selectedClip.duration
        }
      });

      const trackId = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
      if (trackId) {
        onUpdateClip(trackId, selectedClip.id, {
          metadata: {
            ...selectedClip.metadata,
            animation: {
              ...selectedClip.metadata.animation,
              generatedHtml: result.html,
              generatedCss: result.css,
              generatedJs: result.js
            }
          }
        });
      }
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-[60%] flex border-b border-[#333]">
        {/* Asset Zone */}
        <div className="w-[20%] border-r border-[#333] flex flex-col bg-[#141414]">
          <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">MEDIA POOL</div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div 
              onClick={() => onAddClip('v1')}
              className="p-3 bg-[#222] border border-[#333] rounded hover:border-cyan-500 cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-cyan-500" />
                <span className="text-xs font-bold text-cyan-500 uppercase tracking-tighter">AI Clip</span>
              </div>
              <div className="text-[10px] text-[#888]">Click to add at playhead</div>
            </div>
          </div>
        </div>

        {/* Viewers */}
        <div className="flex-1 flex bg-[#000] gap-1 p-1">
          <div className="flex-1 flex flex-col bg-[#080808] relative">
            <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-1 uppercase tracking-widest text-[#555]">Source</div>
            <div className="flex-1" />
            <ViewerControls time="00:00:00:00" />
          </div>
          <div className="flex-1 flex flex-col bg-[#080808] relative">
            <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-1 uppercase tracking-widest text-cyan-500 z-10">Timeline Preview</div>
            <div className="flex-1 flex items-center justify-center p-4">
               <div 
                className="bg-black shadow-2xl border border-[#222] overflow-hidden relative" 
                style={{ 
                  aspectRatio: project.aspect_ratio.replace(':', '/'),
                  width: '90%'
                }}
              >
                <PreviewFrame project={project} currentTime={playheadPosition} />
              </div>
            </div>
            <ViewerControls time={`00:00:${playheadPosition.toFixed(0).padStart(2, '0')}:00`} />
          </div>
        </div>

        {/* Inspector */}
        <div className="w-[20%] border-l border-[#333] flex flex-col bg-[#141414]">
          <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">INSPECTOR</div>
          {selectedClip ? (
            <div className="p-4 space-y-4">
               <div className="text-[11px] text-[#888] uppercase tracking-wider font-bold">Clip Properties</div>
               <PropertyRow label="Name" value={selectedClip.content} />
               <PropertyRow label="Start" value={`${selectedClip.start.toFixed(2)}s`} />
               <PropertyRow label="Duration" value={`${selectedClip.duration.toFixed(2)}s`} />
               
               <div className="pt-4 border-t border-[#333] space-y-4">
                 <div>
                   <label htmlFor="ai-prompt" className="text-[11px] text-[#888] uppercase tracking-wider mb-2 block">AI Prompt</label>
                   <textarea 
                    id="ai-prompt"
                    className="w-full bg-[#000] border border-[#333] rounded p-2 text-xs text-cyan-500 font-mono h-24 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter prompt..."
                    value={selectedClip.metadata.animation?.prompt || ''}
                    onChange={(e) => {
                      const trackId = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
                      if (trackId) {
                        onUpdateClip(trackId, selectedClip.id, {
                          metadata: {
                            ...selectedClip.metadata,
                            animation: {
                              ...selectedClip.metadata.animation,
                              prompt: e.target.value
                            }
                          }
                        });
                      }
                    }}
                   />
                 </div>

                 <div className="space-y-3">
                   <div className="text-[11px] text-[#888] uppercase tracking-wider font-bold">Customization</div>
                   <div className="flex items-center justify-between">
                     <label htmlFor="primary-color" className="text-[10px] text-[#666]">Primary Color</label>
                     <input 
                       id="primary-color"
                       type="color" 
                       className="bg-transparent border-none w-6 h-6 cursor-pointer"
                       value={selectedClip.metadata.animation?.customizations?.color || '#22d3ee'}
                       onChange={(e) => {
                         const trackId = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
                         if (trackId) {
                           onUpdateClip(trackId, selectedClip.id, {
                             metadata: {
                               ...selectedClip.metadata,
                               animation: {
                                 ...selectedClip.metadata.animation,
                                 customizations: {
                                   ...selectedClip.metadata.animation?.customizations,
                                   color: e.target.value
                                 }
                               }
                             }
                           });
                         }
                       }}
                     />
                   </div>
                   <div className="space-y-1">
                     <label htmlFor="text-content" className="text-[10px] text-[#666]">Text Content</label>
                     <input 
                       id="text-content"
                       type="text" 
                       className="w-full bg-[#000] border border-[#333] rounded px-2 py-1 text-[10px] focus:border-cyan-500 outline-none text-white"
                       value={selectedClip.metadata.animation?.customizations?.text || ''}
                       onChange={(e) => {
                         const trackId = project.tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
                         if (trackId) {
                           onUpdateClip(trackId, selectedClip.id, {
                             metadata: {
                               ...selectedClip.metadata,
                               animation: {
                                 ...selectedClip.metadata.animation,
                                 customizations: {
                                   ...selectedClip.metadata.animation?.customizations,
                                   text: e.target.value
                                 }
                               }
                             }
                           });
                         }
                       }}
                     />
                   </div>
                 </div>

                 <button 
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className={`w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isGenerating 
                      ? 'bg-[#333] text-[#666] cursor-not-allowed' 
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]'
                  }`}
                 >
                   {isGenerating ? (
                     <>
                       <Loader2 size={16} className="animate-spin" />
                       Generating...
                     </>
                   ) : (
                     <>
                       <Zap size={16} fill="currentColor" />
                       Generate Animation
                     </>
                   )}
                 </button>
               </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#444] text-xs italic">
              No clip selected
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#111]">
        <div 
          className="h-6 border-b border-[#333] bg-[#181818] flex items-center relative cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left - 100;
            if (x >= 0) {
              const pos = (x / (rect.width - 100)) * project.duration;
              onPlayheadChange(pos);
            }
          }}
        >
            <div className="w-[100px] border-r border-[#333] h-full" />
            <div className="flex-1 h-full relative">
               {[0, 2, 4, 6, 8, 10].map(s => (
                 <div key={s} className="absolute top-0 bottom-0 border-l border-[#333] text-[9px] text-[#555] pl-1 pt-1" style={{ left: `${(s / project.duration) * 100}%` }}>
                   {s}s
                 </div>
               ))}
               <div 
                 className="absolute top-0 bottom-0 w-[2px] bg-red-600 z-50 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                 style={{ left: `${(playheadPosition / project.duration) * 100}%` }}
               >
                 <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-600 rotate-45" />
               </div>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto relative">
          <div 
             className="absolute top-0 bottom-0 w-[1px] bg-red-900/30 z-20 pointer-events-none"
             style={{ left: `${100 + (playheadPosition / project.duration * (window.innerWidth - 100))}px` }}
          />

          {project.tracks.slice().reverse().map(track => (
            <div key={track.id} className="h-12 border-b border-[#222] flex">
              <div className="w-[100px] border-r border-[#333] flex items-center justify-between px-2 bg-[#181818] shrink-0">
                <span className="text-[10px] font-bold text-[#666]">{track.name}</span>
              </div>
              <div className="flex-1 relative bg-[#111]">
                {track.clips.map(clip => (
                  <div 
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClip(clip.id);
                    }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const initialStart = clip.start;
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaSeconds = (deltaX / (window.innerWidth - 100)) * project.duration;
                        onUpdateClip(track.id, clip.id, { start: Math.max(0, initialStart + deltaSeconds) });
                      };
                      const handleMouseUp = () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                      };
                      window.addEventListener('mousemove', handleMouseMove);
                      window.addEventListener('mouseup', handleMouseUp);
                    }}
                    className={`absolute top-2 h-8 border rounded flex items-center px-2 text-[9px] cursor-move transition-shadow ${
                      selectedClipId === clip.id 
                        ? 'bg-cyan-700/70 border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)] z-10' 
                        : 'bg-cyan-900/40 border-cyan-700 hover:border-cyan-500 text-cyan-100'
                    }`}
                    style={{ 
                      left: `${(clip.start / project.duration) * 100}%`, 
                      width: `${(clip.duration / project.duration) * 100}%` 
                    }}
                  >
                    {clip.content}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="h-2 bg-[#000]" />
          <Track label="A1" />
          <Track label="A2" />
        </div>
      </div>
    </div>
  );
}

function PreviewFrame({ project, currentTime }: { project: AnimakerProject, currentTime: number }) {
  const activeClips = project.tracks
    .flatMap(t => t.clips)
    .filter(c => currentTime >= c.start && currentTime <= c.start + c.duration);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
        <style>
          body { margin: 0; background: black; overflow: hidden; display: flex; align-items: center; justify-content: center; width: ${project.width}px; height: ${project.height}px; }
          .container { position: relative; width: 100%; height: 100%; }
          .clip-element { position: absolute; inset: 0; }
          ${activeClips.map(c => c.metadata.animation?.generatedCss || '').join('\n')}
        </style>
      </head>
      <body>
        <div class="container">
          ${activeClips.map(c => c.metadata.animation?.generatedHtml || `<div style="color: #444; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px dashed #333; font-size: 24px;">${c.content}</div>`).join('\n')}
        </div>
        <script>
          ${activeClips.map(c => `
            (function() {
              const clipTime = ${currentTime} - ${c.start};
              ${c.metadata.animation?.generatedJs || ''}
              gsap.globalTimeline.seek(clipTime);
            })();
          `).join('\n')}
        </script>
      </body>
    </html>
  `;

  return (
    <iframe 
      srcDoc={html}
      className="w-full h-full border-none pointer-events-none"
      title="Timeline Preview"
    />
  );
}

function DeliverPage({ project }: { project: AnimakerProject }) {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupListener = async () => {
      unlisten = await listen<any>('render-progress', (event) => {
        setProgress(event.payload.percent);
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleStartRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setStatus('rendering');
    setError(null);
    try {
      const projects = await invoke<any[]>('list_projects');
      let targetProject = projects.find(p => p.name === project.name);
      if (!targetProject) {
        targetProject = await invoke('create_project', { name: project.name, aspectRatio: `${project.width}:${project.height}` });
      }
      const projectPath = targetProject.path;
      const indexHtml = compileProjectToHTML(project);
      const clips = project.tracks.flatMap((track, trackIndex) => 
        track.clips.map(clip => ({ id: clip.id, track_index: trackIndex, clip_type: track.track_type, start: clip.start, duration: clip.duration, content: clip.content }))
      );
      const result = await invoke<string>('render_project', { projectPath, indexHtml, clips });
      setOutputPath(result);
      setStatus('success');
    } catch (err: any) {
      console.error('Render failed:', err);
      setError(err.toString());
      setStatus('error');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
        <div className="w-[300px] border-r border-[#333] flex flex-col bg-[#141414]">
            <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">RENDER SETTINGS</div>
            <div className="p-4 space-y-4">
                <PropertyRow label="Format" value="MP4" />
                <PropertyRow label="Codec" value="H.264" />
                <PropertyRow label="Resolution" value={`${project.width}x${project.height}`} />
            </div>
        </div>
        <div className="flex-1 flex flex-col bg-[#000]">
            <div className="flex-1 flex items-center justify-center relative">
                <div className="aspect-video w-[80%] bg-[#080808] border border-[#222] flex items-center justify-center">
                    {status === 'rendering' && (
                        <div className="text-center">
                            <Loader2 className="animate-spin text-cyan-500 mx-auto mb-4" size={48} />
                            <div className="text-cyan-500 font-mono text-xl">{Math.round(progress)}%</div>
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="text-center text-green-500 font-bold">
                            <CheckCircle2 size={48} className="mx-auto mb-4" /> RENDER COMPLETE
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="text-center text-red-500 font-bold">
                            <AlertCircle size={48} className="mx-auto mb-4" /> RENDER FAILED
                        </div>
                    )}
                    {status === 'idle' && <div className="text-[#333] uppercase tracking-widest">Ready</div>}
                </div>
            </div>
            <div className="h-24 border-t border-[#333] bg-[#141414] p-2">
                {status === 'rendering' && (
                    <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${progress}%` }} />
                    </div>
                )}
            </div>
        </div>
        <div className="w-[300px] border-l border-[#333] flex flex-col bg-[#141414] p-4">
            <button onClick={handleStartRender} disabled={isRendering} className="w-full bg-cyan-600 py-2 rounded font-bold">
                {isRendering ? 'Rendering...' : 'Start Render'}
            </button>
        </div>
    </div>
  );
}

function PageIcon({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <div onClick={onClick} className={`flex flex-col items-center gap-0.5 cursor-pointer ${active ? 'text-cyan-400' : 'text-[#888]'}`}>
      {icon} <span className="text-[9px] uppercase">{label}</span>
    </div>
  );
}

function ViewerControls({ time }: { time: string }) {
  return (
    <div className="h-10 bg-[#181818] border-t border-[#333] flex items-center justify-between px-4">
      <div className="text-[11px] font-mono text-cyan-500">{time}</div>
      <div className="flex gap-4 text-[#aaa]">
        <SkipBack size={14} /> <Play size={14} fill="currentColor" /> <SkipForward size={14} />
      </div>
      <div className="text-[11px] font-mono text-[#666]">100%</div>
    </div>
  );
}

function Track({ label }: { label: string }) {
  return (
    <div className="h-12 border-b border-[#222] flex">
      <div className="w-[100px] border-r border-[#333] flex items-center px-2 bg-[#181818]">
        <span className="text-[10px] font-bold text-[#666]">{label}</span>
      </div>
      <div className="flex-1 relative" />
    </div>
  );
}

function PropertyRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[#888]">{label}</span>
      <span className="bg-[#000] px-2 py-0.5 rounded border border-[#333] text-cyan-500 font-mono">{value}</span>
    </div>
  );
}
