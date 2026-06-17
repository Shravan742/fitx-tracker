// GitHub Gist sync — offline-first
// Store your Gist ID and PAT in localStorage (set on first sync or profile screen)

const GIST_ID_KEY  = 'fitx_gistId';
const GIST_PAT_KEY = 'fitx_gistPat';

export function getGistConfig() {
  return {
    gistId: localStorage.getItem(GIST_ID_KEY),
    pat:    localStorage.getItem(GIST_PAT_KEY),
  };
}

export function setGistConfig(gistId, pat) {
  localStorage.setItem(GIST_ID_KEY, gistId);
  localStorage.setItem(GIST_PAT_KEY, pat);
}

export async function syncGist() {
  const { gistId, pat } = getGistConfig();
  if (!gistId || !pat) return;

  // Export all IDB stores as JSON and push to gist
  const { db } = await import('./db.js');
  const d = db.get();

  const stores = ['profiles', 'sessions', 'meals', 'sleep', 'orm'];
  const payload = {};
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
      files: {
        'fitx-data.json': { content: JSON.stringify(payload, null, 2) },
      },
    }),
  });
}

export async function loadFromGist() {
  const { gistId, pat } = getGistConfig();
  if (!gistId || !pat) return null;

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { Authorization: `Bearer ${pat}` },
  });
  if (!res.ok) return null;

  const gist = await res.json();
  const content = gist.files?.['fitx-data.json']?.content;
  if (!content) return null;

  return JSON.parse(content);
}
