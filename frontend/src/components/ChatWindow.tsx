'use client';

import { useEffect, useRef } from 'react';
import { ChatEntry } from '@/hooks/useChat';
import MessageBubble from './MessageBubble';
import { Scale } from 'lucide-react';

interface Props {
  entries: ChatEntry[];
  onViewArticle: (lawName: string, articleId: string) => void;
  onSend?: (text: string) => void;
}

export default function ChatWindow({ entries, onViewArticle, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-3"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Scale size={40} strokeWidth={1.2} />
        <p className="text-sm">법령에 대해 궁금한 것을 질문하세요.</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      style={{ userSelect: 'text', WebkitUserSelect: 'text' } as React.CSSProperties}
    >
      {entries.map((entry, i) => {
        const prevUserMsg = entry.role === 'assistant'
          ? entries.slice(0, i).reverse().find((e) => e.role === 'user')?.content
          : undefined;
        return (
          <MessageBubble
            key={i}
            entry={entry}
            onViewArticle={onViewArticle}
            onSend={onSend}
            onRetry={prevUserMsg ? () => onSend?.(prevUserMsg) : undefined}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
