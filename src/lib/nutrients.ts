export type NutrientKey =
  | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'addedSugar' | 'satFat' | 'transFat' | 'cholesterol'
  | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'magnesium' | 'zinc' | 'phosphorus' | 'copper' | 'manganese' | 'selenium' | 'iodine'
  | 'vitA' | 'b1' | 'b2' | 'b3' | 'b5' | 'b6' | 'b7' | 'b9' | 'b12' | 'vitC' | 'vitD' | 'vitE' | 'vitK';

export type Unit = 'kcal' | 'g' | 'mg' | 'mcg';
export type Group = 'macro' | 'vitamin' | 'mineral' | 'other';

export interface NutrientDef {
  key: NutrientKey;
  label: string;
  unit: Unit;
  group: Group;
  /** USDA FoodData Central nutrient numbers, first match wins. */
  fdc: string[];
  /** FDA Daily Value used for % DV bars (adults, 2000 kcal reference). */
  dv?: number;
}

export const NUTRIENTS: NutrientDef[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', group: 'macro', fdc: ['208', '957', '958'], dv: 2000 },
  { key: 'protein', label: 'Protein', unit: 'g', group: 'macro', fdc: ['203'], dv: 50 },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g', group: 'macro', fdc: ['205'], dv: 275 },
  { key: 'fat', label: 'Total fat', unit: 'g', group: 'macro', fdc: ['204'], dv: 78 },
  { key: 'fiber', label: 'Dietary fiber', unit: 'g', group: 'macro', fdc: ['291'], dv: 28 },
  { key: 'sugar', label: 'Total sugars', unit: 'g', group: 'macro', fdc: ['269', '269.3'] },
  { key: 'addedSugar', label: 'Added sugars', unit: 'g', group: 'other', fdc: ['539'], dv: 50 },
  { key: 'satFat', label: 'Saturated fat', unit: 'g', group: 'other', fdc: ['606'], dv: 20 },
  { key: 'transFat', label: 'Trans fat', unit: 'g', group: 'other', fdc: ['605'] },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', group: 'other', fdc: ['601'], dv: 300 },
  { key: 'vitA', label: 'Vitamin A (RAE)', unit: 'mcg', group: 'vitamin', fdc: ['320'], dv: 900 },
  { key: 'b1', label: 'Vitamin B1 (thiamin)', unit: 'mg', group: 'vitamin', fdc: ['404'], dv: 1.2 },
  { key: 'b2', label: 'Vitamin B2 (riboflavin)', unit: 'mg', group: 'vitamin', fdc: ['405'], dv: 1.3 },
  { key: 'b3', label: 'Vitamin B3 (niacin)', unit: 'mg', group: 'vitamin', fdc: ['406'], dv: 16 },
  { key: 'b5', label: 'Vitamin B5 (pantothenic acid)', unit: 'mg', group: 'vitamin', fdc: ['410'], dv: 5 },
  { key: 'b6', label: 'Vitamin B6', unit: 'mg', group: 'vitamin', fdc: ['415'], dv: 1.7 },
  { key: 'b7', label: 'Vitamin B7 (biotin)', unit: 'mcg', group: 'vitamin', fdc: ['416'], dv: 30 },
  { key: 'b9', label: 'Vitamin B9 (folate, DFE)', unit: 'mcg', group: 'vitamin', fdc: ['435', '417'], dv: 400 },
  { key: 'b12', label: 'Vitamin B12', unit: 'mcg', group: 'vitamin', fdc: ['418'], dv: 2.4 },
  { key: 'vitC', label: 'Vitamin C', unit: 'mg', group: 'vitamin', fdc: ['401'], dv: 90 },
  { key: 'vitD', label: 'Vitamin D', unit: 'mcg', group: 'vitamin', fdc: ['328'], dv: 20 },
  { key: 'vitE', label: 'Vitamin E', unit: 'mg', group: 'vitamin', fdc: ['323'], dv: 15 },
  { key: 'vitK', label: 'Vitamin K', unit: 'mcg', group: 'vitamin', fdc: ['430'], dv: 120 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', group: 'mineral', fdc: ['307'], dv: 2300 },
  { key: 'potassium', label: 'Potassium', unit: 'mg', group: 'mineral', fdc: ['306'], dv: 4700 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral', fdc: ['301'], dv: 1300 },
  { key: 'iron', label: 'Iron', unit: 'mg', group: 'mineral', fdc: ['303'], dv: 18 },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'mineral', fdc: ['304'], dv: 420 },
  { key: 'zinc', label: 'Zinc', unit: 'mg', group: 'mineral', fdc: ['309'], dv: 11 },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', group: 'mineral', fdc: ['305'], dv: 1250 },
  { key: 'copper', label: 'Copper', unit: 'mg', group: 'mineral', fdc: ['312'], dv: 0.9 },
  { key: 'manganese', label: 'Manganese', unit: 'mg', group: 'mineral', fdc: ['315'], dv: 2.3 },
  { key: 'selenium', label: 'Selenium', unit: 'mcg', group: 'mineral', fdc: ['317'], dv: 55 },
  { key: 'iodine', label: 'Iodine', unit: 'mcg', group: 'mineral', fdc: ['314'], dv: 150 },
];

export const DEF = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n])) as Record<NutrientKey, NutrientDef>;

