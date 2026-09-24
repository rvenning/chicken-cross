"use strict";
// The character roster: 420 characters, and the promises made about them.
//
// Everything in the collection is data plus two painters, and nearly every
// way it can go wrong is silent -- a character whose plan nobody paints, a
// palette missing the colour its painter reads, a hat that pokes into the
// lane above, an achievement nobody can ever reach, a save that loses a bird
// on its way through the migration. So each of those is asserted here, for
// every one of the 420, rather than spot-checked in a screenshot.

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { loadGame, botStep, FPS, DT } = require("./bot.js");

const game = loadGame();
const { Game, App, sandbox } = game;
const { Roster, Collection, PLANS, STATS, SECRETS, EVENTS, EVENT_ROWS, FOUNDING, PRIZE_COST, eventActive } = sandbox.__roster;
const { Art, R3, mergeProgress } = sandbox;
const { HATS, THEMES, PLAN3D, VOICES } = sandbox.__roster2;
const ROOT = path.join(__dirname, "..");

const KINDS = {
  neck: ["scarf", "bow", "bowtie", "bandana", "medal", "bell", "lei", "tie", "collar"],
  face: ["glasses", "specs", "shades", "mask", "goggles", "blush", "monocle", "stache"],
  back: ["cape", "backpack", "wings", "jetpack", "shell", "leaf"],
  mark: ["spots", "speckle", "stripes", "bands", "patch", "belly", "stars", "hearts", "check", "rainbow"],
  fx: ["hearts", "stars", "sparkle", "glitter", "notes", "bubbles", "leaves", "petals", "snow", "embers", "confetti", "bolts", "drops", "feathers", "rainbow"],
};
const kind = (spec) => spec.split(":")[0];
const HEX = /^#[0-9a-f]{6}$/i;
// objects from the game sandbox are from another realm, so compare as JSON
const same = (a, b, msg) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), msg);

/* ------------------------------------------------------------ registry */

test("the registry holds exactly 420 characters with unique ids and names", () => {
  assert.strictEqual(Roster.list.length, 420, `registry has ${Roster.list.length} characters`);
  const ids = new Set(), names = new Set();
  for (const ch of Roster.list) {
    assert.ok(/^[a-z0-9-]+$/.test(ch.id), `bad id "${ch.id}"`);
    assert.ok(!ids.has(ch.id), `duplicate id ${ch.id}`);
    assert.ok(!names.has(ch.name.toLowerCase()), `duplicate name ${ch.name}`);
    ids.add(ch.id); names.add(ch.name.toLowerCase());
  }
  assert.strictEqual(Roster.byId.size, 420);
});

test("thirty-odd collections and thirty-odd body plans", () => {
  const cols = Roster.collections.length, plans = Object.keys(PLANS).length;
  assert.ok(cols >= 30 && cols <= 35, `${cols} collections`);
  assert.ok(plans >= 30 && plans <= 40, `${plans} body plans`);
  for (const col of Roster.collections) assert.ok(col.ids.length > 0, `${col.name} is empty`);
  // and every plan is actually used by somebody
  const used = new Set(Roster.list.map(c => c.plan));
  for (const p of Object.keys(PLANS)) assert.ok(used.has(p), `plan ${p} is never used`);
});

test("every character names a real plan, collection and rarity", () => {
  for (const ch of Roster.list) {
    assert.ok(PLANS[ch.plan], `${ch.name}: no 2D plan "${ch.plan}"`);
    assert.ok(PLAN3D[ch.plan], `${ch.name}: no 3D plan "${ch.plan}"`);
    assert.ok(Roster.colById.has(ch.col), `${ch.name}: no collection "${ch.col}"`);
    assert.ok(["common", "uncommon", "rare", "epic", "legendary"].includes(ch.rarity), `${ch.name}: rarity ${ch.rarity}`);
  }
});

