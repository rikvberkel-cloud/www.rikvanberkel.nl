// Toegankelijkheid en ankers, in een echte browser.
// - axe (WCAG 2.2 AA) op elke pagina, op 390 en 1280 px, en op Over mij ook
//   met Licht uit. Nul overtredingen is de eis.
// - Elke link naar een anker op dezelfde pagina moet een doel hebben.
// De wisselkop staat stil tijdens de meting ("beweging beperken"), anders
// meet axe soms halverwege een vervaging en meldt het een vals contrast.
// Gebruik: node scripts/check-axe.mjs [basisadres]
// Alleen voor de controle: playwright en axe-core komen niet op de site.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axe = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const basis = process.argv[2] || "http://localhost:8765";
const paginas = ["index", "over-mij", "werk", "publicaties", "contact", "privacy", "av", "404"];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const browser = await chromium.launch();
let fouten = 0;
let metingen = 0;

for (const breedte of [390, 1280]) {
  for (const pagina of paginas) {
    for (const lichtUit of pagina === "over-mij" ? [false, true] : [false]) {
      const context = await browser.newContext({
        viewport: { width: breedte, height: 900 },
        bypassCSP: true,
        reducedMotion: "reduce"
      });
      const page = await context.newPage();
      await page.goto(`${basis}/${pagina}.html`, { waitUntil: "networkidle" });
      if (lichtUit) {
        await page.click("details.geheim summary");
        await page.waitForTimeout(300);
      }
      await page.addScriptTag({ content: axe });
      const overtredingen = await page.evaluate(async (t) => {
        const uitkomst = await axe.run({ runOnly: t });
        return uitkomst.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(" ")}`);
      }, tags);
      const dodeAnkers = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="#"]')]
          .map((a) => a.getAttribute("href"))
          .filter((h) => h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1))))
      );
      metingen += 1;
      for (const regel of overtredingen) {
        fouten += 1;
        console.log(`axe  ${breedte} ${pagina}${lichtUit ? " (Licht uit)" : ""}: ${regel}`);
      }
      for (const anker of dodeAnkers) {
        fouten += 1;
        console.log(`anker ${breedte} ${pagina}: ${anker} heeft geen doel`);
      }
      await context.close();
    }
  }
}

await browser.close();
if (metingen === 0) {
  console.error("Niets gemeten. Klopt het adres?");
  process.exit(2);
}
if (fouten) {
  console.error(`${fouten} probleem of problemen in ${metingen} metingen.`);
  process.exit(1);
}
console.log(`Geen overtredingen en geen dode ankers (${metingen} metingen).`);
