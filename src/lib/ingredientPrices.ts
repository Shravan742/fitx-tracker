// Real-world ultra-cheap grocery pricing, modeled on German discount supermarkets
// (Aldi/Lidl tier). Price is per 100g or 100ml. Matched by keyword against ingredient
// names (case-insensitive substring match), most specific entries first, so variants
// like "Chicken breast (sliced)" or "Red lentils (dry)" still match correctly.
// This replaces a flat per-diet-type estimate with per-ingredient pricing, so genuinely
// cheap staples (oats, lentils, quark, potato) are rewarded even within pricier diet
// categories, and premium ingredients (salmon, halloumi, nuts) are priced accurately.

import { findCustomIngredientByName } from './customIngredients';
import { getCommunityPricePer100 } from './communityPrices';

interface PriceEntry {
  keywords: string[];
  pricePer100: number; // EUR per 100g or 100ml
}

// Ordered most-specific-first; first match wins.
const PRICE_TABLE: PriceEntry[] = [
  // Ultra-cheap carb staples
  { keywords: ['potato'], pricePer100: 0.15 },
  { keywords: ['rice'], pricePer100: 0.2 },
  { keywords: ['pasta', 'spaghetti', 'fettuccine', 'penne', 'macaroni'], pricePer100: 0.18 },
  { keywords: ['oat', 'oats'], pricePer100: 0.2 },
  { keywords: ['flour'], pricePer100: 0.15 },
  { keywords: ['bread', 'baguette', 'tortilla', 'naan', 'pita', 'bun'], pricePer100: 0.3 },
  { keywords: ['cracker'], pricePer100: 0.45 },

  // Ultra-cheap protein/legumes
  { keywords: ['lentil'], pricePer100: 0.25 },
  { keywords: ['chickpea', 'kidney bean', 'white bean', 'black bean', 'baked bean', 'cannellini'], pricePer100: 0.2 },
  { keywords: ['quark', 'cottage cheese'], pricePer100: 0.25 },
  { keywords: ['egg'], pricePer100: 0.35 },
  { keywords: ['tofu', 'tempeh'], pricePer100: 0.45 },

  // Cheap dairy / fats
  { keywords: ['milk'], pricePer100: 0.1 },
  { keywords: ['plant milk', 'almond milk', 'soy milk'], pricePer100: 0.25 },
  { keywords: ['butter'], pricePer100: 0.7 },
  { keywords: ['oil', 'cooking spray'], pricePer100: 0.5 },
  { keywords: ['greek yoghurt', 'yoghurt'], pricePer100: 0.35 },
  { keywords: ['peanut butter'], pricePer100: 0.6 },

  // Cheap veg
  { keywords: ['onion'], pricePer100: 0.1 },
  { keywords: ['carrot'], pricePer100: 0.12 },
  { keywords: ['cabbage'], pricePer100: 0.1 },
  { keywords: ['tomato', 'crushed tomato', 'tinned tomato'], pricePer100: 0.18 },
  { keywords: ['frozen peas', 'peas & corn', 'sweetcorn', 'frozen', 'mixed veg'], pricePer100: 0.22 },
  { keywords: ['banana'], pricePer100: 0.18 },
  { keywords: ['apple', 'pear'], pricePer100: 0.25 },
  { keywords: ['spinach', 'broccoli', 'courgette', 'pepper', 'capsicum', 'cucumber', 'lettuce', 'celery'], pricePer100: 0.35 },
  { keywords: ['beetroot'], pricePer100: 0.3 },
  { keywords: ['green beans'], pricePer100: 0.4 },
  { keywords: ['aubergine', 'fennel'], pricePer100: 0.4 },
  { keywords: ['avocado'], pricePer100: 0.6 },
  { keywords: ['mushroom'], pricePer100: 0.45 },

  // Cheap pantry / spices (small quantities, cost barely matters per gram)
  { keywords: ['garlic', 'ginger', 'chilli', 'paprika', 'cumin', 'turmeric', 'cinnamon', 'masala', 'spice', 'powder', 'flake', 'seed', 'leaves', 'basil', 'parsley', 'coriander', 'dill', 'mint', 'salt', 'pepper', 'vanilla', 'baking powder'], pricePer100: 1.2 },
  { keywords: ['sugar', 'honey', 'syrup'], pricePer100: 0.4 },
  { keywords: ['soy sauce', 'vinegar', 'ketchup', 'bbq sauce', 'hot sauce', 'fish sauce'], pricePer100: 0.5 },

  // Mid-tier protein
  { keywords: ['chicken thigh', 'chicken drumstick', 'chicken mince'], pricePer100: 0.45 },
  { keywords: ['pork mince', 'pork shoulder', 'pork chop', 'bacon', 'chorizo'], pricePer100: 0.55 },
  { keywords: ['chicken breast', 'chicken'], pricePer100: 0.8 },
  { keywords: ['canned tuna', 'canned mackerel', 'canned sardine', 'tuna', 'mackerel', 'sardine'], pricePer100: 0.8 },
  { keywords: ['beef mince'], pricePer100: 0.9 },

  // Pricier
  { keywords: ['cheddar', 'mozzarella', 'parmesan', 'pecorino'], pricePer100: 1.1 },
  { keywords: ['feta', 'halloumi'], pricePer100: 1.5 },
  { keywords: ['white fish', 'fish fillet'], pricePer100: 1.3 },
  { keywords: ['beef chunks', 'beef steak', 'sirloin', 'beef'], pricePer100: 1.8 },
  { keywords: ['salmon'], pricePer100: 2.0 },
  { keywords: ['prawn', 'shrimp'], pricePer100: 2.2 },
  { keywords: ['nuts', 'almond', 'walnut', 'cashew', 'tahini', 'sesame'], pricePer100: 1.4 },
  { keywords: ['paneer'], pricePer100: 1.0 },
  { keywords: ['cream', 'soured cream', 'sour cream'], pricePer100: 0.6 },
  { keywords: ['coconut milk'], pricePer100: 0.4 },
];

const DEFAULT_PRICE_PER_100 = 0.5;

function priceForIngredient(name: string): number {
  const custom = findCustomIngredientByName(name);
  if (custom?.pricePer100 != null) return custom.pricePer100;

  const community = getCommunityPricePer100(name);
  if (community != null) return community;

  const lower = name.toLowerCase();
  for (const entry of PRICE_TABLE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.pricePer100;
  }
  return DEFAULT_PRICE_PER_100;
}

export function estimateIngredientCost(item: string, grams?: number, ml?: number): number {
  const qty = grams ?? ml ?? 0;
  return (priceForIngredient(item) * qty) / 100;
}
