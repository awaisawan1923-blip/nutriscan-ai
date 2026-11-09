'use client';
import { useState } from 'react';
import { Barcode, Search } from 'lucide-react';
import { Spinner, useToast } from './ui';
import type { Per100, ScanItem } from '@/lib/nutrients';

export interface FoodMatch { dbSource: ScanItem['dbSource']; dbId: string; description: string; dataType: string; per100: Per100 }

export const itemFromMatch = (m: FoodMatch, grams = 100): ScanItem => ({
  id: crypto.randomUUID(), name: m.description, grams, gramsSource: 'user', cookingMethod: '', ingredients: [], confidence: 1,
  dbSource: m.dbSource, dbId: m.dbId, dbDescription: m.description, per100: m.per100,
});

/** Database search (USDA) + barcode lookup (Open Food Facts). Calls onPick with the chosen database entry. */
export function FoodSearch({ onPick, label = 'Use this food' }: { onPick: (m: FoodMatch) => void; label?: string }) {
  const toast = useToast();
  const [mode, setMode] = useState<'name' | 'barcode'>('name');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<FoodMatch[] | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (busy || q.trim().length < 2) return;
    setBusy(true); setResults(null);
    try {
      const r = await fetch(mode === 'name' ? `/api/foods/search?q=${encodeURIComponent(q.trim())}` : `/api/barcode?code=${encodeURIComponent(q.trim())}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Lookup failed');
      setResults(mode === 'name' ? j.foods : [j.food]);
    } catch (err) { toast((err as Error).message, 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="tablist">
        {(['name', 'barcode'] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setResults(null); setQ(''); }}
            className={`btn !min-h-[36px] flex-1 ${mode === m ? 'bg-primary text-white' : 'btn-ghost'}`}>
            {m === 'name' ? <><Search className="h-4 w-4" />Search by name</> : <><Barcode className="h-4 w-4" />Barcode number</>}
          </button>
        ))}
      </div>
      <form onSubmit={run} className="flex gap-2">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} inputMode={mode === 'barcode' ? 'numeric' : 'text'}
          placeholder={mode === 'name' ? 'e.g. lentils, cooked' : 'Digits under the barcode'} aria-label="Search" />
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Search'}</button>
      </form>
      {results && results.length === 0 && <p className="text-sm text-muted">No matches. Try a simpler or more general name.</p>}
      <ul className="space-y-2">
        {results?.map((m) => (
          <li key={m.dbId} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{m.description}</p>
              <p className="text-xs text-muted">{m.dbSource} · {m.dataType} · {m.per100.calories != null ? `${Math.round(m.per100.calories)} kcal/100 g` : 'calories not listed'}</p>
            </div>
            <button className="btn-ghost shrink-0 !min-h-[36px]" onClick={() => onPick(m)}>{label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
