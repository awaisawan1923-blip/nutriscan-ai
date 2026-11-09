'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Loader2, X } from 'lucide-react';

/* ---------- Notifications (in-app toasts) ---------- */
type Toast = { id: number; text: string; kind: 'ok' | 'error' };
const ToastCtx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, text, kind }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        <AnimatePresence>
          {list.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${t.kind === 'error' ? 'bg-red-600 text-white' : 'bg-ink text-white'}`}>
              <Bell className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Primitives ---------- */
export const Spinner = ({ className = 'h-4 w-4' }: { className?: string }) => <Loader2 className={`${className} animate-spin`} aria-label="Loading" />;

export function Bar({ value, max, color = '#16A36A', label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-soft" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
    </div>
  );
}

export function Ring({ value, max, size = 168, children }: { value: number; max: number; size?: number; children?: ReactNode }) {
  const r = (size - 18) / 2, c = 2 * Math.PI * r, pct = Math.min(1, max > 0 ? value / max : 0);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--soft)" strokeWidth={14} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#16A36A" strokeWidth={14} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </svg>
      <div className="absolute text-center">{children}</div>
    </div>
  );
}

export function BarChart({ data, unit = '', height = 140, target }: { data: { label: string; value: number }[]; unit?: string; height?: number; target?: number }) {
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 24 }} role="img" aria-label={`Bar chart: ${data.map((d) => `${d.label} ${Math.round(d.value)}${unit}`).join(', ')}`}>
      {data.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <motion.div className="w-full max-w-[34px] rounded-t-lg bg-primary/90" initial={{ height: 0 }} animate={{ height: Math.max(d.value > 0 ? 3 : 0, (d.value / max) * height) }} transition={{ duration: 0.6, delay: i * 0.015 }} title={`${d.label}: ${Math.round(d.value)}${unit}`} />
          <span className="w-full truncate text-center text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()}
        className="card max-h-[88vh] w-full overflow-y-auto rounded-b-none p-5 sm:max-w-lg sm:rounded-b-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-ghost !min-h-[36px] !px-2" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export const Empty = ({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) => (
  <div className="card grid place-items-center gap-2 px-6 py-12 text-center">
    <p className="font-semibold">{title}</p><p className="max-w-sm text-sm text-muted">{hint}</p>{children}
  </div>
);
