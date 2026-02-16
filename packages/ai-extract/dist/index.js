import { AnthropicExtractor } from "./providers/anthropic.js";
import { GoogleExtractor } from "./providers/google.js";
import { OpenAIExtractor } from "./providers/openai.js";
export * from "./types.js";
export * from "./prompt.js";
export * from "./json.js";
export function createExtractor(provider) {
    switch (provider) {
        case "openai":
            return new OpenAIExtractor();
        case "anthropic":
            return new AnthropicExtractor();
        case "google":
            return new GoogleExtractor();
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}
export async function extractWithProvider(provider, images, apiKey) {
    return createExtractor(provider).extract(images, apiKey);
}
//# sourceMappingURL=index.js.map