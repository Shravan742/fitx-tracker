import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { getActiveProfileId } from '../lib/storage';
import { addSleepLog, getSleepLogs } from '../lib/db';
import type { SleepLog } from '../types';
import Card from '../components/Card';
import SleepChart from '../components/SleepChart';

export default function Sleep() {
  const pid = getActiveProfileId();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [bedtime, setBedtime] = useState('22:30');
  const [waketime, setWaketime] = useState('06:30');
  const [quality, setQuality] = useState(3);

  const reload = async () => {
    const all = await getSleepLogs(pid);
    setLogs(all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    const bed = dayjs(`${date} ${bedtime}`);
    let wake = dayjs(`${date} ${waketime}`);
    if (wake.isBefore(bed)) wake = wake.add(1, 'day');
    const mins = wake.diff(bed, 'minute');

    await addSleepLog({
      profileId: pid,
      date,
      bedtime,
      waketime,
      quality,
      durationH: Math.floor(mins / 60),
      durationM: mins % 60,
      loggedAt: new Date().toISOString(),
    });
    reload();
  };

  const recent = logs.slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Sleep</h1>

      <Card title="Log last night">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Date</span>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Bedtime</span>
              <input type="time" className="input" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-text-muted">Wake time</span>
              <input type="time" className="input" value={waketime} onChange={(e) => setWaketime(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-text-muted">Quality (1 = terrible, 5 = great)</span>
            <select className="input" value={quality} onChange={(e) => setQuality(+e.target.value)}>
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary mt-2 w-full" onClick={save}>
            Save
          </button>
        </div>
      </Card>

      <Card title="Recent sleep (14 days)">
        {logs.length ? (
          <>
            <div className="h-40">
              <SleepChart logs={logs} />
            </div>
            <div className="mt-3 space-y-2">
              {recent.map((l, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold">{l.date}</div>
                    <div className="text-xs text-text-muted">
                      {l.bedtime} → {l.waketime}
                    </div>
                  </div>
                  <span className="text-sm">
                    {l.durationH}h {l.durationM}m {'⭐'.repeat(l.quality)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted">No sleep logged yet.</p>
        )}
      </Card>
    </div>
  );
}
