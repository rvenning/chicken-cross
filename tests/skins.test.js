"use strict";
// Avatar-skin checks.
//
// The skins are data + two painters, and both failure modes here are SILENT:
// a skin that names a body plan nobody paints just falls back to the stock
// bird, and a missing colour field leaves ctx.fillStyle at whatever the last
// shape set it to, so the wing quietly paints in body colour. Neither throws,
// neither shows up in a balance run, and both look "nearly right" in a
// screenshot. So they get asserted instead.
//
// The reduced-motion check is here rather than in the browser because there is
// no viewport emulation for prefers-reduced-motion; Art.motion is the one flag
// the whole art layer multiplies by, so setting it is the whole test.

const { test } = require("node:test");
const assert = require("node:assert");
const { loadGame } = require("./bot.js");

const { sandbox } = loadGame();
const { SKINS, Art } = sandbox;
const FLAMINGO = "\u{1F9A9}";

// Which fields each painter actually reads. Kept as data so adding a skin
// field means updating one list, not hunting through the painter.
const SHARED = ["body", "shade", "beak", "legs"];
const BY_PLAN = {
  flamingo: ["body", "shade", "beak", "beakTip", "legs", "head", "wing"],
};
const PLANS = Object.keys(BY_PLAN);

test("every skin declares a body plan something actually paints", () => {
  for (const [key, sk] of Object.entries(SKINS)) {
    if (sk.plan === undefined) continue;
    assert.ok(PLANS.includes(sk.plan),
      `${key} asks for plan "${sk.plan}", which no painter handles`);
  }
  // and the painters it names all exist
  for (const plan of PLANS) {
    const fn = "bird" + plan[0].toUpperCase() + plan.slice(1);
    assert.equal(typeof Art[fn], "function", `Art.${fn} is missing`);
  }
});

test("every skin carries the colours its painter reads", () => {
  for (const [key, sk] of Object.entries(SKINS)) {
    const needed = sk.plan ? BY_PLAN[sk.plan] : SHARED;
    for (const field of needed) {
      assert.equal(typeof sk[field], "string",
        `${key} is missing "${field}", which its painter paints with`);
    }
  }
});

// A canvas context that records the path coordinates and swallows the rest.
function recorder() {
  const pts = [];
  const noop = () => {};
  return {
    pts,
    save: noop, restore: noop, clip: noop, beginPath: noop, closePath: noop,
    fill: noop, stroke: noop, fillRect: noop, translate: noop, rotate: noop,
    scale: noop, arc: noop, ellipse: noop, quadraticCurveTo: noop,
    bezierCurveTo: noop, drawImage: noop,
    moveTo(x, y) { pts.push(["moveTo", x, y]); },
    lineTo(x, y) { pts.push(["lineTo", x, y]); },
  };
}

// Drive the real painter at a known idle time and read back where the tucked
// leg's foot ended up. s=1 so the numbers are the painter's own units.
function footY(idleSeconds) {
  const ctx = recorder();
  Art.birdFlamingo(ctx, 1, SKINS[FLAMINGO], { dead: false, idle: idleSeconds });
  // the far leg is drawn first: moveTo(hip), lineTo(knee), lineTo(foot)
  return ctx.pts[2][2];
}

test("the flamingo's tuck eases, and snaps instead under reduced motion", () => {
  const setRM = (on) => { Art.motion = on ? 0 : 1; };

  setRM(false);
  const down = footY(0.0), mid = footY(0.87), up = footY(3.0);
  assert.ok(down > mid && mid > up,
    `mid-tuck should sit between the endpoints, got ${down} / ${mid} / ${up}`);

  setRM(true);
  assert.equal(footY(0.87), footY(3.0), "reduced motion should snap to tucked");
  assert.equal(footY(0.0), down, "reduced motion should still start untucked");

  setRM(false);
});

test("the tucked leg stays hidden behind the body", () => {
  const ctx = recorder();
  Art.birdFlamingo(ctx, 1, SKINS[FLAMINGO], { dead: false, idle: 3 });
  // body ellipse spans y -0.435..-0.085; a folded foot poking below that shows
  const [, , kneeY] = ctx.pts[1];
  const [, , foot] = ctx.pts[2];
  assert.ok(foot < -0.085, `tucked foot at ${foot} hangs below the body`);
  assert.ok(kneeY < -0.085, `tucked knee at ${kneeY} hangs below the body`);
});
