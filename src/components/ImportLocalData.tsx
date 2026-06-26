import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listLocalProfiles, importLocalProfileData, type LocalProfileSummary, type ImportCounts } from '../lib/migration';
import Card from './Card';

function dismissedKey(uid: string) {
  return `fitx_import_dismissed_${uid}`;
}

export default function ImportLocalData({ uid }: { uid: string }) {
  const [localProfiles, setLocalProfiles] = useState<LocalProfileSummary[]>([]);
  const [importing, setImporting] = useState<string | null>(null);
  const [done, setDone] = useState<ImportCounts | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(dismissedKey(uid))) {
      setDismissed(true);
      return;
    }
    listLocalProfiles().then(setLocalProfiles).catch(() => setLocalProfiles([]));
  }, [uid]);

  const dismiss = () => {
    localStorage.setItem(dismissedKey(uid), '1');
    setDismissed(true);
  };

  const handleImport = async (localId: string) => {
    setImporting(localId);
    try {
      const counts = await importLocalProfileData(localId, uid);
      setDone(counts);
      localStorage.setItem(dismissedKey(uid), '1');
    } finally {
      setImporting(null);
    }
  };

  if (dismissed || !localProfiles.length) return null;

  return (
    <Card variant="glow" className="mb-1">
      <h4 className="mb-1 text-sm font-semibold">📦 Import data from this device</h4>
      {done ? (
        <p className="text-sm text-success">
          ✓ Imported {done.meals} meals, {done.sessions} workout sessions, {done.sleep} sleep logs, {done.orm} 1RM
          entries into your account.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-text-muted">
            This browser has existing local data from before you signed in. Pick which one was you to copy its history
            into your new account — it won't be lost.
          </p>
          <div className="space-y-2">
            {localProfiles.map((p) => (
              <button
                key={p.id}
                className="btn-secondary flex w-full items-center justify-between disabled:cursor-not-allowed"
                onClick={() => handleImport(p.id)}
                disabled={importing !== null}
              >
                <span>{p.name || p.id}</span>
                {importing === p.id ? (
                  <motion.span
                    className="h-3.5 w-3.5 rounded-full border-2 border-text-muted/40 border-t-text"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <span className="text-xs text-accent">Import →</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      <AnimatePresence>
        {!importing && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            type="button"
            className="mt-3 text-xs text-text-muted underline"
            onClick={dismiss}
          >
            {done ? 'Dismiss' : "Skip — none of these were me"}
          </motion.button>
        )}
      </AnimatePresence>
    </Card>
  );
}
