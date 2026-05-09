export interface AnimakerProject {
  name: string;
  aspect_ratio: string;
  created_at: number;
  path?: string;
  width: number;
  height: number;
  fps: number;
  duration: number; // in seconds
  tracks: Track[];
}

export interface Track {
  id: string;
  name: string;
  track_type: 'media' | 'animation';
  clips: Clip[];
}

export interface Clip {
  id: string;
  clip_type: 'media' | 'smart';
  start: number; // start time in timeline
  duration: number;
  content: string; // text or file path
  metadata: {
    animation?: {
      prompt?: string;
      presetId?: string;
      customizations?: {
        text?: string;
        color?: string;
      };
      generatedHtml?: string;
      generatedCss?: string;
      generatedJs?: string;
    };
  };
}
