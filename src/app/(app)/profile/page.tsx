'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Spinner, useToast } from '@/components/ui';

const PREFS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free', 'Low sodium'];
const ACTIVITY = [['', 'Prefer not to say'], ['sedentary', 'Mostly sitting'], ['light', 'Lightly active'], ['moderate', 'Moderately active'], ['active', 'Very active'], ['very_active', 'Extremely active']];

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: '', age: '', height_cm: '', activity: '', diet_prefs: [] as string[], allergies: '', restrictions: '', calorie_target: '' });

  useEffect(() => {
    supabase().from('profiles').select('*').maybeSingle().then(({ data }) => {
      if (data) setF({ name: data.name ?? '', age: data.age?.toString() ?? '', height_cm: data.height_cm?.toString() ?? '', activity: data.activity ?? '', diet_prefs: data.diet_prefs ?? [], allergies: data.allergies ?? '', restrictions: data.restrictions ?? '', calorie_target: data.calorie_target?.toString() ?? '' });
      setLoaded(true);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return;
    const num = (s: string) => (s.trim() === '' ? null : Number(s));
    const age = num(f.age), h = num(f.height_cm), cal = num(f.calorie_target);
    if (age != null && !(age >= 1 && age <= 120)) return toast('Age must be between 1 and 120.', 'error');
    if (h != null && !(h >= 40 && h <= 260)) return toast('Height must be between 40 and 260 cm.', 'error');
    if (cal != null && !(cal >= 800 && cal <= 6000)) return toast('Calorie target must be between 800 and 6000.', 'error');
    setBusy(true);
    const { data: { user } } = await supabase().auth.getUser();
    const { error } = await supabase().from('profiles').upsert({ user_id: user!.id, name: f.name.trim() || null, age, height_cm: h, activity: f.activity || null, diet_prefs: f.diet_prefs, allergies: f.allergies.trim() || null, restrictions: f.restrictions.trim() || null, calorie_target: cal, updated_at: new Date().toISOString() });
    setBusy(false);
    error ? toast('Could not save: ' + error.message, 'error') : toast('Profile saved');
  }

  if (!loaded) return <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div>;
  return (
    <form onSubmit={save} className="mx-auto max-w-xl space-y-5">
      <div><h1 className="text-3xl font-extrabold">Profile</h1><p className="mt-1 text-sm text-muted">Everything here is optional. It only tailors the educational answers from the assistant and your daily reference targets. It never creates a restrictive diet.</p></div>
      <div className="card space-y-4 p-5">
        <label className="block text-sm font-medium">Name<input className="input mt-1" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Age<input className="input mt-1" type="number" inputMode="numeric" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></label>
          <label className="block text-sm font-medium">Height (cm)<input className="input mt-1" type="number" inputMode="decimal" value={f.height_cm} onChange={(e) => setF({ ...f, height_cm: e.target.value })} /></label>
        </div>
        <label className="block text-sm font-medium">Activity level<select className="input mt-1" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}>{ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="block text-sm font-medium">Daily calorie reference (kcal)<input className="input mt-1" type="number" inputMode="numeric" placeholder="Default: 2000 (FDA reference)" value={f.calorie_target} onChange={(e) => setF({ ...f, calorie_target: e.target.value })} />
          <span className="mt-1 block text-xs font-normal text-muted">Only changes the progress bars. Ask a doctor or registered dietitian what is right for you.</span></label>
      </div>
      <fieldset className="card space-y-3 p-5"><legend className="px-1 text-sm font-bold">Dietary preferences</legend>
        <div className="flex flex-wrap gap-2">{PREFS.map((p) => { const on = f.diet_prefs.includes(p); return <button type="button" key={p} aria-pressed={on} onClick={() => setF({ ...f, diet_prefs: on ? f.diet_prefs.filter((x) => x !== p) : [...f.diet_prefs, p] })} className={`btn !min-h-[38px] ${on ? 'bg-primary text-white' : 'btn-ghost'}`}>{p}</button>; })}</div>
        <label className="block text-sm font-medium">Food allergies<input className="input mt-1" maxLength={200} placeholder="e.g. peanuts, shellfish" value={f.allergies} onChange={(e) => setF({ ...f, allergies: e.target.value })} /></label>
        <label className="block text-sm font-medium">Other restrictions<input className="input mt-1" maxLength={200} value={f.restrictions} onChange={(e) => setF({ ...f, restrictions: e.target.value })} /></label>
      </fieldset>
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy}>{busy ? <Spinner /> : <Save className="h-4 w-4" />}Save profile</button>
        <button type="button" className="btn-ghost" onClick={async () => { await supabase().auth.signOut(); router.replace('/login'); router.refresh(); }}><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </form>
  );
}
