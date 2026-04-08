'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSession, PersonaId } from '@/lib/types';
import {
  Plus,
  Star,
  StarOff,
  Trash2,
  MessageSquare,
  ChevronDown,
  Compass,
  Building2,
  PencilRuler,
  HardHat,
  FileSignature,
  ClipboardCheck,
  SearchCode,
} from 'lucide-react';

/* ── 페르소나 메타데이터 ── */
export const PERSONA_ICONS: Record<PersonaId, { label: string; icon: (size: number) => React.ReactNode; colorVar: string; gradient: string }> = {
  'general': {
    label: '종합 검색',
    icon: (s) => <SearchCode size={s} />,
    colorVar: 'var(--color-general)',
    gradient: 'linear-gradient(135deg, #1e40af, #6366f1)',
  },
  'dev-sales': {
    label: '개발/영업',
    icon: (s) => <Building2 size={s} />,
    colorVar: 'var(--color-dev-sales)',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
  },
  'design-permit': {
    label: '설계/인허가',
    icon: (s) => <PencilRuler size={s} />,
    colorVar: 'var(--color-design)',
    gradient: 'linear-gradient(135deg, #0369a1, #38bdf8)',
  },
  'construction-safety': {
    label: '시공/안전',
    icon: (s) => <HardHat size={s} />,
    colorVar: 'var(--color-construction)',
    gradient: 'linear-gradient(135deg, #b45309, #f59e0b)',
  },
  'contract-cost': {
    label: '계약/원가',
    icon: (s) => <FileSignature size={s} />,
    colorVar: 'var(--color-contract)',
    gradient: 'linear-gradient(135deg, #a16207, #eab308)',
  },
  'quality-mgmt': {
    label: '품질관리',
    icon: (s) => <ClipboardCheck size={s} />,
    colorVar: 'var(--color-quality)',
    gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
  },
};

const ALL_PERSONAS: PersonaId[] = ['general', 'dev-sales', 'design-permit', 'construction-safety', 'contract-cost', 'quality-mgmt'];

/* ── 날짜 그룹핑 ── */
function getDateGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && now.getDate() === date.getDate()) return '오늘';
  if (diffDays <= 1 && now.getDate() - date.getDate() === 1) return '어제';
  if (diffDays <= 7) return '이번 주';
  if (diffDays <= 30) return '이번 달';
  return '이전';
}

interface Props {
  collapsed: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  currentPersona: PersonaId;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onToggleBookmark: (sessionId: string) => void;
  onChangePersona: (persona: PersonaId) => void;
}

