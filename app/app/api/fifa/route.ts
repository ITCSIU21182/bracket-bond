// Server route: real World Cup 2026 data from the FIFA API, mapped to our shapes.
// Server-side (no CORS) + cached; returns { ok:false } on any failure so the client
// falls back to mock data.

import { NextResponse } from "next/server";
import { fetchFifa } from "@/lib/fifa";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  const data = await fetchFifa();
  if (!data) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, ...data });
}
