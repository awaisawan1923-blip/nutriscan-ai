'use client';
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bookmark, Download, Heart, Plus, Repeat, Save, Share2, Trash2, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { dateStr, signedImage } from '@/lib/data';
import { MEALS, confidenceLabel, fmt, sumItems, type Meal, type ScanItem, type ScanRow } from '@/lib/nutrients';
import { downloadPdf, shareSummary, summaryText } from '@/lib/export';
import { Modal, Spinner, useToast } from '@/components/ui';
import { FoodSearch, itemFromMatch, type FoodMatch } from '@/components/food-search';
import { NutritionPanel } from '@/components/nutrition-panel';

export default function ScanResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [scan, setScan] = useState<ScanRow | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [title, setTitle] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [swap, setSwap] = useState<string | 'new' | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase().from('scans').select('*').eq('id', id).maybeSingle();
      if (!data) return setMissing(true);
      setScan(data as ScanRow); setItems((data as ScanRow).items); setTitle(data.title);
      setImg(await signedImage(data.image_path));
    })();
  }, [id]);

  const totals = useMemo(() => sumItems(items), [items]);
  const edit = (itemId: string, patch: Partial<ScanItem>) => { setItems((l) => l.map((i) => (i.id === itemId ? { ...i, ...patch } : i))); setDirty(true); };

  async function persist(extra: Partial<ScanRow> = {}) {
    setSaving(true);
    const { error } = await supabase().from('scans').update({ items, title: title.trim() || 'Meal', ...extra }).eq('id', id);
    setSaving(false);
    if (error) { toast('Could not save: ' + error.message, 'error'); return false; }
    setDirty(false); return true;
  }
  async function toggle(field: 'saved' | 'favorite') {
    if (!scan) return;
    const next = !scan[field];
    if (await persist({ [field]: next })) { setScan({ ...scan, [field]: next }); toast(field === 'saved' ? (next ? 'Report saved' : 'Removed from saved reports') : (next ? 'Added to favorites' : 'Removed from favorites')); }
  }
  function pick(m: FoodMatch) {
    if (swap === 'new') { setItems((l) => [...l, itemFromMatch(m, 100)]); }
    else if (swap) edit(swap, { dbSource: m.dbSource, dbId: m.dbId, dbDescription: m.description, per100: m.per100 });
    setDirty(true); setSwap(null);
  }

  if (missing) return <p className="card p-6">This scan no longer exists. <Link className="text-primary underline" href="/history">Back to history</Link></p>;
  if (!scan) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div>;

  const totalGrams = items.reduce((s, i) => s + i.grams, 0);
  const lowConf = items.some((i) => i.confidence < 0.5);

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden md:grid md:grid-cols-[320px_1fr]">
        {img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt={`Photo of ${scan.title}`} className="h-56 w-full object-cover md:h-full" /> : <div className="grid h-40 place-items-center bg-soft text-primary md:h-full"><Utensils className="h-10 w-10" /></div>}
        <div className="space-y-3 p-5">
          <label className="block text-xs font-medium text-muted">Meal name
            <input className="input mt-1 text-lg font-bold" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
          </label>
          <p className="text-4xl font-extrabold tabular-nums">{fmt(totals.calories.v, 'kcal')}<span className="ml-1 text-base font-semibold text-muted">kcal estimated</span></p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip">~{Math.round(totalGrams)} g total</span>
            {scan.confidence != null && <span className="chip">Recognition confidence: {confidenceLabel(scan.confidence)}</span>}
            <span className="chip">{scan.source === 'photo' ? 'From photo' : scan.source === 'barcode' ? 'From barcode' : 'Manual entry'}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn-primary" onClick={() => setLogOpen(true)}><Utensils className="h-4 w-4" />Add to meal</button>
            <button className={scan.saved ? 'btn bg-soft text-primary' : 'btn-ghost'} onClick={() => toggle('saved')} aria-pressed={scan.saved}><Bookmark className="h-4 w-4" />{scan.saved ? 'Saved' : 'Save report'}</button>
            <button className={scan.favorite ? 'btn bg-soft text-primary' : 'btn-ghost'} onClick={() => toggle('favorite')} aria-pressed={scan.favorite} aria-label="Favorite"><Heart className={`h-4 w-4 ${scan.favorite ? 'fill-current' : ''}`} /></button>
            <button className="btn-ghost" onClick={() => downloadPdf(title, new Date(scan.created_at).toLocaleString(), items, totals).catch(() => toast('PDF export failed', 'error'))}><Download className="h-4 w-4" />PDF</button>
            <button className="btn-ghost" onClick={async () => { try { const r = await shareSummary(summaryText(title, items, totals), title); if (r === 'copied') toast('Summary copied to clipboard'); } catch { toast('Sharing is not available here', 'error'); } }}><Share2 className="h-4 w-4" />Share</button>
          </div>
        </div>
      </div>

      {(scan.questions.length > 0 || lowConf) && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200" role="note">
          <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />Please check these before you rely on the numbers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {scan.questions.map((q, i) => <li key={i}>{q}</li>)}
            {lowConf && <li>Some foods have low recognition confidence. Rename them or change the database match below.</li>}
          </ul>
        </div>
      )}

      <section aria-labelledby="foods-h" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="foods-h" className="text-xl font-bold">Recognised foods</h2>
          <button className="btn-ghost !min-h-[38px]" onClick={() => setSwap('new')}><Plus className="h-4 w-4" />Add food</button>
        </div>
        {items.map((it) => (
          <div key={it.id} className="card space-y-3 p-4">
            <div className="flex items-start gap-2">
              <label className="flex-1 text-xs font-medium text-muted">Food
                <input className="input mt-1 font-semibold" value={it.name} maxLength={120} onChange={(e) => edit(it.id, { name: e.target.value })} />
              </label>
              <button className="btn-danger !min-h-[44px] mt-5 !px-3" aria-label={`Remove ${it.name}`} onClick={() => { setItems((l) => l.filter((x) => x.id !== it.id)); setDirty(true); }}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-muted">Weight (grams)
                <input className="input mt-1" type="number" inputMode="decimal" min={1} max={3000} value={it.grams}
                  onChange={(e) => edit(it.id, { grams: Math.max(1, Math.min(3000, Number(e.target.value) || 1)), gramsSource: 'user' })} />
              </label>
              <label className="text-xs font-medium text-muted">Cooking method
                <input className="input mt-1" value={it.cookingMethod} maxLength={80} placeholder="e.g. fried, grilled" onChange={(e) => edit(it.id, { cookingMethod: e.target.value })} />
              </label>
              <label className="text-xs font-medium text-muted">Ingredients (comma separated)
                <input className="input mt-1" value={it.ingredients.join(', ')} onChange={(e) => edit(it.id, { ingredients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20) })} />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="chip">{it.gramsSource === 'user' ? 'Weight: set by you' : 'Weight: AI estimate'}</span>
              <span className="chip">Recognition: {confidenceLabel(it.confidence)}</span>
              {it.per100 ? <span className="chip">{it.dbSource}: {it.dbDescription}</span> : <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">No database match, nutrition not counted</span>}
              <button className="btn-ghost !min-h-[30px] !px-2.5 !text-xs" onClick={() => setSwap(it.id)}><Repeat className="h-3.5 w-3.5" />{it.per100 ? 'Change match' : 'Find match'}</button>
            </div>
            {it.note && <p className="text-xs text-muted">{it.note}</p>}
          </div>
        ))}
        {items.length === 0 && <p className="card p-4 text-sm text-muted">No foods left. Add one to see nutrition.</p>}
        {dirty && (
          <div className="sticky bottom-24 z-20 md:bottom-4">
            <button className="btn-primary w-full shadow-lg" disabled={saving} onClick={async () => { if (await persist()) toast('Changes saved'); }}>{saving ? <Spinner /> : <Save className="h-4 w-4" />}Save changes</button>
          </div>
        )}
      </section>

      <NutritionPanel items={items} totals={totals} />

      {swap && <Modal title={swap === 'new' ? 'Add a food' : 'Choose database match'} onClose={() => setSwap(null)}><FoodSearch onPick={pick} label={swap === 'new' ? 'Add' : 'Use match'} /></Modal>}
      {logOpen && <LogModal onClose={() => setLogOpen(false)} scanId={id} title={title} totals={totals} persist={persist} dirty={dirty} />}
    </div>
  );
}

