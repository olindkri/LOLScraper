import { useQuickFetch } from '../hooks/useQuickFetch';

const pulseStyle = `
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1.0; }
}
`;

function formatCooldown(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `↻ ${m}:${String(sec).padStart(2, '0')}`;
}

export default function FetchButton() {
  const { cooldownSeconds, trigger, status, newGames } = useQuickFetch();

  const isDisabled = status !== 'idle' || cooldownSeconds > 0;

  let label;
  let color = 'var(--fg-dim)';
  let extraStyle = {};

  if (status === 'loading') {
    label = 'Fetching...';
    extraStyle = { animation: 'pulse 1.2s ease-in-out infinite' };
  } else if (status === 'success') {
    label = newGames > 0 ? `+${newGames} new` : 'up to date';
    if (newGames > 0) color = 'var(--win)';
  } else if (status === 'error') {
    label = 'failed';
    color = 'var(--loss)';
  } else if (cooldownSeconds > 0) {
    label = formatCooldown(cooldownSeconds);
  } else {
    label = '↻ Fetch';
  }

  const title = cooldownSeconds > 0
    ? `Cooldown: ${Math.floor(cooldownSeconds / 60)}m ${cooldownSeconds % 60}s remaining`
    : 'Fetch latest games';

  return (
    <>
      <style>{pulseStyle}</style>
      <button
        onClick={isDisabled ? undefined : trigger}
        disabled={isDisabled}
        title={title}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color,
          background: 'none',
          border: 'none',
          cursor: isDisabled ? 'default' : 'pointer',
          opacity: isDisabled && status === 'idle' ? 0.6 : undefined,
          padding: '4px 8px',
          ...extraStyle,
        }}
      >
        {label}
      </button>
    </>
  );
}