/** Nutrient amounts per 100 g. `null`/missing = the database has no value (never guessed). */
export type Per100 = Partial<Record<NutrientKey, number | null>>;

export interface ScanItem {
  id: string;
  name: string;
  grams: number;
  gramsSource: 'ai' | 'user';
  cookingMethod: string;
  ingredients: string[];
  confidence: number; // 0..1, model's own recognition confidence
  dbSource: 'USDA FoodData Central' | 'Open Food Facts' | null;
  dbId: string | null;
  dbDescription: string;
  per100: Per100 | null;
  note?: string;
}

export type Totals = Record<NutrientKey, { v: number | null; partial: boolean }>;

export function sumItems(items: ScanItem[], mult = 1): Totals {
  const out = {} as Totals;
  for (const d of NUTRIENTS) {
    let sum = 0, any = false, missing = false;
    for (const it of items) {
      const x = it.per100?.[d.key];
      if (x == null) missing = true;
      else { sum += (x * it.grams) / 100; any = true; }
    }
    out[d.key] = { v: any ? sum * mult : null, partial: any && missing };
  }
  return out;
}

export function emptyTotals(): Totals {
  const out = {} as Totals;
  for (const d of NUTRIENTS) out[d.key] = { v: null, partial: false };
  return out;
}

export function addTotals(a: Totals, b: Totals, mult = 1): Totals {
  const out = {} as Totals;
  for (const d of NUTRIENTS) {
    const x = a[d.key], y = b[d.key];
    const hasY = y?.v != null;
    out[d.key] = {
      v: x.v == null && !hasY ? null : (x.v ?? 0) + (hasY ? y.v! * mult : 0),
      partial: x.partial || !!y?.partial,
    };
  }
  return out;
}

export function fmt(v: number | null | undefined, unit?: Unit): string {
  if (v == null || Number.isNaN(v)) return '—';
  if (unit === 'kcal' || v >= 100) return Math.round(v).toLocaleString();
  if (v >= 1) return v.toFixed(1).replace(/\.0$/, '');
  if (v === 0) return '0';
  return v.toFixed(2);
}

export const pctDV = (key: NutrientKey, v: number | null) =>
  v == null || !DEF[key].dv ? null : Math.round((v / DEF[key].dv!) * 100);

export const confidenceLabel = (c: number) => (c >= 0.75 ? 'High' : c >= 0.5 ? 'Medium' : 'Low');

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type Meal = (typeof MEALS)[number];

export interface ScanRow {
  id: string;
  title: string;
  source: 'photo' | 'manual' | 'barcode';
  image_path: string | null;
  items: ScanItem[];
  questions: string[];
  confidence: number | null;
  saved: boolean;
  favorite: boolean;
  created_at: string;
}
export interface EntryRow {
  id: string;
  scan_id: string | null;
  entry_date: string;
  meal: Meal;
  label: string;
  servings: number;
  totals: Totals;
}
