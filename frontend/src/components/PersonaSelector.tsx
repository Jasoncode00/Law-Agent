'use client';

import { Persona, PersonaId } from '@/lib/types';
import { PERSONA_ICONS } from './ChatSidebar';

const PERSONA_ORDER: PersonaId[] = [
  'general',
  'dev-sales',
  'design-permit',
  'construction-safety',
  'contract-cost',
  'quality-mgmt',
];

interface Props {
  personas: Persona[];
  selected: PersonaId | null;
  onSelect: (id: PersonaId) => void;
}

export default function PersonaSelector({ personas, selected, onSelect }: Props) {
  const personaMap = Object.fromEntries(personas.map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
      {PERSONA_ORDER.map((pid) => {
        const p = personaMap[pid];
        const meta = PERSONA_ICONS[pid];
        if (!p || !meta) return null;
        const isSelected = selected === pid;

        return (
          <button
            key={pid}
            onClick={() => onSelect(pid)}
            className="group relative flex flex-col rounded-2xl text-left transition-all duration-200 overflow-hidden"
            style={{
              background: '#ffffff',
              boxShadow: isSelected
                ? `0 0 0 2px ${meta.colorVar}, 0 6px 20px rgba(0,0,0,0.10)`
                : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
              transform: isSelected ? 'translateY(-3px)' : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)';
                e.currentTarget.style.transform = '';
              }
            }}
          >
            {/* 상단 액센트 바 */}
            <div
              className="h-1 w-full transition-opacity duration-200"
              style={{
                background: meta.gradient,
                opacity: isSelected ? 1 : 0.3,
              }}
            />

            {/* 카드 본문 */}
            <div className="flex flex-col gap-3 p-4 pt-3.5">
              {/* 아이콘 */}
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: meta.gradient,
                  color: '#fff',
                  boxShadow: `0 2px 6px color-mix(in srgb, ${meta.colorVar} 30%, transparent)`,
                }}
              >
                {meta.icon(16)}
              </div>

              {/* 텍스트 */}
              <div>
                <p
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: isSelected ? meta.colorVar : 'var(--color-text-primary)' }}
                >
                  {meta.label}
                </p>
                <p
                  className="text-[11px] leading-relaxed mt-1 line-clamp-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {p.description}
                </p>
              </div>
            </div>

            {/* 선택 체크 */}
            {isSelected && (
              <div
                className="absolute top-3.5 right-3 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                style={{ background: meta.colorVar }}
              >
                <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
