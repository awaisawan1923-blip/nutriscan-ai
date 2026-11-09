import { NextResponse } from 'next/server';
import { analyzeFoodImage } from '@/lib/vision';
import { searchFoods } from '@/lib/usda';
import { failure, rateLimited, requireUser, unauthorized } from '@/lib/server-utils';
import type { ScanItem } from '@/lib/nutrients';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;

function sniff(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return unauthorized();
  if (rateLimited(user.id, 8)) return NextResponse.json({ error: 'Too many scans in a minute. Wait a moment and try again.' }, { status: 429 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 }); }
  const file = form.get('image');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a food photo to analyse.' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'The image must be under 6 MB.' }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf); // trust file contents, not the declared type
  if (!mime) return NextResponse.json({ error: 'Only JPEG, PNG or WebP images are supported.' }, { status: 415 });
  const hint = typeof form.get('hint') === 'string' ? (form.get('hint') as string) : undefined;

  try {
    const vision = await analyzeFoodImage(buf.toString('base64'), mime, hint);
    if (!vision.is_food || vision.items.length === 0) {
      return NextResponse.json({ error: 'No food was detected in this photo. Try a clearer, well-lit shot from above.' }, { status: 422 });
    }

    const items: ScanItem[] = await Promise.all(vision.items.map(async (v): Promise<ScanItem> => {
      let match = null;
      try { match = (await searchFoods(v.usda_query, 3))[0] ?? null; } catch (e) { if ((e as Error).name === 'ConfigError') throw e; }
      return {
        id: crypto.randomUUID(),
        name: v.name,
        grams: Math.round(v.estimated_grams),
        gramsSource: 'ai',
        cookingMethod: v.cooking_method,
        ingredients: v.visible_ingredients,
        confidence: v.confidence,
        dbSource: match?.dbSource ?? null,
        dbId: match?.dbId ?? null,
        dbDescription: match?.description ?? '',
        per100: match?.per100 ?? null,
        note: v.note || undefined,
      };
    }));

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from('food-images').upload(path, buf, { contentType: mime });
    if (up.error) throw new Error('Image storage failed: ' + up.error.message);

    const { data, error } = await sb.from('scans').insert({
      title: vision.meal_name, source: 'photo', image_path: path, items,
      questions: vision.questions, confidence: vision.overall_confidence,
    }).select('id').single();
    if (error) { await sb.storage.from('food-images').remove([path]); throw new Error(error.message); }

    return NextResponse.json({ id: data.id });
  } catch (e) {
    return failure(e);
  }
}
