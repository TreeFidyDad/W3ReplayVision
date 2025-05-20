// w3replayvision_export.js
// -----------------------------------------------------------------------------
// Stand‑alone exporter: Converts a Warcraft III .w3g replay into a detailed
// build‑order CSV including heroes and their ability timings.
//
// • Run with NO arguments → GUI file picker (node‑file‑dialog) or readline prompt.
// • Run with a replay path → processes that file directly.
// • Optional second arg   → explicit CSV filename override.
// • All CSVs default to ./parsed_replays (in the same folder as this script).
//
//   > node w3replayvision_export.js                  # GUI picker
//   > node w3replayvision_export.js game.w3g         # CLI path
//   > node w3replayvision_export.js game.w3g out.csv # custom CSV
//
// Requirements:
//   npm i w3gjs
//   npm i node-file-dialog      # optional GUI support
// -----------------------------------------------------------------------------



const fs   = require('fs/promises');
const path = require('path');
const W3GReplay = require('w3gjs').default;

// -----------------------------------------------------------------------------
// Central output directory -----------------------------------------------------
// -----------------------------------------------------------------------------
const OUTPUT_DIR = path.join(__dirname, 'parsed_replays');

async function ensureOutputDir() {
  try { await fs.mkdir(OUTPUT_DIR, { recursive: true }); } catch {}
}

// -----------------------------------------------------------------------------
// GUI / readline helper --------------------------------------------------------
// -----------------------------------------------------------------------------
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


