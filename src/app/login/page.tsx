'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui';
import { ThemeToggle } from '@/components/shell';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const sb = supabase();
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg({ text: error.message, error: true });
    if (mode === 'up' && !data.session) return setMsg({ text: 'Check your email to confirm your account, then sign in.', error: false });
    router.replace('/'); router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white"><Leaf className="h-7 w-7" /></span>
          <h1 className="text-3xl font-extrabold">Understand your food.</h1>
          <p className="mt-2 text-sm text-muted">Sign in to scan meals and keep your nutrition history.</p>
        </div>
        <form onSubmit={submit} className="card space-y-3 p-5">
          <label className="block text-sm font-medium">Email
            <input className="input mt-1" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Password
            <input className="input mt-1" type="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {msg && <p role="alert" className={`text-sm ${msg.error ? 'text-red-600' : 'text-primary'}`}>{msg.text}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner />}{mode === 'in' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="w-full text-center text-sm text-muted underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null); }}>
            {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
