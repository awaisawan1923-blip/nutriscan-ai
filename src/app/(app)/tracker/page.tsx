'use client';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { createManualScan, dateStr, loadTargets } from '@/lib/data';
import { Bar, BarChart, Modal, Spinner, useToast } from '@/components/ui';
import { FoodSearch, itemFromMatch, type FoodMatch } from '@/components/food-search';
import { MEALS, fmt, sumItems, type EntryRow, type Meal, type ScanRow } from '@/lib/nutrients';

type Range = 'day' | 'week' | 'month';
const shift = (d: string, n: number) => { const x = new Date(d + 'T00:00'); x.setDate(x.getDate() + n); return dateStr(x); };

export default function Tracker() {
  const toast = useToast();
  const [date, setDate] = useState(dateStr());
  const [range, setRange] = useState<Range>('day');
  const [rows, setRows] = useState<EntryRow[] | null>(null);
  const [targets, setTargets] = useState<Awaited<ReturnType<typeof loadTargets>> | null>(null);
  const [adding, setAdding] = useState<Meal | null>(null);

  const load = useCallback(async () => {
    const from = range === 'day' ? date : shift(date, range === 'week' ? -6 : -29);
    const { data } = await supabase().from('meal_entries').select('*').gte('entry_date', from).lte('entry_date', date).order('created_at');
    setRows((data ?? []) as EntryRow[]);
  }, [date, range]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => { loadTargets().then(setTargets); }, []);

  async function patch(e: EntryRow, p: Partial<Pick<EntryRow, 'servings' | 'meal'>>) {
    const next = { ...e, ...p };
    const ratio = (p.servings ?? e.servings) / e.servings;
    const totals = p.servings ? Object.fromEntries(Object.entries(e.totals).map(([k, v]) => [k, { v: v.v == null ? null : v.v * ratio, partial: v.partial }])) : e.totals;
    const { error } = await supabase().from('meal_entries').update({ ...p, totals }).eq('id', e.id);
    if (error) return toast('Could not update: ' + error.message, 'error');
    setRows((l) => (l ?? []).map((x) => (x.id === e.id ? ({ ...next, totals } as EntryRow) : x)));
  }
  async function remove(e: EntryRow) {
    const { error } = await supabase().from('meal_entries').delete().eq('id', e.id);
    if (error) return toast('Could not delete: ' + error.message, 'error');
    setRows((l) => (l ?? []).filter((x) => x.id !== e.id)); toast('Entry removed');
  }

  if (!rows || !targets) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div>;
  const val = (list: EntryRow[], k: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber') => list.reduce((s, e) => s + (e.totals[k]?.v ?? 0), 0);
  const dayRows = rows.filter((r) => r.entry_date === date);
  const days = range === 'day' ? [] : Array.from({ length: range === 'week' ? 7 : 30 }, (_, i) => shift(date, i - (range === 'week' ? 6 : 29)));
  const chart = days.map((d) => ({ label: range === 'week' ? new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' }) : d.slice(8), value: val(rows.filter((r) => r.entry_date === d), 'calories') }));
  const logged = days.filter((d) => rows.some((r) => r.entry_date === d)).length;
  const bars = [['protein', 'Protein', '#2f80ed'], ['carbs', 'Carbohydrates', '#f2994a'], ['fat', 'Fat', '#eb5757'], ['fiber', 'Fiber', '#27ae60']] as const;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Daily tracker</h1>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-2" aria-label="Previous day" onClick={() => setDate(shift(date, -1))}><ChevronLeft className="h-4 w-4" /></button>
          <input type="date" className="input !w-auto" value={date} max={dateStr()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
          <button className="btn-ghost !px-2" aria-label="Next day" disabled={date >= dateStr()} onClick={() => setDate(shift(date, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1" role="tablist">{(['day', 'week', 'month'] as const).map((r) => <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={`btn !min-h-[40px] capitalize ${range === r ? 'bg-primary text-white' : 'btn-ghost'}`}>{r}</button>)}</div>
      </div>

      {range !== 'day' && (
        <section className="card p-5">
          <h2 className="font-bold">Calories per day</h2>
          <p className="mb-3 text-sm text-muted">{logged === 0 ? 'No meals logged in this period.' : `Average ${fmt(val(rows, 'calories') / logged, 'kcal')} kcal on the ${logged} day${logged > 1 ? 's' : ''} you logged.`}</p>
          <BarChart data={chart} unit=" kcal" target={targets.calories} />
        </section>
      )}

      <section className="card space-y-4 p-5" aria-label="Daily totals">
        <div className="flex items-baseline justify-between"><h2 className="font-bold">{date === dateStr() ? 'Today' : new Date(date + 'T00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}</h2><p className="tabular-nums"><b className="text-2xl">{fmt(val(dayRows, 'calories'), 'kcal')}</b> <span className="text-sm text-muted">/ {targets.calories.toLocaleString()} kcal</span></p></div>
        <Bar value={val(dayRows, 'calories')} max={targets.calories} label="Calories" />
        <div className="grid gap-3 sm:grid-cols-2">{bars.map(([k, l, c]) => (
          <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{l}</span><span className="tabular-nums text-muted">{fmt(val(dayRows, k))} / {Math.round(targets[k])} g</span></div><Bar value={val(dayRows, k)} max={targets[k]} color={c} label={l} /></div>
        ))}</div>
      </section>

      {MEALS.map((m) => {
        const list = dayRows.filter((r) => r.meal === m);
        return (
          <section key={m} className="card p-4" aria-label={m}>
            <div className="flex items-center justify-between"><h2 className="font-bold capitalize">{m} <span className="text-sm font-normal text-muted">{list.length > 0 && `${fmt(val(list, 'calories'), 'kcal')} kcal`}</span></h2><button className="btn-ghost !min-h-[38px]" onClick={() => setAdding(m)}><Plus className="h-4 w-4" />Add</button></div>
            <ul className="mt-2 divide-y divide-line">
              {list.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{e.label}</p><p className="text-xs text-muted tabular-nums">{fmt(e.totals.calories?.v, 'kcal')} kcal · P {fmt(e.totals.protein?.v)} g</p></div>
                  <div className="flex items-center gap-1" aria-label="Portions">
                    <button className="btn-ghost !min-h-[36px] !px-2" aria-label="Fewer portions" disabled={e.servings <= 0.25} onClick={() => patch(e, { servings: Math.max(0.25, e.servings - 0.25) })}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-10 text-center text-sm tabular-nums">×{e.servings}</span>
                    <button className="btn-ghost !min-h-[36px] !px-2" aria-label="More portions" onClick={() => patch(e, { servings: Math.min(20, e.servings + 0.25) })}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <select className="input !w-auto !min-h-[36px] capitalize" aria-label="Meal" value={e.meal} onChange={(ev) => patch(e, { meal: ev.target.value as Meal })}>{MEALS.map((x) => <option key={x}>{x}</option>)}</select>
                  <button className="text-muted hover:text-red-600" aria-label={`Delete ${e.label}`} onClick={() => remove(e)}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
              {list.length === 0 && <li className="py-3 text-sm text-muted">Nothing logged.</li>}
            </ul>
          </section>
        );
      })}
      {adding && <AddModal meal={adding} date={date} onClose={() => setAdding(null)} onDone={() => { setAdding(null); load(); }} />}
    </div>
  );
}

function AddModal({ meal, date, onClose, onDone }: { meal: Meal; date: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<'scans' | 'search'>('scans');
  const [scans, setScans] = useState<ScanRow[] | null>(null);
  const [picked, setPicked] = useState<FoodMatch | null>(null);
  const [grams, setGrams] = useState(100);
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase().from('scans').select('*').order('created_at', { ascending: false }).limit(30).then(({ data }) => setScans((data ?? []) as ScanRow[])); }, []);

  async function log(scanId: string | null, label: string, totals: object) {
    const { error } = await supabase().from('meal_entries').insert({ scan_id: scanId, entry_date: date, meal, label, servings: 1, totals });
    if (error) throw new Error(error.message);
  }
  async function run(fn: () => Promise<void>) {
    if (busy) return; setBusy(true);
    try { await fn(); toast(`Added to ${meal}`); onDone(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Add to ${meal}`} onClose={onClose}>
      <div className="mb-3 flex gap-2" role="tablist">{(['scans', 'search'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn flex-1 ${tab === t ? 'bg-primary text-white' : 'btn-ghost'}`}>{t === 'scans' ? 'My scans' : 'Search foods'}</button>)}</div>
      {tab === 'scans' ? (
        !scans ? <Spinner /> : scans.length === 0 ? <p className="text-sm text-muted">No scans yet. Scan a meal or search foods instead.</p> :
        <ul className="space-y-2">{scans.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{s.title}</p><p className="text-xs text-muted">{fmt(sumItems(s.items).calories.v, 'kcal')} kcal · {new Date(s.created_at).toLocaleDateString()}</p></div>
            <button className="btn-ghost !min-h-[36px]" disabled={busy} onClick={() => run(() => log(s.id, s.title, sumItems(s.items)))}>Add</button></li>))}</ul>
      ) : picked ? (
        <div className="space-y-3"><p className="font-semibold">{picked.description}</p>
          <label className="block text-sm font-medium">Amount eaten (grams)<input type="number" min={1} max={3000} className="input mt-1" value={grams} onChange={(e) => setGrams(Math.max(1, Math.min(3000, Number(e.target.value) || 1)))} /></label>
          <div className="flex gap-2"><button className="btn-ghost" onClick={() => setPicked(null)}>Back</button>
            <button className="btn-primary flex-1" disabled={busy} onClick={() => run(async () => { const items = [itemFromMatch(picked, grams)]; const id = await createManualScan(picked.description, items, picked.dbSource === 'Open Food Facts' ? 'barcode' : 'manual'); await log(id, picked.description, sumItems(items)); })}>{busy && <Spinner />}Add {grams} g</button></div></div>
      ) : <FoodSearch onPick={setPicked} label="Select" />}
    </Modal>
  );
}
