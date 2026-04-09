'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Persona, PersonaId } from '@/lib/types';
import { fetchPersonas } from '@/lib/api';
import PersonaSelector from '@/components/PersonaSelector';
import { Scale, ChevronRight, Loader2, BookOpen, Sparkles, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selected, setSelected] = useState<PersonaId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPersonas()
      .then(setPersonas)
      .catch(() => setError('서버에 연결할 수 없습니다. Backend 서버가 실행 중인지 확인하세요.'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = () => {
    if (!selected) return;
    router.push(`/chat?persona=${selected}`);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── 왼쪽 패널 ── */}
      <div
        className="lg:w-[38%] lg:fixed lg:left-0 lg:top-0 lg:h-screen flex flex-col px-10 py-8"
        style={{ background: 'linear-gradient(160deg, #0b1a2e 0%, #15304d 50%, #1c4468 100%)' }}
      >
        {/* 상단: 로고 */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.30)' }}
          >
            <Scale size={20} color="#c9a84c" strokeWidth={1.6} />
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tight">LexAI</span>
            <p className="text-[10px] font-medium mt-[-1px]" style={{ color: 'rgba(201,168,76,0.80)', letterSpacing: '0.08em' }}>
              SK에코플랜트
            </p>
          </div>
        </div>

        {/* 중앙: 타이틀 + 기능 */}
        <div className="flex-1 flex flex-col justify-center gap-8">
          {/* 메인 카피 */}
          <div>
            <p className="text-[2rem] font-extrabold leading-snug text-white">
              정확한 법령 근거,
            </p>
            <p className="text-[2rem] font-extrabold leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
              빠른 현장 판단
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-px w-6" style={{ background: '#c9a84c' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
                건설·EPC 실무 법령 AI 플랫폼
              </p>
            </div>
          </div>

          {/* 기능 목록 (간결한 인라인) */}
          <div className="flex flex-col gap-3">
            {[
              { icon: <BookOpen size={13} />, text: '국가법령정보 실시간 검색' },
              { icon: <Sparkles size={13} />, text: 'AI 기반 법령 해석 및 적용' },
              { icon: <Shield size={13} />, text: '판례 · 행정심판 · 법령해석 조회' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <span style={{ color: '#c9a84c', opacity: 0.7 }}>{icon}</span>
                <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 하단: 저작권 (한 줄, 중앙) */}
        <p className="text-center text-[11px] pb-4" style={{ color: 'rgba(255,255,255,0.18)' }}>
          © 2026 SK에코플랜트 — AI 답변은 참고용이며 법적 효력이 없습니다.
        </p>
      </div>

      {/* 왼쪽 고정 패널 공간 확보 */}
      <div className="hidden lg:block lg:w-[38%] shrink-0" />

      {/* ── 오른쪽 패널 ── */}
      <div
        className="flex-1 flex flex-col justify-center px-8 lg:px-14 py-10"
        style={{ background: '#f7f6f3', minHeight: '100vh' }}
      >
        <div className="w-full mx-auto" style={{ maxWidth: '580px' }}>

          <div className="mb-7">
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              담당 업무를 선택하세요
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              업무 유형에 맞는 전문 법령 해석을 제공합니다
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>서버 연결 중...</p>
            </div>
          ) : error ? (
            <div
              className="rounded-2xl border px-6 py-5 text-center"
              style={{ borderColor: '#fecaca', background: '#fef2f2' }}
            >
              <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg px-4 py-1.5 text-xs font-medium text-white"
                style={{ background: '#dc2626' }}
              >
                다시 시도
              </button>
            </div>
          ) : (
            <>
              <PersonaSelector personas={personas} selected={selected} onSelect={setSelected} />

              <div className="mt-7 flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {selected ? '선택 완료 — 시작하기를 눌러주세요' : '업무 카드를 선택하세요'}
                </p>
                <button
                  onClick={handleStart}
                  disabled={!selected}
                  className="flex items-center gap-2 rounded-xl px-7 py-2.5 text-sm font-bold transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{
                    background: selected ? 'linear-gradient(135deg, #1a3a5c, #2a5d87)' : '#cec9c0',
                    color: '#fff',
                    boxShadow: selected ? '0 4px 14px rgba(26,58,92,0.28)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (selected) e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                  }}
                >
                  시작하기
                  <ChevronRight size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
