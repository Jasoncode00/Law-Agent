'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Persona, PersonaId } from '@/lib/types';
import { fetchPersonas } from '@/lib/api';
import PersonaSelector from '@/components/PersonaSelector';
import { Compass, ChevronRight, Loader2, BookOpen, Sparkles, Shield } from 'lucide-react';

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
    <div
      className="flex min-h-screen flex-col items-center px-4 py-8"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)',
      }}
    >
      {/* 중앙 콘텐츠 영역 */}
      <div className="flex flex-1 flex-col items-center justify-center w-full gap-8">

      {/* 헤더 섹션 */}
      <div className="flex flex-col items-center gap-3 text-center">
        {/* 커스텀 로고 (SK 로고 모티프 결합) */}
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-full opacity-20 blur-2xl"
            style={{ background: 'linear-gradient(135deg, #e11d48, #f59e0b)' }}
          />
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #0f2540 0%, #1a3a5c 100%)',
              boxShadow: '0 12px 40px rgba(26, 58, 92, 0.35)',
            }}
          >
            {/* 저울 아이콘 위에 SK 날개 형태를 오마주한 포인트 추가 */}
            <div className="absolute top-2 right-2 flex gap-0.5">
              <div className="h-2 w-4 rounded-full bg-[#e11d48] transform rotate-45" />
              <div className="h-2 w-3 rounded-full bg-[#f59e0b] transform rotate-45" />
            </div>
            
            <div className="flex flex-col items-center">
              <Compass size={42} color="#fff" strokeWidth={1.5} />
              <div className="mt-[-6px] flex gap-1 items-end">
                <div className="w-2 h-3 bg-white/40 rounded-sm" />
                <div className="w-2 h-5 bg-white/60 rounded-sm" />
                <div className="w-2 h-2 bg-white/40 rounded-sm" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h1
            className="text-4xl font-black tracking-tighter"
            style={{ 
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em'
            }}
          >
            <span style={{ color: 'var(--color-primary)' }}>Law Navigator</span>
          </h1>
          <p
            className="mt-2 text-base font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            EPC 법령의 길을 안내하는 스마트 내비게이터
          </p>
        </div>

        {/* 특징 배지 */}
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          <span className="home-badge">
            <BookOpen size={13} />
            국가법령정보 실시간 검색
          </span>
          <span className="home-badge">
            <Sparkles size={13} />
            AI 법령 해석
          </span>
          <span className="home-badge">
            <Shield size={13} />
            판례 · 행정심판 · 법령해석
          </span>
        </div>
      </div>

      {/* 페르소나 선택 영역 */}
      <div className="w-full" style={{ maxWidth: '800px' }}>
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2
              size={32}
              className="animate-spin"
              style={{ color: 'var(--color-primary)' }}
            />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              서버 연결 중...
            </p>
          </div>
        ) : error ? (
          <div
            className="rounded-2xl border px-6 py-5 text-center"
            style={{ borderColor: '#fecaca', background: '#fef2f2' }}
          >
            <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
              {error}
            </p>
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
            <p
              className="mb-2 text-center text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              담당 업무를 선택하세요
            </p>

            <PersonaSelector
              personas={personas}
              selected={selected}
              onSelect={setSelected}
            />

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleStart}
                disabled={!selected}
                className="flex items-center gap-2 rounded-2xl px-10 py-3.5 text-sm font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: selected
                    ? 'linear-gradient(135deg, #1a3a5c, #2a5d87)'
                    : '#cec9c0',
                  color: '#fff',
                  boxShadow: selected
                    ? '0 6px 20px rgba(26, 58, 92, 0.35)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (selected) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                }}
              >
                시작하기
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      </div>{/* /중앙 콘텐츠 영역 */}

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        © 2026 SK에코플랜트. AI 답변은 참고용이며 법적 효력이 없습니다.
      </p>
    </div>
  );
}
