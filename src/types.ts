export interface Project {
  id: string;
  name: string;
  createdAt: number;
  mode: "auto" | "manual";
  status: "draft" | "stage1" | "stage2" | "stage3" | "completed";
}

export interface InputTranscript {
  projectId: string;
  source: "paste" | "youtube";
  originalText: string;
  youtubeUrl?: string;
}

export interface Act {
  id: string;
  projectId: string;
  actNumber: number;
  rawText: string;
  narrativeText?: string;
}

export interface PromptSentence {
  id: string;
  actId: string;
  projectId: string;
  sequenceNumber: number;
  originalSentence: string;
  englishPrompt: string;
  customDuration?: number;
}

export interface ActAudio {
  id: string;
  projectId: string;
  actId: string;
  actNumber: number;
  audioBlob: Blob;
  duration: number;
  fileName: string;
  updatedAt: number;
}

export interface PromptImage {
  id: string;
  projectId: string;
  actId: string;
  promptId: string;
  sequenceNumber: number;
  imageBlob: Blob;
  fileName: string;
  updatedAt: number;
}

export interface VideoSyncConfig {
  projectId: string;
  subtitlesEnabled: boolean;
  subtitleStyle: "bottom" | "center" | "minimal";
  aspectRatio: "16:9" | "9:16" | "1:1";
  transitions: "none" | "fade" | "slide";
  updatedAt: number;
}

export interface InstructionTemplate {
  id: "stage1" | "stage2" | "stage3";
  content: string;
  isDefault: boolean;
}
