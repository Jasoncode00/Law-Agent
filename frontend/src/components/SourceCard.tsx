'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { LawSource } from '@/lib/types';

const TOOL_LABEL: Record<string, string> = {
  get_law_text: '법령 전문',
  search_law: '법령 검색',
  get_three_tier: '3단 비교',
  chain_full_research: '종합 리서치',
  chain_law_system: '법령 체계',
  chain_procedure_detail: '절차 분석',
  chain_dispute_prep: '분쟁 대비',
  chain_action_basis: '행위 근거',
  get_related_laws: '관련 법령',
  get_article_history: '조문 연혁',
  search_precedents: '판례 검색',
  get_precedent_text: '판례 전문',
  search_interpretations: '법령해석',
  get_annexes: '별표/서식',
  compare_articles: '조문 비교',
  compare_old_new: '신구 비교',
};

interface Props {
  source: LawSource;
  onViewArticle: (source: LawSource, articleId?: string) => void;
}

export default function SourceCard({ source, onViewArticle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABEL[source.toolName] || source.toolName;
  const hasMultipleArticles = source.articles.length > 1;

  return (
    <div
      className="rounded-xl border overflow-hidden text-xs"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
    >
      {/* 헤더 행 */}
      <div className="flex items-center gap-2 px-3 py-2">
        <FileText size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />

        <span className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {source.lawName}
        </span>

        <span
          className="shrink-0 px-1.5 py-0.5 rounded text-xs"
          style={{
            background: 'var(--color-tool-bg)',
            color: 'var(--color-tool-text)',
            border: '1px solid var(--color-tool-border)',
          }}
        >
          {label}
        </span>

        {source.articles.length > 0 && (
          <span className="shrink-0" style={{ color: 'var(--color-text-muted)' }}>
            {source.articles.length}개 조문
          </span>
        )}

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {/* 전체보기 버튼 */}
          <button
            onClick={() => onViewArticle(source)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors hover:bg-blue-100"
            style={{ color: 'var(--color-primary)' }}
          >
            <ExternalLink size={11} />
            전체보기
          </button>

          {/* 접기/펼치기 토글 (조문이 여러 개일 때만 표시) */}
          {hasMultipleArticles && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-0.5 rounded transition-colors hover:bg-gray-200"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* 조문 목록 (펼쳐진 상태) */}
      {expanded && (
        <div
          className="border-t px-3 py-2 space-y-0.5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {source.articles.map((article) => (
            <button
              key={article.id}
              onClick={() => onViewArticle(source, article.id)}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md transition-colors hover:bg-blue-50"
            >
              <span
                className="font-bold shrink-0"
                style={{ color: 'var(--color-primary)', minWidth: '3.5rem' }}
              >
                {article.id}
              </span>
              {article.title && (
                <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {article.title}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
