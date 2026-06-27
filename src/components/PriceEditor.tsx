import { useState } from 'react';
import { motion } from 'framer-motion';
import { getCommunityPricesForItem, setCommunityPrice } from '../lib/communityPrices';
import type { CommunityPrice } from '../types';

export default function PriceEditor({ item, uid, onSaved }: { item: string; uid: string; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<CommunityPrice[]>(() => getCommunityPricesForItem(item));
  const [supermarket, setSupermarket] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'g' | 'ml' | 'piece'>('g');
  const [gramsPerPiece, setGramsPerPiece] = useState('60');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    const gpp = parseFloat(gramsPerPiece);
    if (!supermarket.trim() || !p || !q || (unit === 'piece' && !gpp)) return;
    setSaving(true);
    try {
      await setCommunityPrice(item, supermarket.trim(), p, q, unit, uid, unit === 'piece' ? gpp : undefined);
      setPrices(getCommunityPricesForItem(item));
      setSupermarket('');
      setPrice('');
      setQuantity('');
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        className="text-[0.65rem] text-accent underline-offset-2 hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {prices.length ? `€${Math.min(...prices.map((p) => p.pricePer100)).toFixed(2)}/100g · ${prices.length} price${prices.length > 1 ? 's' : ''} · ✎ edit` : '✎ Add price'}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 overflow-hidden rounded-lg bg-surface2 p-2.5"
        >
          {prices.length > 0 && (
            <div className="mb-2 space-y-1">
              {prices.map((p) => (
                <div key={p.id} className="flex justify-between text-[0.65rem] text-text-muted">
                  <span>{p.supermarket}</span>
                  <span>
                    €{p.price} / {p.quantity}
                    {p.unit === 'piece' ? ` pcs (~${p.gramsPerPiece}g each)` : p.unit} (€{p.pricePer100.toFixed(2)}/100
                    {p.unit === 'piece' ? 'g' : p.unit})
                  </span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-1.5">
            <input
              className="input col-span-2 !py-1.5 !text-xs"
              placeholder="Supermarket (e.g. Aldi)"
              value={supermarket}
              onChange={(e) => setSupermarket(e.target.value)}
              required
            />
            <input
              type="number"
              min={0}
              step={0.01}
              className="input !py-1.5 !text-xs"
              placeholder="Price paid (€)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
            <div className="flex gap-1">
              <input
                type="number"
                min={0}
                className="input !py-1.5 !text-xs"
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <select
                className="input !py-1.5 !text-xs"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'g' | 'ml' | 'piece')}
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="piece">pieces</option>
              </select>
            </div>
            {unit === 'piece' && (
              <label className="col-span-2 block">
                <span className="mb-1 block text-[0.65rem] text-text-muted">Average weight per piece (g) — varies by size</span>
                <input
                  type="number"
                  min={1}
                  className="input !py-1.5 !text-xs"
                  placeholder="e.g. 60 for a medium egg"
                  value={gramsPerPiece}
                  onChange={(e) => setGramsPerPiece(e.target.value)}
                  required
                />
              </label>
            )}
            <button type="submit" className="btn-primary btn-sm col-span-2 disabled:cursor-not-allowed" disabled={saving}>
              {saving ? 'Saving…' : 'Save price'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
