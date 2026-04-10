import { useState, useEffect } from 'react';

const CIRCUMFERENCE = 87.96; // 2π × 14
const ARC = 65.97;           // (270 / 360) × CIRCUMFERENCE

function rankLabel(rank) {
  if (rank === 1) return 'MVP';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = e => setReduce(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduce;
}

export default function ScoreWidget({ score, rank }) {
  const reducedMotion = useReducedMotion();
  const display = Math.round((score ?? 0) * 10);
  const arcColor = display >= 70
    ? 'var(--win)'
    : display >= 40
    ? 'var(--gold)'
    : 'var(--loss)';
  const offset = ARC * (1 - (score ?? 0) / 10);
  const label = rankLabel(rank ?? 10);

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--surface)',
      borderRadius: '20px',
      padding: '4px 6px 4px 10px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '2px' }}>
        <span style={{
          fontFamily: 'var(--font-head)', fontSize: '1.1rem',
          color: arcColor, lineHeight: 1,
        }}>
          {display}
        </span>
        <span style={{
          fontFamily: 'var(--font-data)', fontSize: '0.6rem',
          color: 'var(--fg-muted)', lineHeight: 1, marginTop: '2px',
        }}>
          {label}
        </span>
      </div>

      <svg
        width="40" height="40"
        viewBox="0 0 40 40"
        role="img"
        aria-label={`Score: ${display} out of 100 — ${label}`}
      >
        {/* Background track */}
        <circle
          cx="20" cy="20" r="14"
          fill="none"
          stroke="var(--border)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          transform="rotate(-225 20 20)"
        />
        {/* Active fill arc */}
        <circle
          cx="20" cy="20" r="14"
          fill="none"
          stroke={arcColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          transform="rotate(-225 20 20)"
          style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 400ms ease' }}
        />
        {/* Center button */}
        <circle cx="20" cy="20" r="10" fill="var(--surface)" />
      </svg>
    </div>
  );
}
