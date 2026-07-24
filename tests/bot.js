"use strict";
// Headless load + perfect-play bot for Chicken Cross. Kept separate from the
// assertions in balance.test.js so it can also be driven by hand when a level
// fails and you want to see why.
//
// The game is one file with an inline <script>, so the script is pulled out of
// index.html and run in a vm alongside the vendored gk-* libs against a fake
// DOM. Nothing renders: the bot steps Game.update() on a fixed timestep and
// reads the same state the real collision code reads.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadScripts } = require("../lib/tools/test-harness.js");

const ROOT = path.join(__dirname, "..");
const FPS = 60, DT = 1 / FPS;
const HOP_TIME = 0.11;      // must match the game
let CAR_MARGIN = 0.10;      // extra clearance the bot leaves around a car
let ROAD_DWELL = 0.10;      // how long a road square must stay clear to be worth landing on
const tune = (m, d) => { CAR_MARGIN = m; ROAD_DWELL = d; };
const COLS = 9;

/* ---------------------------------------------------------------- loading */

// Just enough DOM for boot()/begin()/updateHud(). Nothing here draws.
function fakeDom() {
  const mk = () => {
    const el = {
      style: {}, textContent: "", innerHTML: "", value: "", width: 0, height: 0,
      className: "", dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      appendChild(c) { el.children.push(c); return c; },
      append() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
      querySelector: () => mk(), querySelectorAll: () => [],
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }),
      getContext: () => new Proxy({}, { get: () => () => {} }),
    };
    return el;
  };
  return {
    createElement: mk, getElementById: () => mk(),
    querySelector: () => mk(), querySelectorAll: () => [],
    head: mk(), body: mk(),
    addEventListener() {}, removeEventListener() {}, visibilityState: "visible",
  };
}

function loadGame() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const inline = html.match(/<script>([\s\S]*?)<\/script>/);   // the one with no src=
  if (!inline) throw new Error("could not find the inline game script in index.html");

  const sandbox = loadScripts({
    baseDir: path.join(ROOT, "lib"),
    files: ["gk-util.js", "gk-audio.js", "gk-ui.js", "gk-storage.js",
            "gk-profiles.js", "gk-pwa.js", "gk-fx.js", "gk-debug.js"],
    browser: true,
    globals: {
      document: fakeDom(),
      innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
      requestAnimationFrame: () => 0,   // we step the sim ourselves
      setTimeout: () => 0,              // stop result-screen callbacks firing
      clearTimeout: () => {},
      performance: { now: () => Date.now() },
      location: { search: "" },
      URLSearchParams,
    },
  });
  vm.runInContext(inline[1], sandbox, { filename: "chicken-cross-inline.js" });

  const { Game, App, LEVELS } = sandbox;
  if (!Game || !App || !LEVELS) throw new Error("game globals missing after load");
  App.profile = { id: "__bot__", name: "Bot", avatar: "🐔" };
  Game.boot();
  return { Game, App, LEVELS };
}

/* -------------------------------------------------------------------- bot */

// Is a road lane clear at `col`, `t` seconds from now?
function roadClear(lane, col, t) {
  for (const car of lane.cars) {
    const x = car.x + lane.dir * lane.speed * t;
    if (Math.abs(x - col) < car.width * 0.45 + 0.18 + CAR_MARGIN) return false;
  }
  return true;
}

// Cars move fast enough (up to ~4.2 tiles/s) to cross a whole tile between two
// sampled instants, so a road has to be clear across the WHOLE window the chick
// will stand there — sampling, not two endpoints.
function roadClearThrough(lane, col, from, to, step = 0.04) {
  for (let t = from; t <= to + 1e-9; t += step) if (!roadClear(lane, col, t)) return false;
  return true;
}

// Where the chick actually lands. A water->water hop keeps the fractional
// column AND is carried by the source lane's drift during flight (doMove's
// `afloat` branch); everything else snaps to the grid.
function arrivalCol(g, fromRow, toRow, dc) {
  const from = g.world[fromRow], dest = g.world[toRow];
  const afloat = from && from.type === "water" && dest && dest.type === "water";
  const base = afloat ? g.chick.col : Math.round(g.chick.col);
  let tc = Math.max(0, Math.min(COLS - 1, base + dc));
  if (afloat) tc += from.dir * from.speed * HOP_TIME;    // carried mid-hop
  return tc;
}

