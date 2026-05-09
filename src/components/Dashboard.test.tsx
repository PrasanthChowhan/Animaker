import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import Dashboard from './Dashboard';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

test('renders dashboard with title', () => {
  render(<Dashboard onProjectSelect={() => {}} />);
  const titleElement = screen.getByText(/Project Manager/i);
  expect(titleElement).toBeInTheDocument();
});

test('shows "No projects yet" when empty', async () => {
  const { invoke } = await import('@tauri-apps/api/core');
  (invoke as any).mockResolvedValue([]);

  render(<Dashboard onProjectSelect={() => {}} />);
  
  const emptyText = await screen.findByText(/No projects yet/i);
  expect(emptyText).toBeInTheDocument();
});