test("every character carries the palette its painter reads, and only known extras", () => {
  for (const ch of Roster.list) {
    for (const f of PLANS[ch.plan].needs) {
      assert.strictEqual(typeof ch.pal[f], "string", `${ch.name} (${ch.plan}) is missing "${f}"`);
      assert.ok(HEX.test(ch.pal[f]) || ch.pal[f].startsWith("rgba"), `${ch.name}.${f} = ${ch.pal[f]} is not a colour`);
    }
    if (ch.hat) assert.ok(HATS[kind(ch.hat)], `${ch.name}: unknown hat ${ch.hat}`);
    for (const k of ["neck", "face", "back", "mark", "fx"]) if (ch[k]) assert.ok(KINDS[k].includes(kind(ch[k])), `${ch.name}: unknown ${k} ${ch[k]}`);
    for (const k of ["hat", "neck", "face", "back", "mark"]) if (ch[k] && ch[k].includes(":")) assert.ok(HEX.test("#" + ch[k].split(":")[1]), `${ch.name}: bad colour in ${ch[k]}`);
    if (ch.voice) assert.ok(VOICES[ch.voice], `${ch.name}: unknown voice ${ch.voice}`);
    assert.ok(VOICES[ch.voice || PLANS[ch.plan].voice || "peep"], `${ch.name}: plan ${ch.plan} has no voice`);
    if (ch.theme) assert.ok(THEMES[ch.theme], `${ch.name}: unknown theme ${ch.theme}`);
  }
});

/* ------------------------------------------------------------- 2D art */

// Records the extent of every path point, ignoring anything inside a clip
// (bounded by the clip path, recorded when it was traced). Same recorder as
// tests/skins.test.js, which checks it against painted pixels.
function bounds() {
  const b = { top: 1e9, bottom: -1e9, left: 1e9, right: -1e9 };
  const noop = () => {};
  let clipped = 0; const stack = [];
  const T = { m: [1, 0, 0, 1, 0, 0] };
  const tstack = [];
  const hit = (x, y) => {
    if (clipped || !isFinite(x) || !isFinite(y)) return;
    const [a, bb, c, d, e, f] = T.m, X = a * x + c * y + e, Y = bb * x + d * y + f;
    if (Y < b.top) b.top = Y; if (Y > b.bottom) b.bottom = Y;
    if (X < b.left) b.left = X; if (X > b.right) b.right = X;
  };
  const mul = (n) => { const [a, bb, c, d, e, f] = T.m, [A, B, C, D, E, F] = n;
    T.m = [a * A + c * B, bb * A + d * B, a * C + c * D, bb * C + d * D, a * E + c * F + e, bb * E + d * F + f]; };
  return {
    b,
    save: () => { stack.push(clipped); tstack.push(T.m.slice()); },
    restore: () => { clipped = stack.length ? stack.pop() : 0; if (tstack.length) T.m = tstack.pop(); },
    clip: () => { clipped++; },
    translate: (x, y) => mul([1, 0, 0, 1, x, y]),
    scale: (x, y) => mul([x, 0, 0, y, 0, 0]),
    rotate: (a) => mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
    beginPath: noop, closePath: noop, fill: noop, stroke: noop, drawImage: noop, fillText: noop,
    moveTo: hit, lineTo: hit,
    quadraticCurveTo: (cx, cy, x, y) => { hit(cx, cy); hit(x, y); },
    bezierCurveTo: (a, c, d, e, x, y) => { hit(a, c); hit(d, e); hit(x, y); },
    arc: (x, y, r) => { hit(x - r, y - r); hit(x + r, y + r); },
    arcTo: (x1, y1, x2, y2) => { hit(x1, y1); hit(x2, y2); },
    ellipse: (x, y, rx, ry) => { const r = Math.max(rx, ry); hit(x - r, y - r); hit(x + r, y + r); },
    rect: (x, y, w, h) => { hit(x, y); hit(x + w, y + h); },
    fillRect: (x, y, w, h) => { hit(x, y); hit(x + w, y + h); },
  };
}
const S = 200;

test("every character paints in 2D inside the legibility budget, alive and dead", () => {
  for (const ch of Roster.list) {
    for (const dead of [false, true]) {
      const ctx = bounds();
      assert.doesNotThrow(() => Art.character(ctx, S, ch, { dead, idle: 3 }), `${ch.name} threw (dead=${dead})`);
      const b = ctx.b; for (const k of Object.keys(b)) b[k] /= S;
      // a car in the lane above starts at -1.38s; the bird's column is +-1s
      assert.ok(b.top > -1.38, `${ch.name} (${ch.plan}, hat ${ch.hat}) reaches ${b.top.toFixed(3)}s into the lane above`);
      assert.ok(b.left > -1.0 && b.right < 1.0, `${ch.name} (${ch.plan}) spans ${b.left.toFixed(2)}..${b.right.toFixed(2)}s, past its column`);
      assert.ok(b.bottom > 0.3, `${ch.name} (${ch.plan}) floats: stops at ${b.bottom.toFixed(3)}s`);
    }
  }
});

