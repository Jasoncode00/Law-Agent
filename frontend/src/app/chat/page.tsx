'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { PersonaId, LawSource, Message } from '@/lib/types';
import { fetchArticle } from '@/lib/api';
import { useChat, ChatEntry } from '@/hooks/useChat';
import { useChatHistory } from '@/hooks/useChatHistory';
import ChatWindow from '@/components/ChatWindow';
import ChatInput from '@/components/ChatInput';
import LawViewer from '@/components/LawViewer';
import ChatSidebar from '@/components/ChatSidebar';
import { PERSONA_ICONS } from '@/components/ChatSidebar';
import { Trash2, Compass, PanelLeftClose, PanelLeft } from 'lucide-react';

/** ChatEntry → Message (저장용, streaming 메타 제거) */
function toMessages(entries: ChatEntry[]): Message[] {
  return entries
    .filter((e) => e.content.trim() !== '')
    .map((e) => ({
      role: e.role,
      content: e.content,
      toolCalls: e.toolCalls,
      toolResults: e.toolResults,
    }));
}

function ChatPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialPersona = (params.get('persona') ?? 'general') as PersonaId;

  const [persona, setPersona] = useState<PersonaId>(initialPersona);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ source: LawSource; articleId: string } | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    sessions,
    createSession,
    updateSession,
    updateSessionPersona,
    deleteSession,
    toggleBookmark,
    getSession,
  } = useChatHistory();

  const onEntriesChange = useCallback(
    (entries: ChatEntry[]) => {
      if (activeSessionId) {
        updateSession(activeSessionId, toMessages(entries));
      }
    },
    [activeSessionId, updateSession]
  );

  const { entries, isLoading, sendMessage, stopStreaming, clearChat, loadEntries } = useChat(
    persona,
    { onEntriesChange }
  );

  // 초기 진입 시 새 세션 자동 생성
  useEffect(() => {
    if (!activeSessionId && sessions !== undefined) {
      const id = createSession(persona);
      setActiveSessionId(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 출처 클릭 → 백엔드 직접 조회 */
  const handleViewArticle = useCallback(async (lawName: string, articleId: string) => {
    setViewerLoading(true);
    setViewer(null);
    try {
      const data = await fetchArticle(lawName, articleId);
      const source: LawSource = {
        id: `direct-${Date.now()}`,
        toolName: 'get_law_text',
        lawName: data.lawName,
        articles: [{ id: data.articleId, title: '', content: data.content }],
        raw: data.content,
      };
      setViewer({ source, articleId: data.articleId });
    } catch (e) {
      console.error('조문 조회 실패:', e);
    } finally {
      setViewerLoading(false);
    }
  }, []);

  /** 새 대화 */
  const handleNewChat = useCallback(() => {
    // 현재 세션이 비어 있으면 새 세션 생성 불필요
    const current = activeSessionId ? getSession(activeSessionId) : null;
    if (current && current.entries.length === 0) return;
    const id = createSession(persona);
    setActiveSessionId(id);
    clearChat();
    setViewer(null);
    setViewerLoading(false);
  }, [persona, activeSessionId, getSession, createSession, clearChat]);

  /** 세션 선택 */
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      const session = getSession(sessionId);
      if (!session) return;

      setActiveSessionId(sessionId);
      setPersona(session.persona);
      setViewer(null);

      // entries 복원
      const restored: ChatEntry[] = session.entries.map((m) => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolResults: m.toolResults,
      }));
      loadEntries(restored);
    },
    [activeSessionId, getSession, loadEntries]
  );

  /** 세션 삭제 */
  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      deleteSession(sessionId);
      if (sessionId === activeSessionId) {
        // 삭제된 세션이 현재 세션이면 새 대화 생성
        const id = createSession(persona);
        setActiveSessionId(id);
        clearChat();
        setViewer(null);
      }
    },
    [activeSessionId, deleteSession, createSession, persona, clearChat]
  );

  /** 페르소나 전환 */
  const handleChangePersona = useCallback(
    (newPersona: PersonaId) => {
      if (newPersona === persona) return;
      setPersona(newPersona);
      setViewer(null);
      // 현재 세션이 비어 있으면 페르소나만 변경, 새 세션 생성 안 함
      const current = activeSessionId ? getSession(activeSessionId) : null;
      if (current && current.entries.length === 0) {
        updateSessionPersona(activeSessionId!, newPersona);
      } else {
        const id = createSession(newPersona);
        setActiveSessionId(id);
        clearChat();
      }
      router.replace(`/chat?persona=${newPersona}`);
    },
    [persona, activeSessionId, getSession, updateSessionPersona, createSession, clearChat, router]
  );

  return (
    <div className="flex h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* ── 좌측 사이드바 (항상 표시, 축소/펼침 전환) ── */}
      <ChatSidebar
        collapsed={sidebarCollapsed}
        sessions={sessions}
        activeSessionId={activeSessionId}
        currentPersona={persona}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onToggleBookmark={toggleBookmark}
        onChangePersona={handleChangePersona}
      />

      {/* ── 메인 영역 ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header
          className="flex items-center justify-between border-b px-4 py-3 shrink-0"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
              title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            >
              {sidebarCollapsed ? (
                <PanelLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
              ) : (
                <PanelLeftClose size={18} style={{ color: 'var(--color-text-secondary)' }} />
              )}
            </button>
            {/* 현재 페르소나 배지 */}
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                background: `color-mix(in srgb, ${PERSONA_ICONS[persona].colorVar} 12%, transparent)`,
                color: PERSONA_ICONS[persona].colorVar,
              }}
            >
              {PERSONA_ICONS[persona].icon(16)}
              {PERSONA_ICONS[persona].label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                clearChat();
                if (activeSessionId) {
                  updateSession(activeSessionId, []);
                }
              }}
              disabled={entries.length === 0}
              className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 disabled:opacity-30"
              title="대화 초기화"
            >
              <Trash2 size={16} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>
        </header>

        {/* 본문 — 채팅 + 법령뷰어 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 중앙 채팅 영역 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div
              className="mx-auto flex h-full w-full flex-col"
              style={{ maxWidth: 'var(--chat-max-width)' }}
            >
              <ChatWindow
                entries={entries}
                onViewArticle={handleViewArticle}
                onSend={sendMessage}
              />
              <ChatInput onSend={sendMessage} onStop={stopStreaming} isLoading={isLoading} />
            </div>
          </div>

          {/* 우측 법령 뷰어 */}
          {(viewer || viewerLoading) && (
            <LawViewer
              source={viewer?.source ?? null}
              scrollToId={viewer?.articleId ?? null}
              isLoading={viewerLoading}
              onClose={() => { setViewer(null); setViewerLoading(false); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
