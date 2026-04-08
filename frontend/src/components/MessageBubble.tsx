'use client';

import { useEffect, useRef, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { ChatEntry } from '@/hooks/useChat';
import { LawSource } from '@/lib/types';
import { parseLawSources, TEXT_TOOL_PRIORITY } from '@/lib/lawParser';
import ToolBadge from './ToolBadge';

interface Props {
  entry: ChatEntry;
  /** 출처 클릭 시 법령명 + 조문번호를 전달 — 백엔드에서 직접 원문 조회 */
  onViewArticle: (lawName: string, articleId: string) => void;
  /** 리스트 항목 클릭 시 해당 텍스트를 새 질의로 전송 */
  onSend?: (text: string) => void;
}

interface CitationEntry {
  num: number;
  lawName: string;     // LLM이 쓴 법령명 (대괄호 안)
  articleId: string;   // "제50조"
  source: LawSource | null;
}

/* assistant 답변에서 JSON 쓰레기 제거 */
function cleanContent(text: string): string {
  return text.replace(/^\{[^}]*\}/g, '').replace(/\{[^}]*\}\s*/g, '').trim();
}

// [법령명] 제N조 형식 - 법령명은 대괄호 안에 있고, 제N조(의N)가 뒤따름
// [법령명] 제N조 — 대괄호 안 문자를 넓게 허용 (중간점, 따옴표, 하이픈 등 포함)
const CITATION_RE = /\[([가-힣ㆍ\s·•‧∙\-–―‐''""()（）0-9A-Za-z]{2,50})\]\s*(제\d+조(?:의\d+)?)/g;

/** 한글+숫자만 남기고 모든 특수문자 제거 — 유니코드 중간점/공백/괄호 차이 무시 */
function normalizeLawName(name: string): string {
  return name.replace(/[^가-힣0-9a-zA-Z]/g, '');
}

/** 법령명 유사 비교 — 순수 한글+숫자로 비교 */
function lawNameMatches(sourceLawName: string, keyword: string): boolean {
  if (!sourceLawName || !keyword) return false;
  const s = normalizeLawName(sourceLawName);
  const k = normalizeLawName(keyword);
  return s === k || s.includes(k) || k.includes(s);
}

/**
 * 텍스트에서 [법령명] 제N조 패턴을 찾아 [N] 인용 번호를 삽입하고,
 * 인용 레지스트리(citations)를 반환한다.
 *
 * 같은 source + 같은 articleId → 동일 번호로 통합
 * (LLM이 "시행령", "건축법 시행령" 등 다른 표현을 쓰더라도)
 */
function buildCitations(
  text: string,
  sources: LawSource[],
): { markedText: string; citations: CitationEntry[] } {
  // 통합 key: "sourceId:articleId" (source 없으면 "null:원문법령명:articleId")
  const registry = new Map<string, CitationEntry>();
  // LLM 원문 key → 통합 key 매핑 (텍스트 치환 시 사용)
  const aliasMap = new Map<string, string>();
  let counter = 0;

  const prioritized = [
    ...sources.filter((s) => TEXT_TOOL_PRIORITY.includes(s.toolName)),
    ...sources.filter((s) => !TEXT_TOOL_PRIORITY.includes(s.toolName)),
  ];

  // 1. 고유 조문 수집 — 같은 source+articleId는 하나의 번호
  for (const match of text.matchAll(new RegExp(CITATION_RE.source, 'g'))) {
    const lawName = match[1]?.trim();
    const articleId = match[2];
    const rawKey = `${lawName}:${articleId}`;

    if (aliasMap.has(rawKey)) continue;

    const source = findSource(prioritized, lawName, articleId);
    const unifiedKey = source
      ? `${source.id}:${articleId}`
      : `null:${normalizeLawName(lawName)}:${articleId}`;

    if (registry.has(unifiedKey)) {
      // 이미 같은 source+조문이 등록됨 → alias만 추가
      aliasMap.set(rawKey, unifiedKey);
    } else {
      counter++;
      // lawName: source가 있으면 source의 정식 법령명, 없으면 LLM이 쓴 것 중 가장 긴 것
      const displayLawName = source ? source.lawName : lawName;
      registry.set(unifiedKey, { num: counter, lawName: displayLawName, articleId, source });
      aliasMap.set(rawKey, unifiedKey);
    }
  }

  if (registry.size === 0) return { markedText: text, citations: [] };

  // 2. 텍스트 치환
  const markedText = text.replace(new RegExp(CITATION_RE.source, 'g'), (fullMatch, lawName, articleId) => {
    const rawKey = `${(lawName as string).trim()}:${articleId}`;
    const unifiedKey = aliasMap.get(rawKey);
    const entry = unifiedKey ? registry.get(unifiedKey) : undefined;
    if (!entry) return fullMatch;
    return `${fullMatch}<cite class="cite-num" data-n="${entry.num}">[${entry.num}]</cite>`;
  });

  return { markedText, citations: [...registry.values()] };
}

