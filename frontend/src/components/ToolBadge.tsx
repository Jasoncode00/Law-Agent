'use client';

import { Wrench, CheckCircle2, Loader2 } from 'lucide-react';
import { ToolEvent, ToolResultEvent } from '@/lib/types';

interface Props {
  toolCalls: ToolEvent[];
  toolResults: ToolResultEvent[];
  isStreaming?: boolean;
}

export default function ToolBadge({ toolCalls, toolResults, isStreaming }: Props) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {toolCalls.map((tc, i) => {
        const isDone = toolResults?.some((r) => r.name === tc.name);
        const isPending = !isDone && isStreaming;
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              background: isDone ? '#f0fdf4' : 'var(--color-tool-bg)',
              border: `1px solid ${isDone ? '#bbf7d0' : 'var(--color-tool-border)'}`,
              color: isDone ? '#15803d' : 'var(--color-tool-text)',
            }}
          >
            {isPending ? (
              <Loader2 size={11} className="animate-spin" />
            ) : isDone ? (
              <CheckCircle2 size={11} />
            ) : (
              <Wrench size={11} />
            )}
            {tc.name}
          </span>
        );
      })}
    </div>
  );
}
