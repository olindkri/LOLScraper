import { useState } from 'react';
import ChampionBadge from './ChampionBadge';

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];

function GameDot({ result }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '2px',
        backgroundColor: result === 'win' ? 'var(--win)' : 'var(--loss)',
        flexShrink: 0,
      }}
      title={result}
    />
  );
}

// Fallback map until next scraper run populates gamertag in Firebase
const GAMERTAGS = {
  oliver:   'Hopa#Hopa',
  eirik:    'ErikBby69#EUW',
  marcus:   'Easy Geometry#EUW',
  minh:     'KingOfTheWolvez#EUW',
  jon:      'Markemouse#Monke',
  daniel:   'MczExperttt#EUW',
  nontagan: 'MrHipsterYip#EUW',
  tim:      'Pamit#EUW',
  sigurd:   'Pog0p#EUW',
  simon:    'sXBLACKPHANTOMXs#2003',
  fredrik:  'XxVortexSpeedxX#3845',
};

export default function ScoreboardRow({ rank, player, isEven, onGameClick }) {
  const [expanded, setExpanded] = useState(false);
  const { id, displayName, gamertag, games = [], stats = {}, soloRank = null } = player;
  const { wins = 0, losses = 0, winRate = 0, avgKda = 0, avgCs = 0, mostPlayedChampion = '' } = stats;
  const pct = Math.round(winRate * 100);
  const isWinning = pct >= 50;
  const tag = gamertag || GAMERTAGS[id] || null;
  const rankColor = RANK_COLORS[rank - 1] ?? 'var(--fg-dim)';
  const totalGames = wins + losses;

  return (
    <>
      <tr
        onClick={() => setExpanded(v => !v)}
        style={{
          backgroundColor: expanded
            ? 'var(--card-hover)'
            : isEven
            ? 'var(--surface)'
            : 'var(--bg)',
          cursor: 'pointer',
          borderBottom: expanded ? 'none' : '1px solid var(--border)',
          transition: 'background-color 150ms ease',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.backgroundColor = 'var(--card)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = expanded ? 'var(--card-hover)' : isEven ? 'var(--surface)' : 'var(--bg)'; }}
        aria-expanded={expanded}
      >
        {/* Rank */}
        <td style={{ padding: '14px 0 14px 20px', width: '40px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: rankColor,
          }}>
            {rank <= 3
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill={rankColor} style={{ display: 'inline', verticalAlign: 'middle' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              : rank
            }
          </span>
        </td>

        {/* Name */}
        <td style={{ padding: '14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: '0.85rem',
                  color: 'var(--fg)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.2,
                }}>
                  {displayName}
                </span>
                {soloRank && (() => {
                  const tierLabel = soloRank.tier.charAt(0).toUpperCase() + soloRank.tier.slice(1);
                  const rankLabel = soloRank.division ? `${tierLabel} ${soloRank.division}` : tierLabel;
                  const src = `/ranks/emblem-${soloRank.tier}.png`;
                  return (
                    <img
                      src={src}
                      alt={rankLabel}
                      title={`${rankLabel} — ${soloRank.lp} LP`}
                      width={100}
                      height={100}
                      style={{ flexShrink: 0 }}
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  );
                })()}
              </div>
              {tag && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--fg-dim)',
                  letterSpacing: '0.02em',
                  marginTop: '1px',
                }}>
                  {tag}
                </div>
              )}
            </div>
            {expanded && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="18 15 12 9 6 15" />
              </svg>
            )}
            {!expanded && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </div>
        </td>

        {/* Win rate */}
        <td style={{ padding: '14px 12px', width: '120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: isWinning ? 'var(--win)' : 'var(--loss)',
              minWidth: '38px',
            }}>
              {pct}%
            </span>
            <div style={{ flex: 1, height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', minWidth: '40px' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: isWinning ? 'var(--win)' : 'var(--loss)',
                borderRadius: '2px',
              }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', marginTop: '2px' }}>
            {wins}W · {losses}L · {totalGames}G
          </div>
        </td>

        {/* Game history dots */}
        <td style={{ padding: '14px 12px' }}>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            {games.length > 0
              ? games.slice(0, 15).map((g, i) => <GameDot key={i} result={g.result} />)
              : <span style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>no data</span>
            }
          </div>
        </td>

        {/* KDA */}
        <td style={{ padding: '14px 12px', width: '60px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
            {avgKda}
          </span>
          <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>KDA</div>
        </td>

        {/* CS */}
        <td style={{ padding: '14px 12px', width: '60px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
            {avgCs}
          </span>
          <div style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)' }}>CS/G</div>
        </td>

        {/* Champion */}
        <td style={{ padding: '14px 20px 14px 12px' }}>
          {mostPlayedChampion
            ? (
              <ChampionBadge
                championName={mostPlayedChampion}
                size={20}
                textStyle={{
                  fontSize: '0.78rem',
                  color: 'var(--fg-muted)',
                  fontFamily: 'var(--font-data)',
                }}
              />
            )
            : <span style={{ fontSize: '0.7rem', color: 'var(--fg-dim)' }}>—</span>
          }
        </td>
      </tr>

      {/* Expanded game table */}
      {expanded && games.length > 0 && (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <td colSpan={7} style={{ padding: '0', backgroundColor: 'var(--card-hover)' }}>
            <div style={{ borderTop: '1px solid var(--border-hi)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--card)', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                    <th style={{ padding: '8px 12px 8px 24px', textAlign: 'left' }}>Result</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Champion</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>K / D / A</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>CS</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g, i) => {
                    const clickable = !!g.matchId && !!onGameClick;
                    const baseRowColor = i % 2 === 0 ? 'transparent' : 'var(--surface)';
                    return (
                      <tr
                        key={i}
                        onClick={clickable ? () => onGameClick(g.matchId) : undefined}
                        style={{
                          borderTop: '1px solid var(--border)',
                          backgroundColor: baseRowColor,
                          cursor: clickable ? 'pointer' : 'default',
                          transition: 'background-color 150ms ease',
                        }}
                        onMouseEnter={clickable ? e => { e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'; } : undefined}
                        onMouseLeave={clickable ? e => { e.currentTarget.style.backgroundColor = baseRowColor; } : undefined}
                      >
                        <td style={{ padding: '8px 12px 8px 24px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: g.result === 'win' ? 'var(--win)' : 'var(--loss)',
                            fontWeight: 600,
                          }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '1px', backgroundColor: g.result === 'win' ? 'var(--win)' : 'var(--loss)', display: 'inline-block', flexShrink: 0 }} />
                            {g.result === 'win' ? 'WIN' : 'LOSS'}
                            {g.lpDelta != null && (
                              <span style={{ fontWeight: 700 }}>
                                {g.lpDelta > 0 ? `+${g.lpDelta}` : g.lpDelta}
                              </span>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--fg)' }}>
                          <ChampionBadge
                            championName={g.champion}
                            championSlug={g.championSlug}
                            size={18}
                            textStyle={{
                              color: 'var(--fg)',
                              fontFamily: 'var(--font-data)',
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--fg-muted)' }}>
                          <span style={{ color: 'var(--fg)' }}>{g.kills}</span>
                          <span style={{ color: 'var(--fg-dim)' }}> / </span>
                          <span style={{ color: g.deaths >= 7 ? 'var(--loss)' : 'var(--fg)' }}>{g.deaths}</span>
                          <span style={{ color: 'var(--fg-dim)' }}> / </span>
                          <span style={{ color: 'var(--fg)' }}>{g.assists}</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--fg-muted)' }}>{g.cs}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--fg-dim)' }}>{g.duration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
