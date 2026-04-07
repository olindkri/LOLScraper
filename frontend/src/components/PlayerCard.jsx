import { useState } from 'react';

function WinDot({ result }) {
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full"
      style={{ backgroundColor: result === 'win' ? 'var(--color-win)' : 'var(--color-loss)' }}
      title={result}
    />
  );
}

function SwordIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  );
}

export default function PlayerCard({ playerId, player }) {
  const [expanded, setExpanded] = useState(false);
  const { displayName, games = [], stats = {} } = player;
  const { wins = 0, losses = 0, winRate = 0, avgKda = 0, avgCs = 0, mostPlayedChampion = '' } = stats;
  const pct = Math.round(winRate * 100);
  const isWinning = pct >= 50;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
    >
      {/* Card header */}
      <button
        className="w-full text-left p-4 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ focusVisibleRingColor: 'var(--color-win)' }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-bold text-lg"
            style={{ color: 'var(--color-fg)', fontFamily: 'var(--font-display)' }}
          >
            {displayName}
          </span>
          <span
            className="text-xs font-semibold px-2 py-1 rounded"
            style={{
              backgroundColor: isWinning ? '#14532d40' : '#7f1d1d40',
              color: isWinning ? 'var(--color-win)' : 'var(--color-loss)',
              border: `1px solid ${isWinning ? '#22c55e30' : '#ef444430'}`,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Win/loss dots */}
        <div className="flex gap-1 mb-3">
          {games.map((g, i) => (
            <WinDot key={i} result={g.result} />
          ))}
          {games.length === 0 && (
            <span className="text-xs" style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}>
              No ranked games
            </span>
          )}
        </div>

        <div
          className="flex flex-wrap gap-4 text-sm"
          style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          <span>
            <span style={{ color: 'var(--color-win)' }}>{wins}W</span>
            <span className="opacity-40 mx-1">/</span>
            <span style={{ color: 'var(--color-loss)' }}>{losses}L</span>
          </span>
          <span>KDA <span style={{ color: 'var(--color-fg)' }}>{avgKda}</span></span>
          <span>CS <span style={{ color: 'var(--color-fg)' }}>{avgCs}</span></span>
          {mostPlayedChampion && (
            <span className="flex items-center gap-1">
              <SwordIcon />
              <span style={{ color: 'var(--color-fg)' }}>{mostPlayedChampion}</span>
            </span>
          )}
        </div>
      </button>

      {/* Expanded game table */}
      {expanded && games.length > 0 && (
        <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr
                className="uppercase text-xs"
                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-fg-muted)' }}
              >
                <th className="text-left px-4 py-2">Result</th>
                <th className="text-left px-4 py-2">Champion</th>
                <th className="text-center px-4 py-2">K/D/A</th>
                <th className="text-center px-4 py-2">CS</th>
                <th className="text-center px-4 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => (
                <tr
                  key={i}
                  style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-fg-muted)' }}
                  className="transition-colors hover:bg-white/5"
                >
                  <td className="px-4 py-2">
                    <span style={{ color: g.result === 'win' ? 'var(--color-win)' : 'var(--color-loss)' }}>
                      {g.result === 'win' ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td className="px-4 py-2" style={{ color: 'var(--color-fg)' }}>{g.champion || '—'}</td>
                  <td className="px-4 py-2 text-center">{g.kills}/{g.deaths}/{g.assists}</td>
                  <td className="px-4 py-2 text-center">{g.cs}</td>
                  <td className="px-4 py-2 text-center opacity-50">{g.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
