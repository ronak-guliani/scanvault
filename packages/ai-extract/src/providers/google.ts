import { EXTRACTION_SYSTEM_PROMPT } from "../prompt.js";
import { parseExtractionResponse } from "../json.js";
import type { AIExtractor, ExtractionResult } from "../types.js";

export class GoogleExtractor implements AIExtractor {
  async extract(images: Buffer[], apiKey: string): Promise<ExtractionResult> {
    const parts = [
      {
        text: EXTRACTION_SYSTEM_PROMPT
      },
      ...images.map((image) => ({
        inline_data: {
          mime_type: "image/png",
          data: image.toString("base64")
        }
      }))
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json"
          },
          contents: [
            {
              role: "user",
              parts
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google extraction failed: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
    return parseExtractionResponse(text);
  }
}
