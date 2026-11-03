// Optional commissioning check; deliberately not part of the weekly build.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { createCardRenderer } from "./social-card-renderer";

const { values } = parseArgs({ options: { output: { type: "string", default: "output/card-alphabet" } } });
const output = resolve(values.output!);
await mkdir(output, { recursive: true });
const renderer = await createCardRenderer();
const results = [];
try {
  for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    // Render the shared component normally, then exercise this glyph in every
    // slot without relying on a real puzzle containing all those copies.
    await renderer.render({ date: "2026-11-03", letters: "abcdefg", centre: "a" });
    await renderer.page.locator(".letter").evaluateAll((nodes, glyph) => {
      for (const node of nodes) node.textContent = glyph;
    }, letter);
    const slots = await renderer.page.locator(".letter").evaluateAll((nodes) => nodes.map((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const glyph = range.getBoundingClientRect();
      const button = node.closest("button")!.getBoundingClientRect();
      return {
        slot: node.closest("button")!.className,
        width: glyph.width,
        height: glyph.height,
        inside: glyph.left >= button.left && glyph.right <= button.right && glyph.top >= button.top && glyph.bottom <= button.bottom,
        offsetX: (glyph.left + glyph.right - button.left - button.right) / 2,
        offsetY: (glyph.top + glyph.bottom - button.top - button.bottom) / 2,
      };
    }));
    assert.equal(slots.length, 7);
    for (const slot of slots) {
      assert.ok(slot.width > 0 && slot.height > 0 && slot.inside, `${letter}: clipped at ${slot.slot}`);
      assert.ok(Math.abs(slot.offsetX) <= 1 && Math.abs(slot.offsetY) <= 8, `${letter}: misplaced at ${slot.slot}`);
    }
    results.push({ letter, slots });
    await renderer.page.locator(".social-card").screenshot({ path: `${output}/${letter}.png`, animations: "disabled" });
  }
  await writeFile(`${output}/results.json`, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Passed A–Z in all seven positions (182 placements). Results: ${output}`);
} finally {
  await renderer.close();
}
