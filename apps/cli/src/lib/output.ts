export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
}

type PrintableRow = Record<string, string | number | boolean | null>;

interface AssetLike {
  id: string;
  originalFileName: string;
  categoryId?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  summary?: string;
  status?: string;
  fields?: unknown[];
  entities?: unknown[];
  rawOcrText?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TABLE_CELL_MAX = 88;
const ASSET_SUMMARY_MAX = 72;
const HIDDEN_TABLE_KEYS = new Set(["_rid", "_self", "_etag", "_attachments"]);

export function shouldUseJson(flag?: boolean): boolean {
  return Boolean(flag) || !process.stdout.isTTY;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssetLike(value: unknown): value is AssetLike {
  return isRecord(value) && typeof value.id === "string" && typeof value.originalFileName === "string";
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 1) return "…";
  return `${text.slice(0, Math.max(maxLength - 1, 1))}…`;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function formatDateTime(value: unknown): string {
  if (typeof value !== "string") return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().replace("T", " ").replace(".000Z", "Z");
}

function formatBytes(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) return "-";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function formatCell(value: unknown, maxLength = TABLE_CELL_MAX): string | number | boolean | null {
  if (value === null) return null;
  if (value === undefined) return "";
  if (typeof value === "string") {
    return truncate(oneLine(value), maxLength);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const primitivePreview = value.slice(0, 3).every((item) => ["string", "number", "boolean"].includes(typeof item));
    if (primitivePreview) {
      return truncate(`[${value.slice(0, 3).join(", ")}${value.length > 3 ? ", …" : ""}]`, maxLength);
    }
    return `${value.length} items`;
  }
  if (isRecord(value)) {
    return "{…}";
  }
  return truncate(String(value), maxLength);
}

function toCompactRow(value: unknown): PrintableRow {
  if (!isRecord(value)) {
    return { value: formatCell(value) };
  }

  const keys = Object.keys(value)
    .filter((key) => !HIDDEN_TABLE_KEYS.has(key) && !key.startsWith("_"))
    .slice(0, 8);

  const row: PrintableRow = {};
  for (const key of keys) {
    row[key] = formatCell(value[key]);
  }
  return row;
}

function toAssetTableRow(asset: AssetLike): PrintableRow {
  return {
    id: asset.id,
    file: truncate(asset.originalFileName, 32),
    category: truncate(asset.categoryId ?? "-", 26),
    status: asset.status ?? "-",
    size: formatBytes(asset.fileSizeBytes),
    createdAt: formatDateTime(asset.createdAt),
    summary: truncate(oneLine(asset.summary ?? ""), ASSET_SUMMARY_MAX)
  };
}

function toAssetDetailView(asset: AssetLike): Record<string, unknown> {
  const fields = Array.isArray(asset.fields)
    ? asset.fields.slice(0, 12).map((field) => {
        if (!isRecord(field)) return field;
        return {
          key: field.key,
          value: formatCell(field.value, 48),
          unit: field.unit,
          confidence: field.confidence,
          source: field.source
        };
      })
    : [];

  return {
    id: asset.id,
    file: asset.originalFileName,
    categoryId: asset.categoryId ?? null,
    status: asset.status ?? null,
    mimeType: asset.mimeType ?? null,
    size: formatBytes(asset.fileSizeBytes),
    createdAt: formatDateTime(asset.createdAt),
    updatedAt: formatDateTime(asset.updatedAt),
    summary: asset.summary ?? null,
    entities: Array.isArray(asset.entities) ? asset.entities.slice(0, 20) : [],
    fieldCount: Array.isArray(asset.fields) ? asset.fields.length : 0,
    fields,
    rawOcrTextPreview: typeof asset.rawOcrText === "string" ? truncate(oneLine(asset.rawOcrText), 240) : null
  };
}

function toQuietValue(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "object" && item && "id" in item) {
          return String((item as { id: unknown }).id);
        }
        return JSON.stringify(item);
      })
      .join("\n");
  }

  if (typeof data === "object" && data && "id" in data) {
    return String((data as { id: unknown }).id);
  }

  return JSON.stringify(data);
}

export function printOutput(data: unknown, options: OutputOptions = {}): void {
  if (options.quiet) {
    process.stdout.write(`${toQuietValue(data)}\n`);
    return;
  }

  if (shouldUseJson(options.json)) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      process.stdout.write("No results.\n");
      return;
    }

    if (data.every(isAssetLike)) {
      console.table((data as AssetLike[]).map(toAssetTableRow));
      return;
    }

    if (data.every((item) => !isRecord(item))) {
      process.stdout.write(`${data.map((item) => String(item)).join("\n")}\n`);
      return;
    }

    console.table(data.map(toCompactRow));
    return;
  }

  if (typeof data === "string") {
    process.stdout.write(`${data}\n`);
    return;
  }

  if (isAssetLike(data)) {
    console.dir(toAssetDetailView(data), { depth: null, colors: true });
    return;
  }

  console.dir(data, { depth: null, colors: true });
}
