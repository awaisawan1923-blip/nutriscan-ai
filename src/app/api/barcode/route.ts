import { NextResponse } from 'next/server';
import { z } from 'zod';
import { failure, rateLimited, requireUser, unauthorized } from '@/lib/server-utils';
import type { Per100 } from '@/lib/nutrients';

export const runtime = 'nodejs';

// Open Food Facts reports most nutrients in grams per 100 g.
const G = (n: any, k: string) => (typeof n[k] === 'number' ? n[k] : null);
const MG = (n: any, k: string) => (typeof n[k] === 'number' ? n[k] * 1000 : null);

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return unauthorized();
  if (rateLimited(user.id + ':barcode', 20)) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  const code = z.string().regex(/^\d{8,14}$/).safeParse(new URL(req.url).searchParams.get('code'));
  if (!code.success) return NextResponse.json({ error: 'Enter the 8 to 14 digits printed under the barcode.' }, { status: 400 });
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code.data}.json?fields=product_name,brands,nutriments`, {
      headers: { 'User-Agent': 'NutriScanAI/1.0' }, signal: AbortSignal.timeout(10_000), cache: 'no-store',
    });
    const j = await r.json();
    if (j.status !== 1) return NextResponse.json({ error: 'That barcode is not in Open Food Facts yet. Try searching by name.' }, { status: 404 });
    const n = j.product.nutriments ?? {};
    const per100: Per100 = {
      calories: G(n, 'energy-kcal_100g'), protein: G(n, 'proteins_100g'), carbs: G(n, 'carbohydrates_100g'),
      fat: G(n, 'fat_100g'), fiber: G(n, 'fiber_100g'), sugar: G(n, 'sugars_100g'), satFat: G(n, 'saturated-fat_100g'),
      transFat: G(n, 'trans-fat_100g'), cholesterol: MG(n, 'cholesterol_100g'), sodium: MG(n, 'sodium_100g'),
      potassium: MG(n, 'potassium_100g'), calcium: MG(n, 'calcium_100g'), iron: MG(n, 'iron_100g'),
      vitC: MG(n, 'vitamin-c_100g'),
    };
    const name = [j.product.brands?.split(',')[0], j.product.product_name].filter(Boolean).join(' ') || `Barcode ${code.data}`;
    return NextResponse.json({ food: { dbSource: 'Open Food Facts', dbId: code.data, description: name, dataType: 'Packaged product', per100 } });
  } catch (e) { return failure(e); }
}
