import { useEffect, useState } from 'react';
import { resolveChampion } from '../champions/resolveChampion.js';

export default function ChampionBadge({
  championName = '',
  championSlug = '',
  size = 18,
  gap = 8,
  textStyle = {},
  placeholder = '—',
}) {
  const resolved = resolveChampion({ championSlug, championName });
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [championName, championSlug]);

  const label = championName || resolved?.name || placeholder;
  const showImage = Boolean(resolved) && !imageFailed;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, minWidth: 0 }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        {showImage ? (
          <img
            src={resolved.imageUrl}
            alt={`${resolved.name} icon`}
            width={size}
            height={size}
            loading="lazy"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </span>
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...textStyle,
        }}
      >
        {label}
      </span>
    </span>
  );
}
