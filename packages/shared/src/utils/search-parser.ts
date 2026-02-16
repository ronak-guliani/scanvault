import type { FieldFilter, ParsedQuery } from "../types.js";

const NUMERIC_OPERATOR_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/;

function createFieldFilter(key: string, operator: FieldFilter["operator"], value: string): FieldFilter {
  const numeric = Number(value);
  return {
    key: key.toLowerCase(),
    operator,
    value: Number.isFinite(numeric) && value.trim() !== "" ? numeric : value
  };
}

export function parseSearchQuery(input: string): ParsedQuery {
  const parsed: ParsedQuery = {
    keywords: [],
    fieldFilters: []
  };

  const tokens = input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    const numericMatch = token.match(NUMERIC_OPERATOR_PATTERN);
    if (numericMatch) {
      const [, key, operator, value] = numericMatch;
      parsed.fieldFilters.push(createFieldFilter(key, operator as FieldFilter["operator"], value));
      continue;
    }

    const separatorIndex = token.indexOf(":");
    if (separatorIndex > 0) {
      const key = token.slice(0, separatorIndex).toLowerCase();
      const value = token.slice(separatorIndex + 1);

      if (!value) {
        parsed.keywords.push(token);
        continue;
      }

      if (key === "category") {
        parsed.categoryFilter = value.toLowerCase();
        continue;
      }

      if (key === "vendor" || key === "entity") {
        parsed.entityFilter = value.toLowerCase();
        continue;
      }

      if (value.includes("*")) {
        parsed.fieldFilters.push(createFieldFilter(key, ":", value.replace(/\*+$/, "")));
      } else {
        parsed.fieldFilters.push(createFieldFilter(key, "=", value));
      }
      continue;
    }

    parsed.keywords.push(token.toLowerCase());
  }

  return parsed;
}
