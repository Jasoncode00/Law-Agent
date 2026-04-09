'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, PersonaId, Message } from '@/lib/types';

const STORAGE_KEY = 'skep-law-chat-sessions';

function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function generateId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 첫 번째 사용자 메시지에서 제목 자동 생성 (최대 30자) */
function generateTitle(entries: Message[]): string {
  const first = entries.find((e) => e.role === 'user');
  if (!first) return '새 대화';
  const text = first.content.trim();
  return text.length > 30 ? text.slice(0, 30) + '…' : text;
}

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  // 초기 로드
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // sessions 변경 시 자동 저장
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  /** 새 대화 생성 → sessionId 반환 */
  const createSession = useCallback((persona: PersonaId): string => {
    const id = generateId();
    const session: ChatSession = {
      id,
      persona,
      title: '새 대화',
      entries: [],
      bookmarked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => {
      const next = [session, ...prev];
      saveSessions(next);
      return next;
    });
    return id;
  }, []);

  /** 대화 내역 업데이트 (entries 변경 시) */
  const updateSession = useCallback((sessionId: string, entries: Message[]) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId
          ? { ...s, entries, title: generateTitle(entries), updatedAt: Date.now() }
          : s
      );
      saveSessions(next);
      return next;
    });
  }, []);

  /** 대화 삭제 */
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      saveSessions(next);
      return next;
    });
  }, []);

  /** 북마크 토글 */
  const toggleBookmark = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, bookmarked: !s.bookmarked } : s
      );
      saveSessions(next);
      return next;
    });
  }, []);

  /** 특정 세션 가져오기 */
  const getSession = useCallback(
    (sessionId: string): ChatSession | undefined => {
      return sessions.find((s) => s.id === sessionId);
    },
    [sessions]
  );

  /** 세션 페르소나 변경 */
  const updateSessionPersona = useCallback((sessionId: string, persona: PersonaId) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessionId ? { ...s, persona } : s
      );
      saveSessions(next);
      return next;
    });
  }, []);

  /** 전체 대화 삭제 */
  const clearAll = useCallback(() => {
    setSessions([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    sessions,
    createSession,
    updateSession,
    updateSessionPersona,
    deleteSession,
    toggleBookmark,
    getSession,
    clearAll,
  };
}
