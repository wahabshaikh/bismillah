import { applyEdits, modify, type ParseError, parse, printParseErrorCode } from "jsonc-parser";

export type Config = Record<string, unknown>;

export const SCHEMA_PATH = "node_modules/wrangler/config-schema.json";

const FORMAT = { formattingOptions: { insertSpaces: true, tabSize: 2 } } as const;

export function parseJsonc(text: string, file: string): Config {
  const errors: ParseError[] = [];
  const value: unknown = parse(text, errors, { allowTrailingComma: true });
  const [error] = errors;
  if (error) {
    throw new Error(`${file}: ${printParseErrorCode(error.error)} at offset ${error.offset}`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${file}: expected a JSON object`);
  }
  return value as Config;
}

function expected(base: Config, config: Config): Config {
  const want: Config = { $schema: SCHEMA_PATH, ...base };
  const flags = base["compatibility_flags"];
  const own = config["compatibility_flags"];
  if (Array.isArray(flags) && Array.isArray(own)) {
    want["compatibility_flags"] = [...new Set([...flags, ...own])];
  }
  return want;
}

/** Returns one message per shared key the config does not match. */
export function checkConfig(config: Config, base: Config): string[] {
  const problems: string[] = [];
  if (typeof config["name"] !== "string" || config["name"] === "") {
    problems.push(`"name" must be set`);
  }
  for (const [key, value] of Object.entries(expected(base, config))) {
    if (JSON.stringify(config[key]) !== JSON.stringify(value)) {
      problems.push(
        `"${key}" must be ${JSON.stringify(value)}, got ${JSON.stringify(config[key])}`,
      );
    }
  }
  return problems;
}

/** Rewrites the shared keys in place, keeping comments and formatting elsewhere. */
export function fixConfig(text: string, base: Config): string {
  const config = parseJsonc(text, "config");
  let out = text;
  for (const [key, value] of Object.entries(expected(base, config))) {
    if (JSON.stringify(config[key]) !== JSON.stringify(value)) {
      out = applyEdits(out, modify(out, [key], value, FORMAT));
    }
  }
  return out;
}