// -----------------------------------------------------------------------------
// Lookup tables (units, buildings, etc.) – trimmed for brevity. Extend as needed
// -----------------------------------------------------------------------------
// Updated NAME_MAP
const NAME_MAP = {
  // ===========================================================================
  // HUMAN ---------------------------------------------------------------------
  // Units
  hfoo: 'Footman',
  hkni: 'Knight',
  hpea: 'Peasant',
  hrif: 'Rifleman',
  hmpr: 'Priest',
  hsor: 'Sorceress',
  hspt: 'Spell Breaker',
  hgyr: 'Flying Machine',
  hmtm: 'Mortar Team',

  // Buildings
  halt: 'Altar of Kings',
  hatw: 'Arcane Tower',
  hbar: 'Barracks(Hu)',
  hbla: 'Blacksmith',
  hcas: 'Castle',
  hhou: 'Farm',
  hkee: 'Keep',
  hlum: 'Lumber Mill',
  hars: 'Arcane Sanctum',
  hvlt: 'Arcane Vault',
  hwtw: 'Scout Tower',
  hgtw: 'Guard Tower',
  htow: 'Town Hall',
  harm: 'Workshop',
  hctw: 'Castle',

  // ===========================================================================
  // ORC -----------------------------------------------------------------------
  // Units
  nzep: 'Zepplin',
  ngir: 'Goblin Shredder',
  opeo: 'Peon',
  ogru: 'Grunt',
  ohun: 'Troll Headhunter',
  otbk: 'Troll Berserker',
  ospm: 'Spirit Walker',
  orai: 'Raider',
  okod: 'Kodo Beast',
  ocat: 'Demolisher',
  oshm: 'Shaman',
  owyv: 'Wind Rider',
  otau: 'Tauren',
  otbr: 'Bat Rider',
  // Buildings
  oalt: 'Altar of Storms',
  obar: 'Barracks',
  owtw: 'Watch Tower',
  obea: 'Beastiary',
  ofor: 'War Mill',
  ofrt: 'Spirit Lodge',
  ogre: 'Great Hall',
  ostru: 'Fortress',
  ostr: 'Stronghold',
  otto: 'Tauren Totem',
  otrb: 'Burrow',
  ovln: 'Voodoo Lounge',
  osld: 'Spirit Lodge',        // alias (old parser tag)

  

  // ===========================================================================
  // UNDEAD --------------------------------------------------------------------
  // Units
  uaco: 'Acolyte',
  uabo: 'Abomination',
  ucry: 'Crypt Fiend',
  ugho: 'Ghoul',
  uobs: 'Obsidian Statue',
  // Buildings
  uaod: 'Altar of Darkness',
  ugol: 'Gold Mine',
  ugrp: 'Graveyard',
  ugrv: 'Graveyard',            // alias
  unpl: 'Necropolis',
  unp1: 'Halls of the Dead',
  unp2: 'Black Citadel',
  usap: 'Sacrificial Pit',
  usep: 'Crypt',
  uslh: 'Slaughterhouse',
  utom: 'Tomb of Relics',
  uzg2: 'Spirit Tower',
  uzig: 'Ziggurat',

  // ===========================================================================
  // NIGHT ELF -----------------------------------------------------------------
  // Units
  earc: 'Archer',
  eden: 'Demon Hunter',
  edoc: 'Druid of the Claw',
  emow: 'Moon Well',
  emtg: 'Mountain Giant',
  ewsp: 'Wisp',
  nftb: 'Forest Troll Berserker',
  nfsp: 'Forest Troll Shadow Priest',
  edry: 'Dryad',
  ebal: 'Glaive',
  
  // Buildings
  etrp: 'Ancient Protector',
  eaoe: 'Ancient of Lore',
  eaom: 'Ancient of War',
  eate: 'Altar of Elders',
  etoa: 'Tree of Ages',
  etoe: 'Tree of Eternity',
  gcel: 'Ancient of Wonders',
  oven: 'Ancient of Wind',
  etol: 'Tree of Life',
  edob: 'Huntress Hall',

  // ===========================================================================
  // UPGRADES & TECH -----------------------------------------------------------
  // Orc
  Robk: 'Berserker Upgrade',
  Rora: 'Steel Ranged Weapons',
  Roen: 'Ensnare',
  Rost: 'Reinforced Defenses',
  Rowd: 'War Drums Upgrade',
  Rowt: 'Spirit Walker Training',
  Rubu: 'Burrow Upgrade',
  Rwdm: 'Wind Walk',
  Rorb: 'Reinforced Defenses',
  Rotr: 'Troll Regeneration',
  Roar: 'Steel Unit Armor',
  Ropg: 'Pillage',
  // Human
  Rhla: 'Long Rifles',
  Rhra: 'Black Gunpowder',
  Rhri: 'Iron Plating',
  Rhme: 'Iron Forged Swords',
  Rhar: 'Iron Plating',
  Rhpm: 'Backpack',
  Rhde: 'Defend',
  Rhlh: 'Improved Lumber Harvesting',
  Rhst: 'Sorceress Training',
  Rhpt: 'Priest Training',
  Rhse: 'Magic Sentry',
  Rhfs: 'Fragmentation Shards',
  
  // Undead
  Rume: 'Unholy Strength',
  Rucr: 'Creature Attack',
  Rura: 'Unholy Armor',
  Rusp: 'Destroyer Form',
  Rugf: "Unholy Frenzy",
  // Night Elf
  Redc: 'Druid of the Claw Adept Training',
  Resi: 'Resistant Skin',
  Rehs: 'Hardened Skin',
  Rers: 'Rejuvenation',
  Reuv: 'Ultravision',
  Reeb: 'Bear Form',
  Reib: 'Improved Bows',
  Renb: 'Natures Blessings',
  spre: 'Resistant Skin', // alias  
  

  // ===========================================================================
  // ITEMS ---------------------------------------------------------------------
  bspd: 'Boots of Speed',
  cnob: 'Circlet of Nobility',
  dust: 'Dust of Appearance',
  hslv: 'Healing Salves',
  ocor: 'Orb of Corruption',
  oli2: 'Orb of Lightning',
  phea: 'Potion of Healing',
  pman: 'Potion of Mana',
  pnvl: 'Potion of Invulnerability',
  plcl: 'Lesser Clarity Potion',
  rnec: 'Rod of Necromancy',
  sreg: 'Scroll of Regeneration',
  shas: 'Scroll of Speed',
  shea: 'Scroll of Healing',
  stwp: 'Scroll of Town Portal',
  wneg: 'Wand of Negation',
  spro: 'Scroll of Protection',
  pinv: 'Potion of Invisibility',
  moon: 'Moonstone',
  stel: 'Staff of Teleportation',
  tret: 'Tome of Retraining',
  ssan: 'Staff of Sanctuary',
  mcri: 'Mechanical Critter',
  tsct: 'Ivory Tower',

};

const HERO_MAP = {
  Obla: 'Blademaster', Ofar: 'Far Seer', Oshd: 'Shadow Hunter', Otch: 'Tauren Chieftain',
  Hamg: 'Archmage', Hmkg: 'Mountain King', Hpal: 'Paladin', Hblm: 'Blood Mage',
  Udea: 'Death Knight', Ulic: 'Lich', Ucrl: 'Crypt Lord', Udth: 'Dreadlord',
  Edem: 'Demon Hunter', Ekee: 'Keeper of the Grove', Epri: 'Priestess of the Moon', Ewar: 'Warden',
  Nalc: 'Alchemist', Nbrn: 'Dark Ranger', Nngs: "Naga"

};

