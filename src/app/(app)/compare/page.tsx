'use client';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Spinner } from '@/components/ui';
import { FoodSearch, itemFromMatch, type FoodMatch } from '@/components/food-search';
import { supabase } from '@/lib/supabase/client';
import { NUTRIENTS, fmt, sumItems, type Group, type ScanRow, type Totals } from '@/lib/nutrients';

interface Side { label: string; totals: Totals }
const GROUPS: { g: Group; t: string }[] = [{ g: 'macro', t: 'Macronutrients' }, { g: 'other', t: 'Fats and cholesterol' }, { g: 'vitamin', t: 'Vitamins' }, { g: 'mineral', t: 'Minerals (incl. sodium)' }];

export default function Compare() {
  const [scans, setScans] = useState<ScanRow[] | null>(null);
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const [picking, setPicking] = useState<'a' | 'b' | null>(null);
  useEffect(() => { supabase().from('scans').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setScans((data ?? []) as ScanRow[])); }, []);

  const rows = useMemo(() => (a && b ? NUTRIENTS.map((n) => ({ n, x: a.totals[n.key].v, y: b.totals[n.key].v })) : []), [a, b]);
  const headline = rows.filter((r) => ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].includes(r.n.key));

  return (
    <div className="space-y-5">
      <div><h1 className="text-3xl font-extrabold">Compare foods</h1><p className="mt-1 text-muted">Pick two scanned meals, or search the database. Each side shows the full amount you choose, so compare similar portions.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([['a', a, '#16A36A'], ['b', b, '#2f80ed']] as const).map(([k, s, c]) => (
          <button key={k} onClick={() => setPicking(k)} className="card flex min-h-[88px] flex-col items-start justify-center border-2 p-4 text-left transition hover:bg-soft" style={{ borderColor: s ? c : undefined }}>
            <span className="text-xs text-muted">Food {k.toUpperCase()}</span>
            <span className="text-lg font-bold">{s ? s.label : 'Choose a food'}</span>
            {s && <span className="text-sm text-muted">{fmt(s.totals.calories.v, 'kcal')} kcal · tap to change</span>}
          </button>
        ))}
      </div>

      {a && b ? (
        <>
          <section className="card space-y-4 p-5" aria-label="Headline comparison">
            <div className="flex gap-4 text-xs font-semibold"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-primary" />{a.label}</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ background: '#2f80ed' }} />{b.label}</span></div>
            {headline.map(({ n, x, y }) => {
              const max = Math.max(x ?? 0, y ?? 0, 0.0001);
              return (
                <div key={n.key}>
                  <p className="mb-1 text-sm font-medium">{n.label} <span className="text-muted">({n.unit})</span></p>
                  {([[x, '#16A36A'], [y, '#2f80ed']] as const).map(([v, col], i) => (
                    <div key={i} className="mb-1 flex items-center gap-2"><div className="h-3 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${((v ?? 0) / max) * 100}%`, background: col }} /></div><span className="w-16 text-right text-xs tabular-nums">{v == null ? 'n/a' : fmt(v, n.unit)}</span></div>
                  ))}
                </div>
              );
            })}
          </section>
          {GROUPS.map(({ g, t }) => (
            <section key={g} className="card overflow-x-auto"><h2 className="px-4 pt-4 font-bold">{t}</h2>
              <table className="mt-2 w-full min-w-[420px] text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-4 py-2 font-medium">Nutrient</th><th className="py-2 text-right font-medium">A</th><th className="py-2 text-right font-medium">B</th><th className="px-4 py-2 text-right font-medium">Higher</th></tr></thead>
                <tbody>{rows.filter((r) => r.n.group === g).map(({ n, x, y }) => (
                  <tr key={n.key} className="border-b border-line last:border-0"><td className="px-4 py-2">{n.label}</td><td className="py-2 text-right tabular-nums">{x == null ? '—' : `${fmt(x, n.unit)} ${n.unit}`}</td><td className="py-2 text-right tabular-nums">{y == null ? '—' : `${fmt(y, n.unit)} ${n.unit}`}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted">{x == null || y == null ? 'Unknown' : Math.abs(x - y) < 1e-9 ? 'Same' : x > y ? 'A' : 'B'}</td></tr>))}</tbody></table>
            </section>
          ))}
          <p className="text-xs text-muted">“—” means a database has no value for that nutrient. A nutrient is only compared when both sides have data.</p>
        </>
      ) : <p className="card p-6 text-center text-sm text-muted">Choose two foods to see the comparison.</p>}

      {picking && <Modal title={`Choose food ${picking.toUpperCase()}`} onClose={() => setPicking(null)}><Picker scans={scans} onPick={(s) => { (picking === 'a' ? setA : setB)(s); setPicking(null); }} /></Modal>}
    </div>
  );
}

function Picker({ scans, onPick }: { scans: ScanRow[] | null; onPick: (s: Side) => void }) {
  const [tab, setTab] = useState<'scans' | 'db'>('scans');
  const [m, setM] = useState<FoodMatch | null>(null);
  const [grams, setGrams] = useState(100);
  return (
    <div>
      <div className="mb-3 flex gap-2" role="tablist">{(['scans', 'db'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setM(null); }} className={`btn flex-1 ${tab === t ? 'bg-primary text-white' : 'btn-ghost'}`}>{t === 'scans' ? 'My scans' : 'Search foods'}</button>)}</div>
      {tab === 'scans' ? (!scans ? <Spinner /> : scans.length === 0 ? <p className="text-sm text-muted">No scans yet. Use “Search foods”.</p> : (
        <ul className="space-y-2">{scans.map((s) => <li key={s.id}><button className="flex w-full items-center justify-between rounded-xl border border-line p-3 text-left hover:bg-soft" onClick={() => onPick({ label: s.title, totals: sumItems(s.items) })}><span className="truncate font-semibold">{s.title}</span><span className="text-xs text-muted">{fmt(sumItems(s.items).calories.v, 'kcal')} kcal</span></button></li>)}</ul>
      )) : m ? (
        <div className="space-y-3"><p className="font-semibold">{m.description}</p><label className="block text-sm font-medium">Amount (grams)<input type="number" min={1} max={3000} className="input mt-1" value={grams} onChange={(e) => setGrams(Math.max(1, Math.min(3000, Number(e.target.value) || 1)))} /></label>
          <button className="btn-primary w-full" onClick={() => onPick({ label: `${m.description} (${grams} g)`, totals: sumItems([itemFromMatch(m, grams)]) })}>Use</button></div>
      ) : <FoodSearch onPick={setM} label="Select" />}
    </div>
  );
}
