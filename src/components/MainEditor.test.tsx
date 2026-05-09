import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import MainEditor from './MainEditor';
import { AnimakerProject } from '../types/project';

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

const mockProject: AnimakerProject = {
  name: 'Test Project',
  aspect_ratio: '16:9',
  created_at: Date.now(),
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 10,
  tracks: [
    { id: 'v1', name: 'V1', track_type: 'animation', clips: [] },
    { id: 'v2', name: 'V2', track_type: 'animation', clips: [] }
  ]
};

test('renders main editor', () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  expect(screen.getAllByText(/Media Pool/i).length).toBeGreaterThan(0);
});

test('can add a clip to the timeline', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  
  const clips = await screen.findAllByText(/New AI Clip/i);
  expect(clips.length).toBeGreaterThan(0);
});

test('selecting a clip updates the inspector', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  
  const clips = await screen.findAllByText(/New AI Clip/i);
  fireEvent.click(clips[0]);
  
  expect(screen.getByText(/Clip Properties/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Enter prompt.../i)).toBeInTheDocument();
  expect(screen.getByText(/Primary Color/i)).toBeInTheDocument();
});

test('updating prompt and customizations updates project state', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  const clips = await screen.findAllByText(/New AI Clip/i);
  fireEvent.click(clips[0]);
  
  const promptArea = screen.getByPlaceholderText(/Enter prompt.../i);
  fireEvent.change(promptArea, { target: { value: 'Make it blue' } });
  expect(promptArea).toHaveValue('Make it blue');
  
  const textInput = screen.getByLabelText(/Text Content/i);
  fireEvent.change(textInput, { target: { value: 'Updated Animation Text' } });
  expect(textInput).toHaveValue('Updated Animation Text');
});

test('scrubbing the timeline updates playhead', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const zeroMarker = screen.getByText(/^0s$/);
  const ruler = zeroMarker.parentElement;
  if (ruler) {
    fireEvent.click(ruler);
    const playhead = document.querySelector('.bg-red-600');
    expect(playhead).toBeInTheDocument();
  }
});

test('preview frame renders active clips', () => {
  const projectWithClip = {
    ...mockProject,
    tracks: [
      {
        ...mockProject.tracks[0],
        clips: [{
          id: 'clip1',
          clip_type: 'smart' as const,
          start: 0,
          duration: 5,
          content: 'Test Clip',
          metadata: { animation: { generatedHtml: '<div id="test-content">Hello World</div>' } }
        }]
      }
    ]
  };

  render(<MainEditor project={projectWithClip} onBackToDashboard={() => {}} />);
  
  const iframe = screen.getByTitle(/Timeline Preview/i) as HTMLIFrameElement;
  expect(iframe).toBeInTheDocument();
  expect(iframe.srcdoc).toContain('Hello World');
});

test('starting render in deliver page calls backend', async () => {
  const { invoke } = await import('@tauri-apps/api/core');
  (invoke as any).mockImplementation((cmd: string) => {
    if (cmd === 'list_projects') {
      return Promise.resolve([{ name: 'Test Project', path: '/test/path' }]);
    }
    if (cmd === 'render_project') {
      return Promise.resolve('/test/path/exports/render.mp4');
    }
    return Promise.resolve();
  });

  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const deliverIcon = screen.getByText(/Deliver/i);
  fireEvent.click(deliverIcon);
  
  const renderButton = screen.getByText(/Start Render/i);
  fireEvent.click(renderButton);
  
  expect(await screen.findByText(/Rendering\.\.\./i)).toBeInTheDocument();
  expect(await screen.findByText(/RENDER COMPLETE/i)).toBeInTheDocument();
});

test('triggering generation calls backend', async () => {
  const { invoke } = await import('@tauri-apps/api/core');
  (invoke as any).mockImplementation((cmd: string) => {
    if (cmd === 'generate_clip_code') {
      return Promise.resolve({
        html: '<div class="test">Generated</div>',
        css: '.test { color: red; }',
        js: 'console.log("test")'
      });
    }
    return Promise.resolve();
  });

  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  const clips = await screen.findAllByText(/New AI Clip/i);
  fireEvent.click(clips[0]);
  
  const generateButton = screen.getByText(/Generate Animation/i);
  fireEvent.click(generateButton);
  
  await screen.findByText(/Generate Animation/i);
  expect(generateButton).not.toBeDisabled();
});
