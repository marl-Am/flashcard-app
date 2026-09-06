import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ActivityCalendar } from 'react-activity-calendar';
import type { DayActivity } from '../types';

/** Mirrors the level colours used elsewhere in the dark theme. */
const DARK_LEVEL_COLOURS: readonly string[] = [
  '#1a1a1a',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
];

/** Local calendar date as YYYY-MM-DD. Using toISOString directly would
 *  report the UTC day, which is wrong either side of midnight. */
function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Heatmap(): ReactElement {
  const [data, setData] = useState<DayActivity[]>([]);

  useEffect(() => {
    invoke<DayActivity[]>('get_heatmap_data')
      .then((result) => {
        // react-activity-calendar requires at least one entry
        // pad with today at level 0 if the DB is empty
        if (result.length === 0) {
          setData([{ date: localIsoDate(new Date()), count: 0, level: 0 }]);
        } else {
          setData(result);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="heatmap-wrapper">
      <h2>Review Activity</h2>
      {data.length > 0 && (
        <ActivityCalendar
          data={data}
          colorScheme="dark"
          theme={{ dark: [...DARK_LEVEL_COLOURS] }}
        />
      )}
    </div>
  );
}
