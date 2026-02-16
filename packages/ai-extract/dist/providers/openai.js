import { EXTRACTION_SYSTEM_PROMPT } from "../prompt.js";
import { parseExtractionResponse } from "../json.js";
export class OpenAIExtractor {
    async extract(images, apiKey) {
        const content = [
            {
                type: "text",
                text: EXTRACTION_SYSTEM_PROMPT
            },
            ...images.map((image) => ({
                type: "image_url",
                image_url: {
                    url: `data:image/png;base64,${image.toString("base64")}`
                }
            }))
        ];
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                temperature: 0,
                messages: [
                    {
                        role: "user",
                        content
                    }
                ]
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI extraction failed: ${response.status} ${response.statusText}`);
        }
        const json = (await response.json());
        const messageContent = json.choices?.[0]?.message?.content;
        const text = Array.isArray(messageContent)
            ? messageContent.map((item) => item.text ?? "").join("\n")
            : messageContent ?? "";
        return parseExtractionResponse(text);
    }
}
//# sourceMappingURL=openai.js.map