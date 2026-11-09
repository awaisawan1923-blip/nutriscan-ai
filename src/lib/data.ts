import { supabase } from './supabase/client';
import type { ScanItem } from './nutrients';
import { sumItems } from './nutrients';

export const dateStr = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d); };

export async function signedImage(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase().storage.from('food-images').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Creates a scan row without a photo (manual search / barcode entry). */
export async function createManualScan(title: string, items: ScanItem[], source: 'manual' | 'barcode' = 'manual') {
  const { data, error } = await supabase().from('scans').insert({ title, source, items, questions: [], confidence: null }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export const entryFromItems = (items: ScanItem[]) => sumItems(items);

/** Downscale + re-encode to JPEG before upload: smaller, faster, strips camera metadata. */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('This image could not be read. Try a JPEG, PNG or WebP photo.');
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (!blob) throw new Error('Image compression failed.');
  return new File([blob], 'meal.jpg', { type: 'image/jpeg' });
}

export async function loadTargets() {
  const { data } = await supabase().from('profiles').select('calorie_target').maybeSingle();
  const cal = data?.calorie_target ?? 2000, r = cal / 2000;
  return { calories: cal, protein: 50 * r, carbs: 275 * r, fat: 78 * r, fiber: 28 * r, custom: !!data?.calorie_target };
}
