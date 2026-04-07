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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg animate-pulse">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-yellow-400">LOL</span> Group Tracker
        </h1>
      </header>

      {/* Hero */}
      <HeroStats group={group} />

      {/* Player grid */}
      <PlayerGrid players={players} />

      {/* Leaderboard */}
      <Leaderboard players={players} />

      {/* Footer */}
      <footer className="border-t border-gray-700 px-6 py-4 text-center text-gray-500 text-sm">
        Last updated: {timeAgo(group?.lastUpdated)} · Data from leagueofgraphs.com · Updates every 30 min
      </footer>
    </div>
  );
}
