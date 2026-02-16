function addField(fields, key, value, unit) {
    fields.push({
        key,
        value,
        unit,
        confidence: 0.6,
        source: "ocr"
    });
}
function extractFields(rawText) {
    const fields = [];
    const usdPattern = /(USD\s*)?\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2})?)/gi;
    for (const match of rawText.matchAll(usdPattern)) {
        addField(fields, "total_amount", Number(match[2].replace(/,/g, "")), "USD");
    }
    const eurPattern = /€\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2})?)/gi;
    for (const match of rawText.matchAll(eurPattern)) {
        addField(fields, "total_amount", Number(match[1].replace(/,/g, "")), "EUR");
    }
    const datePattern = /(\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b[A-Z][a-z]+\s\d{1,2},\s\d{4}\b)/g;
    for (const match of rawText.matchAll(datePattern)) {
        addField(fields, "date", match[1]);
    }
    const invoicePattern = /(invoice\s*#?\s*([A-Za-z0-9-]+)|#\s*([A-Za-z0-9-]{4,}))/gi;
    for (const match of rawText.matchAll(invoicePattern)) {
        addField(fields, "invoice_number", match[2] ?? match[3]);
    }
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    for (const match of rawText.matchAll(emailPattern)) {
        addField(fields, "email", match[1]);
    }
    const phonePattern = /(\+?\d[\d\s().-]{7,}\d)/g;
    for (const match of rawText.matchAll(phonePattern)) {
        addField(fields, "phone", match[1].trim());
    }
    const weightPattern = /(\d+(?:\.\d+)?)\s?(kg|lbs)/gi;
    for (const match of rawText.matchAll(weightPattern)) {
        addField(fields, "weight", Number(match[1]), match[2].toLowerCase());
    }
    const caloriesPattern = /(\d+(?:\.\d+)?)\s?(k?cal)/gi;
    for (const match of rawText.matchAll(caloriesPattern)) {
        addField(fields, "calories", Number(match[1]), "kcal");
    }
    return fields;
}
function inferCategory(rawText) {
    const text = rawText.toLowerCase();
    if (/[\$€]|invoice|receipt/.test(text))
        return "finance";
    if (/cal|workout|protein/.test(text))
        return "fitness";
    if (/flight|hotel|boarding/.test(text))
        return "travel";
    if (/prescription|diagnosis|lab/.test(text))
        return "health";
    if (/salary|contract|timesheet/.test(text))
        return "work";
    return "general";
}
function extractEntities(rawText) {
    const candidates = rawText.match(/\b[A-Z][A-Za-z0-9&.-]{2,}\b/g) ?? [];
    const filtered = candidates.filter((item) => !["Invoice", "Total", "Date", "Receipt"].includes(item));
    return [...new Set(filtered)].slice(0, 20);
}
export function extractFromOcrText(rawText) {
    const rawOcrText = rawText.trim();
    const fields = extractFields(rawOcrText);
    const topFieldKeys = [...new Set(fields.map((field) => field.key))].slice(0, 3).join(", ") || "no key fields";
    const summary = `Document uploaded on ${new Date().toISOString().slice(0, 10)}. Contains ${fields.length} extracted fields including ${topFieldKeys}.`;
    return {
        summary,
        fields,
        entities: extractEntities(rawOcrText),
        suggestedCategory: inferCategory(rawOcrText),
        rawOcrText
    };
}
export async function extractWithOCR(images) {
    if (process.env.SCANVAULT_DISABLE_TESSERACT === "true") {
        return extractFromOcrText("");
    }
    try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        try {
            const texts = [];
            for (const image of images) {
                const { data: { text } } = await worker.recognize(image);
                texts.push(text);
            }
            return extractFromOcrText(texts.join("\n\n"));
        }
        finally {
            await worker.terminate();
        }
    }
    catch {
        return extractFromOcrText("");
    }
}
//# sourceMappingURL=ocr.js.map