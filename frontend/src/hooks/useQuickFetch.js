import { useState, useEffect, useRef, useCallback } from 'react';
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
  const isLoadingRef = useRef(false);
  const resetTimerRef = useRef(null);

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

  const trigger = useCallback(async () => {
    if (isLoadingRef.current || cooldownSeconds > 0) return;
    isLoadingRef.current = true;
    setStatus('loading');
    try {
      const fn = httpsCallable(functions, 'quick_fetch');
      const result = await fn();
      setNewGames(result.data?.newGames ?? 0);
      isLoadingRef.current = false;
      setStatus('success');
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('quickFetch error:', err);
      isLoadingRef.current = false;
      setStatus('error');
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setStatus('idle'), 3000);
    }
  }, [cooldownSeconds]);

  useEffect(() => () => clearTimeout(resetTimerRef.current), []);

  return { cooldownSeconds, trigger, status, newGames };
}
