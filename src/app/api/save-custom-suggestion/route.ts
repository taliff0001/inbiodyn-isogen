import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { verifyPassphrase } from "@/lib/auth";

/**
 * POST /api/save-custom-suggestion
 *
 * Saves a user-entered custom item suggestion for a given weight class.
 * These persist across sessions and appear alongside AI suggestions.
 */
export async function POST(req: NextRequest) {
  const authError = verifyPassphrase(req);
  if (authError) return authError;

  try {
    const { weight, description } = await req.json();
    if (!weight || !description) {
      return NextResponse.json({ error: "Weight and description required" }, { status: 400 });
    }

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json({ ok: true });
    }

    const key = `isogen:custom:${weight}`;
    const existing = (await redis.get<string[]>(key)) ?? [];

    const normalized = description.trim().toLowerCase();
    const alreadyExists = existing.some((item) => item.toLowerCase() === normalized);

    if (!alreadyExists) {
      existing.push(description.trim());
      await redis.set(key, existing);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("save-custom-suggestion error:", error);
    return NextResponse.json({ ok: true });
  }
}
