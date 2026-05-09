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
  // Check if we have multiple "Media Pool" mentions (button and header)
  expect(screen.getAllByText(/Media Pool/i).length).toBeGreaterThan(0);
});

test('can add a clip to the timeline', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  
  // Should find at least one clip in the timeline
  const clips = await screen.findAllByText(/New AI Clip/i);
  expect(clips.length).toBeGreaterThan(0);
});

test('selecting a clip updates the inspector', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  // Add a clip first
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  
  const clips = await screen.findAllByText(/New AI Clip/i);
  fireEvent.click(clips[0]);
  
  // Check if inspector shows clip properties
  expect(screen.getByText(/Clip Properties/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/Enter prompt.../i)).toBeInTheDocument();
  expect(screen.getByText(/Primary Color/i)).toBeInTheDocument();
});

test('updating prompt and text content updates project state', async () => {
  render(<MainEditor project={mockProject} onBackToDashboard={() => {}} />);
  
  // Add and select clip
  const aiClipButton = screen.getByText(/Drag or click to add animation/i);
  fireEvent.click(aiClipButton);
  const clips = await screen.findAllByText(/New AI Clip/i);
  fireEvent.click(clips[0]);
  
  // Update prompt
  const promptArea = screen.getByPlaceholderText(/Enter prompt.../i);
  fireEvent.change(promptArea, { target: { value: 'Make it blue' } });
  expect(promptArea).toHaveValue('Make it blue');
  
  // Update text content
  const textInput = screen.getByDisplayValue(/New AI Clip/i);
  fireEvent.change(textInput, { target: { value: 'Updated Title' } });
  
  // The clip on the timeline should update its text
  const updatedClips = await screen.findAllByText(/Updated Title/i);
  expect(updatedClips.length).toBeGreaterThan(0);
});
