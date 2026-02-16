import { EXTRACTION_SYSTEM_PROMPT } from "../prompt.js";
import { parseExtractionResponse } from "../json.js";
export class GoogleExtractor {
    async extract(images, apiKey) {
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
        });
        if (!response.ok) {
            throw new Error(`Google extraction failed: ${response.status} ${response.statusText}`);
        }
        const json = (await response.json());
        const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
        return parseExtractionResponse(text);
    }
}
//# sourceMappingURL=google.js.map