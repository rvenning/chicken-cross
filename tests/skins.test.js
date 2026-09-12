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
// field means updating one list, not hunting through the painter. Every skin
// has a plan now, so there is no shared fallback to list.
const CORE = ["body", "shade", "beak", "legs"];
const BY_PLAN = {
  chicken:  CORE.concat(["comb", "wattle"]),
  rooster:  CORE.concat(["comb", "wattle", "tail"]),
  chick:    CORE,                                  // tuft and shell are optional
  duck:     CORE.concat(["head", "ring"]),
  penguin:  CORE.concat(["belly"]),
  owl:      CORE.concat(["disc", "tufts"]),
  flamingo: CORE.concat(["beakTip", "head", "wing"]),
  parrot:   CORE.concat(["tuft", "wing", "tail"]),
  peacock:  CORE.concat(["head", "tail", "crown"]),
  swan:     CORE.concat(["mask"]),
  dove:     CORE,
};
const PLANS = Object.keys(BY_PLAN);

test("every skin declares a body plan something actually paints", () => {
  for (const [key, sk] of Object.entries(SKINS)) {
    assert.ok(sk.plan, `${key} has no body plan -- it would paint as nothing`);
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
    const needed = BY_PLAN[sk.plan];
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

// A recorder that tracks the extent of every path coordinate, so the
// legibility budget is asserted rather than eyeballed.
//
// Checked against the real thing: every one of the twelve agrees with the
// painted pixels (measured with getImageData in the browser) to within
// 0.004s, because these birds are built from ellipses and short quadratics
// whose control points sit close to the curve. Tallest is the flamingo at
// -1.000s against a -1.380s ceiling; widest is the peacock at 1.321s in a
// 2.000s column.
//
// The two things it is here to catch are a new bird with a crest that covers
// the lane above, and one with a tail that hides the column beside it.
function bounds() {
  const b = { top: 1e9, bottom: -1e9, left: 1e9, right: -1e9 };
  const noop = () => {};
  // Anything drawn inside a clip is bounded by the clip path, which was
  // already recorded when it was traced -- so stop recording until the
  // matching restore(). Without this the flamingo reads as two tiles tall,
  // because its black bill tip is a huge rect clipped to the bill outline.
  let clipped = 0;
  const stack = [];
  const hit = (x, y) => {
    if (clipped || !isFinite(x) || !isFinite(y)) return;
    if (y < b.top) b.top = y;
    if (y > b.bottom) b.bottom = y;
    if (x < b.left) b.left = x;
    if (x > b.right) b.right = x;
  };
  const ctx = {
    b,
    save: () => stack.push(clipped),
    restore: () => { clipped = stack.length ? stack.pop() : 0; },
    clip: () => { clipped++; },
    beginPath: noop, closePath: noop,
    fill: noop, stroke: noop, drawImage: noop, scale: noop, rotate: noop,
    translate: noop,
    moveTo: hit, lineTo: hit,
    quadraticCurveTo: (cx, cy, x, y) => { hit(cx, cy); hit(x, y); },
    bezierCurveTo: (a, c, d, e, x, y) => { hit(a, c); hit(d, e); hit(x, y); },
    arc: (x, y, r) => { hit(x - r, y - r); hit(x + r, y + r); },
    // rr() in js/util.js builds its rounded rect out of arcTo
    arcTo: (x1, y1, x2, y2) => { hit(x1, y1); hit(x2, y2); },
    ellipse: (x, y, rx, ry) => { hit(x - rx, y - ry); hit(x + rx, y + ry); },
    rect: (x, y, w, h) => { hit(x, y); hit(x + w, y + h); },
    fillRect: (x, y, w, h) => { hit(x, y); hit(x + w, y + h); },
  };
  return ctx;
}

// A car in the lane above has its lower edge at -0.69 tiles = -1.38s, and the
// playfield column the bird stands in is 2s wide. Both are properties of the
// game, not of the art, which is why they are the numbers asserted here.
const CEILING = -1.38;
const HALF_TILE = 1.0;

// Measured at a realistic size and normalised, NOT at s=1: the pen's rim is
// Math.max(0.8, s * 0.038), and at s=1 that 0.8px floor is most of the bird,
// which reported the chicken as two and a half tiles wide.
const MEASURE_S = 200;

test("no bird pokes into the lane above, or out of its own column", () => {
  for (const [key, sk] of Object.entries(SKINS)) {
    const ctx = bounds();
    Art.bird(ctx, MEASURE_S, sk, { dead: false, idle: 3 });
    const b = ctx.b;
    for (const k of Object.keys(b)) b[k] /= MEASURE_S;
    assert.ok(b.top > CEILING,
      `${key} (${sk.plan}) reaches ${b.top.toFixed(3)}s, into the car band at ${CEILING}s`);
    assert.ok(b.left > -HALF_TILE && b.right < HALF_TILE,
      `${key} (${sk.plan}) spans ${b.left.toFixed(3)}..${b.right.toFixed(3)}s, past its own column`);
    // and it has to actually be on the ground, not hovering
    assert.ok(b.bottom > 0.3, `${key} (${sk.plan}) stops at ${b.bottom.toFixed(3)}s, short of the ground`);
  }
});

test("every plan paints without throwing, alive and dead", () => {
  for (const [key, sk] of Object.entries(SKINS)) {
    for (const dead of [false, true]) {
      for (const idle of [0, 0.9, 4]) {
        assert.doesNotThrow(() => Art.bird(bounds(), 200, sk, { dead, idle }),
          `${key} threw with dead=${dead} idle=${idle}`);
      }
    }
  }
});
