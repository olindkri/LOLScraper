import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

const COOLDOWN_SECONDS = 300;

export function useQuickFetch() {
  const [lastFetchTs, setLastFetchTs] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [status, setStatus] = useState('idle');
  const [newGames, setNewGames] = useState(0);

  const lastFetchTsRef = useRef(null);

  // Subscribe to /metadata/lastManualFetch
  useEffect(() => {
    const metaRef = ref(db, '/metadata/lastManualFetch');
    const unsubscribe = onValue(metaRef, (snapshot) => {
      const ts = snapshot.val();
      setLastFetchTs(ts);
      lastFetchTsRef.current = ts;
    });
    return unsubscribe;
  }, []);

  // Tick cooldown every second
  useEffect(() => {
    function computeCooldown() {
      const ts = lastFetchTsRef.current;
      if (!ts) {
        setCooldownSeconds(0);
        return;
      }
      const secondsElapsed = (Date.now() - new Date(ts).getTime()) / 1000;
      setCooldownSeconds(Math.max(0, Math.ceil(COOLDOWN_SECONDS - secondsElapsed)));
    }

    computeCooldown();
    const interval = setInterval(computeCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastFetchTs]);

  async function trigger() {
    if (status === 'loading' || cooldownSeconds > 0) return;

    setStatus('loading');
    try {
      const quickFetch = httpsCallable(functions, 'quick_fetch');
      const result = await quickFetch();
      setNewGames(result.data?.newGames ?? 0);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return { cooldownSeconds, trigger, status, newGames };
}
