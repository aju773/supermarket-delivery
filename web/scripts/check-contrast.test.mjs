import assert from "node:assert/strict";
import { test } from "node:test";

import { colourPairs, contrastRatio, resolveColours } from "./check-contrast.mjs";

test("contrast ratio follows WCAG", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(contrastRatio("#FFFFFF", "#FFFFFF"), 1);
  assert.equal(contrastRatio("#fff", "#767676").toFixed(2), "4.54");
});

test("colour tokens resolve through var() to the raw palette", () => {
  const css = `
    :root { --palette-ink: #1A1A1A; --palette-paper: #FFFFFF; }
    @theme {
      --color-foreground: var(--palette-ink);
      --color-card: var(--palette-paper);
      --color-card-foreground: var(--color-foreground);
    }
  `;
  assert.deepEqual(resolveColours(css), {
    foreground: "#1A1A1A",
    card: "#FFFFFF",
    "card-foreground": "#1A1A1A",
  });
});

test("every colour is paired with its -foreground, and text colours with every surface", () => {
  const colours = {
    foreground: "#000",
    "muted-foreground": "#000",
    card: "#fff",
    page: "#fff",
    brand: "#000",
    "brand-foreground": "#fff",
    ring: "#000",
  };
  assert.deepEqual(
    colourPairs(colours).map(([text, background]) => `${text} on ${background}`).sort(),
    [
      "brand on card",
      "brand on page",
      "brand-foreground on brand",
      "foreground on card",
      "foreground on page",
      "muted-foreground on card",
      "muted-foreground on page",
    ],
  );
});
