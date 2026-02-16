export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
}

export function shouldUseJson(flag?: boolean): boolean {
  return Boolean(flag) || !process.stdout.isTTY;
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
    console.table(data as object[]);
    return;
  }

  if (typeof data === "string") {
    process.stdout.write(`${data}\n`);
    return;
  }

  console.dir(data, { depth: null, colors: true });
}