function LogModal({ onClose, scanId, title, totals, persist, dirty }: { onClose: () => void; scanId: string; title: string; totals: ReturnType<typeof sumItems>; persist: () => Promise<boolean>; dirty: boolean }) {
  const toast = useToast();
  const hour = new Date().getHours();
  const [meal, setMeal] = useState<Meal>(hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 21 ? 'dinner' : 'snack');
  const [date, setDate] = useState(dateStr());
  const [servings, setServings] = useState(1);
  const [busy, setBusy] = useState(false);
  async function add() {
    if (busy) return; setBusy(true);
    if (dirty) await persist();
    const scaled = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, { v: v.v == null ? null : v.v * servings, partial: v.partial }]));
    const { error } = await supabase().from('meal_entries').insert({ scan_id: scanId, entry_date: date, meal, label: title || 'Meal', servings, totals: scaled });
    setBusy(false);
    if (error) return toast('Could not add: ' + error.message, 'error');
    toast(`Added to ${meal}`); onClose();
  }
  return (
    <Modal title="Add to your day" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Meal">
          {MEALS.map((m) => <button key={m} role="radio" aria-checked={meal === m} onClick={() => setMeal(m)} className={`btn !px-1 capitalize ${meal === m ? 'bg-primary text-white' : 'btn-ghost'}`}>{m}</button>)}
        </div>
        <label className="block text-sm font-medium">Date<input type="date" className="input mt-1" value={date} max={dateStr()} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="block text-sm font-medium">Portions eaten (1 = the whole scanned meal)
          <input type="number" className="input mt-1" step="0.25" min="0.25" max="10" value={servings} onChange={(e) => setServings(Math.max(0.25, Math.min(10, Number(e.target.value) || 1)))} />
        </label>
        <button className="btn-primary w-full" onClick={add} disabled={busy}>{busy && <Spinner />}Add to {meal}</button>
      </div>
    </Modal>
  );
}
