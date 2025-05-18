// export-raw-replay-events.cjs
// Dumps ALL available top-level metadata, player stats, AND raw build events from a .w3g.

const fs   = require('fs/promises');
const path = require('path');
const W3GReplay = require('w3gjs').default;

const OUTPUT_DIR = 'D://ReplayProject//wc3-analysis//parsed_replays';

async function ensureOutputDir() {
  try { await fs.mkdir(OUTPUT_DIR, { recursive: true }); } catch {}
}

async function pickReplayViaDialog() {
  try {
    const dialog = require('node-file-dialog');
    const [file] = await dialog({ type: 'open-file', multiple: false, filter: ['w3g'] });
    return file;
  } catch {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(res => rl.question('Enter path to .w3g replay file: ', ans => { rl.close(); res(ans.trim()); }));
  }
}

const formatTime = ms => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

async function main() {
  let [, , replayPath, outPathBase] = process.argv;

  if (!replayPath) replayPath = await pickReplayViaDialog();
  if (!replayPath) {
    console.error('No replay selected – aborting.');
    process.exit(1);
  }

  await ensureOutputDir();
  const baseName = path.basename(replayPath, path.extname(replayPath));
  const outBase = outPathBase ? outPathBase : path.join(OUTPUT_DIR, baseName);

  try {
    const parser = new W3GReplay();
    const res = await parser.parse(replayPath);

    // --- 1. Write Top-Level Metadata (JSON) ---
    const meta = {
      map: res.map,
      gameLengthMS: res.length,
      gameLength: formatTime(res.length),
      date: res.date,
      version: res.version,
      patch: res.patch,
      creator: res.creator,
      speed: res.speed,
      host: res.host,
      winner: res.winner,
      teams: res.teams,
      gameType: res.gameType,
      slotCount: res.slotCount,
      observerCount: res.observerCount,
      seed: res.seed,
      players: res.players.map(p => ({
        name: p.name,
        id: p.id,
        team: p.team,
        color: p.color,
        race: p.race,
        apm: p.apm,
        winner: p.winner,
        left: p.left, leftAt: p.leftAt,
        actions: p.actions,
        camera: p.camera,
        chat: p.chat,
        selections: p.selections,
        // etc...
      })),
      chat: res.chat
    };
    await fs.writeFile(`${outBase}-METADATA.json`, JSON.stringify(meta, null, 2), 'utf8');
    console.log(`Metadata written to ${outBase}-METADATA.json`);

    // --- 2. Write Per-Player Stats (CSV) ---
    const statKeys = [
      'name','id','team','color','race','apm','winner','left','leftAt'
    ];
    const statLines = [
      statKeys.join(','),
      ...res.players.map(p => statKeys.map(k => JSON.stringify(p[k])).join(','))
    ];
    await fs.writeFile(`${outBase}-PLAYERSTATS.csv`, statLines.join('\n'), 'utf8');
    console.log(`Player stats written to ${outBase}-PLAYERSTATS.csv`);

    // --- 3. Write All Raw Events (CSV, like before) ---
    const rows = [];
    res.players.forEach(player => {
      player.units.order.forEach(e => rows.push({Type:'Unit',Player:player.name,Id:e.id,Order:e.order,TimeMS:e.ms,Time:formatTime(e.ms),X:e.x,Y:e.y,Raw:JSON.stringify(e)}));
      player.buildings.order.forEach(e => rows.push({Type:'Building',Player:player.name,Id:e.id,Order:e.order,TimeMS:e.ms,Time:formatTime(e.ms),X:e.x,Y:e.y,Raw:JSON.stringify(e)}));
      player.upgrades.order.forEach(e => rows.push({Type:'Upgrade',Player:player.name,Id:e.id,Order:e.order,TimeMS:e.ms,Time:formatTime(e.ms),Level:e.level,Raw:JSON.stringify(e)}));
      player.items.order.forEach(e => rows.push({Type:'Item',Player:player.name,Id:e.id,Order:e.order,TimeMS:e.ms,Time:formatTime(e.ms),Raw:JSON.stringify(e)}));
      player.heroes.forEach(hero => {
        rows.push({Type:'Hero',Player:player.name,Id:hero.id,Level:hero.level,Exp:hero.exp,Revive:hero.revive,Items:JSON.stringify(hero.items),TimeMS:(hero.abilityOrder[0]?.time ?? 0),Time:formatTime(hero.abilityOrder[0]?.time ?? 0),Raw:JSON.stringify(hero)});
        hero.abilityOrder.forEach(a => rows.push({Type:'HeroAbility',Player:player.name,HeroId:hero.id,TimeMS:a.time,Time:formatTime(a.time),AbilityRaw:a.value,Raw:JSON.stringify(a)}));
      });
    });
    const allKeys = new Set(); rows.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
    const header = Array.from(allKeys);
    const csvLines = [header.join(','), ...rows.map(row => header.map(k => (row[k] ?? '')).join(','))];
    await fs.writeFile(`${outBase}-EVENTS.csv`, csvLines.join('\n'), 'utf8');
    console.log(`Raw events written to ${outBase}-EVENTS.csv`);

    // --- 4. Optionally: Write chat log and actions, etc. (JSON) ---
    await fs.writeFile(`${outBase}-CHAT.json`, JSON.stringify(res.chat, null, 2), 'utf8');
    res.players.forEach(p => {
      fs.writeFile(`${outBase}-${p.name}-ACTIONS.json`, JSON.stringify(p.actions, null, 2), 'utf8');
    });
    // Only write these if they exist and are not undefined/null:
    if (typeof res.events !== "undefined") {
      await fs.writeFile(`${outBase}-EVENTS-RAW.json`, JSON.stringify(res.events, null, 2), 'utf8');
    }
    if (typeof res.actions !== "undefined") {
      await fs.writeFile(`${outBase}-ACTIONS-RAW.json`, JSON.stringify(res.actions, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error parsing replay:', err);
    process.exit(1);
  }
}

main();