// Would landing at (row,col) be survivable — not just on arrival, but for as
// long as the chick has to stand there? Semantics differ per lane, so this
// mirrors each hazard's own rule rather than one generic check.
// `t0` shifts the whole evaluation forward in time, so the same predicate can
// answer "is this safe if I go now?" and "…if I go one hop later?" — which is
// what makes the two-ply exit check below possible.
function landingOk(g, row, col, t0 = 0) {
  if (row < 0) return false;
  const lane = g.world[row];
  if (!lane) return false;
  const land = t0 + HOP_TIME;
  switch (lane.type) {
    case "grass":
      return !lane.trees.has(Math.round(col));
    case "road":
      // Clear long enough to find the next gap from there. Generous, because a
      // chick that lands in a closing gap has nowhere to go.
      return roadClearThrough(lane, col, land, land + ROAD_DWELL);
    case "water": {
      // must land ON a log; riding it is then safe until it nears the bank
      const onLog = lane.logs.some(lg => {
        const x = lg.x + lane.dir * lane.speed * land;
        return Math.abs(col - x) < lg.len * 0.47 + 0.12 - 0.22;   // land well inside
      });
      return onLog && col > 0.5 && col < COLS - 1.5;
    }
    case "rail":
      // only cross a quiet crossing, with room to get on and off again
      return lane.phase === "clear" && lane.timer > land + 1.3;
    default:
      return true;
  }
}

// Would the chick have somewhere to go from (row,col), one hop from now? Roads
// and crossings are transit lanes — landing on one with no exit is how a bot
// (or a player) gets boxed in and run over while shuffling sideways.
function hasExit(g, row, col, t0 = HOP_TIME) {
  if (landingOk(g, row + 1, col, t0)) return true;
  for (const dc of [-1, 1]) {
    const side = Math.max(0, Math.min(COLS - 1, Math.round(col) + dc));
    if (side !== Math.round(col) && landingOk(g, row, side, t0)) return true;
  }
  return false;
}

// Landing somewhere you can also leave. Grass and logs are places you can
// legitimately sit; roads and crossings are not.
function landingUsable(g, row, col, t0 = 0) {
  if (!landingOk(g, row, col, t0)) return false;
  const lane = g.world[row];
  if (lane && (lane.type === "road" || lane.type === "rail"))
    return hasExit(g, row, col, t0 + HOP_TIME);
  return true;
}

// One decision, only between hops — the same constraint a player has.
function botStep(g) {
  const c = g.chick;
  if (c.hop < 1 || g.dead || !g.running) return;

  const row = Math.round(c.row);
  const lane = g.world[row];
  const afloat = lane && lane.type === "water";

  // Standing still is only really safe on grass. On a road or a crossing the
  // chick is sitting in the hazard; on a log it is drifting toward the bank.
  // That's a reason to PREFER moving -- never a reason to move blindly, which
  // is just a different way to die.
  const exposed = lane && (lane.type === "road" || lane.type === "rail");
  const edgeRisk = afloat && (c.col < 1.2 || c.col > COLS - 2.2);
  const preferMove = exposed || edgeRisk || (row - g.camBottomRow() < 5);
  // Only these two make standing still certainly fatal.
  const critical = (row - g.camBottomRow() < 2) || edgeRisk;

  // Forward, but only into a square we can also leave again.
  if (landingUsable(g, row + 1, arrivalCol(g, row, row + 1, 0))) { g.move(0, 1); return; }

  // Sideways — prefer a column that also opens the way forward.
  const opts = [];
  for (const dc of [-1, 1]) {
    const side = arrivalCol(g, row, row, dc);
    if (Math.round(side) === Math.round(c.col)) continue;
    if (!landingUsable(g, row, side)) continue;
    opts.push({ dc, opensForward: landingOk(g, row + 1, side, HOP_TIME) });
  }
  opts.sort((a, b) => Number(b.opensForward) - Number(a.opensForward));
  if (opts.length && (opts[0].opensForward || preferMove)) { g.move(opts[0].dc, 0); return; }

  // Stuck and exposed: retreating to safe ground beats being run over while
  // shuffling. Only worth it if we're not about to be taken by the camera.
  if (exposed && !critical && landingUsable(g, row - 1, Math.round(c.col))) { g.move(0, -1); return; }

  // Must move and nothing is comfortable: take anything merely *survivable*,
  // dropping the "can I leave again" requirement. Jumping blind is the last
  // resort -- on a drifting log that means landing in open water.
  if (critical) {
    if (landingOk(g, row + 1, arrivalCol(g, row, row + 1, 0))) { g.move(0, 1); return; }
    for (const dc of [-1, 1]) {
      const side = arrivalCol(g, row, row, dc);
      if (Math.round(side) !== Math.round(c.col) && landingOk(g, row, side)) { g.move(dc, 0); return; }
    }
    g.move(0, 1);
  }
}

// Play one level to a result.
function playLevel({ Game, App }, gi, capSeconds = 180) {
  App.startLevel(gi);
  let frames = 0;
  const cap = capSeconds * FPS;
  while (Game.running && frames < cap) {
    botStep(Game);
    Game.update(DT);
    frames++;
  }
  return {
    seconds: +(frames / FPS).toFixed(1),
    outcome: Game.running ? "timeout" : (Game.result && Game.result.type) || "unknown",
    reason: Game.result && Game.result.reason,
    reached: Game.chick.maxRow,
    target: Game.target,
  };
}

module.exports = { loadGame, botStep, playLevel, landingOk, arrivalCol, tune, FPS, DT, HOP_TIME, COLS };
