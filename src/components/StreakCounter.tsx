import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function StreakCounter() {
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    invoke<number>('get_streak').then(setStreak).catch(console.error);
  }, []);

  const emoji = streak >= 30 ? '🔥🔥' : streak >= 7 ? '🔥' : '⚡';
  const label =
    streak === 0 ? 'no streak yet' : streak === 1 ? 'day streak' : 'day streak';

  return (
    <div className="streak-counter">
      <span className="streak-emoji">{emoji}</span>
      <span className="streak-number">{streak}</span>
      <span className="streak-label">{label}</span>
    </div>
  );
}
