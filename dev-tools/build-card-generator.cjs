#!/usr/bin/env node
/* -------------------------------------------------------------------------
 * build-card-generator.cjs  ▸  v2.0  (2025‑05‑16)
 * -------------------------------------------------------------------------
 * Convert a **build‑order CSV** (produced by export-build-order-with-heroes.cjs)
 * into printable HTML timeline cards – **one card per player** in the replay.
 *
 *   $ node build-card-generator.cjs MyReplay.csv
 *       → MyReplay_Medusa.html
 *       → MyReplay_Soin.html
 *
 * The HTML is self‑contained (inline CSS) – open in a browser or print.
 * Tech buildings = blue highlight, upgrades = gold, hero/ability = grey.
 * Key upgrades (Ensnare, Bear Adept, etc.) get a ⚑ badge for quick eye‑catch.
 * -------------------------------------------------------------------------
 * Requirements (CommonJS‑friendly versions):
 *   npm i chalk@4  (optional – console colours)
 * -------------------------------------------------------------------------*/

const fs   = require('fs/promises');
const path = require('path');
let   chalk = null; // lazy‑load                                      
try { chalk = require('chalk'); } catch {}
const colour = chalk ? chalk.cyanBright : s => s;

// ────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ────────────────────────────────────────────────────────────────────────────
const slug = s => s.replace(/[^\w\-]+/g, '_');

const CATEGORY_COLORS = {
  Building: '#cde7ff',   // light blue
  Upgrade : '#fff5d1',   // light gold
  Hero    : '#f2f2f2',   // light grey
  Ability : '#f9f9f9',
  Item    : '#ffffff',
  Unit    : '#ffffff'
};

const FLAG_UPGRADES = new Set(['Ensnare', 'Bear Adept Training', 'Bear Form',
                               'Spirit Walker Training', 'Ultravision']);

function buildHTML(title, rows) {
  const style = `body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:2rem;background:#fefefe}
  h1{font-size:1.4rem;margin-bottom:1rem}
  table{border-collapse:collapse;width:100%}
  th,td{padding:4px 8px;font-size:.85rem}
  tr:nth-child(even){background:#fafafa}
  .time{width:60px;font-weight:bold}
  .flag{color:#d00;margin-left:4px}`;

  const trs = rows.map(r => {
    const bg = CATEGORY_COLORS[r.Category] || '#fff';
    const flag = FLAG_UPGRADES.has(r.Name) ? '⚑' : '';
    return `<tr style="background:${bg}"><td class="time">${r.Time}</td><td>${r.Category}</td><td>${r.Name}${flag?` <span class="flag">${flag}</span>`:''}</td></tr>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>${style}</style></head><body><h1>${title}</h1><table>${trs}</table></body></html>`;
}

// ────────────────────────────────────────────────────────────────────────────
// CSV loader & main
// ────────────────────────────────────────────────────────────────────────────
async function parseCSV(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines.map(l => {
    const parts = l.split(',');
    const obj = {};
    cols.forEach((c,i)=>{obj[c]=parts[i];});
    return obj;
  });
}

async function generateCards(csvPath) {
  const events = await parseCSV(csvPath);
  const players = [...new Set(events.map(e => e.Player))];

  if(chalk) console.log(colour(`✔ Found ${players.length} players → generating build cards...`));

  const base = path.basename(csvPath, path.extname(csvPath));
  const dir  = path.dirname(csvPath);

  for (const p of players) {
    const rows = events.filter(e => e.Player === p);
    const html = buildHTML(`${base} – ${p}`, rows);
    const out  = path.join(dir, `${base}_${slug(p)}.html`);
    await fs.writeFile(out, html, 'utf8');
    if(chalk) console.log(colour(`  • ${out}`));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────
if (!process.argv[2]) {
  console.error('Usage: node build-card-generator.cjs <build-order.csv>');
  process.exit(1);
}

generateCards(path.resolve(process.argv[2])).catch(err=>{console.error(err);process.exit(1);});
