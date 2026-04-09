import { useQuickFetch } from '../hooks/useQuickFetch';

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

  if (status === 'loading') {
    label = 'Fetching...';
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

  const title =
    status === 'idle' && cooldownSeconds === 0
      ? 'Fetch latest games'
      : cooldownSeconds > 0
      ? `Cooldown: ${Math.floor(cooldownSeconds / 60)}m ${cooldownSeconds % 60}s remaining`
      : undefined;

  const ariaLabel =
    status === 'loading' ? 'Fetching games...' :
    status === 'success' ? (newGames > 0 ? `${newGames} new games fetched` : 'Already up to date') :
    status === 'error' ? 'Fetch failed' :
    cooldownSeconds > 0 ? `Cooldown: ${Math.floor(cooldownSeconds / 60)} minutes ${cooldownSeconds % 60} seconds remaining` :
    'Fetch latest games';

  return (
    <button
      onClick={trigger}
      disabled={isDisabled}
      title={title}
      aria-label={ariaLabel}
      className={status === 'loading' ? 'fetch-loading' : undefined}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        color,
        background: 'none',
        border: 'none',
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled && status === 'idle' ? 0.6 : undefined,
        padding: '4px 8px',
      }}
    >
      {label}
    </button>
  );
}
