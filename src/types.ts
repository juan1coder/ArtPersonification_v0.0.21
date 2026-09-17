export interface Persona {
  id: string;
  name: string;
  description: string;
  rawContent: string;
  isJson: boolean;
  minifiedContent?: string;
  estimatedTokens: number;
}

export interface StyleTag {
  id: string;
  name: string;
  description: string;
  category: "lighting" | "camera" | "texture" | "aesthetic" | "retro";
}

export interface OllamaModelSpec {
  name: string;
  parameterSize: string; // e.g. "27B", "12B", "14B"
  diskSize: string; // e.g. "17 GB"
  defaultCtxRecommended: number;
  vramRequirementGB: number;
  supportsThinking: boolean;
}

export interface VramCalculation {
  modelWeightsVramGB: number;
  kvCacheVramGB: number;
  totalEstimatedVramGB: number;
  headroomGB: number;
  status: "safe" | "caution" | "oom_risk";
  explanation: string;
}

export interface PromptLogEntry {
  id: string;
  timestamp: string;
  model: string;
  persona: string;
  styles: string[];
  rawPrompt: string;
  generatedOutput: string;
  thinkingOutput?: string;
  status: "success" | "length_limit" | "oom" | "error";
  tokensUsed?: number;
}
