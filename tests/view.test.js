"use strict";
// Settings: the 2D/3D view.
//
// The 3D renderer needs WebGL, so nothing here draws a frame. What CAN be
// checked headlessly is the one place the view reaches into the rules: how far
// the hazards loop past the playfield (Game.extC). The angled camera sees round
// the corners, so if that number is too small a car pops into view mid-screen.
// The test below projects the screen's corners through the same camera
// independently and checks nothing that wraps can ever be on screen.

const { test } = require("node:test");
const assert = require("node:assert");
const { loadGame, playLevel } = require("./bot.js");

const game = loadGame();
const { Game, sandbox } = game;
const { R3, mergeProgress } = sandbox;
const COLS = 9;

// Size the game as if the window were W x H, the way resize() would.
function sizeTo(W, H) {
  Game.W = W; Game.H = H;
  Game.TILE = Math.min(W / COLS, H / 11);
  Game.X0 = (W - COLS * Game.TILE) / 2;
  Game.extC = Game.X0 / Game.TILE + 1.2;
  if (Game.view === "3d") Game.extC = Math.max(Game.extC, R3.extFor(W, H, Game.TILE));
}

// Furthest column from the playfield centre the camera can see, at ground
// level and at roof height, found by casting a ray from each screen corner.
function visibleReach(W, H) {
  const G = { W, H, TILE: Game.TILE, BASE_Y: Game.BASE_Y, camRow: 20 };
  const f = R3.frame3(G), P = f.P, th = R3.PITCH, ph = R3.YAW;
  const tx = R3.shiftFor(H, P, G.TILE, G.BASE_Y), tz = -f.anchor;
  const back = [Math.sin(ph) * Math.cos(th), Math.sin(th), Math.cos(ph) * Math.cos(th)];
  const right = [Math.cos(ph), 0, -Math.sin(ph)];
  const up = [ // back x right
    back[1] * right[2] - back[2] * right[1],
    back[2] * right[0] - back[0] * right[2],
    back[0] * right[1] - back[1] * right[0],
  ];
  let reach = 0;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const hgt of [0, 1]) {
    const a = sx * W / (2 * P), b = sy * H / (2 * P);
    const o = [tx + right[0] * a + up[0] * b, right[1] * a + up[1] * b, tz + right[2] * a + up[2] * b];
    const t = (o[1] - hgt) / back[1];      // walk along -back to height hgt
    const x = o[0] - back[0] * t;
    reach = Math.max(reach, Math.abs(x));
  }
  return reach;
}

const SCREENS = [[390, 844], [768, 1024], [820, 1180], [1024, 768], [1366, 1024], [1920, 1080], [2560, 1080]];

test("a car never wraps where the 3D camera can see it", () => {
  Game.view = "3d";
  try {
    for (const [W, H] of SCREENS) {
      sizeTo(W, H);
      // A car wraps once its centre is extC past the playfield edge; its near
      // end (a truck is 0.9 either side) must still be off screen by then.
      const wrapsAt = COLS / 2 + Game.extC - 0.9 - 0.5;
      const seen = visibleReach(W, H);
      assert.ok(seen <= wrapsAt, `${W}x${H}: camera sees ${seen.toFixed(2)} tiles out, cars wrap at ${wrapsAt.toFixed(2)}`);
    }
  } finally { Game.view = "2d"; sizeTo(390, 844); }
});

test("setView switches the view and only 3D widens the loop", () => {
  Game.setView("2d");
  const flat = Game.extC;
  Game.setView("3d");
  assert.strictEqual(Game.view, "3d");
  assert.ok(Game.extC > flat, "3D loops further out");
  Game.setView("nonsense");
  assert.strictEqual(Game.view, "2d");
  assert.strictEqual(Game.extC, flat);
});

test("the opening levels are still winnable with the 3D loop width", () => {
  Game.setView("3d");
  try {
    for (const gi of [0, 1]) {
      let won = false;
      for (let a = 0; a < 4 && !won; a++) won = playLevel(game, gi, 120).outcome === "win";
      assert.ok(won, `level ${gi + 1} not cleared in 4 tries`);
    }
  } finally { Game.setView("2d"); }
});

test("sync keeps the newer copy's view", () => {
  const a = { coins: 0, best: 0, levels: {}, updated: 100, view: "3d" };
  const b = { coins: 0, best: 0, levels: {}, updated: 200, view: "2d" };
  assert.strictEqual(mergeProgress(a, b).view, "2d");
  assert.strictEqual(mergeProgress(a, { ...b, view: undefined }).view, "3d");
});
