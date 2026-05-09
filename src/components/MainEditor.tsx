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

export default function MainEditor({ project, onBackToDashboard }: { project: AnimakerProject, onBackToDashboard: () => void }) {
  const [activePage, setActivePage] = useState<Page>('Edit');

  return (
    <div className="flex flex-col h-screen bg-[#111] text-[#e0e0e0] font-sans overflow-hidden select-none">
      {/* Top Bar (Interface Toolbar) */}
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
          <button className="flex items-center gap-2 hover:bg-[#2a2a2a] px-2 py-1 rounded text-sm">
            Mixer
          </button>
          <button className="flex items-center gap-2 hover:bg-[#2a2a2a] px-2 py-1 rounded text-sm">
            Metadata
          </button>
          <button className="flex items-center gap-2 bg-[#2a2a2a] px-2 py-1 rounded text-sm border border-[#444]">
            <Info size={16} /> Inspector
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activePage === 'Edit' && <EditPage project={project} />}
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

function EditPage({ project: _project }: { project: AnimakerProject }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Upper Half: Assets, Viewers, Inspector */}
      <div className="h-[60%] flex border-b border-[#333]">
        {/* Asset Zone */}
        <div className="w-[20%] border-r border-[#333] flex flex-col bg-[#141414]">
          <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">MEDIA POOL</div>
          <div className="flex-1 p-4 text-[#666] italic text-sm">No clips in pool</div>
        </div>

        {/* Dual Viewers */}
        <div className="flex-1 flex bg-[#000] gap-1 p-1">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-[#080808] relative">
              <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-1">SOURCE</div>
            </div>
            <ViewerControls time="00:00:00:00" />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-[#080808] relative">
              <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-1">TIMELINE</div>
            </div>
            <ViewerControls time="00:00:05:12" />
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-[20%] border-l border-[#333] flex flex-col bg-[#141414]">
          <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">INSPECTOR</div>
          <div className="p-4 space-y-4">
             <div className="text-[11px] text-[#888] uppercase tracking-wider">Transform</div>
             <PropertyRow label="Zoom" value="1.000" />
             <PropertyRow label="Position X" value="0.0" />
             <PropertyRow label="Position Y" value="0.0" />
             <PropertyRow label="Rotation" value="0.0" />
          </div>
        </div>
      </div>

      {/* Central Toolbar */}
      <div className="h-8 border-b border-[#333] flex items-center px-4 bg-[#1a1a1a] gap-4">
        <MousePointer2 size={16} className="text-cyan-500" />
        <Scissors size={16} className="text-[#888]" />
        <div className="h-4 w-[1px] bg-[#333]" />
        <Magnet size={16} className="text-cyan-500" />
      </div>

      {/* Timeline Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#111]">
        <div className="h-6 border-b border-[#333] bg-[#181818] flex items-center">
            {/* Ruler would go here */}
            <div className="w-[100px] border-r border-[#333] h-full" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Track label="V2" active={false} />
          <Track label="V1" active />
          <div className="h-2 bg-[#000]" />
          <Track label="A1" active={false} />
          <Track label="A2" active={false} />
        </div>
      </div>
    </div>
  );
}

interface RenderProgress {
  percent: number;
  message: string;
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
      unlisten = await listen<RenderProgress>('render-progress', (event) => {
        setProgress(event.payload.percent);
      });
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleStartRender = async () => {
    setIsRendering(true);
    setProgress(0);
    setStatus('rendering');
    setError(null);

    try {
      // 1. Ensure project exists and get its path
      const projects = await invoke<any[]>('list_projects');
      let targetProject = projects.find(p => p.name === project.name);
      
      if (!targetProject) {
        targetProject = await invoke('create_project', { 
          name: project.name, 
          aspectRatio: `${project.width}:${project.height}` 
        });
      }

      const projectPath = targetProject.path;
      const indexHtml = compileProjectToHTML(project);

      // 2. Map clips to RenderClip format
      const clips = project.tracks.flatMap((track, trackIndex) => 
        track.clips.map(clip => ({
          id: clip.id,
          track_index: trackIndex,
          clip_type: track.type,
          start: clip.start,
          duration: clip.duration,
          content: clip.content
        }))
      );

      // 3. Trigger render
      const result = await invoke<string>('render_project', {
        projectPath,
        indexHtml,
        clips
      });

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
        {/* Render Settings */}
        <div className="w-[300px] border-r border-[#333] flex flex-col bg-[#141414]">
            <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">RENDER SETTINGS</div>
            <div className="flex gap-2 p-2 border-b border-[#333]">
                <div className="flex-1 bg-[#333] text-[10px] p-1 text-center rounded">H.264</div>
                <div className="flex-1 bg-[#222] text-[10px] p-1 text-center rounded">YouTube</div>
                <div className="flex-1 bg-[#222] text-[10px] p-1 text-center rounded">ProRes</div>
            </div>
            <div className="p-4 space-y-4">
                <PropertyRow label="Format" value="MP4" />
                <PropertyRow label="Codec" value="H.264" />
                <PropertyRow label="Resolution" value={`${project.width} x ${project.height}`} />
            </div>
        </div>

        {/* Master Viewer & Mini-Timeline */}
        <div className="flex-1 flex flex-col bg-[#000]">
            <div className="flex-1 flex items-center justify-center relative">
                <div className="aspect-video w-[80%] bg-[#080808] border border-[#222] flex items-center justify-center">
                    {status === 'rendering' && (
                        <div className="text-center">
                            <Loader2 className="animate-spin text-cyan-500 mx-auto mb-4" size={48} />
                            <div className="text-cyan-500 font-mono text-xl">{Math.round(progress)}%</div>
                            <div className="text-[#666] text-xs mt-2 uppercase tracking-widest">Rendering Frame</div>
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="text-center">
                            <CheckCircle2 className="text-green-500 mx-auto mb-4" size={48} />
                            <div className="text-green-500 font-bold">RENDER COMPLETE</div>
                            <div className="text-[#888] text-[10px] mt-2 max-w-[200px] truncate">{outputPath}</div>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="text-center">
                            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
                            <div className="text-red-500 font-bold">RENDER FAILED</div>
                            <div className="text-[#888] text-[10px] mt-2 max-w-[200px]">{error}</div>
                        </div>
                    )}
                    {status === 'idle' && (
                         <div className="text-[#333] text-sm uppercase tracking-widest">Ready to Render</div>
                    )}
                </div>
            </div>
            <div className="h-24 border-t border-[#333] bg-[#141414] p-2">
                <div className="text-[10px] text-[#555] mb-2">RENDER RANGE</div>
                <div className="h-8 bg-[#1a1a1a] rounded relative">
                    <div className="absolute inset-y-0 left-[0%] right-[0%] bg-cyan-900/30 border-x border-cyan-500" />
                </div>
                {status === 'rendering' && (
                    <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-cyan-500 transition-all duration-300" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>

        {/* Render Queue */}
        <div className="w-[300px] border-l border-[#333] flex flex-col bg-[#141414]">
            <div className="p-2 text-xs font-bold border-b border-[#333] bg-[#1a1a1a]">RENDER QUEUE</div>
            <div className="p-4">
                <div className="border border-[#333] rounded p-2 bg-[#1a1a1a]">
                    <div className="text-xs font-bold">Job 1: {project.name}</div>
                    <div className="text-[10px] text-[#888]">MP4 | {project.width}x{project.height} | {project.fps}fps</div>
                    <button 
                        onClick={handleStartRender}
                        disabled={isRendering}
                        className={`mt-2 w-full text-xs py-1 rounded transition-colors ${
                            isRendering 
                                ? 'bg-[#333] text-[#666] cursor-not-allowed' 
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                    >
                        {isRendering ? 'Rendering...' : 'Start Render'}
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}

function PageIcon({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 cursor-pointer group ${active ? 'text-cyan-400' : 'text-[#888] hover:text-white'}`}
    >
      {icon}
      <span className="text-[9px] uppercase font-medium">{label}</span>
      {active && <div className="h-0.5 w-full bg-cyan-400 mt-0.5" />}
    </div>
  );
}

function ViewerControls({ time }: { time: string }) {
  return (
    <div className="h-10 bg-[#181818] border-t border-[#333] flex items-center justify-between px-4">
      <div className="text-[11px] font-mono text-cyan-500">{time}</div>
      <div className="flex gap-4 text-[#aaa]">
        <SkipBack size={14} />
        <Play size={14} fill="currentColor" />
        <SkipForward size={14} />
      </div>
      <div className="text-[11px] font-mono text-[#666]">100%</div>
    </div>
  );
}

function Track({ label, active }: { label: string, active?: boolean }) {
  return (
    <div className={`h-12 border-b border-[#222] flex ${active ? 'bg-[#1a1a1a]' : ''}`}>
      <div className="w-[100px] border-r border-[#333] flex items-center justify-between px-2 bg-[#181818]">
        <span className="text-[10px] font-bold text-[#666]">{label}</span>
        <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-green-900" />
            <div className="w-2 h-2 rounded-full bg-blue-900" />
        </div>
      </div>
      <div className="flex-1 relative">
        {active && <div className="absolute top-2 left-20 h-8 w-40 bg-cyan-700/50 border border-cyan-400 rounded flex items-center px-2 text-[9px]">Prototype_Clip_01</div>}
      </div>
    </div>
  );
}

function PropertyRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[#888]">{label}</span>
      <span className="bg-[#000] px-2 py-0.5 rounded border border-[#333] min-w-[60px] text-right font-mono text-cyan-500">
        {value}
      </span>
    </div>
  );
}
