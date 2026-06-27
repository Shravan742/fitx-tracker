import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { CommunityPrice } from '../types';

/**
 * Crowdsourced grocery prices — any signed-in user can add what they actually paid
 * for a product at a specific supermarket, benefiting every user's budget estimates,
 * not just their own. Like recipes/custom ingredients, recipeCost.ts's calculations
 * are synchronous, so this keeps an in-memory cache refreshed at app start and after
 * every edit rather than fetching mid-calculation.
 */
let cache: CommunityPrice[] = [];
let cacheByItemSlug: Map<string, CommunityPrice[]> = new Map();
let preferredSupermarket: string | undefined;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function loadCommunityPrices(): Promise<void> {
  const snap = await getDocs(collection(firestore, 'ingredientPrices'));
  cache = snap.docs.map((d) => ({ ...(d.data() as Omit<CommunityPrice, 'id'>), id: d.id }));
  cacheByItemSlug = new Map();
  for (const p of cache) {
    const list = cacheByItemSlug.get(p.itemSlug) ?? [];
    list.push(p);
    cacheByItemSlug.set(p.itemSlug, list);
  }
}

export function setPreferredSupermarket(supermarket: string | undefined): void {
  preferredSupermarket = supermarket;
}

export function getCommunityPricesForItem(item: string): CommunityPrice[] {
  return cacheByItemSlug.get(slugify(item)) ?? [];
}

/** Prefers the user's chosen supermarket if priced there, otherwise the cheapest known price. */
export function getCommunityPricePer100(item: string): number | null {
  const list = getCommunityPricesForItem(item);
  if (!list.length) return null;
  if (preferredSupermarket) {
    const match = list.find((p) => p.supermarket.toLowerCase() === preferredSupermarket!.toLowerCase());
    if (match) return match.pricePer100;
  }
  return Math.min(...list.map((p) => p.pricePer100));
}

function invalidateMealPlanCache(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('fitx_plan_v6_') || k.startsWith('fitx_weekplan_v2_'))
    .forEach((k) => localStorage.removeItem(k));
}

export async function setCommunityPrice(
  item: string,
  supermarket: string,
  price: number,
  quantity: number,
  unit: 'g' | 'ml' | 'piece',
  uid: string,
  gramsPerPiece?: number,
): Promise<void> {
  const itemSlug = slugify(item);
  const id = `${itemSlug}__${slugify(supermarket)}`;
  // Recipe ingredients and all downstream cost math work in grams/ml, so a count-based
  // purchase (e.g. "12 eggs for €2.49") needs an average weight per piece to convert —
  // egg size (S/M/L/XL) varies, so this is necessarily an approximation, not exact.
  const totalGrams = unit === 'piece' ? quantity * (gramsPerPiece || 1) : quantity;
  const pricePer100 = (price / totalGrams) * 100;
  await setDoc(doc(firestore, 'ingredientPrices', id), {
    item,
    itemSlug,
    supermarket,
    price,
    quantity,
    unit,
    ...(unit === 'piece' ? { gramsPerPiece: gramsPerPiece || 1 } : {}),
    pricePer100,
    updatedBy: uid,
    updatedAt: new Date().toISOString(),
  });
  invalidateMealPlanCache();
  await loadCommunityPrices();
}
