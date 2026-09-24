// The character collection: the registry, save migration and every way a
// character can be unlocked. No DOM and no canvas, so the tests can run it.
//
// A character is DATA: a body plan (the silhouette), a palette, and a few
// cosmetic extras -- headwear, something at the neck, the face or the back, a
// marking, a hop particle, a voice, and optionally a presentation theme. The
// plans are painted by js/characters.js (2D) and js/characters3d.js (3D); the
// characters themselves live in js/roster-data.js as one line each.
//
// ALL OF IT IS COSMETIC. Nothing here is read by js/game.js: the hitbox, the
// hop, the speed and the score are the same for every character, and a theme
// may change what the world looks and sounds like but never what is in it.
//
// Unlocks, and the rules that keep them kind:
//   founding -- the original twelve birds, owned by every player, always
//   prize    -- the Prize Machine: coins earned in play, never duplicates
// Everything other than a Prize Machine win is EARNED, and earned characters
// arrive one at a time -- see Collection.qualify.
//   ach      -- a visible achievement or campaign milestone
//   secret   -- a playful action, hinted at but not spelled out
//   season   -- an annual event that comes back every year
// A character, once owned, is never taken away: owned lists only ever grow,
// and sync merges them by union.
"use strict";

const PRIZE_COST = 150;
// Earned characters arrive one at a time: at most one per run, and at least
// this many runs apart. See Collection.qualify.
const AWARD_GAP = 3;

const RARITIES = [
  { id:"common",    label:"Common",    color:"#8d9aa6" },
  { id:"uncommon",  label:"Uncommon",  color:"#2f9a41" },
  { id:"rare",      label:"Rare",      color:"#2670ab" },
  { id:"epic",      label:"Epic",      color:"#8e4fe9" },
  { id:"legendary", label:"Legendary", color:"#d98e12" },
];

// The founding flock: the twelve birds every player already had, keyed by the
// emoji the old saves stored in progress.bird (and in the profile avatar).
const FOUNDING = [
  ["🐔", "hen",       "Chicken"],   ["🐓", "rooster",  "Rooster"],
  ["🐤", "chick",     "Chick"],     ["🐥", "hatchling","Hatchling"],
  ["🦆", "duck",      "Duck"],      ["🐧", "penguin",  "Penguin"],
  ["🦉", "owl",       "Owl"],       ["🦩", "flamingo", "Flamingo"],
  ["🦜", "parrot",    "Parrot"],    ["🦚", "peacock",  "Peacock"],
  ["🦢", "swan",      "Swan"],      ["🕊️", "dove",     "Dove"],
];
const FOUNDING_BY_EMOJI = Object.fromEntries(FOUNDING.map(([e, id]) => [e, id]));

/* ------------------------------------------------------------ statistics */
// Everything an achievement can ask about. `max` is the most the stat can
// ever reach, which is how an impossible condition is caught by the tests.
const STATS = {
  best:        { max: Infinity, text: n => `Reach ${n} rows in one run`,            get: g => g.best || 0 },
  stars:       { max: 120,      text: n => `Earn ${n} stars in the Worlds`,          get: g => starsOf(g) },
  worlds:      { max: 10,       text: n => `Finish ${n} worlds`,                     get: g => worldsDone(g) },
  runs:        { max: Infinity, text: n => `Play ${n} runs`,                         get: g => st(g, "runs") },
  hops:        { max: Infinity, text: n => `Hop forward ${n.toLocaleString("en")} times`, get: g => st(g, "hops") },
  coinsEarned: { max: Infinity, text: n => `Collect ${n.toLocaleString("en")} coins in all`, get: g => st(g, "coinsEarned") },
  runCoins:    { max: Infinity, text: n => `Collect ${n} coins in one run`,          get: g => st(g, "maxRunCoins") },
  near:        { max: Infinity, text: n => `Have ${n} close calls`,                  get: g => st(g, "near") },
  logs:        { max: Infinity, text: n => `Ride ${n} logs`,                         get: g => st(g, "logs") },
  rails:       { max: Infinity, text: n => `Cross ${n} railway lines`,               get: g => st(g, "rails") },
  pulls:       { max: Infinity, text: n => `Win ${n} prizes from the Prize Machine`, get: g => st(g, "pulls") },
  owned:       { max: 420,      text: n => `Collect ${n} characters`,                get: g => ownedCount(g) },
};
// Per-world milestones: "world:3" is Frozen Tracks finished, "world3:3" is
// every star in it.
for (let w = 0; w < 10; w++) {
  STATS["world:" + w]  = { max: 1,  text: () => `Finish ${WORLDS[w].name}`,              get: g => worldLevels(g, w) === 4 ? 1 : 0 };
  STATS["world3:" + w] = { max: 12, text: () => `Earn all 12 stars in ${WORLDS[w].name}`, get: g => worldStars(g, w) };
}
function st(g, k) { return (g.stats && g.stats[k]) || 0; }
function starsOf(g) { let n = 0; for (const lv of Object.values(g.levels || {})) n += lv.stars || 0; return n; }
function worldLevels(g, w) { let n = 0; for (let j = 0; j < 4; j++) if (g.levels && g.levels[w * 4 + j]) n++; return n; }
function worldStars(g, w) { let n = 0; for (let j = 0; j < 4; j++) { const lv = g.levels && g.levels[w * 4 + j]; if (lv) n += lv.stars || 0; } return n; }
function worldsDone(g) { let n = 0; for (let w = 0; w < 10; w++) if (worldLevels(g, w) === 4) n++; return n; }

