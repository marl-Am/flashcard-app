import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { invoke } from '@tauri-apps/api/core';

const FLAME_THRESHOLD = 7;
const DOUBLE_FLAME_THRESHOLD = 30;

export function StreakCounter(): ReactElement {
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    invoke<number>('get_streak').then(setStreak).catch(console.error);
  }, []);

  const emoji =
    streak >= DOUBLE_FLAME_THRESHOLD
      ? '🔥🔥'
      : streak >= FLAME_THRESHOLD
        ? '🔥'
        : '⚡';
  const label = streak === 0 ? 'no streak yet' : 'day streak';

  return (
    <div className="streak-counter">
      <span className="streak-emoji">{emoji}</span>
      <span className="streak-number">{streak}</span>
      <span className="streak-label">{label}</span>
    </div>
  );
}
