import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../firebase';
import { TRACKED_GAMERTAGS } from '../trackedPlayers';

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
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [matchId, onClose]);

  if (!matchId) return null;

  const team1 = match ? match.participants.filter(p => p.team === 1) : [];
  const team2 = match ? match.participants.filter(p => p.team === 2) : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Match detail"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border-hi)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.85rem', color: 'var(--fg)', letterSpacing: '0.05em' }}>
              MATCH DETAIL
            </span>
            {match && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', marginLeft: '12px' }}>
                Team 1: <span style={{ color: 'var(--win)' }}>{match.team1Kills}</span> kills
                {' · '}
                Team 2: <span style={{ color: 'var(--loss)' }}>{match.team2Kills}</span> kills
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close match detail"
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
              color: 'var(--fg-dim)', cursor: 'pointer', padding: '4px 10px',
              fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
            }}
          >
            ESC
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '32px' }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ textAlign: 'center', color: 'var(--loss)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '32px' }}>
              {error}
            </div>
          )}
          {match && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <TeamColumn title="Team 1" players={team1} killColor="var(--win)" />
              <TeamColumn title="Team 2" players={team2} killColor="var(--loss)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamColumn({ title, players, killColor }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-data)', fontSize: '0.6rem', letterSpacing: '0.12em',
        textTransform: 'uppercase', color: killColor, marginBottom: '8px', paddingLeft: '12px',
      }}>
        {title}
      </div>
      {players.map((p, i) => <ParticipantRow key={i} participant={p} />)}
    </div>
  );
}

function ParticipantRow({ participant }) {
  const isTracked = TRACKED_GAMERTAGS.has(participant.summonerName);
  const score = participant.score ?? 0;
  const scoreBg = score >= 5 ? 'var(--win)' : score >= 3 ? 'var(--gold)' : 'var(--loss)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '8px 12px',
      borderRadius: '4px',
      marginBottom: '4px',
      background: isTracked ? 'var(--accent-soft)' : 'transparent',
      borderLeft: isTracked ? '3px solid var(--accent)' : '3px solid transparent',
    }}>
      {/* Champion */}
      <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: 'var(--fg)', minWidth: '72px' }}>
        {participant.champion || '—'}
      </span>

      {/* Name */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
        color: isTracked ? 'var(--fg)' : 'var(--fg-muted)',
        fontWeight: isTracked ? 600 : 400,
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {participant.summonerName}
      </span>

      {/* KDA */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--fg)' }}>{participant.kills}</span>
        <span>/</span>
        <span style={{ color: participant.deaths >= 7 ? 'var(--loss)' : 'var(--fg)' }}>{participant.deaths}</span>
        <span>/</span>
        <span style={{ color: 'var(--fg)' }}>{participant.assists}</span>
      </span>

      {/* CS */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-dim)', minWidth: '36px', textAlign: 'right' }}>
        {participant.cs}
      </span>

      {/* Score badge */}
      <span style={{
        background: scoreBg, color: '#fff',
        fontFamily: 'var(--font-head)', fontSize: '0.65rem',
        padding: '2px 6px', borderRadius: '3px',
        minWidth: '36px', textAlign: 'center',
      }}>
        {score}
      </span>
    </div>
  );
}
