export type MessageRole = "user" | "assistant" | "system";

export interface ProgressStep {
  id: string;
  text: string;
  status: "pending" | "running" | "done" | "error";
  timestamp: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  dataPreview?: DataPreview;
  progressSteps?: ProgressStep[];
}

export interface DataPreview {
  type: "csv" | "geojson" | "table";
  headers: string[];
  rows: string[][];
  summary: string;
  filename: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: string;
}

// SSE event types from the API
export type SSEEvent =
  | { type: "progress"; step: string; status: "running" | "done" | "error" }
  | { type: "result"; content: string; data?: ApiResponseData }
  | { type: "error"; message: string }
  | { type: "done" };

export interface ApiResponseData {
  species: string;
  totalRecords: number;
  cleanedRecords: number;
  csv: string;
  preview: Record<string, unknown>[];
  fullRecords: Record<string, unknown>[];
}
