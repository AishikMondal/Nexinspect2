export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timeStamp: number;
}

export interface AIInsight {
  summary: string;
  criticalIssues: string[];
  recommendations: string[];
  timeStamp: number;
}

export interface AIState {
  isAvailable: boolean;
  status: "checking" | "available" | "unavailable";
  modelName: string;
  error?: string;
}
