'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeftRight, History, Home, Leaf, Moon, ScanLine, Sparkles, Sun, Utensils } from 'lucide-react';
import { UserRound } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tracker', label: 'Tracker', icon: Utensils },
  { href: '/scan', label: 'Scan', icon: ScanLine },
  { href: '/history', label: 'History', icon: History },
  { href: '/assistant', label: 'Assistant', icon: Sparkles },
];
const MORE = [
  { href: '/compare', label: 'Compare', icon: ArrowLeftRight },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  return (
    <button className="btn-ghost !min-h-[40px] !px-2.5" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => { const n = !dark; setDark(n); document.documentElement.classList.toggle('dark', n); try { localStorage.setItem('theme', n ? 'dark' : 'light'); } catch {} }}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

const Logo = () => (
  <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight" aria-label="NutriScan AI home">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"><Leaf className="h-5 w-5" /></span>
    <span>NutriScan <span className="text-primary">AI</span></span>
  </Link>
);

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <div className="min-h-screen md:pl-60">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 border-r border-line bg-card p-4 md:flex">
        <div className="mb-6 px-2 pt-2"><Logo /></div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {[...NAV, ...MORE].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active(href) ? 'bg-soft text-primary dark:text-accent' : 'text-muted hover:bg-soft'}`}>
              <Icon className="h-[18px] w-[18px]" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto"><ThemeToggle /></div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1.5">
          {MORE.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-label={label} className="btn-ghost !min-h-[40px] !px-2.5"><Icon className="h-4 w-4" /></Link>
          ))}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">{children}</main>

      <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const scan = href === '/scan';
          return (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active(href) ? 'text-primary' : 'text-muted'}`}>
              {scan ? <span className="-mt-6 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg"><Icon className="h-6 w-6" /></span> : <Icon className="h-5 w-5" />}
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
