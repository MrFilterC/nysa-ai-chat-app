export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  currentCredits?: number;
  notEnoughCredits?: boolean;
  creditError?: string;
}

export interface ChatContextType {
  chatState: ChatState;
  sendMessage: (content: string, timestamp?: string) => Promise<void>;
  createNewChat: () => void;
  selectChat: (sessionId: string) => void;
  deleteChat: (sessionId: string) => void;
  clearCurrentChat: () => void;
} 