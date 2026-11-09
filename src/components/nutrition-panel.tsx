'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Info } from 'lucide-react';
import { Bar } from './ui';
import { NUTRIENTS, fmt, pctDV, type Group, type ScanItem, type Totals } from '@/lib/nutrients';

const HEADLINE = [
  { key: 'calories', color: '#16A36A' }, { key: 'protein', color: '#2f80ed' }, { key: 'carbs', color: '#f2994a' },
  { key: 'fat', color: '#eb5757' }, { key: 'fiber', color: '#27ae60' }, { key: 'sugar', color: '#bb6bd9' },
] as const;

const SECTIONS: { group: Group; title: string }[] = [
  { group: 'macro', title: 'Macronutrients' }, { group: 'vitamin', title: 'Vitamins' },
  { group: 'mineral', title: 'Minerals' }, { group: 'other', title: 'Other nutrients' },
];

export function NutritionPanel({ items, totals }: { items: ScanItem[]; totals: Totals }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ macro: true });
  const matched = items.filter((i) => i.per100).length;
  const sources = Array.from(new Set(items.filter((i) => i.dbSource).map((i) => i.dbSource)));
  const aiWeights = items.filter((i) => i.gramsSource === 'ai').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {HEADLINE.map(({ key, color }) => {
          const d = NUTRIENTS.find((n) => n.key === key)!, x = totals[key], p = pctDV(key, x.v);
          return (
            <div key={key} className="card p-4">
              <p className="text-xs font-medium text-muted">{d.label}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{fmt(x.v, d.unit)}<span className="ml-1 text-sm font-semibold text-muted">{x.v != null && d.unit}</span></p>
              {x.partial && <p className="text-[11px] text-amber-600">Partial: some foods lack this value</p>}
              <div className="mt-2"><Bar value={x.v ?? 0} max={d.dv ?? 1} color={color} label={`${d.label} percent of daily value`} /></div>
              <p className="mt-1 text-[11px] text-muted">{p == null ? (d.dv ? 'Not available' : 'No daily value set') : `${p}% of daily value`}</p>
            </div>
          );
        })}
      </div>

      <div className="card flex gap-3 p-4 text-sm" role="note">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1 text-muted">
          <p><b className="text-fg">How these numbers are made.</b> Nutrient values per 100 g come from {sources.length ? sources.join(' and ') : 'a nutrition database (no match found yet)'} for {matched} of {items.length} foods. They are scaled by the portion weight.</p>
          <p>{aiWeights > 0 ? `${aiWeights} portion weight${aiWeights > 1 ? 's are' : ' is'} an AI estimate from the photo and can be off by a lot. Adjust grams above for a better result.` : 'All portion weights were set by you.'} Hidden oil, sugar and salt can’t be seen in photos.</p>
        </div>
      </div>

      {SECTIONS.map(({ group, title }) => (
        <section key={group} className="card overflow-hidden">
          <button className="flex min-h-[52px] w-full items-center justify-between px-4 text-left font-bold" aria-expanded={!!open[group]}
            onClick={() => setOpen((o) => ({ ...o, [group]: !o[group] }))}>
            {title}<ChevronDown className={`h-4 w-4 transition ${open[group] ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {open[group] && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <ul className="divide-y divide-line border-t border-line">
                  {NUTRIENTS.filter((n) => n.group === group).map((n) => {
                    const x = totals[n.key], p = pctDV(n.key, x.v);
                    return (
                      <li key={n.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                        <span>{n.label}</span>
                        <span className="text-right font-semibold tabular-nums">{x.v == null ? <span className="font-normal text-muted">Not available</span> : `${fmt(x.v, n.unit)} ${n.unit}`}{x.partial && <span className="ml-1 text-amber-600" title="Some foods have no value for this nutrient">*</span>}</span>
                        {p != null && <div className="col-span-2"><Bar value={x.v ?? 0} max={n.dv!} label={`${n.label} percent of daily value`} /></div>}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      ))}

      <section className="card overflow-x-auto" aria-label="Nutrition facts table">
        <h3 className="px-4 pt-4 font-bold">Nutrition facts</h3>
        <table className="mt-2 w-full min-w-[420px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="px-4 py-2 font-medium">Nutrient</th><th className="py-2 text-right font-medium">Amount</th><th className="py-2 text-right font-medium">% DV</th><th className="px-4 py-2 text-right font-medium">Basis</th></tr></thead>
          <tbody>
            {NUTRIENTS.map((n) => {
              const x = totals[n.key], p = pctDV(n.key, x.v);
              return (
                <tr key={n.key} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">{n.label}</td>
                  <td className="py-2 text-right tabular-nums">{x.v == null ? '—' : `${fmt(x.v, n.unit)} ${n.unit}`}</td>
                  <td className="py-2 text-right tabular-nums text-muted">{p == null ? '—' : `${p}%`}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted">{x.v == null ? 'Not in database' : x.partial ? 'Partial total' : 'Database × est. weight'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-4 pb-4 pt-2 text-xs text-muted">% DV uses FDA adult reference values (2,000 kcal). “—” means the database has no value; it is never filled in by guesswork.</p>
      </section>
    </div>
  );
}
