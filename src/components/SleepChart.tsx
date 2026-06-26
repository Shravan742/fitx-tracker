import { useMemo } from 'react';
import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, Tooltip, type ChartData } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import dayjs from 'dayjs';
import type { SleepLog } from '../types';

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip);

export default function SleepChart({ logs }: { logs: SleepLog[] }) {
  const data: ChartData<'bar'> = useMemo(() => {
    const ordered = [...logs].reverse();
    return {
      labels: ordered.map((l) => dayjs(l.date).format('D MMM')),
      datasets: [
        {
          label: 'Hours',
          data: ordered.map((l) => +(l.durationH + l.durationM / 60).toFixed(1)),
          backgroundColor: '#ff7a1aaa',
          borderRadius: 4,
        },
      ],
    };
  }, [logs]);

  return (
    <Bar
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8d9a83', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#8d9a83' }, grid: { color: '#2a332655' }, min: 0, max: 12 },
        },
      }}
    />
  );
}
