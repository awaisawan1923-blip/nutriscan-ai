import { NUTRIENTS, type Per100 } from './nutrients';

export interface FoodMatch {
  dbSource: 'USDA FoodData Central' | 'Open Food Facts';
  dbId: string;
  description: string;
  dataType: string;
  per100: Per100;
}

const BASE = 'https://api.nal.usda.gov/fdc/v1';

export class ConfigError extends Error {}

function extract(list: any[]): Per100 {
  const byNumber = new Map<string, number>();
  for (const n of list ?? []) {
    const num = String(n.nutrientNumber ?? n.number ?? '');
    const val = n.value ?? n.amount;
    if (num && typeof val === 'number') byNumber.set(num, val);
  }
  const out: Per100 = {};
  for (const d of NUTRIENTS) {
    const hit = d.fdc.find((num) => byNumber.has(num));
    out[d.key] = hit ? byNumber.get(hit)! : null; // absent in the database -> null, never guessed
  }
  return out;
}

export async function searchFoods(query: string, pageSize = 6): Promise<FoodMatch[]> {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new ConfigError('USDA_API_KEY is not configured on the server.');
  const res = await fetch(`${BASE}/foods/search?api_key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize, dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'] }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`USDA lookup failed (${res.status})`);
  const json = await res.json();
  return (json.foods ?? []).map((f: any): FoodMatch => ({
    dbSource: 'USDA FoodData Central',
    dbId: String(f.fdcId),
    description: String(f.description ?? query),
    dataType: String(f.dataType ?? ''),
    per100: extract(f.foodNutrients),
  }));
}
