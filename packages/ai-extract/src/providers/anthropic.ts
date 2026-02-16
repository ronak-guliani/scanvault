import { EXTRACTION_SYSTEM_PROMPT } from "../prompt.js";
import { parseExtractionResponse } from "../json.js";
import type { AIExtractor, ExtractionResult } from "../types.js";

export class AnthropicExtractor implements AIExtractor {
  async extract(images: Buffer[], apiKey: string): Promise<ExtractionResult> {
    const content = [
      {
        type: "text",
        text: EXTRACTION_SYSTEM_PROMPT
      },
      ...images.map((image) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: image.toString("base64")
        }
      }))
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic extraction failed: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text =
      json.content
        ?.filter((item) => item.type === "text")
        .map((item) => item.text ?? "")
        .join("\n") ?? "";

    return parseExtractionResponse(text);
  }
}
