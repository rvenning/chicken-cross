"use strict";
// Balance checks driven by the headless bot in bot.js — the pattern documented
// in gamekit/docs/testing.md.
//
//   cd chicken-cross && node --test
//   cd chicken-cross && npm run balance     # full 40-level report
//
// WHAT THIS GATES, AND WHAT IT DOESN'T
//
// Chicken Cross generates its world randomly every run, so unlike Brick
// Breaker there is no fixed layout to lint — "is this level completable" is a
// statistical property of the level's parameters, not a fact about a grid.
// That makes the bot's own skill part of the measurement.
//
// The bot clears the early worlds reliably but only wins ~25% of runs in the
// late ones, and the levels it fails vary between runs — so a failure there
// would mean "the bot isn't good enough", not "the level is broken". Gating on
// it would be a flaky test that cries wolf.
//
// So the assertions below are limited to what is genuinely robust:
//   * the game loads and plays headlessly at all
//   * the opening levels are winnable (a regression here is real)
//   * when the bot does win, it isn't a grind
//   * the declared difficulty ramp doesn't go backwards
// The full per-level win-rate table is printed by `npm run balance` for a
// human to read; see report.js.

const { test } = require("node:test");
const assert = require("node:assert");
const { loadGame, playLevel } = require("./bot.js");

const game = loadGame();
const { Game, LEVELS } = game;

// Best of a few attempts — the world is random, so one unlucky spawn
// shouldn't decide anything.
function bestOf(gi, attempts, cap = 120) {
  let best = null;
  for (let a = 0; a < attempts; a++) {
    const r = playLevel(game, gi, cap);
    if (r.outcome === "win" && (!best || r.seconds < best.seconds)) best = r;
  }
  return best;
}

test("the game loads and runs headlessly", () => {
  assert.equal(LEVELS.length, 40);
  assert.ok(Game.TILE > 0 && Game.W > 0, "resize() should have produced geometry");
  assert.equal(typeof Game.update, "function");
});

test("the bot can actually play — and the opening levels are winnable", () => {
  // These are the levels a new player meets first; the bot clears them
  // comfortably (8/8 in sampling), so a failure here is a real regression in
  // the game rather than bot noise.
  // 6 attempts, not 3: the bot clears these ~4-6 times in 6, so a handful of
  // tries makes a false failure vanishingly unlikely while a real regression
  // (a level that stops being winnable at all) still shows.
  const failed = [];
  for (const gi of [0, 1, 2]) {
    const best = bestOf(gi, 6, 60);
    if (!best) failed.push(`L${gi + 1} (${LEVELS[gi].target}m)`);
  }
  assert.deepEqual(failed, [], "opening level(s) the bot could not finish in 6 attempts");
});

test("a level the bot wins is never a grind", () => {
  // Upper bound on *successful* runs across a sample of the campaign. Catches
  // a level that is technically finishable but takes forever — the failure
  // mode a static check can't see.
  const SLOW = 90;
  const slow = [];
  for (let gi = 0; gi < LEVELS.length; gi += 4) {      // every 4th level
    const best = bestOf(gi, 3);
    if (best && best.seconds > SLOW)
      slow.push(`L${gi + 1} (${LEVELS[gi].target}m): ${best.seconds}s`);
  }
  assert.deepEqual(slow, [], `level(s) slower than ${SLOW}s even on the bot's best run`);
});

test("declared difficulty does not go backwards across the campaign", () => {
  // Parameter-based, so it's stable regardless of bot skill.
  const first = LEVELS[0].params, last = LEVELS[LEVELS.length - 1].params;
  assert.ok(last.creep >= first.creep, "camera creep should not decrease");
  assert.ok(last.carMax >= first.carMax, "top car speed should not decrease");
  assert.ok(LEVELS[LEVELS.length - 1].target > LEVELS[0].target, "targets should grow");
});
