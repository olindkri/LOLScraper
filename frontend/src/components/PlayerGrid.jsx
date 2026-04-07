import PlayerCard from './PlayerCard';

export default function PlayerGrid({ players }) {
  if (!players) return null;

  const entries = Object.entries(players);
  if (entries.length === 0) return <p className="text-gray-500 text-center">No player data yet.</p>;

  return (
    <section className="px-4 pb-8">
      <h2 className="text-gray-400 uppercase tracking-widest text-sm mb-4">Players</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {entries.map(([id, player]) => (
          <PlayerCard key={id} playerId={id} player={player} />
        ))}
      </div>
    </section>
  );
}
