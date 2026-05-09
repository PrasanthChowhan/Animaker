export interface AnimakerProject {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number; // in seconds
  tracks: Track[];
}

export interface Track {
  id: string;
  name: string;
  type: 'media' | 'animation';
  clips: Clip[];
}

export interface Clip {
  id: string;
  type: 'media' | 'smart';
  start: number; // start time in timeline
  duration: number;
  content: string; // text or file path
  metadata: {
    animation?: {
      generatedHtml?: string;
      generatedCss?: string;
      generatedJs?: string;
    };
  };
}
