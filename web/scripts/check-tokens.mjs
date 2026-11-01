// Fails when a raw colour, pixel value or square-bracket Tailwind value appears anywhere outside the
// token file. There is deliberately no way to ignore a line: add a named token instead.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const TOKEN_FILE = "src/styles/tokens.css";

// The scripts themselves are skipped: their tests contain the very values they reject.
const SCANNED_DIRS = ["src", "e2e"];
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"];

const RULES = [
  { rule: "hex colour", pattern: /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi },
  { rule: "colour function", pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi },
  { rule: "pixel value", pattern: /\b\d*\.?\d+px\b/gi },
  {
    rule: "square-bracket Tailwind value",
    pattern: /[\w-]-\[[^\]\s]+\]|\[&[^\]\s]*\]|(?<![\w\]])\[[a-z-]+:[^\]\s]+\]/g,
  },
];

export function findViolations(source) {
  const violations = [];
  source.split("\n").forEach((text, index) => {
    for (const { rule, pattern } of RULES) {
      for (const match of text.matchAll(pattern)) {
        violations.push({ rule, line: index + 1, match: match[0] });
      }
    }
  });
  return violations;
}

function* sourceFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) yield path;
  }
}

function main() {
  const root = fileURLToPath(new URL("..", import.meta.url));
  let failures = 0;
  const rootFiles = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext)))
    .map((entry) => join(root, entry.name));
  const paths = [...rootFiles, ...SCANNED_DIRS.flatMap((dir) => [...sourceFiles(join(root, dir))])];
  for (const path of paths) {
    const file = relative(root, path);
    if (file === TOKEN_FILE) continue;
    for (const { rule, line, match } of findViolations(readFileSync(path, "utf8"))) {
      console.error(`${file}:${line}: ${rule} "${match}" — use a named token from ${TOKEN_FILE}`);
      failures++;
    }
  }
  if (failures) {
    console.error(`\n${failures} hard-coded value(s) found outside ${TOKEN_FILE}.`);
    process.exit(1);
  }
  console.log(`No hard-coded values outside ${TOKEN_FILE}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
