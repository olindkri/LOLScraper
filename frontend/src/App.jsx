import { useGameData } from './hooks/useGameData';
import ScoreboardRow from './components/ScoreboardRow';

function timeAgo(isoString) {
  if (!isoString) return null;
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1m ago';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

export default function App() {
  const { players, group, loading } = useGameData();

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        {/* Skeleton shimmer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '480px', padding: '0 24px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              height: '52px',
              borderRadius: '4px',
              background: 'var(--surface)',
              opacity: 1 - i * 0.12,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }`}</style>
        </div>
      </div>
    );
  }

  const sorted = players
    ? Object.entries(players)
        .map(([id, p]) => ({ id, ...p }))
        .filter(p => (p.stats?.wins ?? 0) + (p.stats?.losses ?? 0) > 0)
        .sort((a, b) => (b.stats?.winRate ?? 0) - (a.stats?.winRate ?? 0))
    : [];

  const totalWins = group?.totalWins ?? 0;
  const totalLosses = group?.totalLosses ?? 0;
  const pct = group ? Math.round(group.winRate * 100) : 0;
  const totalGames = totalWins + totalLosses;
  const isWinning = pct >= 50;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        flexWrap: 'wrap',
        minHeight: '64px',
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '28px', borderRight: '1px solid var(--border)', marginRight: '28px', alignSelf: 'stretch', paddingTop: '12px', paddingBottom: '12px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, var(--accent), #a855f7)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px var(--accent-soft)',
            flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--fg)' }}>
            GROUP TRACKER
          </span>
        </div>

        {/* Group win rate hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, flexWrap: 'wrap', paddingTop: '12px', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-head)',
              fontSize: '2rem',
              color: isWinning ? 'var(--win)' : 'var(--loss)',
              lineHeight: 1,
              letterSpacing: '0.02em',
              textShadow: isWinning ? '0 0 24px var(--win-soft)' : '0 0 24px var(--loss-soft)',
            }}>
              {pct}%
            </span>
            <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.65rem', color: 'var(--fg-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Group W/R
            </span>
          </div>

          {/* W / L counts */}
          <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            <span><span style={{ color: 'var(--win)', fontWeight: 600 }}>{totalWins}</span><span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem' }}> W</span></span>
            <span style={{ color: 'var(--border-hi)' }}>·</span>
            <span><span style={{ color: 'var(--loss)', fontWeight: 600 }}>{totalLosses}</span><span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem' }}> L</span></span>
            <span style={{ color: 'var(--border-hi)' }}>·</span>
            <span style={{ color: 'var(--fg-muted)' }}>{totalGames}<span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem' }}> games</span></span>
          </div>

          {/* Win rate bar */}
          <div style={{ flex: 1, maxWidth: '180px', height: '4px', background: 'var(--border)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: '0 auto 0 0',
              width: `${pct}%`,
              background: isWinning ? 'var(--win)' : 'var(--loss)',
              borderRadius: '2px',
              transition: 'width 600ms ease',
            }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'var(--fg-dim)' }} />
          </div>
        </div>

        {/* Updated timestamp */}
        {group?.lastUpdated && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', paddingLeft: '16px', alignSelf: 'center' }}>
            {timeAgo(group.lastUpdated)}
          </div>
        )}
      </header>

      {/* ── Scoreboard ── */}
      <main style={{ flex: 1, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
          <thead>
            <tr style={{
              background: 'var(--surface)',
              borderBottom: '2px solid var(--accent)',
              fontFamily: 'var(--font-data)',
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-dim)',
            }}>
              <th style={{ padding: '10px 0 10px 20px', width: '40px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Player</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '160px' }}>Win Rate</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Last 10 Games</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '60px' }}>KDA</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', width: '60px' }}>CS</th>
              <th style={{ padding: '10px 20px 10px 12px', textAlign: 'left' }}>Top Champ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  No data yet — scraper runs every 30 minutes
                </td>
              </tr>
            ) : (
              sorted.map((p, i) => (
                <ScoreboardRow
                  key={p.id}
                  rank={i + 1}
                  player={p}
                  isEven={i % 2 === 0}
                />
              ))
            )}
          </tbody>
        </table>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '10px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color: 'var(--fg-dim)',
        flexWrap: 'wrap',
        gap: '4px',
      }}>
        <span>Solo/Duo only · last 10 ranked games per player · data from leagueofgraphs.com</span>
        <span>auto-refresh every 30 min</span>
      </footer>
    </div>
  );
}
