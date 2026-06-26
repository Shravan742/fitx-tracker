// One-time migration: uploads src/data/recipes.ts into the Firestore `recipes`
// collection, using firebase-admin (service-account.json) to bypass security rules
// entirely — the live app never writes to this collection itself.
//
// Run with: npx tsx scripts/seedRecipes.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import recipes from '../src/data/recipes';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf-8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const seenIds = new Map<string, number>();
  let batch = db.batch();
  let count = 0;

  for (const recipe of recipes) {
    let id = slugify(recipe.name);
    const dupeCount = seenIds.get(id) ?? 0;
    seenIds.set(id, dupeCount + 1);
    if (dupeCount > 0) id = `${id}-${dupeCount + 1}`;

    batch.set(db.collection('recipes').doc(id), recipe);
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Committed ${count} recipes...`);
    }
  }

  await batch.commit();
  console.log(`Done. Seeded ${count} recipes into Firestore.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
