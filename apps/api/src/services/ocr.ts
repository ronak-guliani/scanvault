import type { ExtractedField } from "@scanvault/shared";

export interface OCRExtractionResult {
  summary: string;
  fields: ExtractedField[];
  entities: string[];
  suggestedCategory: string;
  rawOcrText: string;
}

function addField(
  fields: ExtractedField[],
  key: string,
  value: string | number,
  unit?: string
): void {
  fields.push({
    key,
    value,
    unit,
    confidence: 0.6,
    source: "ocr"
  });
}

function parseReceiptLineItems(rawText: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const trailingAmountRegex = /^(.+?)\s+([$€]?\s?\d+(?:[.,]\d{2})?)$/i;
  let itemIndex = 1;

  for (const line of lines) {
    if (/^(total|receipt total|tax|subtotal|cash|change|tender|visa|mastercard|thank you)\b/i.test(line)) continue;
    const match = line.match(trailingAmountRegex);
    if (!match) continue;
    const name = match[1].trim().replace(/\s{2,}/g, " ");
    const amount = Number(match[2].replace(/[$€\s]/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (!/[A-Za-z]{2,}/.test(name)) continue;
    fields.push({ key: `line_item_${itemIndex}_name`, value: name, confidence: 0.72, source: "ocr" });
    fields.push({ key: `line_item_${itemIndex}_price`, value: amount, confidence: 0.72, source: "ocr" });
    itemIndex += 1;
  }

  return fields;
}

function shouldParseWorkoutSchedule(rawText: string): boolean {
  const normalized = rawText.toLowerCase();
  const dayMatches = (normalized.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g) ?? []).length;
  const hasWorkoutSignals = /\b(workout|exercise|schedule|rest day|cardio|biceps|triceps|legs|chest|back|lats)\b/.test(normalized);
  const looksLikeReceipt = /\b(receipt|invoice|subtotal|tax|total|cashier|payment)\b/.test(normalized);
  if (looksLikeReceipt) return false;
  return dayMatches >= 2 && hasWorkoutSignals;
}

function parseWorkoutScheduleFields(rawText: string): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/[^a-zA-Z0-9&\s-]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const schedule = new Map<string, string>();
  const normalizeWorkout = (input: string): string =>
    input
      .replace(/\b6\b/g, "&")
      .replace(/\bbice\b/i, "Biceps")
      .replace(/\blats?\b/i, "Lats")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  for (const rawLine of lines) {
    const line = rawLine.toLowerCase();
    const matchedDay = days.find((day) => line.includes(day));
    if (!matchedDay) {
      if (/rest day/i.test(rawLine)) schedule.set("sunday", "Rest Day");
      continue;
    }

    const remainder = rawLine.replace(new RegExp(matchedDay, "i"), "").replace(/^[\s:-]+/, "").trim();
    if (remainder.length > 0) {
      schedule.set(matchedDay, normalizeWorkout(remainder));
    } else if (matchedDay === "sunday" && line.includes("rest")) {
      schedule.set("sunday", "Rest Day");
    }
  }

  for (const [day, workout] of schedule.entries()) {
    addField(fields, `workout_${day}`, workout);
  }
  if (schedule.get("sunday") === "Rest Day") {
    addField(fields, "rest_day", "Sunday");
  }

  return fields;
}

function extractFields(rawText: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

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

  fields.push(...parseReceiptLineItems(rawText));
  if (shouldParseWorkoutSchedule(rawText)) {
    fields.push(...parseWorkoutScheduleFields(rawText));
  }

  return fields;
}

function inferCategory(rawText: string): string {
  const text = rawText.toLowerCase();
  if (/[\$€]|invoice|receipt/.test(text)) return "finance";
  if (/cal|workout|protein/.test(text)) return "fitness";
  if (/flight|hotel|boarding/.test(text)) return "travel";
  if (/prescription|diagnosis|lab/.test(text)) return "health";
  if (/salary|contract|timesheet/.test(text)) return "work";
  return "general";
}

function extractEntities(rawText: string): string[] {
  const candidates = rawText.match(/\b[A-Z][A-Za-z0-9&.-]{2,}\b/g) ?? [];
  const filtered = candidates.filter((item) => !["Invoice", "Total", "Date", "Receipt"].includes(item));
  return [...new Set(filtered)].slice(0, 20);
}

export function extractFromOcrText(rawText: string): OCRExtractionResult {
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

export async function extractWithOCR(images: Buffer[]): Promise<OCRExtractionResult> {
  if (process.env.SCANVAULT_DISABLE_TESSERACT === "true") {
    return extractFromOcrText("");
  }

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    try {
      const texts: string[] = [];
      for (const image of images) {
        const {
          data: { text }
        } = await worker.recognize(image);
        texts.push(text);
      }

      return extractFromOcrText(texts.join("\n\n"));
    } finally {
      await worker.terminate();
    }
  } catch {
    return extractFromOcrText("");
  }
}
