'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

/* 자주 쓰는 질문 예시 - 수정하세요 */
const QUICK_QUESTIONS = [
  '내화구조 기준 알려줘',
  '중대재해처벌법 주요 내용은?',
  '국가계약법 입찰 자격 요건은?',
];

export default function ChatInput({ onSend, onStop, isLoading, disabled }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  return (
    <div className="border-t px-4 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      {/* 빠른 질문 버튼 */}
      {!isLoading && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { onSend(q); }}
              className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-blue-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div
        className="flex items-center gap-2 rounded-2xl border px-3 py-2"
        style={{ borderColor: 'var(--color-border)', background: '#f8fafc' }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled || isLoading}
          placeholder="법령 관련 질문을 입력하세요... (Shift+Enter: 줄바꿈)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-text-primary)', maxHeight: '160px' }}
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="rounded-xl p-2 transition-colors hover:bg-red-50"
            style={{ color: '#dc2626' }}
            title="중지"
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="rounded-xl p-2 transition-colors disabled:opacity-30"
            style={{
              background: text.trim() ? 'var(--color-primary)' : 'transparent',
              color: text.trim() ? '#fff' : 'var(--color-text-muted)',
            }}
            title="전송 (Enter)"
          >
            <Send size={18} />
          </button>
        )}
      </div>
      <p className="mt-1 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        AI 답변은 참고용입니다. 중요한 사항은 관련 법령 원문을 확인하세요.
      </p>
    </div>
  );
}
