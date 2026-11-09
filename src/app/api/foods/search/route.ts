import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchFoods } from '@/lib/usda';
import { failure, rateLimited, requireUser, unauthorized } from '@/lib/server-utils';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { user } = await requireUser();
  if (!user) return unauthorized();
  if (rateLimited(user.id + ':search', 40)) return NextResponse.json({ error: 'Slow down a little.' }, { status: 429 });
  const q = z.string().trim().min(2).max(80).safeParse(new URL(req.url).searchParams.get('q'));
  if (!q.success) return NextResponse.json({ error: 'Type at least 2 characters.' }, { status: 400 });
  try { return NextResponse.json({ foods: await searchFoods(q.data, 8) }); } catch (e) { return failure(e); }
}
