import { useMemo } from 'react';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  type ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import dayjs from 'dayjs';
import type { WeightEntry } from '../types';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

export default function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const data: ChartData<'line'> = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const vals = sorted.map((e) => e.weightKg);
    const n = vals.length;
    let trendline: number[] = [];
    if (n > 1) {
      const avgX = (n - 1) / 2;
      const avgY = vals.reduce((a, v) => a + v, 0) / n;
      const slope =
        vals.reduce((a, v, i) => a + (i - avgX) * (v - avgY), 0) /
        vals.reduce((a, _, i) => a + (i - avgX) ** 2, 0);
      const intercept = avgY - slope * avgX;
      trendline = vals.map((_, i) => intercept + slope * i);
    }
    return {
      labels: sorted.map((e) => dayjs(e.date).format('D MMM')),
      datasets: [
        {
          label: 'Weight',
          data: vals,
          borderColor: '#b6f400',
          backgroundColor: '#b6f400',
          pointRadius: 3,
          pointBackgroundColor: '#b6f400',
          tension: 0.3,
          borderWidth: 2,
        },
        ...(trendline.length
          ? [
              {
                label: 'Trend',
                data: trendline,
                borderColor: '#ff7a1a',
                borderDash: [5, 4],
                pointRadius: 0,
                borderWidth: 1.5,
                tension: 0,
              },
            ]
          : []),
      ],
    };
  }, [entries]);

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8d9a83', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#8d9a83', font: { size: 10 } }, grid: { color: '#2a332655' } },
        },
      }}
    />
  );
}
