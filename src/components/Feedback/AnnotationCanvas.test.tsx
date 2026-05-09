import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnnotationCanvas } from './AnnotationCanvas';

// Mocking some canvas methods that might be used
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  closePath: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  rect: vi.fn(),
  fillText: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
}) as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock');

// Mock Image
global.Image = class {
  onload: () => void = () => {};
  src: string = '';
  width: number = 100;
  height: number = 100;
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
} as any;

describe('AnnotationCanvas', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  const imageSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('allows selecting the rectangle tool', async () => {
    render(<AnnotationCanvas imageSrc={imageSrc} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);
    
    // Find the rectangle tool button
    const rectButton = await screen.findByRole('button', { name: /square/i });
    expect(rectButton).toBeInTheDocument();
    
    fireEvent.click(rectButton);
    
    // Verify tool change (visually via class change)
    expect(rectButton).toHaveClass('bg-terracotta');
  });

  it('calls canvas rect and stroke when drawing with rectangle tool', async () => {
    const { container } = render(<AnnotationCanvas imageSrc={imageSrc} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);
    
    // Select rect tool
    const rectButton = await screen.findByRole('button', { name: /square/i });
    fireEvent.click(rectButton);
    
    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    const ctx = canvas.getContext('2d')!;

    // Wait for image to load and history to be initialized
    await new Promise(resolve => setTimeout(resolve, 10));

    // Simulate drawing
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(canvas);

    expect(ctx.rect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('allows selecting the text tool and prompts for input', async () => {
    const { container } = render(<AnnotationCanvas imageSrc={imageSrc} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);
    
    // Select text tool
    const textButton = await screen.findByRole('button', { name: /text tool/i });
    fireEvent.click(textButton);
    expect(textButton).toHaveClass('bg-terracotta');

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    const ctx = canvas.getContext('2d')!;

    // Mock prompt
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Hello World');

    // Wait for async init
    await new Promise(resolve => setTimeout(resolve, 10));

    // Click to add text
    fireEvent.mouseDown(canvas, { clientX: 20, clientY: 20 });
    
    expect(promptSpy).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('Hello World', expect.any(Number), expect.any(Number));
  });
});
