import { EXTRACTION_SYSTEM_PROMPT } from "../prompt.js";
import { parseExtractionResponse } from "../json.js";
export class AnthropicExtractor {
    async extract(images, apiKey) {
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
        const json = (await response.json());
        const text = json.content
            ?.filter((item) => item.type === "text")
            .map((item) => item.text ?? "")
            .join("\n") ?? "";
        return parseExtractionResponse(text);
    }
}
//# sourceMappingURL=anthropic.js.map