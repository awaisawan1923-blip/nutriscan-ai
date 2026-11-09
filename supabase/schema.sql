-- NutriScan AI schema. Run in Supabase -> SQL Editor.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  name text,
  age int check (age between 1 and 120),
  height_cm numeric check (height_cm between 40 and 260),
  activity text check (activity in ('sedentary','light','moderate','active','very_active')),
  diet_prefs text[] not null default '{}',
  allergies text,
  restrictions text,
  calorie_target int check (calorie_target between 800 and 6000),
  updated_at timestamptz not null default now()
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  source text not null default 'photo' check (source in ('photo','manual','barcode')),
  image_path text,
  items jsonb not null default '[]',
  questions jsonb not null default '[]',
  confidence numeric check (confidence between 0 and 1),
  saved boolean not null default false,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists scans_user_created on public.scans (user_id, created_at desc);

create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  scan_id uuid references public.scans on delete set null,
  entry_date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  label text not null,
  servings numeric not null default 1 check (servings > 0 and servings <= 20),
  totals jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists entries_user_date on public.meal_entries (user_id, entry_date);

alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.meal_entries enable row level security;

create policy "own profile" on public.profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own scans" on public.scans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own entries" on public.meal_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Private image bucket; each user can only touch files inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-images', 'food-images', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "own images read" on storage.objects for select
  using (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images insert" on storage.objects for insert
  with check (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own images delete" on storage.objects for delete
  using (bucket_id = 'food-images' and (storage.foldername(name))[1] = auth.uid()::text);
