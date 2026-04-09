'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown, ChevronUp, BookOpen, Loader2 } from 'lucide-react';
import { LawSource } from '@/lib/types';

interface Props {
  source: LawSource | null;
  scrollToId: string | null;
  onClose: () => void;
  isLoading?: boolean;
}

/** HTML 특수문자 이스케이프 — 법령 텍스트의 <, >, &, " 가 HTML로 해석되지 않도록 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 한국 법령 원문 텍스트 → 읽기 좋은 HTML */
function formatLawText(text: string): string {
  if (!text) return '';

  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '<div class="law-gap"></div>';
      const s = escapeHtml(t);

      // ①②③… 항목
      if (/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/.test(t)) {
        return `<div class="law-item-circle">${s}</div>`;
      }
      // 1. 2. 3. 번호 항목
      if (/^\d+\./.test(t)) {
        return `<div class="law-item-num">${s}</div>`;
      }
      // 가. 나. 다. 한글 항목
      if (/^[가-힣]\. /.test(t)) {
        return `<div class="law-item-ko">${s}</div>`;
      }
      // 일반 줄
      return `<div class="law-line">${s}</div>`;
    })
    .join('');
}

export default function LawViewer({ source, scrollToId, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const articleRefs = useRef<Map<string, HTMLElement>>(new Map());

  // source.id가 바뀔 때 상태 초기화를 위해 상위에서 key={source.id}를 권장하지만,
  // 여기서 내부적으로 처리하려면 useEffect 대신 source 변경 시점에 로직을 수행합니다.
  const [lastSourceId, setLastSourceId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (source && source.id !== lastSourceId) {
    // scrollToId와 일치하는 조문을 우선 펼침, 없으면 첫 번째 조문
    const targetId = scrollToId
      ? source.articles.find(
          (a) => a.id === scrollToId || a.id.includes(scrollToId) || scrollToId.includes(a.id),
        )?.id
      : undefined;
    const initialId = targetId ?? source.articles[0]?.id;
    setExpanded(initialId ? new Set([initialId]) : new Set());
    setLastSourceId(source.id);
    setShowAll(false);
  }

  // source 변경 시 ref 초기화
  useEffect(() => {
    articleRefs.current.clear();
  }, [lastSourceId]);

  // 특정 조문으로 자동 스크롤 + 펼치기
  useEffect(() => {
    if (!scrollToId || !source) return;
    const match = source.articles.find(
      (a) => a.id === scrollToId || a.id.includes(scrollToId) || scrollToId.includes(a.id),
    );
    if (!match) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded((prev) => {
      if (prev.has(match.id)) return prev;
      return new Set([...prev, match.id]);
    });

    const timer = setTimeout(() => {
      articleRefs.current.get(match.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(timer);
  }, [scrollToId, source]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!source) {
    return (
      <div
        className="flex flex-col items-center justify-center border-l shrink-0"
        style={{
          width: '520px',
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>조문을 불러오는 중…</p>
      </div>
    );
  }

  // scrollToId가 있으면 해당 조문만 표시, 없으면 전체
  const targetArticle = scrollToId
    ? source.articles.find(
        (a) => a.id === scrollToId || a.id.includes(scrollToId) || scrollToId.includes(a.id),
      )
    : null;
  const displayArticles =
    targetArticle && !showAll ? [targetArticle] : source.articles;
  const hiddenCount = source.articles.length - 1;

  return (
    /* flex 사이드 패널 — 채팅 영역을 왼쪽으로 밀어냄 */
    <div
      className="flex flex-col border-l shrink-0"
      style={{
        width: '520px',
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <span
            className="font-bold text-sm truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {source.lawName}
          </span>
          <span
            className="shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            {displayArticles.length}개 조문
          </span>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
        >
          <X size={15} style={{ color: 'var(--color-text-secondary)' }} />
        </button>
      </div>

      {/* 조문 목록 */}
      <div className="overflow-y-auto flex-1 px-3 py-3 space-y-2">
        {targetArticle && !showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-[#e8eef5]"
            style={{ color: 'var(--color-primary)', border: '1px dashed var(--color-border)' }}
          >
            전체 조문 보기 (총 {source.articles.length}개)
          </button>
        )}
        {targetArticle && showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-gray-50"
            style={{ color: 'var(--color-text-secondary)', border: '1px dashed var(--color-border)' }}
          >
            인용 조문만 보기
          </button>
        )}
        {displayArticles.map((article) => {
          const isOpen = expanded.has(article.id);
          return (
            <div
              key={article.id}
              ref={(el) => {
                if (el) articleRefs.current.set(article.id, el);
                else articleRefs.current.delete(article.id);
              }}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* 조문 헤더 */}
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
                onClick={() => toggle(article.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {article.id}
                  </span>
                  {article.title && (
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {article.title}
                    </span>
                  )}
                </div>
                {isOpen
                  ? <ChevronUp size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  : <ChevronDown size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                }
              </button>

              {/* 조문 본문 — 포맷된 HTML */}
              {isOpen && (
                <div
                  className="law-content px-3 pb-3 pt-2 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                  dangerouslySetInnerHTML={{ __html: formatLawText(article.content) }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
