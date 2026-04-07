import { useState } from 'react';

function WinDot({ result }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full"
      style={{ backgroundColor: result === 'win' ? '#22c55e' : '#ef4444' }}
      title={result}
    />
  );
}

export default function PlayerCard({ playerId, player }) {
  const [expanded, setExpanded] = useState(false);
  const { displayName, games = [], stats = {} } = player;
  const { wins = 0, losses = 0, winRate = 0, avgKda = 0, avgCs = 0, mostPlayedChampion = '' } = stats;
  const pct = Math.round(winRate * 100);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Card header */}
      <button
        className="w-full text-left p-4 transition-colors hover:bg-gray-700"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-white text-lg">{displayName}</span>
          <span
            className="text-sm font-semibold px-2 py-1 rounded"
            style={{
              backgroundColor: pct >= 50 ? '#16532d' : '#7f1d1d',
              color: pct >= 50 ? '#4ade80' : '#fca5a5',
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
          {games.length === 0 && <span className="text-gray-500 text-xs">No ranked games</span>}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          <span><span className="text-green-400">{wins}W</span> / <span className="text-red-400">{losses}L</span></span>
          <span>KDA: <span className="text-white">{avgKda}</span></span>
          <span>CS: <span className="text-white">{avgCs}</span></span>
          {mostPlayedChampion && <span>⚔ <span className="text-yellow-400">{mostPlayedChampion}</span></span>}
        </div>
      </button>

      {/* Expanded game table */}
      {expanded && games.length > 0 && (
        <div className="border-t border-gray-700 overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="bg-gray-900 text-gray-500 text-xs uppercase">
                <th className="text-left px-4 py-2">Result</th>
                <th className="text-left px-4 py-2">Champion</th>
                <th className="text-center px-4 py-2">K/D/A</th>
                <th className="text-center px-4 py-2">CS</th>
                <th className="text-center px-4 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => (
                <tr key={i} className="border-t border-gray-700 hover:bg-gray-700">
                  <td className="px-4 py-2">
                    <span style={{ color: g.result === 'win' ? '#4ade80' : '#f87171' }}>
                      {g.result === 'win' ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{g.champion || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {g.kills}/{g.deaths}/{g.assists}
                  </td>
                  <td className="px-4 py-2 text-center">{g.cs}</td>
                  <td className="px-4 py-2 text-center text-gray-500">{g.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
