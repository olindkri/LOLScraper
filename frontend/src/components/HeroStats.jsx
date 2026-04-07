export default function HeroStats({ group }) {
  if (!group) return null;

  const { totalWins, totalLosses, winRate } = group;
  const pct = Math.round(winRate * 100);
  const totalGames = totalWins + totalLosses;

  return (
    <div className="text-center py-12 px-4">
      <p className="text-gray-400 uppercase tracking-widest text-sm mb-2">Group Win Rate</p>
      <div className="text-8xl font-black mb-4" style={{ color: pct >= 50 ? '#22c55e' : '#ef4444' }}>
        {pct}%
      </div>
      <p className="text-gray-300 text-lg mb-6">
        <span className="text-green-400 font-semibold">{totalWins}W</span>
        <span className="text-gray-500 mx-2">/</span>
        <span className="text-red-400 font-semibold">{totalLosses}L</span>
        <span className="text-gray-500 ml-2">— {totalGames} games tracked</span>
      </p>

      {/* Win rate bar */}
      <div className="max-w-lg mx-auto bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 50 ? '#22c55e' : '#ef4444',
          }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-2">50% threshold</p>
    </div>
  );
}
