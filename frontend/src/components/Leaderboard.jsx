function RankBadge({ rank }) {
  const colors = {
    1: { bg: '#854d0e40', border: '#ca8a0430', text: '#fbbf24' },
    2: { bg: '#37415140', border: '#64748b30', text: '#94a3b8' },
    3: { bg: '#431407 40', border: '#c2410c30', text: '#fb923c' },
  };
  const style = colors[rank] ?? { bg: 'transparent', border: 'var(--color-border)', text: 'var(--color-fg-muted)' };

  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold"
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.text,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {rank}
    </span>
  );
}

export default function Leaderboard({ players }) {
  if (!players) return null;

  const sorted = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => (p.stats?.wins ?? 0) + (p.stats?.losses ?? 0) > 0)
    .sort((a, b) => (b.stats?.winRate ?? 0) - (a.stats?.winRate ?? 0));

  if (sorted.length === 0) return null;

  return (
    <section className="px-4 pb-12">
      <h2
        className="uppercase tracking-[0.25em] text-xs mb-4"
        style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        Leaderboard
      </h2>
      <div
        className="rounded-xl overflow-hidden max-w-lg"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {sorted.map((p, i) => {
          const pct = Math.round((p.stats?.winRate ?? 0) * 100);
          const isWinning = pct >= 50;
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center gap-3">
                <RankBadge rank={i + 1} />
                <span
                  className="font-semibold"
                  style={{ color: 'var(--color-fg)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}
                >
                  {p.displayName}
                </span>
              </div>
              <div
                className="flex items-center gap-3 text-sm"
                style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}
              >
                <span>
                  <span style={{ color: 'var(--color-win)' }}>{p.stats?.wins ?? 0}W</span>
                  <span className="opacity-40 mx-1">/</span>
                  <span style={{ color: 'var(--color-loss)' }}>{p.stats?.losses ?? 0}L</span>
                </span>
                <span
                  className="font-bold"
                  style={{ color: isWinning ? 'var(--color-win)' : 'var(--color-loss)' }}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
