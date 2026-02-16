import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import type { Category, ParsedQuery } from "@scanvault/shared";

export type LlmSearchResult =
  | { type: "search"; parsedQuery: ParsedQuery; categorySlug?: string }
  | { type: "answer"; message: string };

const FIELD_KEY_PATTERN = /^[a-z_][a-z0-9_]{0,63}$/i;
const ALLOWED_OPERATORS = new Set<ParsedQuery["fieldFilters"][number]["operator"]>([
  "=",
  ">",
  "<",
  ">=",
  "<=",
  ":"
]);

function sanitizeText(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function sanitizeSlug(value: unknown): string | undefined {
  const sanitized = sanitizeText(value, 50)?.toLowerCase();
  return sanitized && /^[a-z0-9-]+$/.test(sanitized) ? sanitized : undefined;
}

function sanitizeEntity(value: unknown): string | undefined {
  return sanitizeText(value, 80)?.toLowerCase();
}

function sanitizeFieldFilter(value: unknown): ParsedQuery["fieldFilters"][number] | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const key = sanitizeText(candidate.key, 64)?.toLowerCase();
  if (!key || !FIELD_KEY_PATTERN.test(key)) {
    return null;
  }

  const operator = typeof candidate.operator === "string" ? (candidate.operator as ParsedQuery["fieldFilters"][number]["operator"]) : undefined;
  if (!operator || !ALLOWED_OPERATORS.has(operator)) {
    return null;
  }

  const rawValue = candidate.value;
  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue)) {
      return null;
    }
    return { key, operator, value: rawValue };
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }

    if (operator === ">" || operator === "<" || operator === ">=" || operator === "<=") {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        return null;
      }
      return { key, operator, value: numeric };
    }

    return { key, operator, value: trimmed.slice(0, 120) };
  }

  return null;
}

function sanitizeParsedQuery(value: unknown): ParsedQuery {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const keywords = Array.isArray(candidate.keywords)
    ? candidate.keywords
        .map((item) => sanitizeText(item, 60)?.toLowerCase())
        .filter((item): item is string => Boolean(item))
        .slice(0, 25)
    : [];

  const fieldFilters = Array.isArray(candidate.fieldFilters)
    ? candidate.fieldFilters
        .map((item) => sanitizeFieldFilter(item))
        .filter((item): item is ParsedQuery["fieldFilters"][number] => item !== null)
        .slice(0, 20)
    : [];

  return {
    keywords,
    fieldFilters,
    categoryFilter: sanitizeSlug(candidate.categoryFilter),
    entityFilter: sanitizeEntity(candidate.entityFilter)
  };
}

function hasSearchSignal(parsedQuery: ParsedQuery): boolean {
  return (
    parsedQuery.keywords.length > 0 ||
    parsedQuery.fieldFilters.length > 0 ||
    Boolean(parsedQuery.categoryFilter) ||
    Boolean(parsedQuery.entityFilter)
  );
}

function getOpenAIKey(): string {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(dir, "../../.env");
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
    if (match?.[1]) {
      return match[1].trim();
    }
  } catch {}

  throw new Error("OPENAI_API_KEY is not configured. Set it in local.settings.json or .env");
}

export async function interpretSearchQuery(
  userQuery: string,
  categories: Category[]
): Promise<LlmSearchResult> {
  const apiKey = getOpenAIKey();
  const client = new OpenAI({ apiKey });

  const categoryInfo =
    categories.length > 0
      ? categories.map((c) => `- ${c.name} (slug: "${c.slug}")`).join("\n")
      : "(no categories yet)";

  const today = new Date().toISOString().split("T")[0];

  const systemPrompt = `You are a search query interpreter for ScanVault, a document vault where users store scanned documents (receipts, invoices, medical records, etc.).

Your job is to interpret natural language queries and either:
1. Convert them into a structured search query (if the user is looking for documents)
2. Return a friendly, concise human answer (if the query cannot be mapped to a document search)

Today's date is ${today}.

Available categories:
${categoryInfo}

The structured query has these fields:
- keywords: string[] — general search terms to match against document content/summary
- fieldFilters: array of { key, operator, value }
    Common keys: date, total_amount, subtotal_amount, tax_amount, store_name, vendor, receipt_number, invoice_number
    Operators: "=" (exact), ">" "<" ">=" "<=" (numeric comparison), ":" (contains / partial match)
    Date values must be YYYY-MM-DD format
- categoryFilter: string (optional) — category slug to filter by
- entityFilter: string (optional) — entity/vendor name to filter by

Respond with ONLY valid JSON in one of these two formats:

For searchable queries:
{"type":"search","parsedQuery":{"keywords":[],"fieldFilters":[],"categoryFilter":"...","entityFilter":"..."},"categorySlug":"..."}

For non-searchable queries:
{"type":"answer","message":"Your friendly response here"}

Important rules:
- Relative dates like "last month" or "past week" must be converted to fieldFilters with concrete YYYY-MM-DD values based on today's date.
- If the user mentions a store/vendor/company name, use entityFilter.
- If the user mentions a category by name, map it to the correct slug and use categoryFilter.
- Only include fields that are relevant; omit empty arrays and undefined fields.
- Keep answer messages brief and helpful.`;

  const response = await client.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery }
    ],
    temperature: 0,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { type: "answer", message: "I couldn't understand your query. Try asking about your documents." };
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;

    if (parsed.type === "answer") {
      return {
        type: "answer",
        message: sanitizeText(parsed.message, 220) ?? "I couldn't understand your query."
      };
    }

    const parsedQuery = sanitizeParsedQuery(parsed.parsedQuery);
    if (!hasSearchSignal(parsedQuery)) {
      throw new Error("LLM returned empty search query");
    }

    const categorySlug = sanitizeSlug(parsed.categorySlug) ?? parsedQuery.categoryFilter;

    return {
      type: "search",
      parsedQuery,
      categorySlug
    };
  } catch {
    throw new Error("LLM_SEARCH_PARSE_FAILED");
  }
}
