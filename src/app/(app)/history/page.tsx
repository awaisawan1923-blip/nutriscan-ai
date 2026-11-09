'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Heart, Search, Trash2, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { signedImage } from '@/lib/data';
import { Empty, Modal, Spinner, useToast } from '@/components/ui';
import { fmt, sumItems, type ScanRow } from '@/lib/nutrients';

type Row = ScanRow & { url: string | null };
const FILTERS = [['all', 'All'], ['saved', 'Saved'], ['favorite', 'Favorites'], ['photo', 'Photos'], ['manual', 'Manual']] as const;

export default function HistoryPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [f, setF] = useState<(typeof FILTERS)[number][0]>('all');
  const [del, setDel] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase().from('scans').select('*').order('created_at', { ascending: false }).limit(300);
      setRows(await Promise.all(((data ?? []) as ScanRow[]).map(async (x) => ({ ...x, url: await signedImage(x.image_path) }))));
    })();
  }, []);

  const shown = useMemo(() => (rows ?? []).filter((r) =>
    (f === 'all' || (f === 'saved' && r.saved) || (f === 'favorite' && r.favorite) || (f === 'photo' && r.source === 'photo') || (f === 'manual' && r.source !== 'photo')) &&
    (!q.trim() || (r.title + ' ' + r.items.map((i) => i.name).join(' ')).toLowerCase().includes(q.trim().toLowerCase()))), [rows, q, f]);

  async function remove(r: Row) {
    const sb = supabase();
    const { error } = await sb.from('scans').delete().eq('id', r.id);
    if (error) return toast('Could not delete: ' + error.message, 'error');
    if (r.image_path) await sb.storage.from('food-images').remove([r.image_path]);
    setRows((l) => (l ?? []).filter((x) => x.id !== r.id)); setDel(null); toast('Scan deleted');
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">History</h1>
      <div className="space-y-3">
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted" aria-hidden /><input className="input pl-9" placeholder="Search meals or foods" aria-label="Search history" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
          {FILTERS.map(([k, l]) => <button key={k} role="tab" aria-selected={f === k} onClick={() => setF(k)} className={`btn !min-h-[38px] shrink-0 ${f === k ? 'bg-primary text-white' : 'btn-ghost'}`}>{l}</button>)}
        </div>
      </div>
      {!rows ? <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div> : shown.length === 0 ? (
        <Empty title={rows.length ? 'No matches' : 'No scans yet'} hint={rows.length ? 'Try a different search or filter.' : 'Scanned meals appear here with their photos and nutrition.'}>{!rows.length && <Link href="/scan" className="btn-primary mt-2">Scan a meal</Link>}</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((r) => {
            const t = sumItems(r.items);
            return (
              <li key={r.id} className="card flex overflow-hidden">
                <Link href={`/scan/${r.id}`} className="flex min-w-0 flex-1">
                  {r.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.url} alt="" className="h-full min-h-[110px] w-28 object-cover" /> : <div className="grid min-h-[110px] w-28 place-items-center bg-soft text-primary"><Utensils /></div>}
                  <div className="min-w-0 flex-1 p-3">
                    <p className="flex items-center gap-1 truncate font-semibold">{r.title}{r.saved && <Bookmark className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Saved" />}{r.favorite && <Heart className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" aria-label="Favorite" />}</p>
                    <p className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                    <p className="mt-2 text-sm tabular-nums"><b>{fmt(t.calories.v, 'kcal')}</b> kcal</p>
                    <p className="text-xs text-muted">P {fmt(t.protein.v)} · C {fmt(t.carbs.v)} · F {fmt(t.fat.v)} g</p>
                  </div>
                </Link>
                <button className="px-3 text-muted hover:text-red-600" aria-label={`Delete ${r.title}`} onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
      {del && <Modal title="Delete this scan?" onClose={() => setDel(null)}><p className="mb-4 text-sm text-muted">“{del.title}” and its photo will be removed. Entries already logged in your tracker stay, but lose their link to this scan.</p><div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setDel(null)}>Keep</button><button className="btn-danger flex-1" onClick={() => remove(del)}>Delete</button></div></Modal>}
    </div>
  );
}
