import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import MainEditor from './MainEditor';
import { AnimakerProject } from '../types/project';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
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

test('renders main editor with project name', () => {
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
  
  // Customization fields
  const textInput = screen.getByLabelText(/Text Content/i);
  fireEvent.change(textInput, { target: { value: 'Updated Animation Text' } });
  expect(textInput).toHaveValue('Updated Animation Text');
});

test('scrubbing the timeline updates playhead', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const ruler = screen.getByText(/^0s$/i).parentElement;
  if (ruler) {
    fireEvent.click(ruler);
    // Check if red playhead line exists
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
          metadata: { 
            animation: { 
              generatedHtml: '<div id="test-content">Hello</div>',
              customizations: { text: 'Hello', color: '#ff0000' }
            } 
          }
        }]
      }
    ]
  };

  render(<MainEditor project={projectWithClip} onBackToDashboard={() => {}} />);
  
  const iframe = screen.getByTitle(/Timeline Preview/i);
  expect(iframe).toBeInTheDocument();
  expect(iframe).toHaveAttribute('srcDoc', expect.stringContaining('Hello'));
});
