import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/generate-image
 *
 * Uses Google Imagen 4 Ultra to generate an isometric image from a prompt.
 * Returns the image as a base64 data URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const apiKey = req.headers.get("x-google-key");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Google AI API key" }, { status: 401 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Call Imagen 4 Ultra via the Google GenAI REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          // Imagen 4 Ultra generates at 2K resolution by default
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Imagen API error:", errText);

      // Try the Gemini generateContent fallback with image generation
      // This endpoint has better CORS and broader access
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
          },
        }),
      });

      if (!fallbackResponse.ok) {
        const fallbackErr = await fallbackResponse.text();
        console.error("Imagen fallback error:", fallbackErr);
        return NextResponse.json(
          { error: `Image generation failed. Check your Google AI API key and ensure Imagen 4 is enabled. Error: ${response.status}` },
          { status: response.status }
        );
      }

      const fallbackData = await fallbackResponse.json();
      const fallbackImage = fallbackData.predictions?.[0]?.bytesBase64Encoded;
      if (!fallbackImage) {
        return NextResponse.json({ error: "No image in fallback response" }, { status: 500 });
      }
      return NextResponse.json({
        imageBase64: fallbackImage,
        mimeType: "image/png",
        model: "imagen-4.0-generate-001",
      });
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image data in response" }, { status: 500 });
    }

    return NextResponse.json({
      imageBase64,
      mimeType: "image/png",
      model: "imagen-4.0-ultra-generate-001",
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
