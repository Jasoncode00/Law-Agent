'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { streamChat, ChatMessage } from '@/lib/api';
import { PersonaId, Message, ToolEvent, ToolResultEvent } from '@/lib/types';

export interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolEvent[];
  toolResults?: ToolResultEvent[];
  isStreaming?: boolean;
  hasError?: boolean;
}

interface UseChatOptions {
  /** 세션 변경 시 entries를 외부에 알리는 콜백 */
  onEntriesChange?: (entries: ChatEntry[]) => void;
}

export function useChat(persona: PersonaId, options?: UseChatOptions) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const personaRef = useRef(persona);
  personaRef.current = persona;

  // sendMessage 클로저가 stale entries/isLoading을 참조하지 않도록 ref로 최신 값 유지
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  // entries 변경 시 외부 콜백 호출 (세션 저장용)
  const onEntriesChangeRef = useRef(options?.onEntriesChange);
  onEntriesChangeRef.current = options?.onEntriesChange;

  // loadEntries 중에는 onEntriesChange 콜백 억제 (updatedAt 갱신 방지)
  const suppressCallbackRef = useRef(false);

  useEffect(() => {
    if (suppressCallbackRef.current) return;
    if (entries.length > 0 && !entries.some((e) => e.isStreaming)) {
      onEntriesChangeRef.current?.(entries);
    }
  }, [entries]);

  const sendMessage = useCallback((message: string) => {
    if (!message.trim() || isLoadingRef.current) return;

    const history: ChatMessage[] = entriesRef.current.map((e) => ({
      role: e.role,
      content: e.content,
    }));

    setEntries((prev) => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);

    setEntries((prev) => [
      ...prev,
      { role: 'assistant', content: '', toolCalls: [], toolResults: [], isStreaming: true },
    ]);

    abortRef.current = streamChat(personaRef.current, message, history, {
      onContent: (delta) => {
        setEntries((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + delta };
          }
          return next;
        });
      },
      onToolCall: (name) => {
        setEntries((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            const existing = last.toolCalls ?? [];
            if (!existing.find((t) => t.name === name)) {
              next[next.length - 1] = { ...last, toolCalls: [...existing, { name }] };
            }
          }
          return next;
        });
      },
      onToolResult: (name, result) => {
        setEntries((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            const existing = last.toolResults ?? [];
            next[next.length - 1] = {
              ...last,
              toolResults: [...existing, { name, result }],
            };
          }
          return next;
        });
      },
      onError: (msg) => {
        setEntries((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              isStreaming: false,
              hasError: true,
              content: last.content || '오류가 발생했습니다: ' + msg,
            };
          }
          return next;
        });
        setIsLoading(false);
      },
      onDone: () => {
        setEntries((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, isStreaming: false };
          }
          return next;
        });
        setIsLoading(false);
      },
    });
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setEntries((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.isStreaming) {
        next[next.length - 1] = { ...last, isStreaming: false };
      }
      return next;
    });
  }, []);

  const clearChat = useCallback(() => {
    setEntries([]);
    setIsLoading(false);
  }, []);

  /** 이전 세션 entries를 로드 — onEntriesChange 억제 */
  const loadEntries = useCallback((saved: ChatEntry[]) => {
    suppressCallbackRef.current = true;
    setEntries(saved);
    setIsLoading(false);
    // 다음 렌더 사이클 이후 억제 해제
    requestAnimationFrame(() => {
      suppressCallbackRef.current = false;
    });
  }, []);

  return { entries, isLoading, sendMessage, stopStreaming, clearChat, loadEntries };
}