/* ------------------------------------------------------------- 3D art */

// Every box a character builds, with its rotated corners, in tiles.
function parts3d(ch) {
  const boxes = [];
  R3.characterParts((c, x, y, z, sx, sy, sz, rx, ry, rz) => boxes.push({ c, x, y, z, sx, sy, sz, rx: rx || 0, ry: ry || 0, rz: rz || 0 }), ch);
  return boxes;
}
function extent(bx) {
  // three.js Euler XYZ: p' = Rx * Ry * Rz * p
  let top = -1e9, lo = 1e9, maxXZ = 0;
  for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
    let x = dx * bx.sx, y = dy * bx.sy, z = dz * bx.sz;
    [x, y] = [x * Math.cos(bx.rz) - y * Math.sin(bx.rz), x * Math.sin(bx.rz) + y * Math.cos(bx.rz)];
    [x, z] = [x * Math.cos(bx.ry) + z * Math.sin(bx.ry), -x * Math.sin(bx.ry) + z * Math.cos(bx.ry)];
    [y, z] = [y * Math.cos(bx.rx) - z * Math.sin(bx.rx), y * Math.sin(bx.rx) + z * Math.cos(bx.rx)];
    top = Math.max(top, bx.y + y); lo = Math.min(lo, bx.y + y);
    maxXZ = Math.max(maxXZ, Math.abs(bx.x + x), Math.abs(bx.z + z));
  }
  return { top, lo, maxXZ };
}

test("every character builds in 3D, in colour, inside its own tile", () => {
  for (const ch of Roster.list) {
    let boxes;
    assert.doesNotThrow(() => { boxes = parts3d(ch); }, `${ch.name} (${ch.plan}) threw in 3D`);
    assert.ok(boxes.length >= 6, `${ch.name}: only ${boxes.length} boxes`);
    let top = 0, low = 1e9, reach = 0;
    for (const b of boxes) {
      assert.ok(typeof b.c === "string" && (HEX.test(R3.hex(b.c))), `${ch.name}: box colour ${b.c}`);
      const e = extent(b); top = Math.max(top, e.top); low = Math.min(low, e.lo); reach = Math.max(reach, e.maxXZ);
    }
    assert.ok(top <= 1.2 + 1e-6, `${ch.name} (${ch.plan}, hat ${ch.hat}) stands ${top.toFixed(2)} tiles tall`);
    assert.ok(reach <= 0.55, `${ch.name} (${ch.plan}) reaches ${reach.toFixed(2)} tiles from centre`);
    assert.ok(low <= 0.06, `${ch.name} (${ch.plan}) floats ${low.toFixed(2)} tiles up`);
  }
});

/* ------------------------------------------------------------ unlocks */

test("the unlock mix: founding, prize machine, achievements, secrets, seasons", () => {
  const n = {};
  for (const ch of Roster.list) n[ch.unlock.type] = (n[ch.unlock.type] || 0) + 1;
  assert.strictEqual(n.founding, 12);
  assert.ok(n.prize >= 280 && n.prize <= 310, `${n.prize} prize characters`);
  assert.ok(n.ach >= 60 && n.ach <= 80, `${n.ach} achievement characters`);
  assert.ok(n.secret >= 25 && n.secret <= 35, `${n.secret} secret characters`);
  assert.ok(n.season >= 15 && n.season <= 25, `${n.season} seasonal characters`);
});

