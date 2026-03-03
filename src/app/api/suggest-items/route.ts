import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

/**
 * POST /api/suggest-items
 *
 * Returns 6 AI-generated item suggestions for a given weight class.
 * Uses the full generation history + any user-saved custom suggestions
 * to ensure freshness and visual proportion coherence across the asset set.
 */
export async function POST(req: NextRequest) {
  try {
    const { weight } = await req.json();
    const apiKey = req.headers.get("x-anthropic-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Anthropic API key" }, { status: 401 });
    }
    if (!weight) {
      return NextResponse.json({ error: "Weight is required" }, { status: 400 });
    }

    // Load history and custom suggestions from KV (gracefully skip if KV unavailable)
    let generated: Array<{ weight: number; description: string }> = [];
    let custom: string[] = [];

    const redis = getRedis();
    if (redis) {
      try {
        const [rawGenerated, rawCustom] = await Promise.all([
          redis.get<Array<{ weight: number; description: string }>>("isogen:generated"),
          redis.get<string[]>(`isogen:custom:${weight}`),
        ]);
        generated = rawGenerated ?? [];
        custom = rawCustom ?? [];
      } catch {
        // KV unavailable — suggestions still work, just without history filtering
      }
    }

    // Build a readable summary of what already exists, grouped by weight
    const existingByWeight: Record<number, string[]> = {};
    for (const item of generated) {
      if (!existingByWeight[item.weight]) existingByWeight[item.weight] = [];
      existingByWeight[item.weight].push(item.description);
    }
    const existingSummary = Object.entries(existingByWeight)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([w, items]) => `${w} lbs: ${items.join(", ")}`)
      .join("\n");

    const alreadyGeneratedAtWeight = existingByWeight[weight] ?? [];
    const allExcluded = [...alreadyGeneratedAtWeight, ...custom];

    const systemPrompt = `You are an expert in warehouse safety training content for the InBioDyn Lift Training System. You suggest everyday objects for isometric cartoon illustrations used in a stacking animation — objects fall from the sky and stack on top of each other.

CRITICAL RULES for suggesting objects:
1. VISUAL SCALE COHERENCE: Only suggest objects whose real-world physical size makes intuitive sense for their weight. A truck is visually enormous even if somehow light — do not suggest it at a low weight. A thimble is visually tiny even if somehow heavy — do not suggest it at a high weight. The object's visual scale should feel right for its weight to someone watching the animation.
2. PROPORTIONAL COHERENCE WITH THE FULL SET: The full asset set already contains the items listed below. Your suggestions should complement the set visually — if the set already has many box-shaped items, suggest something different (spheres, bags, cylinders, tools). Objects should look proportionally sensible next to each other in the same animation.
3. FRESHNESS: Never suggest anything already in the generated history or the custom list.
4. WAREHOUSE CONTEXT: Suggest items a warehouse or retail worker would realistically encounter — practical, recognizable objects.
5. ISOMETRIC RENDERING: Prefer objects with interesting 3D shape from an isometric angle — avoid flat/thin objects like paper or sheets.`;

    const userMessage = `Suggest 6 objects for the ${weight} lb weight class.

FULL ASSET SET ALREADY GENERATED (for proportion awareness):
${existingSummary || "None yet — this is the first generation."}

ALREADY EXCLUDED (already generated at ${weight} lbs, or saved as custom):
${allExcluded.length > 0 ? allExcluded.join(", ") : "None"}

Return ONLY a JSON array of 6 strings, each a short object name (2-4 words max). Example format:
["bag of concrete", "hydraulic jack", "toolbox", "watermelon", "car battery", "paint bucket"]

No explanation, no numbering, just the JSON array.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error (suggest-items):", err);
      return NextResponse.json(
        { error: `Claude API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() ?? "";

    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("Could not parse suggestions from Claude response:", text);
      return NextResponse.json({ suggestions: [], custom }, { status: 200 });
    }

    const suggestions: string[] = JSON.parse(match[0]);
    return NextResponse.json({ suggestions, custom });
  } catch (error) {
    console.error("suggest-items error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