export default function ChatSidebar({
  collapsed,
  sessions,
  activeSessionId,
  currentPersona,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onToggleBookmark,
  onChangePersona,
}: Props) {
  const router = useRouter();
  const bookmarked = useMemo(
    () => sessions.filter((s) => s.bookmarked).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  const grouped = useMemo(() => {
    const nonBookmarked = sessions
      .filter((s) => !s.bookmarked)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const groups: Record<string, ChatSession[]> = {};
    for (const s of nonBookmarked) {
      const group = getDateGroup(s.updatedAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(s);
    }
    return groups;
  }, [sessions]);

  const groupOrder = ['오늘', '어제', '이번 주', '이번 달', '이전'];

  /* ═══════════════════════════════════════════
     축소 모드 — 아이콘만 표시 (60px)
     ═══════════════════════════════════════════ */
  if (collapsed) {
    return (
      <aside
        className="flex h-full shrink-0 flex-col items-center border-r py-3 gap-1"
        style={{
          width: '60px',
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* 새 대화 */}
        <button
          onClick={onNewChat}
          className="sidebar-icon-btn"
          title="새 대화"
        >
          <Plus size={20} />
        </button>

        {/* 구분선 */}
        <div className="my-1 w-6 border-t" style={{ borderColor: 'var(--color-border)' }} />

        {/* 페르소나 전환 (아이콘 나열) */}
        {ALL_PERSONAS.map((pid) => {
          const meta = PERSONA_ICONS[pid];
          const isActive = pid === currentPersona;
          return (
            <button
              key={pid}
              onClick={() => onChangePersona(pid)}
              className="sidebar-icon-btn"
              style={{
                background: isActive ? `${meta.colorVar}18` : undefined,
                color: isActive ? meta.colorVar : 'var(--color-text-secondary)',
              }}
              title={meta.label}
            >
              {meta.icon(20)}
            </button>
          );
        })}

        {/* 구분선 */}
        <div className="my-1 w-6 border-t" style={{ borderColor: 'var(--color-border)' }} />

        {/* 즐겨찾기 */}
        {bookmarked.length > 0 && (
          <button
            className="sidebar-icon-btn"
            style={{ color: '#eab308' }}
            title={`즐겨찾기 ${bookmarked.length}개`}
            onClick={() => bookmarked[0] && onSelectSession(bookmarked[0].id)}
          >
            <Star size={20} />
          </button>
        )}

        {/* 최근 대화 (최대 5개 점 표시) */}
        <div className="mt-auto flex flex-col items-center gap-1">
          {sessions.slice(0, 5).map((s) => {
            const meta = PERSONA_ICONS[s.persona];
            const isActive = s.id === activeSessionId;
            return (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className="sidebar-icon-btn"
                style={{
                  background: isActive ? 'var(--color-primary-light)' : undefined,
                  color: isActive ? 'var(--color-primary)' : meta.colorVar,
                }}
                title={s.title}
              >
                <MessageSquare size={16} />
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  /* ═══════════════════════════════════════════
     펼침 모드 — 전체 사이드바 (260px)
     ═══════════════════════════════════════════ */
  const personaMeta = PERSONA_ICONS[currentPersona];

  return (
    <aside
      className="flex h-full shrink-0 flex-col border-r"
      style={{
        width: '260px',
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ── 로고 ── */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2.5 px-4 pt-4 pb-2 w-full text-left rounded-lg transition-opacity hover:opacity-70"
        title="시작 페이지로 이동"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          <Compass size={14} />
        </div>
        <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Law Navigator
        </span>
      </button>

      {/* ── 새 대화 버튼 ── */}
      <div className="px-3 pb-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <Plus size={16} />
          새 대화
        </button>
      </div>

      {/* ── 페르소나 전환 ── */}
      <div className="px-3 pb-3">
        <div className="relative">
          <select
            value={currentPersona}
            onChange={(e) => onChangePersona(e.target.value as PersonaId)}
            className="w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-xs font-medium transition-colors hover:bg-gray-50"
            style={{
              borderColor: 'var(--color-border)',
              color: personaMeta.colorVar,
              background: 'var(--color-surface)',
            }}
          >
            {ALL_PERSONAS.map((pid) => (
              <option key={pid} value={pid}>
                {PERSONA_ICONS[pid].label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-secondary)' }}
          />
        </div>
      </div>

      {/* ── 대화 목록 (스크롤) ── */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* 즐겨찾기 */}
        {bookmarked.length > 0 && (
          <div className="mb-2">
            <p
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold"
              style={{ color: '#eab308' }}
            >
              <Star size={12} />
              즐겨찾기
            </p>
            {bookmarked.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={s.id === activeSessionId}
                onSelect={onSelectSession}
                onDelete={onDeleteSession}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        )}

        {/* 날짜 그룹 */}
        {groupOrder.map((group) =>
          grouped[group] ? (
            <div key={group} className="mb-2">
              <p
                className="px-2 py-1 text-xs font-semibold"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {group}
              </p>
              {grouped[group].map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={s.id === activeSessionId}
                  onSelect={onSelectSession}
                  onDelete={onDeleteSession}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </div>
          ) : null
        )}

        {/* 빈 상태 */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <MessageSquare size={24} style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              대화 기록이 없습니다
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── 개별 세션 아이템 ── */
function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onToggleBookmark,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}) {
  const meta = PERSONA_ICONS[session.persona];

  return (
    <div
      className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
      style={{
        background: isActive ? 'var(--color-primary-light)' : undefined,
      }}
      onClick={() => onSelect(session.id)}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = '#f1f5f9';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = '';
      }}
    >
      <span className="shrink-0" style={{ color: meta.colorVar }}>
        {meta.icon(14)}
      </span>
      <span
        className="flex-1 truncate text-xs"
        style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-primary)' }}
      >
        {session.title}
      </span>
      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBookmark(session.id); }}
          className="rounded p-0.5 hover:bg-gray-200"
          title={session.bookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
        >
          {session.bookmarked ? (
            <StarOff size={12} style={{ color: 'var(--color-text-secondary)' }} />
          ) : (
            <Star size={12} style={{ color: 'var(--color-text-secondary)' }} />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
          className="rounded p-0.5 hover:bg-red-100"
          title="삭제"
        >
          <Trash2 size={12} style={{ color: '#ef4444' }} />
        </button>
      </div>
    </div>
  );
}
