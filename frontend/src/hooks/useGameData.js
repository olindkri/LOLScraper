import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

/**
 * Returns { players, group, loading } from Firebase Realtime DB.
 * players: object keyed by player id
 * group: { totalWins, totalLosses, winRate, lastUpdated }
 */
export function useGameData() {
  const [players, setPlayers] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rootRef = ref(db, '/');
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPlayers(data.players || {});
        setGroup(data.group || null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { players, group, loading };
}
