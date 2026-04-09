const RECORDS = [
  {
    key: 'bestWinStreak',
    label: 'STREAK',
    color: 'var(--gold)',
    format: (r) => String(r.value),
  },
  {
    key: 'bestKda',
    label: 'KDA',
    color: '#a78bfa',
    format: (r) => String(r.value),
  },
  {
    key: 'bestWinRate',
    label: 'WIN RATE',
    color: 'var(--win)',
    format: (r) => `${Math.round(r.value * 100)}%`,
  },
  {
    key: 'highestRank',
    label: 'PEAK RANK',
    color: '#60a5fa',
    format: (r) => r.value,
  },
];

export default function RecordsStrip({ records }) {
  if (!records) return null;

  return (
    <div
      className="records-strip"
      style={{
        display: 'flex',
        width: '100%',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      {RECORDS.map((config, idx) => {
        const record = records[config.key];
        const isLast = idx === RECORDS.length - 1;
        return (
          <div
            key={config.key}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px',
              borderRight: isLast ? 'none' : '1px solid var(--border)',
              gap: '1px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--fg-dim)',
                lineHeight: 1,
              }}
            >
              {config.label}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-data)',
                fontSize: '20px',
                fontWeight: 700,
                color: record ? config.color : 'var(--fg-dim)',
                lineHeight: 1.1,
              }}
            >
              {record ? config.format(record) : '—'}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--fg-muted)',
                lineHeight: 1,
              }}
            >
              {record ? record.displayName : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