/** 법령명 + 조문번호로 최적 source 탐색 */
function findSource(
  prioritized: LawSource[],
  lawName: string,
  articleId: string,
): LawSource | null {
  // 1순위: 법령명 일치 + 조문 포함
  const match1 = prioritized.find(
    (s) =>
      lawNameMatches(s.lawName, lawName) &&
      s.articles.some((a) => articleMatches(a.id, articleId)),
  );
  if (match1) return match1;

  // 2순위: 법령명만 일치 (조문은 없을 수도 있음)
  const match2 = prioritized.find((s) => lawNameMatches(s.lawName, lawName));
  if (match2) return match2;

  // 3순위: 해당 조문을 가진 source 중 prioritized 순서상 첫 번째 선택
  // (prioritized는 TEXT_TOOL_PRIORITY 기준으로 get_law_text 등이 앞에 있음)
  const candidates = prioritized.filter((s) =>
    s.articles.some((a) => articleMatches(a.id, articleId)),
  );
  if (candidates.length >= 1) return candidates[0];

  return null;
}

function articleMatches(sourceId: string, targetId: string): boolean {
  return sourceId === targetId || sourceId.includes(targetId) || targetId.includes(sourceId);
}

/** HTML 특수문자 이스케이프 — XSS 방지 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * "### 추가 질문" 섹션을 본문에서 분리한다.
 * - mainText: 추가 질문 헤딩 이전의 본문 (renderMarkdown에 전달)
 * - followups: 추가 질문 bullet 항목 문자열 배열 (별도 UI로 렌더링)
 */
