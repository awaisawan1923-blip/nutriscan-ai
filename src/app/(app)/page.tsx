'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ScanLine, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { dateStr, daysAgo, loadTargets, signedImage } from '@/lib/data';
import { Bar, BarChart, Empty, Ring, Spinner } from '@/components/ui';
import { fmt, type EntryRow, type ScanRow } from '@/lib/nutrients';

type Targets = Awaited<ReturnType<typeof loadTargets>>;

export default function Home() {
  const [entries, setEntries] = useState<EntryRow[] | null>(null);
  const [scans, setScans] = useState<(ScanRow & { url: string | null })[]>([]);
  const [t, setT] = useState<Targets | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [e, s, targets, p] = await Promise.all([
        sb.from('meal_entries').select('*').gte('entry_date', daysAgo(6)).lte('entry_date', dateStr()),
        sb.from('scans').select('*').order('created_at', { ascending: false }).limit(4),
        loadTargets(), sb.from('profiles').select('name').maybeSingle(),
      ]);
      setEntries((e.data ?? []) as EntryRow[]); setT(targets); setName(p.data?.name ?? '');
      setScans(await Promise.all(((s.data ?? []) as ScanRow[]).map(async (x) => ({ ...x, url: await signedImage(x.image_path) }))));
    })();
  }, []);

  if (!entries || !t) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div>;

  const today = dateStr();
  const sum = (day: string, k: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber') => entries.filter((e) => e.entry_date === day).reduce((s, e) => s + (e.totals[k]?.v ?? 0), 0);
  const week = Array.from({ length: 7 }, (_, i) => { const d = daysAgo(6 - i); return { label: new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' }), value: sum(d, 'calories') }; });
  const bars = [['protein', 'Protein', '#2f80ed'], ['fiber', 'Fiber', '#27ae60'], ['carbs', 'Carbohydrates', '#f2994a'], ['fat', 'Fat', '#eb5757']] as const;
  const cal = sum(today, 'calories');

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-ink p-6 text-white md:p-8">
        {name && <p className="text-sm text-accent">Welcome back, {name}</p>}
        <h1 className="mt-1 max-w-xl text-3xl font-extrabold leading-tight md:text-4xl">Understand your food. Improve your health.</h1>
        <p className="mt-2 max-w-md text-white/70">Simply upload a food photo and discover what’s inside your meal.</p>
        <Link href="/scan" className="btn mt-5 bg-accent text-ink hover:bg-white"><ScanLine className="h-5 w-5" />Scan a meal</Link>
      </section>

      <section className="grid gap-4 md:grid-cols-[auto_1fr]" aria-label="Today">
        <div className="card grid place-items-center p-6">
          <Ring value={cal} max={t.calories}>
            <p className="text-3xl font-extrabold tabular-nums">{fmt(cal, 'kcal')}</p>
            <p className="text-xs text-muted">of {t.calories.toLocaleString()} kcal</p>
          </Ring>
          <p className="mt-3 text-xs text-muted">{t.custom ? 'Your target' : 'FDA reference value'}</p>
        </div>
        <div className="card space-y-4 p-5">
          <h2 className="font-bold">Today’s nutrition</h2>
          {bars.map(([k, label, color]) => (
            <div key={k}>
              <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-muted">{fmt(sum(today, k))} / {Math.round(t[k])} g</span></div>
              <Bar value={sum(today, k)} max={t[k]} color={color} label={label} />
            </div>
          ))}
          {cal === 0 && <p className="text-sm text-muted">Nothing logged today. Scan a meal and add it to your day.</p>}
        </div>
      </section>

      <section className="card p-5" aria-label="Weekly overview">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="font-bold">This week</h2><Link href="/tracker" className="text-sm text-primary">Open tracker</Link></div>
        <BarChart data={week} unit=" kcal" target={t.calories} />
      </section>

      <section aria-label="Recent scans">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="text-xl font-bold">Recent scans</h2><Link href="/history" className="text-sm text-primary">See all</Link></div>
        {scans.length === 0 ? <Empty title="No scans yet" hint="Your first photo takes about ten seconds."><Link href="/scan" className="btn-primary mt-2">Scan your first meal</Link></Empty> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {scans.map((s) => (
              <Link key={s.id} href={`/scan/${s.id}`} className="card overflow-hidden transition hover:-translate-y-0.5">
                {s.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.url} alt="" className="h-28 w-full object-cover" /> : <div className="grid h-28 place-items-center bg-soft text-primary"><Utensils /></div>}
                <div className="p-3"><p className="truncate text-sm font-semibold">{s.title}</p><p className="text-xs text-muted">{fmt(s.items.reduce((a, i) => a + ((i.per100?.calories ?? 0) * i.grams) / 100, 0), 'kcal')} kcal</p></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
