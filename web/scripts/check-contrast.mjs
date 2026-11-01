// Checks every text/background colour pair in the token file against WCAG AA (4.5:1).
// A pair is a colour and its `-foreground`, plus each general text colour on each surface colour.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { TOKEN_FILE } from "./check-tokens.mjs";

const AA_NORMAL_TEXT = 4.5;
const TEXT_COLOURS = ["foreground", "muted-foreground", "brand"];
const SURFACE_COLOURS = ["background", "card", "page", "muted", "accent", "popover", "secondary"];

function channel(value) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  let digits = hex.replace("#", "");
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join("");
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(digits.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

/** Maps each `--color-*` token name (without the prefix) to the hex value it resolves to. */
export function resolveColours(css) {
  const declarations = new Map();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declarations.set(name, value.trim());
  }
  const resolve = (value, seen = new Set()) => {
    const reference = value.match(/^var\((--[\w-]+)\)$/);
    if (!reference) return value;
    if (seen.has(reference[1])) throw new Error(`Circular token reference: ${reference[1]}`);
    seen.add(reference[1]);
    return resolve(declarations.get(reference[1]) ?? "", seen);
  };
  const colours = {};
  for (const [name, value] of declarations) {
    if (!name.startsWith("--color-") || value === "initial") continue;
    const resolved = resolve(value);
    if (/^#[0-9a-f]{3,8}$/i.test(resolved)) colours[name.slice("--color-".length)] = resolved;
  }
  return colours;
}

/** The [text, background] pairs that must meet AA. */
export function colourPairs(colours) {
  const pairs = [];
  for (const name of Object.keys(colours)) {
    const background = name.replace(/-foreground$/, "");
    if (name.endsWith("-foreground") && background in colours && !TEXT_COLOURS.includes(name)) {
      pairs.push([name, background]);
    }
  }
  for (const text of TEXT_COLOURS.filter((t) => t in colours)) {
    for (const surface of SURFACE_COLOURS.filter((s) => s in colours)) {
      pairs.push([text, surface]);
    }
  }
  return pairs;
}

function main() {
  const css = readFileSync(fileURLToPath(new URL(`../${TOKEN_FILE}`, import.meta.url)), "utf8");
  const colours = resolveColours(css);
  let failures = 0;
  for (const [text, background] of colourPairs(colours)) {
    const ratio = contrastRatio(colours[text], colours[background]);
    const ok = ratio >= AA_NORMAL_TEXT;
    if (!ok) failures++;
    console[ok ? "log" : "error"](`${ok ? "pass" : "FAIL"}  ${ratio.toFixed(2)}:1  ${text} on ${background}`);
  }
  if (failures) {
    console.error(`\n${failures} pair(s) below WCAG AA ${AA_NORMAL_TEXT}:1 in ${TOKEN_FILE}.`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
