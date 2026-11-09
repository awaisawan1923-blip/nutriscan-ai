'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { dateStr } from '@/lib/data';
import { NUTRIENTS, fmt, sumItems, type EntryRow, type ScanRow } from '@/lib/nutrients';
import { Spinner, useToast } from '@/components/ui';

type Msg = { role: 'user' | 'assistant'; content: string };
const SUGGESTIONS = ['What nutrients am I getting today?', 'Explain my latest scan in simple terms', 'Which of my recent meals has the most fiber?', 'Suggest a balanced dinner that goes with what I ate today'];

async function buildContext() {
  const sb = supabase();
  const [e, s, p] = await Promise.all([
    sb.from('meal_entries').select('*').eq('entry_date', dateStr()),
    sb.from('scans').select('*').order('created_at', { ascending: false }).limit(5),
    sb.from('profiles').select('name,age,activity,diet_prefs,allergies,restrictions,calorie_target').maybeSingle(),
  ]);
  const entries = (e.data ?? []) as EntryRow[], scans = (s.data ?? []) as ScanRow[];
  const line = (t: ReturnType<typeof sumItems>) => NUTRIENTS.map((n) => `${n.label}: ${t[n.key].v == null ? 'not available' : fmt(t[n.key].v, n.unit) + ' ' + n.unit}`).join('; ');
  const today = entries.reduce((a, x) => { for (const n of NUTRIENTS) a[n.key] = (a[n.key] ?? 0) + (x.totals[n.key]?.v ?? 0); return a; }, {} as Record<string, number>);
  return [
    p.data ? `PROFILE (optional, user-provided): ${JSON.stringify(p.data)}` : 'PROFILE: not provided',
    `TODAY LOGGED (${entries.length} entries; values are estimates): ${entries.map((x) => `${x.meal}: ${x.label} x${x.servings}`).join(' | ') || 'nothing'}`,
    `TODAY TOTALS: ${NUTRIENTS.filter((n) => today[n.key] != null).map((n) => `${n.label} ${fmt(today[n.key], n.unit)} ${n.unit}`).join('; ') || 'none'}`,
    ...scans.map((x, i) => `RECENT SCAN ${i + 1} "${x.title}" (${x.items.map((it) => `${it.name} ~${it.grams} g${it.gramsSource === 'ai' ? ' AI-estimated' : ''}`).join(', ')}): ${line(sumItems(x.items))}`),
  ].join('\n').slice(0, 5800);
}

function Chat() {
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(q: string) {
    q = q.trim(); if (!q || busy) return;
    const next = [...msgs, { role: 'user' as const, content: q }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const context = await buildContext();
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.slice(-12), context }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'The assistant is unavailable.');
      setMsgs([...next, { role: 'assistant', content: j.reply }]);
    } catch (e) { toast((e as Error).message, 'error'); setMsgs(msgs); setText(q); } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col gap-4">
      <div><h1 className="text-3xl font-extrabold">Nutrition assistant</h1><p className="mt-1 text-sm text-muted">Ask about your meals, nutrients, or balanced combinations. General education only: not medical advice or a diet plan.</p></div>
      <div className="flex-1 space-y-3" aria-live="polite">
        {msgs.length === 0 && <div className="grid gap-2 sm:grid-cols-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="card flex items-start gap-2 p-3 text-left text-sm transition hover:bg-soft"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s}</button>)}</div>}
        {msgs.map((m, i) => <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'ml-auto bg-primary text-white' : 'card'}`}>{m.content}</div>)}
        {busy && <div className="card inline-flex items-center gap-2 px-4 py-3 text-sm text-muted"><Spinner />Thinking…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="sticky bottom-20 flex gap-2 md:bottom-4">
        <input className="input shadow-card" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Ask about your nutrition…" aria-label="Your question" />
        <button className="btn-primary !px-4" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
export default function Page() { return <Suspense><Chat /></Suspense>; }
