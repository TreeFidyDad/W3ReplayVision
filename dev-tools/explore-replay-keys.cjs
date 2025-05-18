// explore-replay-keys.cjs
// Usage: node explore-replay-keys.cjs yourreplay.w3g

const fs = require('fs/promises');
const path = require('path');
const W3GReplay = require('w3gjs').default;

function isObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val);
}

// Recursively visit all keys, up to depth 5 to avoid infinite loops on large objects
function exploreKeys(obj, prefix = '', depth = 0, maxDepth = 5, out = []) {
  if (!obj || depth > maxDepth) return;
  for (const key in obj) {
    const value = obj[key];
    const pathStr = prefix ? `${prefix}.${key}` : key;
    let sample;
    if (Array.isArray(value)) {
      sample = `[Array, length: ${value.length}]`;
      if (value.length > 0 && depth < maxDepth) {
        sample += ` Example: ${JSON.stringify(value[0]).slice(0,200)}`;
        if (typeof value[0] === 'object') {
          // Explore one example inside the array
          exploreKeys(value[0], pathStr + '[0]', depth + 1, maxDepth, out);
        }
      }
    } else if (isObject(value)) {
      sample = '[Object]';
      if (depth < maxDepth) {
        // Go deeper
        exploreKeys(value, pathStr, depth + 1, maxDepth, out);
      }
    } else {
      sample = value;
    }
    out.push(`${'  '.repeat(depth)}${pathStr}: ${sample}`);
  }
  return out;
}

async function main() {
  let [, , replayPath] = process.argv;
  if (!replayPath) {
    console.error('Usage: node explore-replay-keys.cjs myreplay.w3g');
    process.exit(1);
  }

  const parser = new W3GReplay();
  const res = await parser.parse(replayPath);

  const structureLines = [];
  structureLines.push('==== Top-level keys ====');
  structureLines.push(...Object.keys(res));
  structureLines.push('\n==== Recursive key/value explorer ====');
  structureLines.push(...exploreKeys(res, '', 0, 4));

  const outPath = path.join(process.cwd(), 'replay-structure.txt');
  await fs.writeFile(outPath, structureLines.join('\n'), 'utf8');
  console.log(`\n[Done] Structure written to ${outPath}\nOpen this file and search for: death, kill, neutral, creep, x, y, combat, event, etc.`);
}

main();
