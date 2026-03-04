import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { verifyPassphrase } from "@/lib/auth";

/**
 * POST /api/track-generated
 *
 * Records a successfully generated item to the persistent history.
 * Called client-side after generation completes.
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
      // KV not configured — silently succeed (local dev)
      return NextResponse.json({ ok: true });
    }

    const existing = (await redis.get<Array<{ weight: number; description: string; createdAt: string }>>("isogen:generated")) ?? [];

    // Avoid exact duplicates
    const alreadyExists = existing.some(
      (item) => item.weight === weight && item.description.toLowerCase() === description.toLowerCase()
    );

    if (!alreadyExists) {
      existing.push({ weight, description, createdAt: new Date().toISOString() });
      await redis.set("isogen:generated", existing);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("track-generated error:", error);
    // Non-critical — always return ok to avoid blocking the client
    return NextResponse.json({ ok: true });
  }
}
