import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackButton } from './FeedbackButton';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path) => `asset://${path}`),
}));

describe('FeedbackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock import.meta.env.DEV
    vi.stubGlobal('import.meta', { env: { DEV: true } });
  });

  it('submits feedback with title and description', async () => {
    (invoke as any).mockResolvedValue('https://github.com/issue/1');

    render(<FeedbackButton />);
    
    // Open modal
    fireEvent.click(screen.getByTitle(/send feedback/i));
    
    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/brief summary/i), { target: { value: 'Bug report' } });
    fireEvent.change(screen.getByPlaceholderText(/details about your feedback/i), { target: { value: 'Something is broken' } });
    
    // Select label
    fireEvent.click(screen.getByText(/Bug/i));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('submit_feedback', {
        payload: expect.objectContaining({
          title: 'Bug report',
          description: 'Something is broken',
          labels: ['bug'],
        })
      });
    });
    
    expect(screen.getByText(/feedback submitted/i)).toBeInTheDocument();
  });

  it('shows error message on submission failure', async () => {
    (invoke as any).mockRejectedValue('GitHub API error: 401 Unauthorized');

    render(<FeedbackButton />);
    
    // Open modal
    fireEvent.click(screen.getByTitle(/send feedback/i));
    
    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/brief summary/i), { target: { value: 'Bug report' } });
    fireEvent.change(screen.getByPlaceholderText(/details about your feedback/i), { target: { value: 'Something is broken' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/GitHub API error: 401 Unauthorized/i)).toBeInTheDocument();
    });
    
    expect(screen.queryByText(/feedback submitted/i)).not.toBeInTheDocument();
  });
});
