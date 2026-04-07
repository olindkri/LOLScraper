import PlayerCard from './PlayerCard';

export default function PlayerGrid({ players }) {
  if (!players) return null;

  const entries = Object.entries(players);
  if (entries.length === 0) {
    return (
      <p
        className="text-center py-8"
        style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        No player data yet.
      </p>
    );
  }

  return (
    <section className="px-4 pb-8">
      <h2
        className="uppercase tracking-[0.25em] text-xs mb-4"
        style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}
      >
        Players
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {entries.map(([id, player]) => (
          <PlayerCard key={id} playerId={id} player={player} />
        ))}
      </div>
    </section>
  );
}
