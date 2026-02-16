import type { ExtractionProvider } from "@scanvault/shared";
import { AnthropicExtractor } from "./providers/anthropic.js";
import { GoogleExtractor } from "./providers/google.js";
import { OpenAIExtractor } from "./providers/openai.js";
import type { AIExtractor, ExtractionResult } from "./types.js";

export * from "./types.js";
export * from "./prompt.js";
export * from "./json.js";

export function createExtractor(provider: ExtractionProvider): AIExtractor {
  switch (provider) {
    case "openai":
      return new OpenAIExtractor();
    case "anthropic":
      return new AnthropicExtractor();
    case "google":
      return new GoogleExtractor();
    default:
      throw new Error(`Unsupported provider: ${provider satisfies never}`);
  }
}

export async function extractWithProvider(
  provider: ExtractionProvider,
  images: Buffer[],
  apiKey: string
): Promise<ExtractionResult> {
  return createExtractor(provider).extract(images, apiKey);
}
