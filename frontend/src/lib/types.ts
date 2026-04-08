export type PersonaId = 'general' | 'dev-sales' | 'design-permit' | 'construction-safety' | 'contract-cost' | 'quality-mgmt';

export interface Persona {
  id: PersonaId;
  name: string;
  description: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolEvent[];
  toolResults?: ToolResultEvent[];
}

export interface ToolEvent {
  name: string;
}

export interface ToolResultEvent {
  name: string;
  result: string;
}

export interface LawArticle {
  id: string;      // "제50조"
  title: string;   // "건축물의 높이 제한"
  content: string; // 조문 본문
}

export interface LawSource {
  id: string;        // 고유 ID
  toolName: string;  // MCP 도구명 e.g. "get_law_text"
  lawName: string;   // "건축법"
  articles: LawArticle[];
  raw: string;       // 원본 JSON 문자열
}

export interface ChatSession {
  id: string;
  persona: PersonaId;
  title: string;
  entries: Message[];
  bookmarked: boolean;
  createdAt: number;   // Date.now()
  updatedAt: number;
}

export type SSEEventType = 'tool_call' | 'tool_result' | 'content' | 'error' | 'done';

export interface SSEPayload {
  delta?: string;
  message?: string;
  name?: string;
  result?: string;
  type?: string;
}
