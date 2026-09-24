"use strict";
// Endless mode: themed chunks and the anti-stall camera.
//
// Endless is the main event now, and it no longer shares the campaign's lane
// generator or its creeping camera. What makes it fair is structural, so it
// is asserted structurally: over thousands of generated rows, how long the
// longest unbroken stretch of hazards is, that roads arrive as related blocks,
// that the scenery moves through the worlds across safe ground -- and, with
// the real engine stepped headlessly, that a bird pausing to judge traffic is
// left alone while one that stops making progress is warned and then pushed.

const { test } = require("node:test");
const assert = require("node:assert");
const { loadGame, botStep, FPS, DT } = require("./bot.js");

const game = loadGame();
const { Game, App, sandbox } = game;
const { ENDLESS, STALL } = sandbox.__endless;

function freshRun() {
  App.startEndless();
  return Game;
}

// Generate `rows` lanes of a fresh endless run without playing it.
function generate(rows) {
  freshRun();
  Game.ensureRows(rows);
  const lanes = [];
  for (let r = 0; r <= rows; r++) lanes.push(Game.world[r]);
  return lanes;
}

test("hazard stretches are always broken up by grass", () => {
  let longest = 0;
  for (let run = 0; run < 20; run++) {
    const lanes = generate(1500);
    let n = 0;
    for (const l of lanes) { n = l.type === "grass" ? 0 : n + 1; longest = Math.max(longest, n); }
  }
  // limit is 3..5 by distance, plus at most one block started before the cap
  assert.ok(longest <= 6, `longest unbroken hazard stretch was ${longest} lanes`);
});

test("roads come in related blocks of two or more", () => {
  let singles = 0, blocks = 0;
  for (let run = 0; run < 10; run++) {
    const lanes = generate(1200);
    for (let i = 5; i < lanes.length - 1; i++) {
      if (lanes[i].type !== "road" || lanes[i - 1].type === "road") continue;
      let n = 0; while (lanes[i + n] && lanes[i + n].type === "road") n++;
      // a lone road beside a railway is the "crossing" encounter, by design
      const byRail = (lanes[i - 1] && lanes[i - 1].type === "rail") || (lanes[i + n] && lanes[i + n].type === "rail");
      if (n === 1 && !byRail) singles++;
      blocks++;
    }
  }
  assert.ok(blocks > 50, "there should be plenty of road blocks");
  // a single road only appears when a road block is cut short by the hazard cap
  assert.ok(singles / blocks < 0.12, `${singles} of ${blocks} road blocks were a lone lane`);
});

test("a road block shares one spacing, and a zig-zag alternates direction", () => {
  let zig = 0;
  for (let run = 0; run < 30; run++) {
    freshRun();
    const specs = Game.chunk_roads(0.5);
    const sp = specs.map(s => s.spacing);
    assert.ok(Math.max(...sp) / Math.min(...sp) < 1.15, "spacings within a block should rhyme");
    if (specs[0].pattern === "zigzag") {
      zig++;
      for (let i = 1; i < specs.length; i++) assert.notStrictEqual(specs[i].dir, specs[i - 1].dir);
    }
  }
  assert.ok(zig > 0, "30 blocks should include a zig-zag");
});

test("every endless row wears a world, and worlds change across a blended meadow", () => {
  const lanes = generate(ENDLESS.SEG * 4);
  const seen = new Set();
  for (let r = 4; r < lanes.length; r++) {
    assert.ok(Number.isInteger(lanes[r].wi), `row ${r} has no world`);
    seen.add(lanes[r].wi);
    if (lanes[r].blend) {
      assert.strictEqual(lanes[r].type, "grass", `row ${r} blends worlds on a ${lanes[r].type} lane`);
      assert.ok(lanes[r].blend.t > 0 && lanes[r].blend.t < 1);
    }
  }
  assert.ok(seen.size >= 4, `a ${lanes.length}-row run should visit several worlds, saw ${[...seen]}`);
  assert.strictEqual(JSON.stringify([...seen].slice(0, 3)), JSON.stringify(ENDLESS.ORDER.slice(0, 3)));
});

test("tree rows never wall the bird in", () => {
  for (let run = 0; run < 10; run++) {
    const lanes = generate(800);
    for (let r = 1; r < lanes.length; r++) {
      const a = lanes[r - 1], b = lanes[r];
      if (a.type !== "grass" || b.type !== "grass") continue;
      // every pocket of open ground on row r-1 has an open column above it
      let start = 0;
      for (let col = 0; col <= 9; col++) {
        if (col < 9 && !a.trees.has(col)) continue;
        if (col > start) {
          let open = false;
          for (let c = start; c < col; c++) if (!b.trees.has(c)) open = true;
          assert.ok(open, `row ${r} walls off columns ${start}-${col - 1}`);
        }
        start = col + 1;
      }
    }
  }
});

// Step the real engine for `seconds`, optionally with the bot playing.
function run(seconds, bot) {
  for (let i = 0; i < seconds * FPS && Game.running; i++) {
    if (bot) botStep(Game);
    Game.update(DT);
  }
}

test("pausing to judge traffic is never punished", () => {
  freshRun();
  Game.move(0, 1); run(0.3);                // one hop, so the grace period is spent normally
  run(STALL.warn - 0.2);
  assert.ok(Game.running, "a short wait should never kill");
  assert.strictEqual(Game.stallLevel(), 0, "no warning inside the normal pause window");
  const cam = Game.camForced;
  run(1.0);
  assert.strictEqual(Game.stallLevel(), 1, "a long wait is warned about first");
  assert.strictEqual(Game.camForced, cam, "the warning does not move the camera");
});

test("a bird that stops making progress is pushed, then taken", () => {
  freshRun();
  Game.move(0, 1); run(0.3);
  const t0 = Game.elapsed;
  run(STALL.push + STALL.pushSeconds + 2);
  assert.ok(!Game.running, "a bird that never moves again is eventually swept off");
  assert.strictEqual(Game.result.reason, "fell");
  const took = Game.elapsed - t0;
  assert.ok(took > STALL.push + 1, `taken after ${took.toFixed(1)}s -- too soon`);
  assert.ok(Game.runStats.blown, "recorded as blown away");
});

test("progress stops the push", () => {
  freshRun();
  Game.move(0, 1); run(0.3);
  run(STALL.push + 0.8);
  assert.strictEqual(Game.stallLevel(), 2);
  // hop forward onto the next safe square -- the opening rows are grass
  Game.move(0, 1); run(0.3);
  assert.strictEqual(Game.stallLevel(), 0, "a new row resets the clock");
  const cam = Game.camForced;
  run(1);
  assert.strictEqual(Game.camForced, cam, "and the push stops");
});

test("the bot makes real progress in endless", () => {
  const reach = [];
  for (let a = 0; a < 6; a++) {
    freshRun();
    run(150, true);
    reach.push(Game.chick.maxRow);
  }
  reach.sort((a, b) => b - a);
  if (process.env.CC_REPORT) console.log("endless bot reach:", reach.join(" "));
  assert.ok(reach[0] >= 60, `best bot endless run reached only ${reach[0]} rows (${reach})`);
});