test("no unlock condition is missing or impossible", () => {
  const foundEmoji = new Set(FOUNDING.map(f => f[0]));
  const achKeys = new Set();
  for (const ch of Roster.list) {
    const u = ch.unlock;
    if (u.type === "founding") assert.ok(foundEmoji.has(u.emoji), `${ch.name}: founding emoji ${u.emoji}`);
    else if (u.type === "ach") {
      const S = STATS[u.stat];
      assert.ok(S, `${ch.name}: unknown stat ${u.stat}`);
      assert.ok(u.n >= 1 && u.n <= S.max, `${ch.name}: needs ${u.n} ${u.stat}, which can reach only ${S.max}`);
      const k = u.stat + ":" + u.n;
      assert.ok(!achKeys.has(k), `${ch.name}: two characters for the same achievement ${k}`);
      achKeys.add(k);
    } else if (u.type === "secret") assert.ok(SECRETS[u.secret], `${ch.name}: unknown secret ${u.secret}`);
    else if (u.type === "season") {
      assert.ok(EVENTS[u.event], `${ch.name}: unknown event ${u.event}`);
      assert.ok(u.tier >= 1 && u.tier <= EVENT_ROWS.length, `${ch.name}: tier ${u.tier}`);
    } else assert.strictEqual(u.type, "prize", `${ch.name}: unknown unlock ${u.type}`);
  }
  // every secret has exactly one character, and every app-fired secret is
  // actually fired from somewhere in the menus
  const src = ["js/main.js", "js/collection-ui.js", "js/roster.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  for (const [name, S] of Object.entries(SECRETS)) {
    assert.strictEqual(Collection.secretChars(name).length, 1, `secret ${name} has ${Collection.secretChars(name).length} characters`);
    if (S.app) assert.ok(src.includes(`"${name}"`), `nothing ever triggers the secret "${name}"`);
  }
  // every event comes round every year
  for (const ev of Object.keys(EVENTS)) for (const y of [2026, 2027, 2030]) {
    let on = 0;
    for (let d = 0; d < 366; d++) if (eventActive(ev, new Date(y, 0, 1 + d))) on++;
    assert.ok(on >= 7, `${ev} is only on for ${on} days in ${y}`);
    assert.ok(Roster.list.some(c => c.unlock.event === ev), `${ev} has no characters`);
  }
});

/* ------------------------------------------------------------- saves */

const blank = () => ({ coins: 0, best: 0, levels: {}, updated: 0 });

test("old saves keep every bird and every preference", () => {
  for (const [emoji, id] of FOUNDING) {
    const old = { coins: 137, best: 42, levels: { 0: { stars: 3, coins: 9 }, 1: { stars: 1, coins: 2 } },
                  updated: 5, bird: emoji, look: "classic", view: "2d" };
    const g = Collection.migrate(JSON.parse(JSON.stringify(old)), "🐔");
    assert.strictEqual(g.char, id, `a save that chose ${emoji} plays as ${g.char}`);
    assert.strictEqual(g.bird, emoji); assert.strictEqual(g.look, "classic"); assert.strictEqual(g.view, "2d");
    assert.strictEqual(g.coins, 137); assert.strictEqual(g.best, 42);
    same(g.levels, old.levels);
    for (const [, fid] of FOUNDING) assert.ok(Collection.owns(g, fid), `migrated save lost ${fid}`);
    // and migrating again changes nothing
    same(Collection.migrate(g, "🐔"), JSON.parse(JSON.stringify(g)));
  }
  // a save with no bird plays as its avatar
  for (const [emoji, id] of FOUNDING) assert.strictEqual(Collection.migrate(blank(), emoji).char, id);
  assert.strictEqual(Collection.migrate(blank(), undefined).char, "hen");
});

test("sync never loses a character, and never hands back spent coins", () => {
  const a = Collection.migrate({ ...blank(), coins: 300, updated: 10 });
  const b = JSON.parse(JSON.stringify(a));
  // device A wins two prizes; device B, offline, earns 40 coins and a secret
  Collection.pull(a, () => 0.1); Collection.pull(a, () => 0.9); a.updated = 20;
  Collection.earn(b, 40); Collection.grant(b, Collection.secretChars("oops")[0].id); b.updated = 15;
  const m = mergeProgress(a, b);
  for (const id of [...a.owned, ...b.owned]) assert.ok(m.owned.includes(id), `merge lost ${id}`);
  assert.strictEqual(m.coins, 300 - 2 * PRIZE_COST + 40, "spent coins came back, or earned ones vanished");
  same([...mergeProgress(b, a).owned].sort(), [...m.owned].sort());
  // an old copy with no ledger still merges: its balance counts as earned
  const legacy = { ...blank(), coins: 350, updated: 1 };
  const m2 = mergeProgress(Collection.migrate(JSON.parse(JSON.stringify(a))), legacy);
  assert.strictEqual(m2.coins, 350 - 2 * PRIZE_COST);
});

