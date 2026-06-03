import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ActivityCalendar } from 'react-activity-calendar';

interface DayActivity {
  date: string;
  count: number;
  level: number;
}

export function Heatmap() {
  const [data, setData] = useState<DayActivity[]>([]);

  useEffect(() => {
    invoke<DayActivity[]>('get_heatmap_data')
      .then((result) => {
        // react-activity-calendar requires at least one entry
        // pad with today at level 0 if the DB is empty
        if (result.length === 0) {
          const today = new Date().toISOString().split('T')[0];
          setData([{ date: today, count: 0, level: 0 }]);
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
          theme={{
            dark: ['#1a1a1a', '#0e4429', '#006d32', '#26a641', '#39d353'],
          }}
        />
      )}
    </div>
  );
}
