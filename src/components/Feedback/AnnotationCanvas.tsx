import React, { useRef, useEffect, useState } from 'react';
import { Check, X, Undo, Type, Square, Pencil, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AnnotationCanvasProps {
  imageSrc: string; // Base64 or Object URL
  onConfirm: (finalImageBase64: string) => void;
  onCancel: () => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'pen' | 'rect' | 'text'>('pen');
  const [history, setHistory] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;

    img.onload = () => {
      // Set canvas internal dimensions to match the actual image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0);
      
      // Setup drawing context
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 4;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#ef4444';
      contextRef.current = ctx;
      
      try {
        setHistory([canvas.toDataURL()]);
      } catch (e) {
        console.error("Failed to save initial history state:", e);
      }
      setIsLoaded(true);
    };

    img.onerror = (e) => {
      console.error("Failed to load screenshot image in annotator:", e);
      alert("Failed to load screenshot for annotation.");
      onCancel();
    };
  }, [imageSrc, onCancel]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    if (!ctx || !canvas || !isLoaded) return;

    if (tool === 'text') {
      const text = window.prompt('Enter annotation text:');
      if (text) {
        ctx.fillText(text, offsetX, offsetY);
        setHistory(prev => [...prev, canvas.toDataURL()]);
      }
      return;
    }

    // Capture the state BEFORE drawing this stroke
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    
    setStartPos({ x: offsetX, y: offsetY });
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || !snapshot) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = contextRef.current;
    
    if (tool === 'pen') {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === 'rect') {
      // Synchronously restore the state and draw the new rectangle
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.rect(startPos.x, startPos.y, offsetX - startPos.x, offsetY - startPos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current || !contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
    setSnapshot(null);
    
    try {
      setHistory(prev => [...prev, canvasRef.current!.toDataURL()]);
    } catch (e) {
      console.error("Failed to save history state:", e);
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        offsetX: (e.touches[0].clientX - rect.left) * scaleX,
        offsetY: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        offsetX: (e.nativeEvent.clientX - rect.left) * scaleX,
        offsetY: (e.nativeEvent.clientY - rect.top) * scaleY
      };
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const lastState = newHistory[newHistory.length - 1];
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && lastState) {
      const img = new Image();
      img.src = lastState;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setHistory(newHistory);
      };
    }
  };

  const handleConfirm = () => {
    if (canvasRef.current && isLoaded) {
      onConfirm(canvasRef.current.toDataURL('image/png'));
    }
  };

  return (
    <div className="fixed inset-0 bg-near-black/90 z-[100] flex flex-col items-center p-4">
      {/* Toolbar */}
      <div className="bg-white rounded-full p-2 mb-4 flex items-center gap-4 shadow-whisper animate-in slide-in-from-top duration-300">
        <button 
          onClick={() => setTool('pen')}
          aria-label="Pen Tool"
          className={cn("p-2 rounded-full transition-colors", tool === 'pen' ? "bg-terracotta text-white" : "hover:bg-parchment text-olive-gray")}
        >
          <Pencil className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setTool('rect')}
          aria-label="Square Tool"
          className={cn("p-2 rounded-full transition-colors", tool === 'rect' ? "bg-terracotta text-white" : "hover:bg-parchment text-olive-gray")}
        >
          <Square className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setTool('text')}
          aria-label="Text Tool"
          className={cn("p-2 rounded-full transition-colors", tool === 'text' ? "bg-terracotta text-white" : "hover:bg-parchment text-olive-gray")}
        >
          <Type className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-border-cream" />
        <button 
          onClick={handleUndo}
          disabled={history.length <= 1}
          aria-label="Undo"
          className="p-2 rounded-full hover:bg-parchment text-olive-gray disabled:opacity-30"
        >
          <Undo className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-border-cream" />
        <button 
          onClick={onCancel}
          aria-label="Cancel"
          className="p-2 rounded-full hover:bg-red-100 text-red-600"
        >
          <X className="w-5 h-5" />
        </button>
        <button 
          onClick={handleConfirm}
          aria-label="Confirm"
          className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
        >
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 w-full flex items-center justify-center overflow-auto bg-near-black/50 rounded-lg">
        {!isLoaded && (
          <div className="flex flex-col items-center gap-2 text-white/60">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm font-medium">Loading screenshot...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ display: isLoaded ? 'block' : 'none' }}
          className="bg-white shadow-2xl max-w-full cursor-crosshair rounded-sm"
        />
      </div>
      
      <p className="text-white/60 text-xs mt-4">Draw anywhere to highlight issues. Click checkmark when done.</p>
    </div>
  );
};
