// GitHub Gist sync — offline-first. Stores Gist ID + PAT in localStorage.
import { openDb } from './db';

const GIST_ID_KEY = 'fitx_gistId';
const GIST_PAT_KEY = 'fitx_gistPat';

export function getGistConfig() {
  return {
    gistId: localStorage.getItem(GIST_ID_KEY) || '',
    pat: localStorage.getItem(GIST_PAT_KEY) || '',
  };
}

export function setGistConfig(gistId: string, pat: string) {
  localStorage.setItem(GIST_ID_KEY, gistId);
  localStorage.setItem(GIST_PAT_KEY, pat);
}

export async function syncGist(): Promise<void> {
  const { gistId, pat } = getGistConfig();
  if (!gistId || !pat) return;

  const d = await openDb();

  const stores = ['profiles', 'sessions', 'meals', 'sleep', 'orm'];
  const payload: Record<string, unknown> = {};
  for (const store of stores) {
    payload[store] = await d.getAll(store);
  }

  await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: { 'fitx-data.json': { content: JSON.stringify(payload, null, 2) } },
    }),
  });
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

const LAST_SYNC_KEY = 'fitx_gist_last_sync';
const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000;

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

let autoSyncStarted = false;

/**
 * Once a Gist is configured, sync should just happen in the background — no manual
 * "Sync now" clicks needed. Pushes immediately, then every few minutes while the app
 * is open. Silently no-ops (and is safe to call repeatedly) when not configured.
 */
export function initAutoSync(): void {
  if (autoSyncStarted) return;
  autoSyncStarted = true;
  const { gistId, pat } = getGistConfig();
  if (!gistId || !pat) return;
  syncGist().catch(() => {});
  setInterval(() => {
    syncGist().catch(() => {});
  }, AUTO_SYNC_INTERVAL_MS);
}