function extractFollowups(text: string): { mainText: string; followups: string[] } {
  const headingMatch = /^#{1,4}\s*추가\s*질문\s*$/m.exec(text);
  if (!headingMatch) return { mainText: text, followups: [] };

  const mainText = text.slice(0, headingMatch.index).trimEnd();
  const afterHeading = text.slice(headingMatch.index + headingMatch[0].length);

  const followups: string[] = [];
  for (const line of afterHeading.split('\n')) {
    const m = line.match(/^[-•]\s+(.+)/);
    if (m) followups.push(m[1].trim());
    else if (/^#{1,4}\s/.test(line)) break; // 다음 헤딩에서 중단
  }

  return { mainText, followups };
}

/** 마크다운 → HTML (인용 <cite> 태그 보존)
 *
 * 지원 문법:
 *   ##/###/#### 헤딩  |  **굵게**  |  --- 구분선
 *   - / • 불릿 (2칸 들여쓰기 → 중첩 <ul>)
 *   1. / 1) 번호 목록 (2칸 들여쓰기 → 중첩 <ol>)
 */
function renderMarkdown(raw: string): string {
  // <cite> 태그를 플레이스홀더로 대피 후 복원
  const cites: string[] = [];
  const withoutCites = raw.replace(/<cite[^>]*>.*?<\/cite>/g, (m) => {
    cites.push(m);
    return `\x00CITE${cites.length - 1}\x00`;
  });

  const escaped = escapeHtml(withoutCites);

  // 인라인 포맷 (볼드)
  const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // ── 라인별 블록 구조 변환 ──────────────────────────────────────────
  const lines = escaped.split('\n');
  const nodes: string[] = [];
  const stack: Array<'ul' | 'ol'> = []; // 열려 있는 목록 태그 스택

  const openList = (tag: 'ul' | 'ol') => { nodes.push(`<${tag}>`); stack.push(tag); };
  const closeListTo = (depth: number) => {
    while (stack.length > depth) nodes.push(`</${stack.pop()!}>`);
  };

  for (const line of lines) {
    // 헤딩 (##, ###, ####)
    const hm = line.match(/^(#{2,4})\s+(.+)$/);
    if (hm) {
      closeListTo(0);
      nodes.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`);
      continue;
    }

    // 구분선 (---, ━━━, ===)
    if (/^[-━=]{3,}$/.test(line.trim())) {
      closeListTo(0);
      nodes.push('<hr>');
      continue;
    }

    // 들여쓰기 불릿 서브항목 (2칸 이상)
    const subBul = line.match(/^[ \t]{2,}[-•]\s+(.+)$/);
    if (subBul) {
      if (stack.length === 0) openList('ul');
      if (stack.length < 2) openList('ul');
      else if (stack.length > 2) closeListTo(2);
      nodes.push(`<li>${inline(subBul[1])}</li>`);
      continue;
    }

    // 최상위 불릿 목록
    const bul = line.match(/^[-•]\s+(.+)$/);
    if (bul) {
      if (stack.length > 0 && stack[stack.length - 1] === 'ol') closeListTo(0);
      if (stack.length > 1) closeListTo(1);
      if (stack.length === 0) openList('ul');
      nodes.push(`<li>${inline(bul[1])}</li>`);
      continue;
    }

    // 들여쓰기 번호 서브항목 (2칸 이상)
    const subNum = line.match(/^[ \t]{2,}\d+[.)]\s+(.+)$/);
    if (subNum) {
      if (stack.length === 0) openList('ol');
      if (stack.length < 2) openList('ol');
      else if (stack.length > 2) closeListTo(2);
      nodes.push(`<li>${inline(subNum[1])}</li>`);
      continue;
    }

    // 최상위 번호 목록
    const num = line.match(/^\d+[.)]\s+(.+)$/);
    if (num) {
      if (stack.length > 0 && stack[stack.length - 1] === 'ul') closeListTo(0);
      if (stack.length > 1) closeListTo(1);
      if (stack.length === 0) openList('ol');
      nodes.push(`<li>${inline(num[1])}</li>`);
      continue;
    }

    // 일반 텍스트 / 빈 줄
    closeListTo(0);
    nodes.push(inline(line));
  }

  closeListTo(0);

  // ── 텍스트 라인 → <p> 그룹화 ────────────────────────────────────────
  // 블록 태그(헤딩·목록·hr)는 그대로, 텍스트 라인은 빈 줄 기준으로 <p>로 묶음
  const BLOCK_TAG_RE = /^<\/?(?:h[2-4]|ul|ol|li|hr)/;
  const blocks: string[] = [];
  let pLines: string[] = [];

  const flushP = () => {
    if (pLines.length) {
      blocks.push(`<p>${pLines.join(' ')}</p>`);
      pLines = [];
    }
  };

  for (const node of nodes) {
    if (BLOCK_TAG_RE.test(node)) {
      flushP();
      blocks.push(node);
    } else if (node.trim() === '') {
      flushP();
    } else {
      pLines.push(node);
    }
  }
  flushP();

  const html = blocks.join('\n');
  return html.replace(/\x00CITE(\d+)\x00/g, (_, i) => cites[Number(i)]);
}

export default function MessageBubble({ entry, onViewArticle, onSend }: Props) {
  const isUser = entry.role === 'user';
  const contentRef = useRef<HTMLDivElement>(null);
  const citationsRef = useRef<CitationEntry[]>([]);

  /* tool_results → LawSource (법령별 분리, 복수 반환) */
  const lawSources = useMemo<LawSource[]>(() => {
    if (!entry.toolResults?.length) return [];
    return entry.toolResults.flatMap((tr) => parseLawSources(tr.name, tr.result));
  }, [entry.toolResults]);

  /* 추가 질문 분리 + 인용 번호 삽입 + HTML 렌더링 */
  const { finalHtml, citations, followups } = useMemo(() => {
    const cleaned = cleanContent(entry.content);
    if (!cleaned) return { finalHtml: '', citations: [], followups: [] };

    const { mainText, followups } = extractFollowups(cleaned);
    const { markedText, citations } = buildCitations(mainText, lawSources);
    const finalHtml = renderMarkdown(markedText);
    return { finalHtml, citations, followups };
  }, [entry.content, lawSources]);

  // citationsRef 최신 유지
  useEffect(() => {
    citationsRef.current = citations;
  }, [citations]);

  /* cite-num 클릭 핸들러 — 컨테이너 이벤트 위임 */
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      const cite = (e.target as HTMLElement).closest<HTMLElement>('.cite-num');
      if (!cite) return;
      const n = Number(cite.dataset.n);
      const entry = citationsRef.current.find((c) => c.num === n);
      if (!entry) return;
      onViewArticle(entry.lawName, entry.articleId);
    };

    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [finalHtml, onViewArticle]);


  /* 사용자 메시지 */
  if (isUser) {
    return (
      <div className="flex justify-end select-text">
        <div
          className="bubble-user-selectable select-text max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'var(--color-bubble-user)',
            color: 'var(--color-bubble-user-text)',
            cursor: 'text',
          }}
        >
          {entry.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="w-full">
        {/* 도구 호출 배지 */}
        <ToolBadge
          toolCalls={entry.toolCalls ?? []}
          toolResults={entry.toolResults ?? []}
          isStreaming={entry.isStreaming}
        />

        {/* 에러 */}
        {entry.hasError && (
          <div
            className="mb-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
          >
            <AlertCircle size={13} />
            일부 법령 검색에 오류가 발생했습니다.
          </div>
        )}

        {/* 답변 말풍선 */}
        <div
          className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm"
          style={{
            background: 'var(--color-bubble-assistant)',
            color: 'var(--color-bubble-assistant-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {entry.isStreaming && !finalHtml ? (
            <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <span className="animate-pulse">●</span>
              <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
              <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
            </span>
          ) : (
            <div
              ref={contentRef}
              className="prose-law"
              dangerouslySetInnerHTML={{ __html: finalHtml }}
            />
          )}
        </div>

        {/* 추가 질문 카드 (스트리밍 완료 후, 추가 질문이 있을 때만) */}
        {!entry.isStreaming && followups.length > 0 && (
          <div
            className="mt-2 rounded-xl border px-3 py-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
          >
            <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              추가 질문
            </p>
            <div className="flex flex-col gap-0.5">
              {followups.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onSend?.(q)}
                  className="flex items-start gap-2 w-full text-left text-xs rounded-md px-2 py-1.5 transition-colors hover:bg-blue-50"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <span className="shrink-0 font-bold" style={{ color: 'var(--color-primary)' }}>›</span>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 인용 목록 (스트리밍 완료 후, 인용이 있을 때만) */}
        {!entry.isStreaming && citations.length > 0 && (
          <div
            className="mt-2 rounded-xl border px-3 py-2 space-y-1"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
          >
            {citations.map((c) => (
              <button
                key={c.num}
                onClick={() => onViewArticle(c.lawName, c.articleId)}
                disabled={false}
                className="flex items-center gap-2 w-full text-left text-xs rounded-md px-1 py-0.5 transition-colors hover:bg-blue-50 disabled:opacity-40 disabled:cursor-default"
              >
                <span
                  className="shrink-0 font-bold tabular-nums"
                  style={{ color: 'var(--color-primary)', minWidth: '1.5rem' }}
                >
                  [{c.num}]
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {c.lawName} · {c.articleId}
                </span>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
