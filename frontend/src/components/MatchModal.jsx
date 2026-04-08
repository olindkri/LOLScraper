import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { TRACKED_GAMERTAGS } from '../trackedPlayers';
import ChampionBadge from './ChampionBadge';

export default function MatchModal({ matchId, onClose }) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setMatch(null);
    setError(null);
    get(ref(db, `/matches/${matchId}`))
      .then(snapshot => {
        const data = snapshot.val();
        if (!data) setError('Match data unavailable.');
        else setMatch(data);
      })
      .catch(() => setError('Failed to load match data.'))
      .finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [matchId, onClose]);

  if (!matchId) return null;

  const team1 = (match?.participants ?? []).filter(p => p.team === 1);
  const team2 = (match?.participants ?? []).filter(p => p.team === 2);
  const totalKills = match ? match.team1Kills + match.team2Kills : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Match detail"
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.80)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        key={matchId}
        onClick={e => e.stopPropagation()}
        className="modal-content"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-hi)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
          animation: 'modalEnter 200ms ease-out forwards',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          background: 'var(--card)',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--fg)', letterSpacing: '0.05em' }}>
              MATCH DETAIL
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)' }}>
              #{matchId}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close match detail"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
              color: 'var(--fg-dim)', cursor: 'pointer', padding: '4px 10px',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hi)'; e.currentTarget.style.color = 'var(--fg)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-dim)'; }}
          >
            ESC
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '48px' }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: 'var(--loss)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '48px' }}>
              {error}
            </div>
          )}
          {match && (
            <div className="modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TeamColumn
                title="Team 1"
                players={team1}
                teamKills={match.team1Kills}
                totalKills={totalKills}
                won={match.team1Won != null ? match.team1Won === true : null}
              />
              <TeamColumn
                title="Team 2"
                players={team2}
                teamKills={match.team2Kills}
                totalKills={totalKills}
                won={match.team1Won != null ? match.team1Won === false : null}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function TeamColumn({ title, players, teamKills, totalKills, won }) {
  const hasResult = won !== null;
  const color = won === true ? 'var(--win)' : won === false ? 'var(--loss)' : 'var(--fg-dim)';
  const glow = won === true ? 'var(--win-soft)' : won === false ? 'var(--loss-soft)' : 'transparent';
  const killPct = totalKills > 0 ? Math.round((teamKills / totalKills) * 100) : 0;

  return (
    <div>
      {/* Team header */}
      <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        {hasResult ? (
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
            color,
            textShadow: `0 0 16px ${glow}`,
            marginBottom: '8px',
          }}>
            {won ? 'VICTORY' : 'DEFEAT'}
          </div>
        ) : (
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.6rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
            marginBottom: '8px',
          }}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color, lineHeight: 1 }}>
            {teamKills}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)' }}>kills</span>
          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${killPct}%`, height: '100%',
              background: color, borderRadius: '3px',
              transition: 'width 400ms ease',
            }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', minWidth: '28px', textAlign: 'right' }}>
            {killPct}%
          </span>
        </div>
      </div>

      {/* Player cards */}
      {players.map((p) => (
        <ParticipantRow key={`${p.team}-${p.summonerName}`} participant={p} teamKills={teamKills} teamColor={color} />
      ))}
    </div>
  );
}

function ParticipantRow({ participant, teamKills, teamColor }) {
  const isTracked = TRACKED_GAMERTAGS.has(participant.summonerName);
  const score = participant.score ?? 0;
  const scoreBg = score >= 7 ? 'var(--win)' : score >= 4 ? 'var(--gold)' : 'var(--loss)';
  const kp = teamKills > 0
    ? Math.min(100, Math.round(((participant.kills + participant.assists) / teamKills) * 100))
    : 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '6px',
      padding: '10px 12px',
      borderRadius: '6px',
      marginBottom: '6px',
      background: isTracked ? 'var(--accent-soft)' : 'var(--surface)',
      borderLeft: `3px solid ${isTracked ? 'var(--accent)' : 'transparent'}`,
    }}>
      {/* Row 1: Champion + Summoner name + Score badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ChampionBadge
          championName={participant.champion}
          size={22}
          textStyle={{
            color: 'var(--fg)',
            fontFamily: 'var(--font-data)',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          color: isTracked ? 'var(--fg)' : 'var(--fg-muted)',
          fontWeight: isTracked ? 600 : 400,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {participant.summonerName}
        </span>
        <span style={{
          background: scoreBg, color: '#fff',
          fontFamily: 'var(--font-head)', fontSize: '0.65rem',
          padding: '2px 7px', borderRadius: '3px', flexShrink: 0,
        }}>
          {score}
        </span>
      </div>

      {/* Row 2: KDA · CS · Vision */}
      <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', alignItems: 'center' }}>
        <span>
          <span style={{ color: 'var(--fg)' }}>{participant.kills}</span>
          <span style={{ color: 'var(--fg-dim)' }}> / </span>
          <span style={{ color: participant.deaths >= 7 ? 'var(--loss)' : 'var(--fg)' }}>{participant.deaths}</span>
          <span style={{ color: 'var(--fg-dim)' }}> / </span>
          <span style={{ color: 'var(--fg)' }}>{participant.assists}</span>
          <span style={{ color: 'var(--fg-dim)', fontSize: '0.6rem', marginLeft: '3px' }}>KDA</span>
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {participant.cs}
          <span style={{ color: 'var(--fg-dim)', fontSize: '0.6rem', marginLeft: '2px' }}>CS</span>
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {participant.visionScore != null ? participant.visionScore : '—'}
          <span style={{ color: 'var(--fg-dim)', fontSize: '0.6rem', marginLeft: '2px' }}>VS</span>
        </span>
      </div>

      {/* Row 3: Kill participation bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-dim)', flexShrink: 0, width: '16px' }}>
          KP
        </span>
        <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${kp}%`, height: '100%',
            background: teamColor, borderRadius: '2px',
            transition: 'width 400ms ease',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-muted)', minWidth: '32px', textAlign: 'right' }}>
          {kp}%
        </span>
      </div>
    </div>
  );
}