/* --------------------------------------------------------------- secrets */
// Playful things to do. `test` reads a finished run (r: { run, stats, mode,
// maxRow, coins, reason, won, elapsed, charId, hour }) and the save; `hint`
// is what the locked card says. App-level ones are fired by name from the
// menus instead (see Collection.trigger) and have no test.
const SECRETS = {
  moonwalk:   { hint: "Some birds prefer to face the way they came…",        test: r => r.stats.maxBackRun >= 8 },
  logSurfer:  { hint: "Stay aboard. Just… stay aboard.",                     test: r => r.stats.maxLogRide >= 8 },
  thirteen:   { hint: "An unlucky number to stop on. Three times.",          test: (r, g) => st(g, "thirteenRuns") >= 3 },
  oops:       { hint: "Everyone's first hop is the hardest. Very hard, ten times over.", test: (r, g) => st(g, "oopsRuns") >= 10 },
  arrow:      { hint: "Straight ahead, no turning, for a long way.",         test: r => r.mode === "endless" && r.maxRow >= 40 && r.stats.side === 0 },
  penniless:  { hint: "Walk past every coin you see. Every single one.",     test: r => r.mode === "endless" && r.maxRow >= 60 && r.coins === 0 },
  coinCombo:  { hint: "Coin, coin, coin, coin! Four hops in a row.",         test: r => r.stats.maxCoinRun >= 4 },
  bothSides:  { hint: "See both edges of the world in one run.",             test: r => r.stats.edges === 3 },
  treeHugger: { hint: "Trees make good friends. Bump into lots of them.",    test: r => r.stats.bumpTree >= 20 },
  wallBonk:   { hint: "What's past the edge of the world? Keep trying.",     test: r => r.stats.bumpEdge >= 15 },
  speedy:     { hint: "Zoom! Thirty rows before fifteen seconds are up.",    test: r => r.stats.rowAt15 >= 30 },
  marathon:   { hint: "Keep one run going for three whole minutes.",         test: r => r.mode === "endless" && r.elapsed >= 180 },
  nearFive:   { hint: "Close… closer… eight close calls in one run.",        test: r => r.stats.near >= 8 },
  railDash:   { hint: "When the lights flash, some birds dash. Five times.", test: r => r.stats.railWarn >= 5 },
  logLover:   { hint: "Ride forty logs in a single run.",                    test: r => r.stats.logs >= 40 },
  pauseParty: { hint: "Take lots of little breaks in one run.",              test: r => r.stats.pauses >= 8 },
  comeback:   { hint: "Keep going after a knock, all the way to a new best.",test: r => r.stats.bestAfterRevive },
  blownAway:  { hint: "Stand still until the breeze carries you off.",       test: r => r.stats.blown },
  splashes:   { hint: "Splash, splash, splash — three runs in a row.",       test: (r, g) => st(g, "waterStreak") >= 3 },
  bestStreak: { hint: "A new best, and another, and another.",               test: (r, g) => st(g, "bestStreak") >= 3 },
  noCoinWin:  { hint: "Finish a World level without picking up a coin.",     test: r => r.won && r.coins === 0 },
  loyal:      { hint: "The very first chicken can go a long way.",           test: r => r.mode === "endless" && r.maxRow >= 50 && r.charId === "hen" },
  evening:    { hint: "Play ten runs after the sun goes down (7pm).",        test: (r, g) => st(g, "eveningRuns") >= 10 },
  earlyBird:  { hint: "The early bird catches… ten runs before 7am.",        test: (r, g) => st(g, "earlyRuns") >= 10 },
  heroTaps:   { hint: "Say hello to your character on the home screen. Lots and lots.", app: 25 },
  eggSearch:  { hint: "Search the collection for what every chick starts as.", app: 1 },
  favTen:     { hint: "Pick ten favourites.",                                app: 1 },
  viewFlip:   { hint: "Flip between flat and blocky four times.",            app: 4 },
  zeroCoins:  { hint: "Spend your very last coin at the Prize Machine.",     app: 1 },
  scoreFan:   { hint: "Visit the High Scores five times.",                   app: 5 },
};

