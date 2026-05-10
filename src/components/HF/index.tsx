import React, { useEffect, useState, useMemo } from 'react';
import { 
  Player as HFPlayer, 
  PlayerControls as HFPlayerControls, 
  Timeline as HFTimeline 
} from '@hyperframes/studio';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { compileProjectToHTML } from '../../lib/compiler';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Adapter for the HyperFrames Timeline.
 * Protects our app from changes in the @hyperframes/studio API.
 */
export const TimelineAdapter = (props: any) => {
  return (
    <div className="h-full w-full bg-[#111] overflow-hidden">
      <HFTimeline {...props} />
    </div>
  );
};

/**
 * Adapter for the HyperFrames Player.
 * Compiles the project to HTML and provides it via a Blob URL.
 */
export const PlayerAdapter = ({ project, ...props }: any) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      const html = compileProjectToHTML(project);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [project]);

  return (
    <div className={cn("aspect-video bg-black relative border border-[#333]", props.className)}>
      {blobUrl && (
        <HFPlayer 
          onLoad={() => {}} 
          {...props} 
          src={blobUrl} 
        />
      )}
    </div>
  );
};

/**
 * Adapter for the HyperFrames Player Controls.
 */
export const PlayerControlsAdapter = (props: any) => {
  return (
    <div className="bg-[#181818] border-t border-[#333] px-4 py-2">
      <HFPlayerControls {...props} />
    </div>
  );
};

/**
 * Semantic helper for timed elements.
 * Maps to the data-attributes expected by the HyperFrames engine.
 */
export const Timed = ({ 
  start, 
  duration, 
  children, 
  id,
  track,
  className 
}: { 
  start: number; 
  duration: number; 
  children: React.ReactNode;
  id?: string;
  track?: number;
  className?: string;
}) => (
  <div 
    id={id}
    data-start={start} 
    data-end={start + duration}
    data-duration={duration} 
    data-layer={track}
    className={cn("hf-timed-element", className)}
  >
    {children}
  </div>
);

/**
 * Semantic helper for sections.
 */
export const Section = ({ 
  name, 
  children, 
  className 
}: { 
  name: string; 
  children: React.ReactNode;
  className?: string;
}) => (
  <section 
    data-section-name={name}
    className={cn("hf-section", className)}
  >
    {children}
  </section>
);
