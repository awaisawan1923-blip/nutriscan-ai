# NutriScan AI

Photo → food recognition → portion estimate → database-backed nutrition → dashboard, tracker, history, comparison and an educational assistant.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Framer Motion · Lucide · Supabase (Auth, Postgres, Storage) · Claude vision (recognition + assistant) · USDA FoodData Central · Open Food Facts (barcodes).

## How the numbers are produced (accuracy model)

| Value | Where it comes from | Labelled in the UI as |
|---|---|---|
| Food names, cooking method, visible ingredients | Vision model, with a 0–1 confidence | "Recognition: High/Medium/Low" |
| Portion weight (g) | Vision model **estimate** until you edit it | "Weight: AI estimate" / "set by you" |
| Nutrients per 100 g | USDA FoodData Central (or Open Food Facts for barcodes) | The matched database entry name |
| Totals | per-100 g × grams, summed | "Database × est. weight" |
| Missing nutrients | Never filled in. Shown as "Not available" / "—" | Totals with gaps show a "partial" marker |

The model cannot see oil, sugar, salt or hidden ingredients, so it asks clarifying questions and you can change every food, weight, cooking method, ingredient list and database match. Nutrition recalculates instantly.

Known data limits: USDA has little on B7 (biotin), iodine and added sugars, and few South Asian dishes. Those show as unavailable, and composite dishes are split into components or matched to the closest entry, which you can swap.

## Setup

1. **Install**: `npm install`
2. **Supabase**: create a project at supabase.com → SQL Editor → run `supabase/schema.sql` (tables, row-level security, private `food-images` bucket). Under Authentication → Providers keep Email enabled (disable "Confirm email" for faster local testing if you like).
3. **Keys**: copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → Project Settings → API (the anon key is safe for browsers because RLS protects data).
   - `ANTHROPIC_API_KEY`: console.anthropic.com. **Server only.**
   - `ANTHROPIC_MODEL`: any vision-capable Claude model id.
   - `USDA_API_KEY`: free at fdc.nal.usda.gov/api-key-signup. **Server only.**
4. **Run**: `npm run dev` → http://localhost:3000, create an account, scan a meal.

Camera note: `getUserMedia` (desktop webcam) needs HTTPS or `localhost`. On phones, "Take photo" opens the native camera.

## Deploy (Vercel)

1. Push to GitHub → import in Vercel.
2. Add the five environment variables above in Project Settings → Environment Variables.
3. In Supabase → Authentication → URL Configuration, set Site URL to your Vercel domain (and add it to Redirect URLs).
4. Deploy. `/api/analyze` sets `maxDuration = 60`, which needs a plan that allows it (Hobby allows up to 60 s on current Fluid compute; check your plan).

## Security notes

- API keys are read only in server route handlers; nothing secret uses `NEXT_PUBLIC_`.
- Every API route requires a signed-in Supabase session and validates input with Zod.
- Uploads: client-side resize to ≤1600 px JPEG; server enforces ≤6 MB and checks magic bytes (JPEG/PNG/WebP), not just the declared type.
- Row-level security restricts every table and storage folder to its owner. Images are in a private bucket and served via short-lived signed URLs.
- Per-user rate limits are in-memory (per instance). For multi-instance production, swap `rateLimited()` in `src/lib/server-utils.ts` for Redis/Upstash.
- Security headers are set in `next.config.mjs`.

## Project map

```
supabase/schema.sql          tables, RLS, storage policies
src/middleware.ts            session refresh + auth redirect
src/lib/nutrients.ts         nutrient definitions, unit/DV tables, calculation
src/lib/usda.ts, vision.ts   database + vision integrations (server)
src/app/api/analyze          photo → recognition → database match → saved scan
src/app/api/foods/search     USDA search          src/app/api/barcode   Open Food Facts
src/app/api/assistant        educational chat with guardrails
src/app/(app)/…              Home, Scan, Scan result, Tracker, History, Compare, Assistant, Profile
```

## Scope notes

- **Barcode:** lookup by the printed number works (Open Food Facts, limited nutrient coverage). Live camera barcode decoding is not included; `BarcodeDetector` or a library such as ZXing can feed the same `/api/barcode` route.
- **Notifications:** in-app toasts for every action. Push/email reminders are not included.
- **PDF export:** client-side via jsPDF. **Share:** Web Share API, with clipboard fallback.
- This app was written without being able to run `npm install` or a build in my environment, so expect to fix small type or dependency-version issues on first `npm run dev` / `npm run typecheck`.
- For education only; not medical advice.
