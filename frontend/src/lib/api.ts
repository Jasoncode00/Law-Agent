import { Persona, PersonaId, SSEEventType, SSEPayload } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ArticleResult {
  lawName: string;
  articleId: string;
  content: string;
}

/** 법령명 + 조문번호로 MCP를 통해 원문을 직접 조회 */
export async function fetchArticle(lawName: string, articleId: string): Promise<ArticleResult> {
  const params = new URLSearchParams({ law: lawName, article: articleId });
  const res = await fetch(`${API_BASE}/api/article?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || '법령 조회 실패');
  }
  return res.json();
}

export async function fetchPersonas(): Promise<Persona[]> {
  const res = await fetch(`${API_BASE}/api/personas/`);
  if (!res.ok) throw new Error('페르소나 목록을 불러오지 못했습니다.');
  return res.json();
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function streamChat(
  persona: PersonaId,
  message: string,
  history: ChatMessage[],
  handlers: {
    onContent: (delta: string) => void;
    onToolCall: (name: string) => void;
    onToolResult: (name: string, result: string) => void;
    onError: (message: string) => void;
    onDone: () => void;
  }
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona, message, history }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
    if (!res.body) throw new Error('응답 스트림이 없습니다.');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: SSEEventType | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: event:')) {
          currentEvent = trimmed.replace('data: event:', '').trim() as SSEEventType;
        } else if (trimmed.startsWith('data: data:')) {
          try {
            const payload: SSEPayload = JSON.parse(trimmed.slice(11).trim());
            if (currentEvent === 'content' && payload.delta) {
              handlers.onContent(payload.delta);
            } else if (currentEvent === 'tool_call' && payload.name) {
              handlers.onToolCall(payload.name);
            } else if (currentEvent === 'tool_result' && payload.name) {
              handlers.onToolResult(payload.name, payload.result ?? '');
            } else if (currentEvent === 'error' && payload.message) {
              handlers.onError(payload.message);
            } else if (currentEvent === 'done') {
              handlers.onDone();
            }
          } catch {
            // JSON 파싱 실패 시 무시
          }
        }
      }
    }
    handlers.onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      handlers.onError(err.message);
    }
  });

  return controller;
}
