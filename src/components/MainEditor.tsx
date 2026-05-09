import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { 
  LayoutPanelLeft, 
  Settings, 
  Home, 
  Scissors, 
  Film, 
  Send,
  Play,
  SkipBack,
  SkipForward,
  MousePointer2,
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
  const [project, setProject] = useState<AnimakerProject>(() => ({
    ...initialProject,
    tracks: initialProject.tracks || []
  }));
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
    // ... same newClip
    const newClip = {
      id: `clip_${Date.now()}`,
      clip_type: 'smart' as const,
      start: playheadPosition,
      duration: 5,
      content: 'New AI Clip',
      metadata: {
        animation: {
          prompt: '',
          presetId: 'default',
          customizations: {
            text: 'New AI Clip',
            color: '#22d3ee'
          }
        }
      }
    };

    setProject(prev => {
      const tracks = prev.tracks || [];
      return {
        ...prev,
        tracks: tracks.map(t => 
          t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
        )
      };
    });
    setSelectedClipId(newClip.id);
  };

  const handleUpdateClip = (trackId: string, clipId: string, updates: Partial<any>) => {
    setProject(prev => {
      const tracks = prev.tracks || [];
      return {
        ...prev,
        tracks: tracks.map(t => 
          t.id === trackId 
            ? { ...t, clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c) } 
            : t
        )
      };
    });
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
          <button className="flex items-center gap-2 bg-[#2a2a2a] px-2 py-1 rounded text-sm border border-[#444]">
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
          <PageIcon icon={<Film size={20} />} label="Edit" active={activePage === 'Edit'} onClick={() => setActivePage('Edit')} />
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
  const tracks = project.tracks || [];
  const selectedClip = tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId);

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

      const tracks = project.tracks || [];
      const trackId = tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
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
                <span className="text-xs font-bold text-cyan-500">AI CLIP</span>
              </div>
              <div className="text-[10px] text-[#888]">Drag or click to add animation</div>
            </div>
          </div>
        </div>

        {/* Viewers */}
        <div className="flex-1 flex bg-[#000] gap-1 p-1">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-[#080808] relative flex items-center justify-center">
              <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-1 z-10 uppercase">Timeline Preview</div>
              <div className="bg-black shadow-2xl border border-[#222] overflow-hidden relative" style={{ aspectRatio: project.aspect_ratio.replace(':', '/'), width: '80%' }}>
                <PreviewFrame project={project} currentTime={playheadPosition} />
              </div>
            </div>
            <ViewerControls time={`00:00:${playheadPosition.toFixed(0).padStart(2, '0')}:00`} />
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-[20%] border-l border-[#333] flex flex-col bg-[#141414]">
          <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">INSPECTOR</div>
          {selectedClip ? (
            <div className="p-4 space-y-4">
               <div className="text-[11px] text-[#888] uppercase tracking-wider">Clip Properties</div>
               <PropertyRow label="Name" value={selectedClip.content} />
               
               <div className="pt-4 border-t border-[#333]">
                 <div className="text-[11px] text-[#888] uppercase tracking-wider mb-2">AI Prompt</div>
                 <textarea 
                  className="w-full bg-[#000] border border-[#333] rounded p-2 text-xs text-cyan-500 font-mono h-24 focus:outline-none focus:border-cyan-500 mb-4"
                  placeholder="Enter prompt..."
                  value={selectedClip.metadata.animation?.prompt || ''}
                  onChange={(e) => {
                    const tracks = project.tracks || [];
      const trackId = tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
                    if (trackId) {
                      onUpdateClip(trackId, selectedClip.id, {
                        metadata: {
                          ...selectedClip.metadata,
                          animation: { ...selectedClip.metadata.animation, prompt: e.target.value }
                        }
                      });
                    }
                  }}
                 />

                 <div className="text-[11px] text-[#888] uppercase tracking-wider mb-2">Customization</div>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <label htmlFor="primary-color" className="text-[10px] text-[#666]">Primary Color</label>
                     <input 
                       id="primary-color"
                       type="color" 
                       className="bg-transparent border-none w-6 h-6 cursor-pointer"
                       value={selectedClip.metadata.animation?.customizations?.color || '#22d3ee'}
                       onChange={(e) => {
                         const tracks = project.tracks || [];
      const trackId = tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
                         if (trackId) {
                           onUpdateClip(trackId, selectedClip.id, {
                             metadata: {
                               ...selectedClip.metadata,
                               animation: {
                                 ...selectedClip.metadata.animation,
                                 customizations: { ...selectedClip.metadata.animation?.customizations, color: e.target.value }
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
                         const tracks = project.tracks || [];
      const trackId = tracks.find(t => t.clips.some(c => c.id === selectedClip.id))?.id;
                         if (trackId) {
                           onUpdateClip(trackId, selectedClip.id, {
                             metadata: {
                               ...selectedClip.metadata,
                               animation: {
                                 ...selectedClip.metadata.animation,
                                 customizations: { ...selectedClip.metadata.animation?.customizations, text: e.target.value }
                               }
                             }
                           });
                         }
                       }}
                     />
                   </div>
                 </div>

                 <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`w-full mt-6 py-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    isGenerating ? 'bg-[#333] text-[#666] cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  }`}
                 >
                   {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Zap size={16} fill="currentColor" /> Generate Animation</>}
                 </button>
               </div>
            </div>
          ) : <div className="flex-1 flex items-center justify-center text-[#444] text-xs italic">No clip selected</div>}
        </div>
      </div>

      {/* Central Toolbar */}
      <div className="h-8 border-b border-[#333] flex items-center px-4 bg-[#1a1a1a] gap-4">
        <MousePointer2 size={16} className="text-cyan-500" />
        <Scissors size={16} className="text-[#888]" />
      </div>

      {/* Timeline Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#111]">
        <div 
          className="h-6 border-b border-[#333] bg-[#181818] flex items-center relative cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left - 100;
            if (x >= 0) onPlayheadChange((x / (rect.width - 100)) * 10);
          }}
        >
            <div className="w-[100px] border-r border-[#333] h-full" />
            <div className="flex-1 h-full relative">
               {[0, 2, 4, 6, 8, 10].map(s => (
                 <div key={s} className="absolute top-0 bottom-0 border-l border-[#333] text-[9px] text-[#555] pl-1 pt-1" style={{ left: `${s * 10}%` }}>{s}s</div>
               ))}
               <div className="absolute top-0 bottom-0 w-[2px] bg-red-600 z-50" style={{ left: `${playheadPosition * 10}%` }} />
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tracks.slice().reverse().map(track => (
            <div key={track.id} className="h-12 border-b border-[#222] flex">
              <div className="w-[100px] border-r border-[#333] flex items-center justify-between px-2 bg-[#181818] shrink-0">
                <span className="text-[10px] font-bold text-[#666]">{track.name}</span>
              </div>
              <div className="flex-1 relative bg-[#111]">
                {track.clips.map(clip => (
                  <div 
                    key={clip.id}
                    onClick={(e) => { e.stopPropagation(); onSelectClip(clip.id); }}
                    className={`absolute top-2 h-8 border rounded flex items-center px-2 text-[9px] cursor-move ${selectedClipId === clip.id ? 'bg-cyan-700/70 border-cyan-300' : 'bg-cyan-900/40 border-cyan-700'}`}
                    style={{ left: `${clip.start * 10}%`, width: `${clip.duration * 10}%` }}
                  >
                    {clip.content}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewFrame({ project, currentTime }: { project: AnimakerProject, currentTime: number }) {
  const tracks = project.tracks || [];
  const activeClips = tracks.flatMap(t => t.clips).filter(c => currentTime >= c.start && currentTime <= c.start + c.duration);
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
        <style>
          body { margin: 0; background: black; overflow: hidden; }
          .container { position: relative; width: ${project.width}px; height: ${project.height}px; }
          .clip-element { position: absolute; inset: 0; }
          ${activeClips.map(c => c.metadata.animation?.generatedCss || '').join('\n')}
        </style>
      </head>
      <body>
        <div class="container">
          ${activeClips.map(c => c.metadata.animation?.generatedHtml || `<div style="color: white;">${c.content}</div>`).join('\n')}
        </div>
        <script>
          ${activeClips.map(c => `(function() { const clipTime = ${currentTime} - ${c.start}; ${c.metadata.animation?.generatedJs || ''} gsap.globalTimeline.seek(clipTime); })();`).join('\n')}
        </script>
      </body>
    </html>
  `;
  return <iframe srcDoc={html} className="w-full h-full border-none pointer-events-none" title="Timeline Preview" />;
}

function DeliverPage({ project }: { project: AnimakerProject }) {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'rendering' | 'success' | 'error'>('idle');

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<any>('render-progress', (event) => setProgress(event.payload.percent)).then(u => unlisten = u);
    return () => { if (unlisten) unlisten(); };
  }, []);

  const handleStartRender = async () => {
    setIsRendering(true); setProgress(0); setStatus('rendering');
    try {
      const projects = await invoke<any[]>('list_projects');
      const targetProject = projects.find(p => p.name === project.name);
      const projectPath = targetProject?.path || '';
      const indexHtml = compileProjectToHTML(project);
      const tracks = project.tracks || [];
      const clips = tracks.flatMap((track, trackIndex) => 
        track.clips.map(clip => ({ id: clip.id, track_index: trackIndex, clip_type: track.track_type, start: clip.start, duration: clip.duration, content: clip.content }))
      );
      await invoke('render_project', { projectPath, indexHtml, clips });
      setStatus('success');
    } catch (err: any) {
      console.error(err); setStatus('error');
    } finally { setIsRendering(false); }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
        <div className="w-[300px] border-r border-[#333] flex flex-col bg-[#141414] p-4 space-y-4">
            <div className="text-xs font-bold uppercase">Render Settings</div>
            <PropertyRow label="Format" value="MP4" />
            <PropertyRow label="Codec" value="H.264" />
        </div>
        <div className="flex-1 flex flex-col bg-[#000] items-center justify-center relative">
            <div className="aspect-video w-[80%] bg-[#080808] border border-[#222] flex items-center justify-center">
                {status === 'rendering' && <div className="text-center"><Loader2 className="animate-spin text-cyan-500 mx-auto mb-2" /><div className="text-cyan-500 font-mono">{Math.round(progress)}%</div></div>}
                {status === 'success' && <div className="text-green-500 font-bold"><CheckCircle2 size={48} className="mx-auto mb-2" /> RENDER COMPLETE</div>}
                {status === 'error' && <div className="text-red-500 font-bold"><AlertCircle size={48} className="mx-auto mb-2" /> RENDER FAILED</div>}
                {status === 'idle' && <div className="text-[#333] uppercase">Ready</div>}
            </div>
        </div>
        <div className="w-[300px] border-l border-[#333] bg-[#141414] p-4">
            <button onClick={handleStartRender} disabled={isRendering} className="w-full bg-cyan-600 py-2 rounded font-bold">{isRendering ? 'Rendering...' : 'Start Render'}</button>
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
      <div className="flex gap-4 text-[#aaa]"><SkipBack size={14} /><Play size={14} fill="currentColor" /><SkipForward size={14} /></div>
      <div className="text-[11px] font-mono text-[#666]">100%</div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]"><span className="text-[#888]">{label}</span><span className="bg-[#000] px-2 py-0.5 rounded border border-[#333] text-cyan-500 font-mono">{value}</span></div>
  );
}
