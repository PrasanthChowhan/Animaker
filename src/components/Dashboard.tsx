import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Plus, 
  Film, 
  Clock, 
  ChevronRight, 
  X,
  Monitor,
  Smartphone,
  Loader2
} from 'lucide-react';
import { AnimakerProject } from '../types/project';

interface ProjectMetadata {
  name: string;
  aspect_ratio: string;
  created_at: number;
  path?: string;
}

interface DashboardProps {
  onProjectSelect: (project: AnimakerProject) => void;
}

export default function Dashboard({ onProjectSelect }: DashboardProps) {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAspectRatio, setNewAspectRatio] = useState('16:9');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<ProjectMetadata[]>('list_projects');
      setProjects(result);
    } catch (err) {
      console.error('Failed to list projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newName.trim()) return;

    try {
      const result = await invoke<ProjectMetadata>('create_project', {
        name: newName,
        aspectRatio: newAspectRatio
      });

      // Map basic project metadata to full AnimakerProject
      const [width, height] = newAspectRatio.split(':').map(Number);
      const fullProject: AnimakerProject = {
        id: result.name, // Use name as ID for now
        name: result.name,
        width: width === 16 ? 1920 : 1080,
        height: height === 9 ? 1080 : 1920,
        fps: 30,
        duration: 5,
        tracks: [
          { id: 'v1', name: 'V1', type: 'animation', clips: [] }
        ]
      };

      onProjectSelect(fullProject);
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleOpenProject = (p: ProjectMetadata) => {
    const [widthStr, heightStr] = p.aspect_ratio.split(':');
    const width = Number(widthStr);
    const height = Number(heightStr);

    const fullProject: AnimakerProject = {
      id: p.name,
      name: p.name,
      width: width === 16 ? 1920 : 1080,
      height: height === 9 ? 1080 : 1920,
      fps: 30,
      duration: 5,
      tracks: [
        { id: 'v1', name: 'V1', type: 'animation', clips: [] }
      ]
    };
    onProjectSelect(fullProject);
  };

  return (
    <div className="flex flex-col h-screen bg-[#111] text-[#e0e0e0] font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-[#333] flex items-center justify-between px-8 bg-[#181818]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center">
            <Film size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Animaker <span className="text-cyan-500 text-sm font-normal ml-2">Project Manager</span></h1>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <Plus size={18} /> New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-[#666]">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#666] border-2 border-dashed border-[#333] rounded-xl">
            <Film size={64} className="mb-4 opacity-20" />
            <p className="text-lg">No projects yet</p>
            <button 
              onClick={() => setShowNewModal(true)}
              className="mt-4 text-cyan-500 hover:underline"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((p) => (
              <ProjectCard 
                key={p.name} 
                project={p} 
                onClick={() => handleOpenProject(p)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#181818] border border-[#333] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#222]">
              <h2 className="font-bold">Create New Project</h2>
              <button onClick={() => setShowNewModal(false)} className="text-[#888] hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#888]">Project Name</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Awesome Video"
                  className="w-full bg-[#000] border border-[#333] rounded px-3 py-2 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-[#888]">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-4">
                  <AspectRatioOption 
                    active={newAspectRatio === '16:9'} 
                    onClick={() => setNewAspectRatio('16:9')}
                    icon={<Monitor size={24} />}
                    label="Widescreen"
                    ratio="16:9"
                  />
                  <AspectRatioOption 
                    active={newAspectRatio === '9:16'} 
                    onClick={() => setNewAspectRatio('9:16')}
                    icon={<Smartphone size={24} />}
                    label="Vertical"
                    ratio="9:16"
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateProject}
                disabled={!newName.trim()}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#333] disabled:text-[#666] text-white py-3 rounded-lg font-bold transition-colors mt-4"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: ProjectMetadata, onClick: () => void }) {
  const dateStr = new Date(project.created_at).toLocaleDateString();
  const isVertical = project.aspect_ratio === '9:16';

  return (
    <div 
      onClick={onClick}
      className="group bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden hover:border-cyan-500/50 hover:bg-[#222] transition-all cursor-pointer shadow-lg"
    >
      <div className="aspect-video bg-[#000] flex items-center justify-center relative border-b border-[#333]">
         <div className={`border-2 border-[#333] group-hover:border-cyan-500/30 transition-colors rounded ${isVertical ? 'w-12 h-20' : 'w-24 h-14'}`} />
         <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors" />
         <div className="absolute top-2 right-2 bg-black/50 text-[10px] px-1.5 py-0.5 rounded border border-white/10">
            {project.aspect_ratio}
         </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold truncate text-sm">{project.name}</h3>
          <ChevronRight size={16} className="text-[#444] group-hover:text-cyan-500 transition-colors" />
        </div>
        <div className="flex items-center gap-4 text-[#666] text-[11px]">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            {dateStr}
          </div>
        </div>
      </div>
    </div>
  );
}

function AspectRatioOption({ active, onClick, icon, label, ratio }: { active: boolean, onClick: () => void, icon: any, label: string, ratio: string }) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 border-2 rounded-lg cursor-pointer transition-all flex flex-col items-center gap-2 ${
        active 
          ? 'border-cyan-600 bg-cyan-950/20 text-cyan-400' 
          : 'border-[#333] bg-[#000] text-[#666] hover:border-[#444]'
      }`}
    >
      {icon}
      <div className="text-center">
        <div className="text-xs font-bold">{label}</div>
        <div className="text-[10px] opacity-60">{ratio}</div>
      </div>
    </div>
  );
}
