import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { verifyPassphrase } from "@/lib/auth";

/**
 * POST /api/suggest-items
 *
 * Returns 6 AI-generated item suggestions for a given weight class.
 * Uses the full generation history + any user-saved custom suggestions
 * to ensure freshness and visual proportion coherence across the asset set.
 */
export async function POST(req: NextRequest) {
  const authError = verifyPassphrase(req);
  if (authError) return authError;

  try {
    const { weight } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured on server" }, { status: 500 });
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

   const systemPrompt = `You are a creative director for an isometric animation studio specializing in warehouse safety training. Your job is to suggest objects for isometric cartoon illustrations where items fall from the sky and stack on top of each other.

CORE VISUAL RULES (non-negotiable):
1. VISUAL SCALE COHERENCE: The object's real-world physical size must feel intuitively correct for its weight. A truck looks enormous even if light — don't suggest it at low weights. A thimble looks tiny even if dense — don't suggest it at high weights.
2. ISOMETRIC RENDERING: Objects must have interesting 3D shape from an isometric top-corner angle. Avoid flat, thin, or featureless objects (paper, sheets, slabs). Favor objects with distinct silhouettes — cylinders, irregular shapes, layered forms, objects with visible components.
3. PROPORTIONAL COHERENCE: Suggestions should look visually sensible next to the existing asset set in the same animation.
4. WEIGHT-TO-SIZE HARD FILTER: Every suggestion MUST pass a real-world weight check. If an object's actual weight doesn't match the requested weight class, DISCARD it — no exceptions. Use this reference table:
   - 5 lbs: roughly the size of a large book, small bag of sugar, or a brick
   - 10 lbs: roughly the size of a large watermelon, car battery, or bowling ball
   - 15 lbs: roughly the size of a small microwave or large bag of dog food
   - 20 lbs: roughly the size of a medium-sized microwave or large jug of water
   - 25 lbs: roughly the size of a small television or large bag of concrete mix
   - 30 lbs: roughly the size of a medium suitcase or large toolbox
   - 35 lbs: roughly the size of a large suitcase or small generator
   - 40 lbs: roughly the size of a large bag of salt or small engine block
   - 45 lbs: roughly the size of a large cooler or shop vacuum
   - 50 lbs: roughly the size of a large bag of concrete or small safe
   - 55 lbs: roughly the size of a large filing cabinet drawer or mid-size generator
   - 60 lbs: roughly the size of a large commercial printer or small refrigerator
   - 65 lbs: roughly the size of a full-size shop vacuum or large compressor tank
   - 70 lbs: roughly the size of a large power tool cabinet or commercial water heater
   Example violation: a bicycle helmet must NEVER appear at 10 lbs — it weighs under 1 lb. Use this table as a hard filter, not a suggestion.

CREATIVITY RULES:
- Start grounded, get progressively weirder and more unexpected as the excluded list grows.
- When fewer than 10 items are excluded: suggest recognizable everyday objects from ANY context — not just warehouses. Kitchen, garage, office, outdoors, sports, nature — all fair game.
- When 10-20 items are excluded: push into the unexpected — scientific equipment, cultural artifacts, industrial machinery components, animals, food items, musical instruments, medical equipment.
- When more than 20 items are excluded: get genuinely creative and surprising — think objects from other countries, historical artifacts, obscure equipment, nature specimens, things that are unexpected but would look AMAZING in isometric style.
- NEVER suggest generic box shapes, plain containers, or anything visually boring.
- Surprise the user. The best suggestion is one they wouldn't have thought of but immediately recognize as perfect.`;

const creativityLevel = allExcluded.length < 10 
  ? "grounded but fresh" 
  : allExcluded.length < 20 
  ? "unexpected and interesting" 
  : "genuinely surprising and creative — push into unusual territory";

const userMessage = `Suggest 6 objects for the ${weight} lb weight class.

CREATIVITY LEVEL FOR THIS REQUEST: ${creativityLevel} (${allExcluded.length} items already exhausted for this weight class)

FULL ASSET SET ALREADY IN THE APP (for proportion and visual variety awareness):
${existingSummary || "None yet — this is the first generation."}

ALREADY EXCLUDED — DO NOT SUGGEST THESE (already used at ${weight} lbs or saved as custom):
${allExcluded.length > 0 ? allExcluded.join(", ") : "None — this is the first request, start grounded but interesting."}

Think carefully about what would look visually STUNNING in isometric cartoon style at ${weight} lbs. Favor objects with interesting geometry, recognizable silhouettes, and visual personality.

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
