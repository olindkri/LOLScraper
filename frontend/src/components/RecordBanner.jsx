function TrophyIcon({ color }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 9H4a2 2 0 0 1-2-2V5h4" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5h-4" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v8a5 5 0 0 1-10 0V4Z" />
    </svg>
  );
}

function LightningIcon({ color }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function RecordCard({ icon, iconColor, glowColor, label, value, suffix, name, ariaLabel }) {
  return (
    <div
      role="region"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border-hi)',
        borderRadius: '6px',
        padding: '8px 12px',
        minWidth: '160px',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          backgroundColor: `${glowColor}18`,
          boxShadow: `0 0 10px ${glowColor}40`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Text stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
        {/* Label */}
        <span
          style={{
            fontFamily: 'var(--font-data)',
            fontSize: '0.6rem',
            color: 'var(--fg-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            lineHeight: 1,
          }}
        >
          {label}
        </span>

        {/* Value row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1.1 }}>
          <span
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: '1.3rem',
              color: 'var(--fg)',
              lineHeight: 1,
            }}
          >
            {value}
          </span>
          {suffix && (
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '0.65rem',
                color: 'var(--fg-muted)',
                letterSpacing: '0.04em',
              }}
            >
              {suffix}
            </span>
          )}
        </div>

        {/* Name */}
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--fg-dim)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}

export default function RecordBanner({ records }) {
  if (!records) return null;

  const { bestWinStreak, bestKda } = records;

  if (!bestWinStreak && !bestKda) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
      }}
    >
      {bestWinStreak && (
        <RecordCard
          icon={<TrophyIcon color="var(--gold)" />}
          iconColor="var(--gold)"
          glowColor="#f59e0b"
          label="Best Win Streak"
          value={bestWinStreak.value}
          suffix="wins"
          name={bestWinStreak.displayName}
          ariaLabel={`Best win streak: ${bestWinStreak.value} wins by ${bestWinStreak.displayName}`}
        />
      )}

      {bestKda && (
        <RecordCard
          icon={<LightningIcon color="var(--accent)" />}
          iconColor="var(--accent)"
          glowColor="#7c3aed"
          label="Best KDA"
          value={bestKda.value}
          suffix={null}
          name={bestKda.displayName}
          ariaLabel={`Best KDA: ${bestKda.value} by ${bestKda.displayName}`}
        />
      )}
    </div>
  );
}
