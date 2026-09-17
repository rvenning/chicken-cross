"use strict";
// Settings: the classic look and the character picker.
//
// The classic renderer is the pre-design-pass code kept alive beside the new
// one, and nothing else exercises it -- the bots never draw. So it gets drawn
// here, every world and every bird, against a canvas that accepts anything.

const { test } = require("node:test");
const assert = require("node:assert");
const { loadGame } = require("./bot.js");

const { Game, App, LEVELS, sandbox } = loadGame();
const { LEGACY_DRAW, LEGACY_SKINS, SKINS, mergeProgress } = sandbox;

// A 2D context where every method exists and returns something that also
// accepts any call (gradients need addColorStop, measureText needs .width).
function anyCtx() {
  const fn = () => proxy;
  const proxy = new Proxy(fn, { get: (t, k) => (k === "width" ? 10 : proxy), set: () => true });
  return proxy;
}

test("setLook swaps the painters both ways", () => {
  const modernRender = Game.render, modernChick = Game.drawChick;
  Game.setLook("classic");
  assert.strictEqual(Game.render, LEGACY_DRAW.render);
  assert.strictEqual(Game.drawChick, LEGACY_DRAW.drawChick);
  Game.setLook("new");
  assert.strictEqual(Game.render, modernRender);
  assert.strictEqual(Game.drawChick, modernChick);
  assert.strictEqual(Game.drawTree, undefined, "classic-only helpers are removed again");
  Game.setLook("nonsense");
  assert.strictEqual(Game.look, "new");
});

test("both looks have a skin for every bird in the picker", () => {
  for (const k of Object.keys(SKINS)) assert.ok(LEGACY_SKINS[k], `classic look has no ${k}`);
});

test("the classic look draws every world and every bird, alive and dead", () => {
  Game.ctx = anyCtx();
  Game.setLook("classic");
  try {
    for (let wi = 0; wi < LEVELS.length; wi += 4) {
      for (const bird of Object.keys(LEGACY_SKINS)) {
        Game.begin({ mode: "level", level: LEVELS[wi], target: LEVELS[wi].target, params: LEVELS[wi].params });
        Game.progress.bird = bird;
        for (let i = 0; i < 20; i++) Game.update(1 / 60);
        assert.doesNotThrow(() => Game.render(), `world ${wi / 4} ${bird}`);
        Game.dead = true; Game.deathReason = "water";
        assert.doesNotThrow(() => Game.render(), `world ${wi / 4} ${bird} drowning`);
      }
    }
  } finally { Game.setLook("new"); }
});

test("the chosen bird wins over the profile avatar", () => {
  Game.profile = { id: "x", avatar: "\u{1F414}" };
  Game.progress = { bird: "\u{1F427}" };
  assert.strictEqual(Game.bird(), "\u{1F427}");
  Game.progress = {};
  assert.strictEqual(Game.bird(), "\u{1F414}");
});

test("sync keeps the newer copy's look and bird, and the best of the rest", () => {
  const a = { coins: 5, best: 30, levels: {}, updated: 100, look: "classic", bird: "\u{1F9A9}" };
  const b = { coins: 9, best: 10, levels: {}, updated: 200, look: "new" };
  const m = mergeProgress(a, b);
  assert.strictEqual(m.look, "new");
  assert.strictEqual(m.bird, "\u{1F9A9}", "an unset field falls back to the older copy");
  assert.strictEqual(m.coins, 9);
  assert.strictEqual(m.best, 30);
  assert.deepStrictEqual(mergeProgress(b, a), m);
});
