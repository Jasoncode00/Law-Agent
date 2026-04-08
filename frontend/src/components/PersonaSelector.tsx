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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {PERSONA_ORDER.map((pid) => {
        const p = personaMap[pid];
        const meta = PERSONA_ICONS[pid];
        if (!p || !meta) return null;
        const isSelected = selected === pid;

        return (
          <button
            key={pid}
            onClick={() => onSelect(pid)}
            className="relative flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            style={{
              minHeight: '140px',
              borderColor: isSelected ? meta.colorVar : 'var(--color-border)',
              background: isSelected
                ? `color-mix(in srgb, ${meta.colorVar} 6%, white)`
                : 'var(--color-surface)',
              boxShadow: isSelected
                ? `0 0 0 3px color-mix(in srgb, ${meta.colorVar} 15%, transparent)`
                : undefined,
            }}
          >
            {/* 아이콘 + 이름 (가로 배치) */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: meta.gradient,
                  color: '#fff',
                  boxShadow: `0 4px 12px color-mix(in srgb, ${meta.colorVar} 30%, transparent)`,
                }}
              >
                {meta.icon(20)}
              </div>
              <span
                className="text-sm font-bold leading-tight"
                style={{ color: isSelected ? meta.colorVar : 'var(--color-text-primary)' }}
              >
                {meta.label}
              </span>
            </div>

            {/* 설명 */}
            <p
              className="text-xs leading-relaxed line-clamp-3"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {p.description}
            </p>

            {/* 선택 dot */}
            {isSelected && (
              <div
                className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full"
                style={{ background: meta.colorVar }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
