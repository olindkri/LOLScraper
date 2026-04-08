import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

export function useGameData() {
  const [players, setPlayers] = useState(null);
  const [group, setGroup] = useState(null);
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rootRef = ref(db, '/');
    const unsubscribe = onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setPlayers(data.players || {});
        setGroup(data.group || null);
        setRecords(data.records || null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { players, group, records, loading };
}
