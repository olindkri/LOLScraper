import { useGameData } from './hooks/useGameData';
import HeroStats from './components/HeroStats';
import PlayerGrid from './components/PlayerGrid';
import Leaderboard from './components/Leaderboard';

function timeAgo(isoString) {
  if (!isoString) return 'unknown';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 minute ago';
  return `${diff} minutes ago`;
}

export default function App() {
  const { players, group, loading } = useGameData();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <span
          className="text-lg animate-pulse"
          style={{ color: 'var(--color-fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Loading stats...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)' }}>
      {/* Header */}
      <header
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h1
          className="text-lg font-black tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-fg)' }}
        >
          <span style={{ color: 'var(--color-accent)' }}>LOL</span> Group Tracker
        </h1>
      </header>

      {/* Hero */}
      <HeroStats group={group} />

      {/* Player grid */}
      <PlayerGrid players={players} />

      {/* Leaderboard */}
      <Leaderboard players={players} />

      {/* Footer */}
      <footer
        className="px-6 py-4 text-center text-xs"
        style={{
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-fg-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Last updated: {timeAgo(group?.lastUpdated)} · Data from leagueofgraphs.com · Updates every 30 min
      </footer>
    </div>
  );
}
