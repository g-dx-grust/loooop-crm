'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BadgeTone } from '@/components/ui/badge';

interface AiScoreCellProps {
  opportunityId: string;
  customerId: string;
  aiScore: string | null;
  aiScoreReason: string | null;
}

function scoreTone(score: string | null): BadgeTone {
  switch (score) {
    case 'A':
      return 'success';
    case 'B':
      return 'warning';
    case 'C':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function AiScoreCell({
  opportunityId,
  customerId,
  aiScore: initialScore,
  aiScoreReason: initialReason,
}: AiScoreCellProps) {
  const [score, setScore] = useState<string | null>(initialScore);
  const [reason, setReason] = useState<string | null>(initialReason);
  const [loading, setLoading] = useState(false);

  const handleScore = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/score-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, opportunityId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { score: string; reason: string };
        setScore(data.score);
        setReason(data.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  if (score) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge tone={scoreTone(score)} withDot={false}>
          {score}
        </Badge>
        {reason ? (
          <span
            className="max-w-[160px] truncate text-xs text-text-tertiary"
            title={reason}
          >
            {reason}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleScore}
          className="text-text-tertiary hover:text-brand-primary disabled:opacity-50"
          title="再スコアリング"
          disabled={loading}
          aria-label="AIスコアを再判定"
        >
          <Sparkles size={12} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleScore}
      loading={loading}
      className="h-6 gap-1 px-2 text-xs"
    >
      <Sparkles size={12} aria-hidden />
      AI判定
    </Button>
  );
}