/* ------------------------------------------------------- prize machine */

test("the prize machine never gives a duplicate and empties exactly", () => {
  const g = Collection.migrate(blank());
  const pool = Collection.prizePool(g).length;
  Collection.earn(g, PRIZE_COST * pool + 50);
  const seen = new Set();
  let r = 0.3;
  for (let i = 0; i < pool; i++) {
    const res = Collection.pull(g, () => (r = (r * 9301 + 49297) % 233280 / 233280));
    assert.ok(res.id, `pull ${i} failed: ${res.error}`);
    assert.ok(!seen.has(res.id), `duplicate ${res.id}`);
    assert.strictEqual(Roster.get(res.id).unlock.type, "prize");
    seen.add(res.id);
  }
  assert.strictEqual(seen.size, pool);
  same(Collection.pull(g), { error: "complete" });
  assert.strictEqual(g.coins, 50, "every pull cost exactly the price");
  const poor = Collection.migrate({ ...blank(), coins: PRIZE_COST - 1 });
  same(Collection.pull(poor), { error: "coins" });
  assert.strictEqual(poor.coins, PRIZE_COST - 1, "a refused pull costs nothing");
});

test("achievements count progress made before the collection existed", () => {
  const g = Collection.migrate({ ...blank(), best: 120, levels: { 0: { stars: 3 }, 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } } });
  const got = Collection.checkAchievements(g).map(id => Roster.get(id).unlock);
  assert.ok(got.some(u => u.stat === "world:0"), "finishing world 1 should unlock its champion");
  assert.ok(got.some(u => u.stat === "world3:0"), "all its stars should unlock its star");
  assert.ok(got.some(u => u.stat === "best" && u.n === 100), "a best of 120 passes the 100 milestone");
  assert.ok(!got.some(u => u.stat === "best" && u.n === 150));
});

test("seasonal characters come with their event, and only then", () => {
  const ch = Roster.list.find(c => c.unlock.type === "season" && c.unlock.event === "christmas" && c.unlock.tier === 1);
  const g = Collection.migrate(blank());
  same(Collection.checkSeason(g, 40, new Date(2026, 6, 1)).filter(id => id === ch.id), []);
  assert.ok(Collection.checkSeason(g, 40, new Date(2026, 11, 10)).includes(ch.id));
  assert.ok(Collection.checkSeason(g, 40, new Date(2031, 11, 10)).length === 0, "and it stays owned");
});

test("secrets fire from a run's own counters", () => {
  const g = Collection.migrate(blank());
  const stats = { ...Game.runStats, maxBackRun: 6, side: 0, maxLogRide: 0, bumpTree: 0, edges: 0 };
  const got = Collection.recordRun(g, { mode: "endless", maxRow: 13, coins: 2, reason: "car", won: false, elapsed: 20, charId: "hen", stats, first: true }, new Date(2026, 2, 3, 12));
  const secrets = got.map(id => Roster.get(id).unlock.secret);
  assert.ok(secrets.includes("moonwalk"));
  assert.ok(secrets.includes("thirteen"));
  assert.ok(!secrets.includes("evening"), "noon is not the evening");
});

/* ------------------------------------------------------ cosmetic only */

test("characters are cosmetic: the simulation never reads them", () => {
  const src = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
  for (const word of ["Roster", "character(", ".pal", "PLANS", "themeFx", "ch.plan"])
    assert.ok(!src.includes(word), `js/game.js mentions ${word}`);
});

test("the same run plays out identically whoever is playing it", () => {
  // Seed the sandbox's Math.random so two runs see the same world, then play
  // it with the bot as two very different characters.
  const play = (charId) => {
    let seed = 12345;
    sandbox.__random(() => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    App.startEndless();
    Game.progress.char = charId;
    let frames = 0;
    while (Game.running && frames < 60 * FPS) { botStep(Game); Game.update(DT); frames++; }
    return { row: Game.chick.maxRow, col: +Game.chick.col.toFixed(4), frames, reason: Game.result && Game.result.reason };
  };
  const rnd = sandbox.__random();
  try {
    const a = play("hen"), b = play(Roster.list.find(c => c.plan === "dragon").id), c = play(Roster.list[419].id);
    same(b, a); same(c, a);
  } finally { sandbox.__random(rnd); }
});
