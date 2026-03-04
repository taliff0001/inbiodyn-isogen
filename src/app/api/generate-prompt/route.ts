import { NextRequest, NextResponse } from "next/server";
import { verifyPassphrase } from "@/lib/auth";

/**
 * POST /api/generate-prompt
 *
 * Uses Claude Opus 4.5 to craft a tailored isometric image prompt
 * for a given weight class + object description.
 *
 * Accepts optional `feedback` for regeneration with remixed prompt.
 */
export async function POST(req: NextRequest) {
  const authError = verifyPassphrase(req);
  if (authError) return authError;

  try {
    const { weight, description, feedback, previousPrompt } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured on server" }, { status: 500 });
    }

    if (!weight || !description) {
      return NextResponse.json({ error: "Weight and description are required" }, { status: 400 });
    }

    const isRegeneration = !!feedback && !!previousPrompt;

    const systemPrompt = `You are an expert prompt engineer specializing in isometric illustration generation. You craft prompts for Google's Imagen 4 Ultra model.

Your goal: generate a prompt that produces a SINGLE clean isometric-style illustration of an everyday object, matching the art style of the InBioDyn Lift Training System animations.

STYLE REFERENCE — the target aesthetic is:
- Clean, cartoon-isometric 3D rendering style
- Bright, saturated colors with soft shadows
- Objects rendered at a slight isometric angle (roughly 30° perspective)
- Smooth, slightly stylized surfaces — NOT photorealistic
- Fun, approachable, slightly whimsical but still clearly identifiable
- SOLID WHITE or TRANSPARENT background — no scene, no floor, no context
- The object should fill most of the frame with comfortable padding
- Single object only — no duplicates, no arrangements, no decorative elements

IMPORTANT RULES:
- The prompt must describe ONLY the object, its visual appearance, and the isometric art style
- NO text, labels, numbers, or watermarks in the image
- NO background elements — just the object floating on white
- Keep the prompt concise but vivid (2-4 sentences max)
- Mention "isometric view", "clean white background", and "cartoon 3D style" explicitly`;

    let userMessage: string;

    if (isRegeneration) {
      userMessage = `The previous prompt was:
"${previousPrompt}"

The user wants a new variation with this feedback: "${feedback}"

Generate a remixed prompt that addresses their feedback while maintaining the same isometric style. The object is: ${description} (approximately ${weight} lbs).

Return ONLY the image generation prompt, nothing else.`;
    } else {
      userMessage = `Generate an image prompt for: ${description} (approximately ${weight} lbs)

This is a weight reference image for warehouse safety training — the object should look like something a worker might encounter, rendered in the fun isometric style described above.

Return ONLY the image generation prompt, nothing else.`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return NextResponse.json(
        { error: `Claude API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const prompt = data.content?.[0]?.text?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "No prompt generated" }, { status: 500 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