/* ---------------------------------------------------------------- events */
// Annual events. Each window comes back every year, and during it the event's
// characters are earned by reaching a distance in Endless -- tier 1 is short.
const EVENT_ROWS = [15, 30, 50, 75];
const EVENTS = {
  newyear:    { name: "New Year Parade",       from: [12, 31], to: [1, 10] },
  friendship: { name: "Friendship Fortnight",  from: [2, 7],   to: [2, 21] },
  easter:     { name: "Easter Egg Hunt",       easter: [-3, 7] },
  snowglobe:  { name: "Snow Globe Days",       from: [6, 20],  to: [7, 20] },
  blossom:    { name: "Blossom Weeks",         from: [9, 1],   to: [9, 21] },
  pumpkin:    { name: "Pumpkin Patch",         from: [10, 20], to: [11, 3] },
  christmas:  { name: "Christmas Crossing",    from: [12, 1],  to: [12, 26] },
  seaside:    { name: "Seaside Holiday",       from: [1, 11],  to: [2, 5] },
};
// Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31);
  return new Date(y, mo - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
// Is `date` inside the event's window this year (windows may wrap the year)?
function eventActive(ev, date) {
  const E = EVENTS[ev], y = date.getFullYear();
  const day = new Date(y, date.getMonth(), date.getDate()).getTime();
  if (E.easter) {
    const e = easterSunday(y), a = new Date(e), b = new Date(e);
    a.setDate(e.getDate() + E.easter[0]); b.setDate(e.getDate() + E.easter[1]);
    return day >= a.getTime() && day <= b.getTime();
  }
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const f = E.from[0] * 100 + E.from[1], t = E.to[0] * 100 + E.to[1];
  return f <= t ? md >= f && md <= t : md >= f || md <= t;
}
function eventLabel(ev) {
  const E = EVENTS[ev], M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (E.easter) return "around Easter";
  return `${E.from[1]} ${M[E.from[0] - 1]} – ${E.to[1]} ${M[E.to[0] - 1]}`;
}

/* --------------------------------------------------------------- registry */
// Filled from js/roster-data.js by Roster.build(), once, at load.
const Roster = {
  list: [], byId: new Map(), collections: [], colById: new Map(),

  build(COLLECTIONS, PLANS) {
    this.plans = PLANS;
    for (const col of COLLECTIONS) {
      const c = { id: col.id, name: col.name, emoji: col.emoji, blurb: col.blurb || "", ids: [] };
      this.collections.push(c); this.colById.set(c.id, c);
      col.chars.forEach((line, i) => {
        const ch = parseLine(line, col, i, PLANS);
        this.list.push(ch); this.byId.set(ch.id, ch); c.ids.push(ch.id);
      });
    }
    this.list.forEach((ch, i) => { ch.n = i + 1; });
    return this;
  },

  get(id) { return this.byId.get(id) || this.byId.get("hen"); },
};

// One character from its line of data:
//   "Name | plan | key=value key=value ..."
// Keys: colours (body, belly, accent, ...) go into the palette over the plan's
// defaults; hat/neck/face/back/mark/fx/voice/theme are the extras; r=0..4 the
// rarity; and the unlock: f=<emoji> founding, a=<stat>:<n> achievement,
// s=<secret>, e=<event>:<tier>. No unlock key means the Prize Machine.
function parseLine(line, col, i, PLANS) {
  const [name, plan, rest = ""] = line.split("|").map(s => s.trim());
  const ch = { id: slug(name), name, col: col.id, plan, pal: {}, rarity: "common", unlock: { type: col.unlock || "prize" } };
  const base = PLANS[plan] && PLANS[plan].pal;
  if (base) Object.assign(ch.pal, base);
  for (const kv of rest.split(/\s+/).filter(Boolean)) {
    const eq = kv.indexOf("="), k = kv.slice(0, eq), v = kv.slice(eq + 1);
    if (k === "r") ch.rarity = RARITIES[+v].id;
    else if (k === "f") ch.unlock = { type: "founding", emoji: v };
    else if (k === "a") {
      // "best:100" is a stat and a number; "world:3" is a stat on its own
      // (a finished world); "world3:3:12" is a per-world stat and a number.
      const parts = v.split(":");
      if (STATS[v]) ch.unlock = { type: "ach", stat: v, n: 1 };
      else { const n = +parts.pop(); ch.unlock = { type: "ach", stat: parts.join(":"), n }; }
    }
    else if (k === "s") ch.unlock = { type: "secret", secret: v };
    else if (k === "e") { const [ev, tier] = v.split(":"); ch.unlock = { type: "season", event: ev, tier: +tier || 1 }; }
    else if (k === "id") ch.id = v;
    else if (k === "form") ch.pal.form = v;
    else if (["hat", "neck", "face", "back", "mark", "fx", "voice", "theme"].includes(k)) ch[k] = v;
    else ch.pal[k] = v.startsWith("#") || v.startsWith("rgba") ? v : "#" + v;
  }
  // The founding flock wear exactly the skins they always had.
  if (ch.unlock.type === "founding" && typeof SKINS !== "undefined") Object.assign(ch.pal, SKINS[ch.unlock.emoji]);
  if (!ch.pal.shade && ch.pal.body) ch.pal.shade = "rgba(0,0,0,0.10)";
  ch.pal.plan = plan;
  if (ch.unlock.type === "founding") ch.rarity = "common";
  return ch;
}
function slug(s) { return s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

/* ------------------------------------------------------ saves and unlocks */
function ownedSet(g) {
  const s = new Set(g.owned || []);
  for (const [, id] of FOUNDING) s.add(id);
  return s;
}
function ownedCount(g) { return ownedSet(g).size; }

const Collection = {
  // Bring any save up to date. Idempotent, and it never removes anything: an
  // old save keeps its coins, levels, best, look, view and chosen bird.
  migrate(g, avatar) {
    if (!g) return g;
    if (!Array.isArray(g.owned)) g.owned = [];
    if (!Array.isArray(g.fav)) g.fav = [];
    if (!Array.isArray(g.pending)) g.pending = [];
    if (!g.stats || typeof g.stats !== "object") g.stats = { coinsEarned: g.coins || 0 };
    if (g.earned === undefined) { g.earned = g.coins || 0; g.spent = 0; }
    if (!g.char || !Roster.byId.has(g.char)) {
      g.char = FOUNDING_BY_EMOJI[g.bird] || FOUNDING_BY_EMOJI[avatar] || "hen";
    }
    return g;
  },

  owns(g, id) { return ownedSet(g).has(id); },
  count(g) { return ownedCount(g); },
  isPending(g, id) { return (g.pending || []).includes(id) && !this.owns(g, id); },
  // Earned but not yet arrived, oldest first, ignoring anything already owned
  // (sync can bring the same character in from another device).
  waiting(g) { return (g.pending || []).filter(id => Roster.byId.has(id) && !this.owns(g, id)); },

  // Adding to the collection. A Prize Machine win lands here directly;
  // everything EARNED goes through qualify() and awardNext() instead.
  grant(g, id) {
    if (!Roster.byId.has(id) || this.owns(g, id)) return false;
    g.owned.push(id);
    (g.unseen = Array.isArray(g.unseen) ? g.unseen : []).push(id);
    if (Array.isArray(g.pending)) g.pending = g.pending.filter(x => x !== id);
    return true;
  },

  // ONE AT A TIME. Meeting a condition -- an achievement, a secret, an event
  // distance -- only puts the character in a queue. The queue pays out at the
  // end of a run, never more than one character per run and never two within
  // AWARD_GAP runs of each other, so a player who has already finished five
  // worlds does not get a dozen characters dumped on her the day this ships,
  // and a lucky run that ticks three boxes is still one new friend.
  qualify(g, id) {
    if (!Roster.byId.has(id) || this.owns(g, id)) return false;
    if (!Array.isArray(g.pending)) g.pending = [];
    if (g.pending.includes(id)) return false;
    g.pending.push(id);
    return true;
  },
  runsUntilNext(g) {
    if (!this.waiting(g).length) return null;
    const since = g.stats && g.stats.sinceAward !== undefined ? g.stats.sinceAward : AWARD_GAP;
    return Math.max(0, AWARD_GAP - since);
  },
  // Called once per finished run. Returns [] or [the one id that arrived].
  awardNext(g) {
    g.stats = g.stats || {};
    const since = g.stats.sinceAward !== undefined ? g.stats.sinceAward : AWARD_GAP;
    const next = this.waiting(g)[0];
    if (!next || since < AWARD_GAP) return [];
    this.grant(g, next);
    g.stats.sinceAward = 0;
    return [next];
  },

  earn(g, n) {
    if (g.earned === undefined) { g.earned = g.coins || 0; g.spent = 0; }
    g.coins = (g.coins || 0) + n; g.earned += n;
    g.stats = g.stats || {}; g.stats.coinsEarned = (g.stats.coinsEarned || 0) + n;
  },
  spend(g, n) {
    if ((g.coins || 0) < n) return false;
    if (g.earned === undefined) { g.earned = g.coins || 0; g.spent = 0; }
    g.coins -= n; g.spent = (g.spent || 0) + n;
    return true;
  },

  // Prize Machine. Every character it can still give is equally likely --
  // no weighting, no duplicates (an owned result is rerolled, which is the
  // same as never drawing it), and the price is shown before you pay. One
  // pull, one character: anything else the pull happens to earn (the
  // collecting achievements, the last-coin secret) joins the queue.
  prizePool(g) { const own = ownedSet(g); return Roster.list.filter(c => c.unlock.type === "prize" && !own.has(c.id)); },
  pull(g, rng = Math.random) {
    const pool = this.prizePool(g);
    if (!pool.length) return { error: "complete" };
    if (!this.spend(g, PRIZE_COST)) return { error: "coins" };
    let pick = pool[Math.floor(rng() * pool.length) % pool.length];
    for (let guard = 0; this.owns(g, pick.id) && guard < 50; guard++) pick = pool[Math.floor(rng() * pool.length) % pool.length];
    this.grant(g, pick.id);
    this.bump(g, "pulls");
    const queued = [];
    if (g.coins === 0) queued.push(...this.trigger(g, "zeroCoins"));
    queued.push(...this.checkAchievements(g));
    return { id: pick.id, queued };
  },

  bump(g, k, n = 1) { g.stats = g.stats || {}; g.stats[k] = (g.stats[k] || 0) + n; return g.stats[k]; },

  // Achievements: every one whose stat has reached its number goes in the
  // queue. Checked after every run and on load, so progress made before the
  // collection existed (a finished world, a long-standing best) still counts
  // -- it just arrives one run at a time like everything else.
  checkAchievements(g) {
    const out = [];
    for (const ch of Roster.list) {
      if (ch.unlock.type !== "ach") continue;
      if (STATS[ch.unlock.stat].get(g) >= ch.unlock.n && this.qualify(g, ch.id)) out.push(ch.id);
    }
    return out;
  },

  secretChars(name) { return Roster.list.filter(c => c.unlock.type === "secret" && c.unlock.secret === name); },

  // App-level secrets: counted in stats, queued when the count is reached.
  trigger(g, name, n = 1) {
    const S = SECRETS[name];
    if (!S || !S.app) return [];
    const v = this.bump(g, "t_" + name, n);
    if (v < S.app) return [];
    return this.secretChars(name).filter(c => this.qualify(g, c.id)).map(c => c.id);
  },

  // A run has ended: fold its counters into the save, queue whatever it
  // earned, and let at most one character out of the queue. `r` is
  // described above SECRETS. A revived run ends twice; the second time
  // r.first is false and r.delta holds only what happened since the first,
  // so nothing is counted twice -- and only the first ending can award.
  recordRun(g, r, date = new Date()) {
    const d = r.delta || r.stats, first = r.first !== false;
    if (first) {
      this.bump(g, "runs");
      // never awarded yet counts as ready: the first earned one comes straight away
      if (g.stats.sinceAward === undefined) g.stats.sinceAward = AWARD_GAP;
      this.bump(g, "sinceAward");
    }
    this.bump(g, "hops", d.fwd);
    this.bump(g, "near", d.near);
    this.bump(g, "logs", d.logs);
    this.bump(g, "rails", d.rails);
    g.stats.maxRunCoins = Math.max(g.stats.maxRunCoins || 0, r.coins);
    if (first) {
      const hour = date.getHours();
      g.stats.waterStreak = !r.won && r.reason === "water" ? (g.stats.waterStreak || 0) + 1 : 0;
      g.stats.bestStreak = r.newBest ? (g.stats.bestStreak || 0) + 1 : 0;
      if (!r.won && r.maxRow <= 1) this.bump(g, "oopsRuns");
      if (!r.won && r.maxRow === 13) this.bump(g, "thirteenRuns");
      if (hour >= 19) this.bump(g, "eveningRuns");
      if (hour < 7) this.bump(g, "earlyRuns");
    }
    const rr = Object.assign({ hour: date.getHours() }, r);
    for (const [name, S] of Object.entries(SECRETS)) {
      if (S.test && S.test(rr, g)) for (const c of this.secretChars(name)) this.qualify(g, c.id);
    }
    if (r.mode === "endless") this.checkSeason(g, r.maxRow, date);
    this.checkAchievements(g);
    return first ? this.awardNext(g) : [];
  },

  activeEvents(date = new Date()) { return Object.keys(EVENTS).filter(ev => eventActive(ev, date)); },
  checkSeason(g, rows, date = new Date()) {
    const out = [], live = new Set(this.activeEvents(date));
    for (const ch of Roster.list) {
      const u = ch.unlock;
      if (u.type === "season" && live.has(u.event) && rows >= EVENT_ROWS[u.tier - 1] && this.qualify(g, ch.id)) out.push(ch.id);
    }
    return out;
  },

  // What a card says about how to get it.
  hint(ch, g) {
    const u = ch.unlock;
    if (u.type === "founding") return "One of the Founding Flock";
    if (this.isPending(g, ch.id)) return "🎁 Earned! Arriving soon — keep playing";
    if (u.type === "prize") return `Win it from the Prize Machine (🪙${PRIZE_COST})`;
    if (u.type === "ach") {
      const S = STATS[u.stat], have = Math.min(S.get(g), u.n);
      return S.text(u.n) + (u.n > 1 && isFinite(u.n) ? ` · ${have.toLocaleString("en")}/${u.n.toLocaleString("en")}` : "");
    }
    if (u.type === "secret") return "Secret · " + SECRETS[u.secret].hint;
    if (u.type === "season") {
      const live = eventActive(u.event, new Date());
      return `${EVENTS[u.event].name} (${eventLabel(u.event)}): reach ${EVENT_ROWS[u.tier - 1]} rows in Endless` +
        (live ? " · on now!" : " · comes back every year");
    }
    return "";
  },
};

// Profile avatar lookup for migrate(). Wrapping getProgress here means every
// read anywhere in the app -- the game, the menus, the leaderboard -- sees a
// migrated save, and the first write stores it.
if (typeof Storage !== "undefined" && Storage.getProgress) {
  const raw = Storage.getProgress.bind(Storage);
  Storage.getProgress = (id) => {
    const p = (Storage.getProfiles ? Storage.getProfiles() : []).find(q => q.id === id);
    return Collection.migrate(raw(id), p && p.avatar);
  };
}
