import { NextResponse } from 'next/server';
import { serverClient } from './supabase/server';
import { ConfigError } from './usda';

export async function requireUser() {
  const sb = await serverClient();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

const hits = new Map<string, number[]>();
/** Small in-memory limiter (per server instance). Use Redis/Upstash for multi-instance production. */
export function rateLimited(userId: string, max: number, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(userId, recent); return true; }
  recent.push(now); hits.set(userId, recent);
  return false;
}

export const unauthorized = () => NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });

export function failure(e: unknown) {
  if (e instanceof ConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  const message = e instanceof Error ? e.message : 'Unexpected error';
  console.error('[api]', message);
  const status = /timeout|abort/i.test(message) ? 504 : 502;
  return NextResponse.json({ error: status === 504 ? 'The service took too long. Please try again.' : 'An upstream service failed. Please try again in a moment.' }, { status });
}