const ABILITY_MAP = {
   // Night Elf
    // KOTG
    // POTM
    // DH
    // Warden
  // Human
      AHhb: 'Holy Light', ADds: 'Divine Shield', AHad: 'Devotion Aura', // Pally 
      AHbz: 'Blizzard', // Archmage
      AHtb: 'Storm Bolt', AHtc: 'Thunder Clap', // MK
      // Blood Mage 
    
      
    
       AHdr: 'Siphon Mana', AHwe: 'Water Elemental', AHab: 'Brilliance Aura',
   // Undead
   // Orc
  AOwk: 'Wind Walk', AOcr: 'Critical Strike', AOmi: 'Mirror Image', AObl: 'Bladestorm',
  AOhx: 'Hex', AOsw: 'Serpent Ward', AOhw: 'Healing Wave', AObv: 'Big Bad Voodoo',
  AOfs: 'Far Sight', AOsf: 'Feral Spirit', AOcl: 'Chain Lightning',
  AOws: 'War Stomp', AOae: 'Endurance Aura', 
  AEmb: 'Mana Burn', AEim: 'Immolation', AEev: 'Evasion', AEme: 'Metamorphosis',
  AEer: 'Entangling Roots', AEah: 'Thorns Aura', AEfn: 'Force of Nature', AEtr: 'Tranquility',
  AUdc: 'Death Coil', AUau: 'Unholy Aura', AUfn: 'Frost Nova', AUdr: 'Dark Ritual',
  ANab: 'Acid Bomb', ANhs: 'Healing Spray', ANba: 'Black Arrow', ANsi: 'Silence', ANfa: 'Cold Arrow',
  ANfl: 'Forked Lightning',  AHfs: 'Flame Strike', 
  
};

// -----------------------------------------------------------------------------
// Utility ---------------------------------------------------------------------
// -----------------------------------------------------------------------------
const formatTime = ms => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// -----------------------------------------------------------------------------
// MAIN ------------------------------------------------------------------------
// -----------------------------------------------------------------------------
async function main() {
  let [, , replayPath, outPath] = process.argv;

  if (!replayPath) replayPath = await pickReplayViaDialog();
  if (!replayPath) {
    console.error('No replay selected – aborting.');
    process.exit(1);
  }

  await ensureOutputDir();
  const baseName = path.basename(replayPath, path.extname(replayPath));
  if (!outPath) outPath = path.join(OUTPUT_DIR, `${baseName}.csv`);

  try {
    const parser = new W3GReplay();
    const res = await parser.parse(replayPath);

    const events = [];

    // -----------------------------------------------------------------------
    // Core build events (units, buildings, upgrades, items) ------------------
    // -----------------------------------------------------------------------
    res.players.forEach(player => {
      [['Unit', player.units.order], ['Building', player.buildings.order], ['Upgrade', player.upgrades.order], ['Item', player.items.order]].forEach(([cat, list]) => {
        list.forEach(e => events.push({
          Player: player.name,
          Time: formatTime(e.ms),
          Category: cat,
          Name: NAME_MAP[e.id] || e.id
        }));
      });

      // ---------------------------------------------------------------------
      // Heroes & abilities ---------------------------------------------------
      // ---------------------------------------------------------------------
      player.heroes.forEach(hero => {
        const heroName = HERO_MAP[hero.id] || hero.id;

        // Hero "spawn" recorded at first ability time, or 0 if none (rare)
        const spawnTime = hero.abilityOrder.length ? hero.abilityOrder[0].time : 0;
        events.push({
          Player: player.name,
          Time: formatTime(spawnTime),
          Category: 'Hero',
          Name: heroName
        });

        // Ability level‑ups
        hero.abilityOrder.forEach(a => {
          events.push({
            Player: player.name,
            Time: formatTime(a.time),
            Category: 'Ability',
            Name: `${heroName}: ${ABILITY_MAP[a.value] || a.value}`
          });
        });
      });
    });

    // Sort chronologically ---------------------------------------------------
    events.sort((a, b) => {
      const [ma, sa] = a.Time.split(':').map(Number);
      const [mb, sb] = b.Time.split(':').map(Number);
      return ma === mb ? sa - sb : ma - mb;
    });

    // Write CSV --------------------------------------------------------------
    const csvLines = ['Player,Time,Category,Name', ...events.map(e => `${e.Player},${e.Time},${e.Category},${e.Name}`)];
    await fs.writeFile(outPath, csvLines.join('\n'), 'utf8');
    console.log(` Parsed ${events.length} events → ${outPath}`);
  } catch (err) {
    console.error('Error parsing replay:', err);
    process.exit(1);
  }
}

main();
