export default function Leaderboard({ players }) {
  if (!players) return null;

  const sorted = Object.entries(players)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => (p.stats?.wins ?? 0) + (p.stats?.losses ?? 0) > 0)
    .sort((a, b) => (b.stats?.winRate ?? 0) - (a.stats?.winRate ?? 0));

  if (sorted.length === 0) return null;

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <section className="px-4 pb-12">
      <h2 className="text-gray-400 uppercase tracking-widest text-sm mb-4">Leaderboard</h2>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden max-w-lg">
        {sorted.map((p, i) => {
          const pct = Math.round((p.stats?.winRate ?? 0) * 100);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 border-b border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{MEDAL[i] ?? `${i + 1}.`}</span>
                <span className="font-semibold text-white">{p.displayName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>
                  <span className="text-green-400">{p.stats?.wins ?? 0}W</span>
                  {' / '}
                  <span className="text-red-400">{p.stats?.losses ?? 0}L</span>
                </span>
                <span
                  className="font-bold"
                  style={{ color: pct >= 50 ? '#4ade80' : '#f87171' }}
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
