// What things look like.
//
// TWO RULES, and they are what keep this file honest:
//
//   1. Nothing here may move an entity or change a number the engine reads.
//      Positions come from js/game.js; decoration comes from a positional hash,
//      so every device draws the same world and the seeded bots replay exactly.
//   2. The static parts are painted once and blitted. A lane's ground never
//      changes, so it is baked to an offscreen strip and drawn with one
//      drawImage -- which is what pays for the texture being any good.
//
// THE LEGIBILITY BUDGET. The player answers one question over and over: can I
// hop into that row right now? On a grass lane the answer depends on which
// columns are BLOCKED, and blocked means lane.trees -- so trees and rocks are
// gameplay objects, not scenery. Everything decorative in here must therefore
// be impossible to mistake for one:
//
//      an obstacle is UPRIGHT, casts a shadow, and carries the dark rim
//      decoration is FLAT, low contrast, and does none of those three
//
// If a new decor function ever grows a shadow or a rim, it has stopped being
// decoration and the player will start walking around it.
"use strict";

const Art = {
  // One number everything that moves multiplies by; 0 is the reduced-motion
  // world. See applyMotion() in js/render.js.
  motion: 1,

  /* ------------------------------------------------------------ palettes */
  // Extends the world's existing `theme` rather than replacing it: the theme
  // keeps owning the five colours the game already shipped with, and this adds
  // the materials and the LITTER. Colour alone is a recolour -- what makes
  // Desert Dash somewhere else is cacti and sand ripples, not a browner green.
  pal(wi) {
    return ART_WORLDS[Math.max(0, Math.min(ART_WORLDS.length - 1, wi | 0))];
  },
};

// Each world: what grows on it, what litters it, what the rocks are made of.
// `tree` and `rock` name the SOLID obstacle species -- see the budget above.
const ART_WORLDS = [
  { // 0 Sunny Meadows
    tree: "broadleaf", rock: "boulder",
    canopy: "#4aa544", canopy2: "#5cb955", trunk: "#7a4a1e",
    rockA: "#a8afb5", rockB: "#c2c8cd",
    decor: [["tuft", 26, 1], ["tuft", 44, 0.55], ["clover", 12, 1], ["flower", 9, 1]],
    litter: "#8fd36a", soil: "#5d9c3f",
    mote: { color: "rgba(255,250,190,0.55)", n: 10, rise: -6, drift: 14, size: 1.6 },
  },
  { // 1 Busy City -- mown verges, kerbside litter
    tree: "clipped", rock: "bollard",
    canopy: "#4f9e52", canopy2: "#61b063", trunk: "#6d5844",
    rockA: "#b9bec4", rockB: "#d6dade",
    decor: [["mow", 4, 1], ["tuft", 30, 0.6], ["pebble", 14, 0.8]],
    litter: "#9ad6a2", soil: "#5f9463",
    mote: { color: "rgba(226,236,246,0.4)", n: 7, rise: -3, drift: 22, size: 1.4 },
  },
  { // 2 Rushing River -- lush and wet
    tree: "willow", rock: "boulder",
    canopy: "#3f9440", canopy2: "#55ab52", trunk: "#6b4a26",
    rockA: "#9aa4a8", rockB: "#b8c1c4",
    decor: [["tuft", 30, 1.1], ["tuft", 48, 0.55], ["reed", 14, 1], ["clover", 10, 0.9]],
    litter: "#83cf63", soil: "#4e9138",
    mote: { color: "rgba(210,240,255,0.5)", n: 12, rise: -4, drift: 18, size: 1.5 },
  },
  { // 3 Frozen Tracks -- snow, and everything under it
    tree: "fir", rock: "ice",
    canopy: "#2f6b4f", canopy2: "#3c7f5e", trunk: "#5b4634",
    rockA: "#9fd2e6", rockB: "#cdeaf5",
    decor: [["drift", 22, 1.3], ["drift", 14, 0.7], ["crystal", 16, 1], ["pebble", 8, 0.7]],
    litter: "#eaf6fb", soil: "#b6d8e4",
    mote: { color: "rgba(255,255,255,0.75)", n: 16, rise: 8, drift: 10, size: 2 },
  },
  { // 4 Rush Hour -- late afternoon, dry verges
    tree: "hedge", rock: "boulder",
    canopy: "#3c6b32", canopy2: "#4a7d3e", trunk: "#5e4526",
    rockA: "#8b9196", rockB: "#a6adb2",
    decor: [["tuft", 24, 0.9], ["tuft", 40, 0.5], ["pebble", 12, 0.9]],
    litter: "#6f9c58", soil: "#40632f",
    mote: { color: "rgba(255,214,150,0.42)", n: 9, rise: -5, drift: 16, size: 1.6 },
  },
  { // 5 Night Roads -- fireflies do the work here, and headlights carry
    night: true,
    tree: "broadleaf", rock: "boulder",
    canopy: "#2c5730", canopy2: "#36683a", trunk: "#4a3722",
    rockA: "#6b7278", rockB: "#828a90",
    decor: [["tuft", 22, 0.95], ["tuft", 36, 0.5], ["clover", 8, 0.9]],
    litter: "#4c7a45", soil: "#2d4c2a",
    mote: { color: "rgba(190,255,150,0.85)", n: 12, rise: -3, drift: 9, size: 2.1, glow: true },
  },
  { // 6 Desert Dash -- cacti, not trees
    tree: "cactus", rock: "sandstone",
    canopy: "#4e9a57", canopy2: "#5fae67", trunk: "#3f7d47",
    rockA: "#c49a5e", rockB: "#dfb87c",
    decor: [["ripple", 20, 1], ["pebble", 18, 0.9], ["scrub", 10, 1]],
    litter: "#e8cd84", soil: "#bb9a4f",
    mote: { color: "rgba(255,236,180,0.40)", n: 8, rise: -2, drift: 26, size: 1.5 },
  },
  { // 7 Jungle Rapids -- palms and leaf litter
    tree: "palm", rock: "boulder",
    canopy: "#3f9236", canopy2: "#52a844", trunk: "#7d5c33",
    rockA: "#7f8a76", rockB: "#9aa690",
    decor: [["leaf", 20, 1], ["tuft", 34, 0.9], ["tuft", 46, 0.5], ["reed", 8, 0.9]],
    litter: "#6fbb4f", soil: "#3c7a30",
    mote: { color: "rgba(220,255,190,0.45)", n: 12, rise: -6, drift: 12, size: 1.7 },
  },
  { // 8 Grand Central -- scrubby railway land
    tree: "poplar", rock: "boulder",
    canopy: "#5c8f4a", canopy2: "#6da05a", trunk: "#6f5738",
    rockA: "#9b9a90", rockB: "#b5b4aa",
    decor: [["tuft", 26, 0.85], ["tuft", 40, 0.5], ["pebble", 16, 0.9], ["scrub", 8, 0.9]],
    litter: "#a3bf87", soil: "#6d8a58",
    mote: { color: "rgba(240,236,214,0.38)", n: 8, rise: -3, drift: 20, size: 1.4 },
  },
  { // 9 Volcano Finale -- ash, and cracks that glow
    night: true,
    tree: "stump", rock: "obsidian",
    canopy: "#5a4038", canopy2: "#6b4d42", trunk: "#43302a",
    rockA: "#2f2730", rockB: "#4a3f4c",
    decor: [["crack", 14, 1], ["pebble", 16, 0.9], ["ash", 22, 1]],
    litter: "#8a7166", soil: "#5a453c",
    mote: { color: "rgba(255,160,80,0.75)", n: 14, rise: -14, drift: 8, size: 1.8, glow: true },
  },
];

/* ------------------------------------------------------ drawing primitives */

// Rounded-rect path that does NOT call beginPath, so it can be the second
// subpath of an even-odd clip. rr() in js/util.js is the one that does.
function rrPath(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);         ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

Object.assign(Art, {
  rrPath,

  /* --- soft blobs -------------------------------------------------------
     Every glow, light pool, cloud shadow and soft shadow in the game is this
     one 128x128 image drawn at some size. createRadialGradient per frame is
     the thing it replaces.

     The cache is keyed by COLOUR STRING, so a call site must only ever pass a
     constant -- build "rgba(0,0,0,0.3)" with a per-frame alpha in it and every
     frame mints and keeps another canvas, with no visible symptom until a
     device runs out of memory. Vary intensity with ctx.globalAlpha instead.
     The cap is a backstop for that mistake, not a design. */
  _blobs: new Map(),
  _blob(color) {
    let c = this._blobs.get(color);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, color);
    rg.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    if (this._blobs.size > 24) this._blobs.clear();
    this._blobs.set(color, c);
    return c;
  },
  blob(ctx, x, y, rx, ry, color, alpha) {
    const img = this._blob(color);
    if (alpha !== undefined) { ctx.save(); ctx.globalAlpha = alpha; }
    ctx.drawImage(img, x - rx, y - ry, rx * 2, ry * 2);
    if (alpha !== undefined) ctx.restore();
  },

  // Soft-edged, never a crisp ellipse: a hard dark oval under a thing reads as
  // a hole in the ground rather than a shadow on it. Offset down-right, since
  // every lane is lit from above-left.
  shadow(ctx, x, y, rx, ry, alpha) {
    this.blob(ctx, x + rx * 0.10, y + ry * 0.25, rx, ry, "rgba(20,26,16,0.42)", alpha === undefined ? 1 : alpha);
  },

  /* --- the shared pen ---------------------------------------------------
     One edge treatment for every solid thing in the game, so a car, a tree and
     a rock look like one illustrator drew them. Obstacles and vehicles use it;
     decoration must not (see the budget at the top of this file). */
  rim(body) { return GK.util.shade(body, -58); },
  lit(body) { return GK.util.shade(body, 34); },

  // Fill a rounded rect with the rim under it and a top highlight over it.
  solidRect(ctx, x, y, w, h, r, body, lw) {
    const L = lw === undefined ? Math.max(1, h * 0.06) : lw;
    ctx.fillStyle = this.rim(body);
    rr(ctx, x - L, y - L, w + L * 2, h + L * 2, r + L); ctx.fill();
    ctx.fillStyle = body;
    rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    rr(ctx, x + r * 0.4, y + h * 0.06, w - r * 0.8, h * 0.30, Math.min(r, h * 0.15)); ctx.fill();
  },

  // Same, for a blob-shaped mass (canopies, rocks).
  solidEllipse(ctx, x, y, rx, ry, body, rot) {
    const L = Math.max(1, rx * 0.08);
    ctx.fillStyle = this.rim(body);
    ctx.beginPath(); ctx.ellipse(x, y, rx + L, ry + L, rot || 0, 0, 7); ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.17)";
    ctx.beginPath(); ctx.ellipse(x - rx * 0.18, y - ry * 0.34, rx * 0.62, ry * 0.42, rot || 0, 0, 7); ctx.fill();
  },
});

/* ------------------------------------------------------- the baked ground */
// A lane's ground never changes, so the expensive part -- a few hundred
// scattered tufts, ripples, speckles and cracks -- is painted once into an
// offscreen strip and blitted. Four variants per (world, lane type), picked by
// row, because one baked strip repeated down the screen reads as wallpaper.
//
// The cache is bounded by construction: 4 types x 4 variants = 16 strips, and
// the whole map is dropped when the geometry generation changes (resize, or a
// new world). Nothing accumulates.

const STRIP_VARIANTS = 4;

Object.assign(Art, {
  _strips: new Map(),
  _gen: "",

  // Called by the renderer whenever geometry or world might have moved.
  ensure(wi, theme, W, TILE, DPR) {
    const gen = wi + "|" + Math.round(W) + "x" + Math.round(TILE) + "|" + DPR;
    if (gen === this._gen) return;
    this._gen = gen;
    this._strips.clear();
    this._geo = { wi, theme, W, TILE, DPR };
  },

  strip(type, variant) {
    const key = type + variant;
    let c = this._strips.get(key);
    if (c) return c;
    const { wi, theme, W, TILE, DPR } = this._geo;
    const H = Math.ceil(TILE) + 2;
    c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(W * DPR));
    c.height = Math.max(1, Math.round(H * DPR));
    const g = c.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Every strip is drawn in the same logical coordinates the game uses, so
    // it lines up when blitted at the lane's top edge.
    GROUND[type](g, W, TILE, this.pal(wi), theme, variant);
    this._strips.set(key, c);
    return c;
  },

  // Blit the ground for one lane. `row` picks the variant, so the same row
  // always gets the same ground and the world is stable as the camera scrolls.
  ground(ctx, type, row, top, W, TILE) {
    const v = Math.floor(GK.util.hash2(row, 7) * STRIP_VARIANTS) % STRIP_VARIANTS;
    const h = Math.ceil(TILE) + 2;
    if (GK.util.hash2(row, 29) < 0.5) {
      ctx.drawImage(this.strip(type, v), 0, top, W, h);
    } else {
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
      ctx.drawImage(this.strip(type, v), 0, top, W, h);
      ctx.restore();
    }
  },
});

// A stable per-strip hash: same world, same variant, same speck positions on
// every device. Salted per (variant, decor index) so two decor kinds with the
// same count never land on top of each other.
function strand(variant, d, i, k) {
  return GK.util.hash2((variant + 1) * 7919 + (d + 1) * 1013 + i * 17 + k * 7, 53 + k * 11);
}

const GROUND = {
  grass(g, W, T, A, th, v) {
    // base: the world's two greens, top to bottom, so a lane has a light edge
    const grad = g.createLinearGradient(0, 0, 0, T);
    grad.addColorStop(0, v % 2 ? th.grassB : th.grassA);
    grad.addColorStop(1, GK.util.shade(v % 2 ? th.grassB : th.grassA, -9));
    g.fillStyle = grad; g.fillRect(0, 0, W, T + 2);
    // a wide soft tonal patch or two, so the field isn't one flat wash
    for (let i = 0; i < 3; i++) {
      Art.blob(g, strand(v, 90, i, 1) * W, T * (0.25 + strand(v, 90, i, 2) * 0.5),
               T * (1.1 + strand(v, 90, i, 3)), T * 0.5, "rgba(255,255,255,0.055)");
    }
    // the lit top edge: where the light catches the lip of the row
    g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, 0, W, Math.max(1.5, T * 0.035));
    g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(0, T - Math.max(1, T * 0.02), W, T * 0.02 + 2);
    scatter(g, W, T, A, v);
  },

  road(g, W, T, A, th, v) {
    const grad = g.createLinearGradient(0, 0, 0, T);
    grad.addColorStop(0, GK.util.shade(th.road, 6));
    grad.addColorStop(0.5, th.road);
    grad.addColorStop(1, GK.util.shade(th.road, -7));
    g.fillStyle = grad; g.fillRect(0, 0, W, T + 2);
    // tarmac speckle -- two sizes, quiet, so it reads as a surface not as grit
    for (let i = 0; i < 150; i++) {
      const x = strand(v, 11, i, 1) * W, y = T * (0.06 + strand(v, 11, i, 2) * 0.88);
      const s = Math.max(0.6, T * (0.006 + strand(v, 11, i, 3) * 0.016));
      g.fillStyle = strand(v, 11, i, 4) > 0.5 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.07)";
      g.fillRect(x, y, s, s);
    }
    // a couple of resurfacing patches, very low contrast
    for (let i = 0; i < 2; i++) {
      g.fillStyle = "rgba(255,255,255,0.030)";
      rr(g, strand(v, 12, i, 1) * W, T * 0.14, T * (1.4 + strand(v, 12, i, 2) * 2), T * 0.72, T * 0.1);
      g.fill();
    }
    // kerbs: a bright lip at the top edge and a shadowed one at the bottom, so
    // a road reads as sunk between its verges rather than painted onto them
    g.fillStyle = "rgba(0,0,0,0.30)"; g.fillRect(0, 0, W, Math.max(2, T * 0.055));
    g.fillStyle = "rgba(255,255,255,0.09)"; g.fillRect(0, Math.max(2, T * 0.055), W, Math.max(1, T * 0.018));
    g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(0, T - Math.max(2, T * 0.05), W, T * 0.05 + 2);
    // centre line
    g.fillStyle = "rgba(255,255,255,0.52)";
    for (let x = 0; x < W + T; x += T) rr(g, x + T * 0.25, T * 0.5 - Math.max(1.5, T * 0.028), T * 0.4, Math.max(3, T * 0.055), 2), g.fill();
  },

  water(g, W, T, A, th, v) {
    // Only the still part is baked; the shimmer and the sparkle are live, in
    // js/render.js, because they have to move with the current.
    const grad = g.createLinearGradient(0, 0, 0, T);
    grad.addColorStop(0, GK.util.shade(th.water, -16));
    grad.addColorStop(0.35, th.water);
    grad.addColorStop(1, GK.util.shade(th.water, 9));
    g.fillStyle = grad; g.fillRect(0, 0, W, T + 2);
    // the far bank's shadow falling on the water, and the shallows below
    g.fillStyle = "rgba(0,0,30,0.13)"; g.fillRect(0, 0, W, T * 0.16);
    g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(0, T * 0.82, W, T * 0.18 + 2);
  },

  rail(g, W, T, A, th, v) {
    // ballast
    g.fillStyle = "#5a5148"; g.fillRect(0, 0, W, T + 2);
    for (let i = 0; i < 220; i++) {
      const x = strand(v, 21, i, 1) * W, y = T * (0.04 + strand(v, 21, i, 2) * 0.92);
      const s = Math.max(0.7, T * (0.008 + strand(v, 21, i, 3) * 0.022));
      const k = strand(v, 21, i, 4);
      g.fillStyle = k > 0.66 ? "rgba(255,255,255,0.10)" : k > 0.33 ? "rgba(0,0,0,0.14)" : "rgba(180,150,110,0.10)";
      g.fillRect(x, y, s, s);
    }
    g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(0, 0, W, Math.max(2, T * 0.05));
    // sleepers, then the rails over them
    for (let x = 0; x < W + T; x += T * 0.5) {
      const jitter = (GK.util.hash2(Math.round(x), 31 + v) - 0.5) * T * 0.02;
      g.fillStyle = "#6f6458"; rr(g, x + 4, T * 0.14 + jitter, T * 0.32, T * 0.72, 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x + 4, T * 0.14 + jitter + T * 0.66, T * 0.32, Math.max(1, T * 0.05));
    }
    for (const ry of [0.3, 0.66]) {
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, T * ry + Math.max(1.5, T * 0.03), W, Math.max(2, T * 0.05));
      g.fillStyle = "#b9bfc4"; g.fillRect(0, T * ry, W, Math.max(2.5, T * 0.055));
      g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(0, T * ry, W, Math.max(1, T * 0.018));
    }
  },
};

/* ------------------------------------------------------------------ decor */
// Flat, quiet, 0.2-0.5 alpha. None of it has a shadow or a rim, because those
// two things are what tell the player a square is blocked. If you find
// yourself wanting to make a decor item read more strongly, it is competing
// with the gameplay and the answer is fewer of them, not louder ones.

function scatter(g, W, T, A, v) {
  A.decor.forEach(([kind, count, scale], d) => {
    const fn = DECOR[kind];
    if (!fn) return;
    for (let i = 0; i < count; i++) {
      const x = strand(v, d, i, 1) * W;
      const y = T * (0.10 + strand(v, d, i, 2) * 0.82);
      const s = T * scale * 0.13 * (0.72 + strand(v, d, i, 3) * 0.62);
      fn(g, x, y, s, (k) => strand(v, d, i, 4 + k), A);
    }
  });
}

const DECOR = {
  // two or three blades from one root
  tuft(g, x, y, s, h, A) {
    g.strokeStyle = A.litter; g.globalAlpha = 0.30 + h(0) * 0.22;
    g.lineWidth = Math.max(0.8, s * 0.22); g.lineCap = "round";
    const n = 2 + (h(1) > 0.55 ? 1 : 0);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const lean = (h(2 + i) - 0.5) * s * 1.5;
      g.moveTo(x + (i - 1) * s * 0.28, y);
      g.quadraticCurveTo(x + lean * 0.5, y - s * 0.7, x + lean, y - s * 1.25);
    }
    g.stroke(); g.globalAlpha = 1;
  },
  clover(g, x, y, s, h, A) {
    g.fillStyle = A.litter; g.globalAlpha = 0.24 + h(0) * 0.14;
    for (let i = 0; i < 3; i++) {
      const a = h(1) * 6 + i * 2.1;
      g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.28, s * 0.34, s * 0.24, a, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  },
  flower(g, x, y, s, h, A) {
    const cols = ["#f6e58d", "#ffffff", "#f3a0c0", "#c9a7ef"];
    g.fillStyle = cols[Math.floor(h(0) * cols.length) % cols.length];
    g.globalAlpha = 0.34;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.257 + h(1) * 3;
      g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.22, s * 0.19, s * 0.15, 0, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  },
  // mown stripe -- a wide, very faint band, so a verge reads as maintained
  mow(g, x, y, s, h, A) {
    g.fillStyle = h(0) > 0.5 ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.022)";
    g.fillRect(0, y - s * 0.8, 1e4, s * 1.7);
  },
  pebble(g, x, y, s, h, A) {
    g.fillStyle = A.soil; g.globalAlpha = 0.26 + h(0) * 0.2;
    g.beginPath(); g.ellipse(x, y, s * 0.42, s * 0.3, h(1) * 3, 0, 7); g.fill();
    g.globalAlpha = 1;
  },
  reed(g, x, y, s, h, A) {
    g.strokeStyle = A.litter; g.globalAlpha = 0.34;
    g.lineWidth = Math.max(0.7, s * 0.16); g.lineCap = "round";
    g.beginPath();
    const lean = (h(0) - 0.5) * s * 1.1;
    g.moveTo(x, y); g.quadraticCurveTo(x + lean, y - s * 1.2, x + lean * 1.6, y - s * 2);
    g.stroke(); g.globalAlpha = 1;
  },
  // wind ripple in sand: a long shallow arc, never a closed shape
  ripple(g, x, y, s, h, A) {
    g.strokeStyle = "rgba(255,255,255,0.13)";
    g.lineWidth = Math.max(0.8, s * 0.17); g.lineCap = "round";
    g.beginPath(); g.moveTo(x - s * 1.6, y);
    g.quadraticCurveTo(x, y - s * (0.3 + h(0) * 0.3), x + s * 1.6, y);
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.07)";
    g.beginPath(); g.moveTo(x - s * 1.5, y + s * 0.22);
    g.quadraticCurveTo(x, y - s * 0.1 + s * 0.22, x + s * 1.5, y + s * 0.22);
    g.stroke();
  },
  scrub(g, x, y, s, h, A) {
    g.strokeStyle = A.soil; g.globalAlpha = 0.34;
    g.lineWidth = Math.max(0.7, s * 0.15); g.lineCap = "round";
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = -1.6 + (i - 1.5) * 0.5 + (h(i) - 0.5) * 0.4;
      g.moveTo(x, y); g.lineTo(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.9);
    }
    g.stroke(); g.globalAlpha = 1;
  },
  drift(g, x, y, s, h, A) {
    Art.blob(g, x, y, s * 2.2, s * 0.8, "rgba(255,255,255,0.22)");
  },
  crystal(g, x, y, s, h, A) {
    g.fillStyle = "rgba(255,255,255,0.5)";
    const r = s * 0.3;
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + h(0); const fn = i ? "lineTo" : "moveTo"; g[fn](x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7); }
    g.closePath(); g.fill();
  },
  leaf(g, x, y, s, h, A) {
    g.fillStyle = h(0) > 0.6 ? A.soil : A.litter; g.globalAlpha = 0.3 + h(1) * 0.18;
    g.beginPath(); g.ellipse(x, y, s * 0.62, s * 0.26, h(2) * 3.1, 0, 7); g.fill();
    g.globalAlpha = 1;
  },
  ash(g, x, y, s, h, A) {
    g.fillStyle = "rgba(230,224,218,0.16)";
    g.beginPath(); g.ellipse(x, y, s * 0.7, s * 0.34, h(0) * 3, 0, 7); g.fill();
  },
  // a fissure with heat in it -- flat on the ground, so it cannot read as
  // something standing in the way
  crack(g, x, y, s, h, A) {
    g.strokeStyle = "rgba(255,120,40,0.30)";
    g.lineWidth = Math.max(1, s * 0.2); g.lineCap = "round";
    g.beginPath(); g.moveTo(x - s * 1.4, y);
    let px = x - s * 1.4;
    for (let i = 1; i <= 3; i++) { px += s * 0.95; g.lineTo(px, y + (h(i) - 0.5) * s * 0.7); }
    g.stroke();
    g.globalAlpha = 0.32;
    Art.blob(g, x, y, s * 2, s * 0.8, "rgba(255,110,30,0.5)");
    g.globalAlpha = 1;
  },
};

/* -------------------------------------------------------------- obstacles */
// These ARE gameplay: a column holding one of these is blocked. So every
// species here is upright, sits on a cast shadow, and wears the shared rim --
// the three signals that say "you cannot hop into this square". A world gets
// its own species rather than a recoloured one, because a green blob on sand
// is what made every world look like the first world with a filter on it.

Object.assign(Art, {
  // `rock` picks the world's second species; it is the same obstacle to the
  // engine, drawn differently so a lane of them doesn't read as an orchard.
  obstacle(ctx, x, y, T, wi, rock, seed) {
    const A = this.pal(wi);
    const h = (k) => GK.util.hash2(seed * 31 + k * 13, 17 + k * 9);
    this.shadow(ctx, x, y + T * 0.30, T * 0.30, T * 0.14);
    (rock ? ROCKS[A.rock] : TREES[A.tree])(ctx, x, y, T, A, h);
  },
});

// Trunk helper: every tree that has one draws it the same way.
function trunk(ctx, x, y, T, A, w, top) {
  ctx.fillStyle = GK.util.shade(A.trunk, -40);
  rr(ctx, x - T * w / 2 - 1, y - T * top, T * w + 2, T * (top + 0.34), T * 0.03); ctx.fill();
  ctx.fillStyle = A.trunk;
  rr(ctx, x - T * w / 2, y - T * top, T * w, T * (top + 0.32), T * 0.025); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  rr(ctx, x - T * w / 2, y - T * top, T * w * 0.38, T * (top + 0.32), T * 0.02); ctx.fill();
}

const TREES = {
  broadleaf(ctx, x, y, T, A, h) {
    trunk(ctx, x, y, T, A, 0.13, 0.06);
    Art.solidEllipse(ctx, x, y - T * 0.34, T * 0.30, T * 0.28, A.canopy);
    Art.solidEllipse(ctx, x - T * 0.11, y - T * 0.46, T * 0.19, T * 0.17, A.canopy2);
  },
  // street tree: same trunk, a tidy lollipop, because the city keeps them cut
  clipped(ctx, x, y, T, A, h) {
    trunk(ctx, x, y, T, A, 0.10, 0.20);
    Art.solidEllipse(ctx, x, y - T * 0.44, T * 0.24, T * 0.23, A.canopy);
  },
  fir(ctx, x, y, T, A, h) {
    trunk(ctx, x, y, T, A, 0.09, 0.02);
    for (let i = 0; i < 3; i++) {
      const w = T * (0.30 - i * 0.068), yy = y - T * (0.14 + i * 0.19);
      ctx.fillStyle = GK.util.shade(A.canopy, -52);
      ctx.beginPath(); ctx.moveTo(x - w - 1.5, yy + 2); ctx.lineTo(x, yy - T * 0.26 - 2); ctx.lineTo(x + w + 1.5, yy + 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = i ? A.canopy2 : A.canopy;
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - T * 0.26); ctx.lineTo(x + w, yy); ctx.closePath(); ctx.fill();
    }
    // snow caught on the branches -- the world's whole identity in three shapes
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 3; i++) {
      const w = T * (0.30 - i * 0.068), yy = y - T * (0.14 + i * 0.19);
      ctx.beginPath(); ctx.moveTo(x - w * 0.75, yy - T * 0.02); ctx.lineTo(x, yy - T * 0.20); ctx.lineTo(x + w * 0.75, yy - T * 0.02);
      ctx.quadraticCurveTo(x, yy - T * 0.08, x - w * 0.75, yy - T * 0.02); ctx.closePath(); ctx.fill();
    }
  },
  willow(ctx, x, y, T, A, h) {
    trunk(ctx, x, y, T, A, 0.11, 0.10);
    Art.solidEllipse(ctx, x, y - T * 0.38, T * 0.29, T * 0.25, A.canopy);
    // trailing fronds
    ctx.strokeStyle = A.canopy2; ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.2, T * 0.035);
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const fx = x + i * T * 0.11;
      ctx.moveTo(fx, y - T * 0.36);
      ctx.quadraticCurveTo(fx + T * 0.04, y - T * 0.18, fx - T * 0.02, y - T * 0.04);
    }
    ctx.stroke();
  },
  hedge(ctx, x, y, T, A, h) {
    Art.solidRect(ctx, x - T * 0.34, y - T * 0.34, T * 0.68, T * 0.62, T * 0.10, A.canopy);
    ctx.fillStyle = GK.util.shade(A.canopy2, 10);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(x - T * 0.24 + i * T * 0.12, y - T * 0.30 + (h(i) - 0.5) * T * 0.06, T * 0.08, T * 0.06, 0, 0, 7);
      ctx.fill();
    }
  },
  cactus(ctx, x, y, T, A, h) {
    const body = A.canopy;
    const arm = (ax, ay, aw, ah) => Art.solidRect(ctx, ax, ay, aw, ah, aw / 2, body);
    // arms first, so the trunk overlaps them and they read as joined on
    if (h(0) > 0.3) {
      arm(x + T * 0.13, y - T * 0.34, T * 0.12, T * 0.40);
      arm(x + T * 0.05, y - T * 0.20, T * 0.20, T * 0.12);
    }
    if (h(1) > 0.5) {
      arm(x - T * 0.25, y - T * 0.26, T * 0.12, T * 0.34);
      arm(x - T * 0.25, y - T * 0.14, T * 0.20, T * 0.12);
    }
    arm(x - T * 0.14, y - T * 0.50, T * 0.28, T * 0.80);
    // ribs, which is what stops a fat cactus reading as a bollard
    ctx.strokeStyle = "rgba(0,0,0,0.13)"; ctx.lineWidth = Math.max(0.8, T * 0.014);
    ctx.beginPath();
    for (const dx of [-0.06, 0.06]) { ctx.moveTo(x + dx * T, y - T * 0.44); ctx.lineTo(x + dx * T, y + T * 0.22); }
    ctx.stroke();
  },
  palm(ctx, x, y, T, A, h) {
    // a leaning trunk, stroked twice so its rim matches everything else
    const lean = (h(0) - 0.5) * T * 0.18;
    const spine = () => {
      ctx.beginPath(); ctx.moveTo(x, y + T * 0.26);
      ctx.quadraticCurveTo(x + lean * 0.4, y - T * 0.12, x + lean, y - T * 0.40); ctx.stroke();
    };
    ctx.lineCap = "round";
    ctx.strokeStyle = GK.util.shade(A.trunk, -40); ctx.lineWidth = Math.max(3, T * 0.13); spine();
    ctx.strokeStyle = A.trunk; ctx.lineWidth = Math.max(2, T * 0.095); spine();
    // fronds
    const cx = x + lean, cy = y - T * 0.42;
    for (let i = 0; i < 5; i++) {
      const a = -2.6 + i * 0.62 + (h(1) - 0.5) * 0.3;
      const frond = () => {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + Math.cos(a) * T * 0.20, cy + Math.sin(a) * T * 0.16,
                             cx + Math.cos(a) * T * 0.34, cy + Math.sin(a) * T * 0.30);
        ctx.stroke();
      };
      ctx.strokeStyle = GK.util.shade(A.canopy, -50); ctx.lineWidth = Math.max(3.4, T * 0.085); frond();
      ctx.strokeStyle = i % 2 ? A.canopy2 : A.canopy; ctx.lineWidth = Math.max(2, T * 0.055); frond();
    }
  },
  poplar(ctx, x, y, T, A, h) {
    trunk(ctx, x, y, T, A, 0.08, 0.04);
    Art.solidEllipse(ctx, x, y - T * 0.38, T * 0.16, T * 0.34, A.canopy);
  },
  // burnt out: still solid, still in the way, just nothing left of it
  stump(ctx, x, y, T, A, h) {
    Art.solidRect(ctx, x - T * 0.16, y - T * 0.30, T * 0.32, T * 0.58, T * 0.05, A.canopy);
    ctx.fillStyle = GK.util.shade(A.canopy, -55);
    ctx.beginPath(); ctx.ellipse(x, y - T * 0.30, T * 0.16, T * 0.07, 0, 0, 7); ctx.fill();
    // a broken limb, so a field of them is not a field of posts
    if (h(0) > 0.5) {
      ctx.strokeStyle = A.canopy; ctx.lineCap = "round"; ctx.lineWidth = Math.max(2, T * 0.055);
      ctx.beginPath(); ctx.moveTo(x + T * 0.10, y - T * 0.22); ctx.lineTo(x + T * 0.26, y - T * 0.40); ctx.stroke();
    }
  },
};

const ROCKS = {
  boulder(ctx, x, y, T, A, h) {
    Art.solidEllipse(ctx, x, y - T * 0.02, T * 0.27, T * 0.24, A.rockA, (h(0) - 0.5) * 0.5);
    ctx.fillStyle = A.rockB;
    ctx.beginPath(); ctx.ellipse(x - T * 0.07, y - T * 0.10, T * 0.14, T * 0.10, -0.3, 0, 7); ctx.fill();
  },
  // faceted, not rounded: an ice block should not look like a snowball
  ice(ctx, x, y, T, A, h) {
    const pts = [[-0.26, 0.14], [-0.18, -0.20], [0.04, -0.30], [0.26, -0.12], [0.20, 0.16]];
    const path = (k) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * T * k, y + py * T * k)); ctx.closePath(); };
    ctx.fillStyle = GK.util.shade(A.rockA, -46); path(1.08); ctx.fill();
    ctx.fillStyle = A.rockA; path(1); ctx.fill();
    ctx.fillStyle = A.rockB; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(x - T * 0.16, y - T * 0.16); ctx.lineTo(x + T * 0.03, y - T * 0.27); ctx.lineTo(x + T * 0.01, y - T * 0.02); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  },
  // layered, so it reads as rock rather than as a big pebble
  sandstone(ctx, x, y, T, A, h) {
    const pts = [[-0.28, 0.20], [-0.24, -0.10], [-0.06, -0.26], [0.16, -0.22], [0.28, 0.04], [0.24, 0.20]];
    const path = (k) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * T * k, y + py * T * k)); ctx.closePath(); };
    ctx.fillStyle = GK.util.shade(A.rockA, -42); path(1.07); ctx.fill();
    ctx.fillStyle = A.rockA; path(1); ctx.fill();
    // bedding planes, following the slope rather than ruled flat across it
    ctx.save(); path(1); ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.09)";
    ctx.fillRect(x - T * 0.3, y - T * 0.04, T * 0.6, Math.max(1, T * 0.028));
    ctx.fillRect(x - T * 0.3, y + T * 0.09, T * 0.6, Math.max(1, T * 0.022));
    ctx.fillStyle = GK.util.shade(A.rockB, 6);
    ctx.fillRect(x - T * 0.3, y - T * 0.30, T * 0.6, T * 0.20);
    ctx.restore();
  },
  bollard(ctx, x, y, T, A, h) {
    // a plinth, so it stands on the ground rather than floating in it
    Art.solidEllipse(ctx, x, y + T * 0.22, T * 0.16, T * 0.07, GK.util.shade(A.rockA, -30));
    Art.solidRect(ctx, x - T * 0.085, y - T * 0.26, T * 0.17, T * 0.50, T * 0.07, GK.util.shade(A.rockA, -26));
    ctx.fillStyle = "#e8b23a";
    ctx.fillRect(x - T * 0.085, y - T * 0.14, T * 0.17, Math.max(2, T * 0.05));
  },
  obsidian(ctx, x, y, T, A, h) {
    const pts = [[-0.22, 0.18], [-0.10, -0.26], [0.10, -0.34], [0.24, -0.04], [0.14, 0.18]];
    const path = (k) => { ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * T * k, y + py * T * k)); ctx.closePath(); };
    ctx.fillStyle = GK.util.shade(A.rockA, -40); path(1.1); ctx.fill();
    ctx.fillStyle = A.rockA; path(1); ctx.fill();
    ctx.fillStyle = A.rockB;
    ctx.beginPath(); ctx.moveTo(x - T * 0.06, y - T * 0.22); ctx.lineTo(x + T * 0.12, y - T * 0.30); ctx.lineTo(x + T * 0.06, y + T * 0.02); ctx.closePath(); ctx.fill();
  },
};

/* ----------------------------------------------------------- the movers */
// Cars, logs and trains are the things the whole game is about looking at, so
// they get the most contrast in the scene and the shared pen makes them read
// as one family. Everything here is drawn at a position the simulation owns.

Object.assign(Art, {
  // A car or a truck, facing whichever way its lane runs.
  car(ctx, x, y, T, w, kind, color, dir, night) {
    const h = T * 0.62, half = w / 2;
    this.shadow(ctx, x, y + h * 0.46, w * 0.48, h * 0.22);

    if (kind === "truck") {
      // cab + box, so a truck is a different SHAPE and not just a longer car
      const cabW = w * 0.34, boxW = w - cabW - T * 0.03;
      const cabX = dir >= 0 ? x + half - cabW : x - half;
      const boxX = dir >= 0 ? x - half : x - half + cabW + T * 0.03;
      this.solidRect(ctx, boxX, y - h / 2 + h * 0.06, boxW, h * 0.88, T * 0.05, GK.util.shade(color, -12));
      // ribbing on the box
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      for (let i = 1; i < 4; i++) ctx.fillRect(boxX + boxW * i / 4, y - h / 2 + h * 0.12, Math.max(1, T * 0.018), h * 0.74);
      this.solidRect(ctx, cabX, y - h / 2, cabW, h, T * 0.07, color);
      this.glass(ctx, cabX + cabW * (dir >= 0 ? 0.30 : 0.14), y - h * 0.30, cabW * 0.56, h * 0.34, T);
    } else {
      this.solidRect(ctx, x - half, y - h / 2, w, h, T * 0.10, color);
      // cabin glass sits toward the front, which is the tell for direction
      const gw = w * 0.46, gx = dir >= 0 ? x - half + w * 0.30 : x + half - w * 0.30 - gw;
      this.glass(ctx, gx, y - h * 0.30, gw, h * 0.36, T);
    }

    // wheels peeking below the body -- the cheapest thing that stops a car
    // reading as a floating lozenge
    ctx.fillStyle = "rgba(20,20,26,0.9)";
    for (const k of [-0.28, 0.28]) rr(ctx, x + w * k - T * 0.06, y + h * 0.34, T * 0.12, T * 0.11, T * 0.04), ctx.fill();

    // lights: white ahead, red behind
    const fx = dir >= 0 ? x + half - T * 0.045 : x - half - T * 0.015;
    const bx = dir >= 0 ? x - half - T * 0.015 : x + half - T * 0.045;
    ctx.fillStyle = "#fff6c8";
    rr(ctx, fx, y - h * 0.30, T * 0.06, T * 0.08, T * 0.02); ctx.fill();
    rr(ctx, fx, y + h * 0.18, T * 0.06, T * 0.08, T * 0.02); ctx.fill();
    ctx.fillStyle = "#e2453a";
    rr(ctx, bx, y - h * 0.28, T * 0.05, T * 0.07, T * 0.02); ctx.fill();
    rr(ctx, bx, y + h * 0.18, T * 0.05, T * 0.07, T * 0.02); ctx.fill();
    // headlight wash, dark worlds only, and it lands on the road ahead
    if (night) {
      ctx.save(); ctx.globalAlpha = 0.30;
      this.blob(ctx, x + dir * (half + T * 0.42), y, T * 0.70, T * 0.30, "rgba(255,240,190,0.9)");
      ctx.restore();
    }
  },

  glass(ctx, x, y, w, h, T) {
    ctx.fillStyle = "rgba(12,20,30,0.30)";
    rr(ctx, x, y, w, h, T * 0.035); ctx.fill();
    ctx.fillStyle = "rgba(150,205,240,0.72)";
    rr(ctx, x + w * 0.06, y + h * 0.12, w * 0.88, h * 0.58, T * 0.03); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    rr(ctx, x + w * 0.10, y + h * 0.16, w * 0.34, h * 0.34, T * 0.02); ctx.fill();
  },

  // A log: end-grain at both ends, bark between, and a wake behind it.
  log(ctx, x, y, T, len, dir) {
    const w = len * T * 0.94, h = T * 0.56, half = w / 2;
    // wake first, under everything
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let k = 0; k < 3; k++) {
      const wx = x - dir * (half + T * 0.08 + k * T * 0.16);
      const wy = y + (k === 1 ? -h * 0.22 : k === 2 ? h * 0.22 : 0);
      rr(ctx, wx - T * 0.09, wy - 1.5, T * 0.18 * (1 - k * 0.25), 3, 1.5); ctx.fill();
    }
    // the log sits IN the water, so its shadow is a dark smear under it
    ctx.save(); ctx.globalAlpha = 0.5;
    this.blob(ctx, x, y + h * 0.30, half * 0.95, h * 0.36, "rgba(8,28,48,0.75)");
    ctx.restore();

    const bark = "#8a5a2b";
    ctx.fillStyle = GK.util.shade(bark, -46);
    rr(ctx, x - half - 1.5, y - h / 2 - 1.5, w + 3, h + 3, h / 2 + 1.5); ctx.fill();
    ctx.fillStyle = bark;
    rr(ctx, x - half, y - h / 2, w, h, h / 2); ctx.fill();
    // bark grain, and the top catching the light
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    rr(ctx, x - half + h * 0.2, y - h * 0.40, w - h * 0.4, h * 0.26, h * 0.13); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    for (let i = 1; i < len; i++) ctx.fillRect(x - half + w * i / len - 1.5, y - h / 2 + 4, 3, h - 8);
    // end grain: rings, so it reads as a cut log rather than a pill
    for (const ex of [x - half + h * 0.30, x + half - h * 0.30]) {
      ctx.fillStyle = "#c79a5f";
      ctx.beginPath(); ctx.ellipse(ex, y, h * 0.17, h * 0.34, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(120,80,40,0.5)"; ctx.lineWidth = Math.max(0.8, T * 0.012);
      ctx.beginPath(); ctx.ellipse(ex, y, h * 0.09, h * 0.19, 0, 0, 7); ctx.stroke();
    }
  },

  // One carriage of the train. The engine gets a nose and a light.
  carriage(ctx, x, y, T, w, dir, lead) {
    const h = T * 0.74;
    this.shadow(ctx, x, y + h * 0.44, w * 0.48, h * 0.20);
    const body = lead ? "#b7332c" : "#c0473f";
    this.solidRect(ctx, x - w / 2, y - h / 2, w, h, T * 0.06, body);
    // window band
    ctx.fillStyle = "rgba(12,20,30,0.30)";
    rr(ctx, x - w / 2 + T * 0.10, y - h * 0.26, w - T * 0.20, h * 0.34, T * 0.03); ctx.fill();
    ctx.fillStyle = "#f2d88a";
    const n = Math.max(1, Math.round(w / (T * 0.45)));
    for (let i = 0; i < n; i++) {
      const ww = (w - T * 0.26) / n - T * 0.07;
      rr(ctx, x - w / 2 + T * 0.13 + i * ((w - T * 0.26) / n), y - h * 0.22, ww, h * 0.26, T * 0.025); ctx.fill();
    }
    // skirt and bogies
    ctx.fillStyle = "rgba(20,20,26,0.85)";
    rr(ctx, x - w / 2 + T * 0.06, y + h * 0.30, w - T * 0.12, T * 0.10, T * 0.03); ctx.fill();
    if (lead) {
      ctx.fillStyle = "#fff6c8";
      const fx = dir >= 0 ? x + w / 2 - T * 0.10 : x - w / 2 + T * 0.03;
      rr(ctx, fx, y - h * 0.06, T * 0.07, T * 0.12, T * 0.02); ctx.fill();
    }
  },

  coin(ctx, x, y, T, spin) {
    // a disc turning edge-on rather than a flat star: the width swing is what
    // makes it catch the eye in a scene that is otherwise all horizontal motion
    const wob = Math.abs(Math.cos(spin));
    const rx = T * 0.19 * (0.28 + wob * 0.72), ry = T * 0.19;
    ctx.fillStyle = GK.util.shade("#f6c531", -45);
    ctx.beginPath(); ctx.ellipse(x, y, rx + 1.5, ry + 1.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#f6c531";
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
    if (rx > T * 0.07) {
      ctx.fillStyle = "#ffe58a";
      ctx.beginPath(); ctx.ellipse(x, y, rx * 0.62, ry * 0.66, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#d99a1a";
      ctx.font = "900 " + (T * 0.2 * Math.min(1, wob * 1.4)) + "px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("★", x, y + 1);
    }
  },
});

/* ------------------------------------------------------------------ birds */
// The playable character. Both painters take an explicit ctx and a tiny
// state bag rather than riding on Game, so the splash and results screens
// can draw the same bird the game draws and it can never drift.
//   st.dead -- cross the eyes
//   st.idle -- seconds standing still, which is what tucks the flamingo up

/* The flamingo's neck, in units of s, built once at load: circle centres and
   radii swept along an S-curve, tapering toward the head.
   Offsetting the curve into a ribbon looked obvious and was wrong -- on a bend
   this tight the inner edge folds over itself and leaves a notch at the
   shoulder. A union of circles cannot self-intersect, and filled as one path
   with nonzero winding it is still a single fill. */
const FLAMINGO_NECK = (() => {
  const P = [[0.06,-0.36],[0.28,-0.57],[0.05,-0.75],[0.22,-0.90]];
  const N = 26, out = new Float32Array((N+1)*3);
  for (let i=0;i<=N;i++){
    const u = i/N, v = 1-u;
    out[i*3]   = v*v*v*P[0][0] + 3*v*v*u*P[1][0] + 3*v*u*u*P[2][0] + u*u*u*P[3][0];
    out[i*3+1] = v*v*v*P[0][1] + 3*v*v*u*P[1][1] + 3*v*u*u*P[2][1] + u*u*u*P[3][1];
    out[i*3+2] = (0.115 - 0.045*u)/2;         // half-width: shoulder -> head
  }
  return out;
})();

/* Per-avatar sprite skins — the playable character matches the profile avatar. */
const SKINS = {
  "🐔": { body:"#fff",    shade:"rgba(0,0,0,0.06)",       beak:"#f0a500", legs:"#f0a500", comb:"#e8403a", wattle:"#e8403a" },
  "🐓": { body:"#f6ede1", shade:"rgba(140,60,20,0.18)",   beak:"#f0a500", legs:"#e8952f", comb:"#d93025", wattle:"#d93025", bigComb:true, tail:"#2e7d4f" },
  "🐤": { body:"#ffd93b", shade:"rgba(0,0,0,0.07)",       beak:"#f28c28", legs:"#f28c28" },
  "🐥": { body:"#ffe066", shade:"rgba(0,0,0,0.05)",       beak:"#f28c28", legs:"#f28c28", tuft:"#f9a825" },
  "🦆": { body:"#9c8f80", shade:"rgba(0,0,0,0.10)",       beak:"#fdd835", legs:"#f28c28", head:"#2e7d32", ring:"#fff", flatBill:true },
  "🐧": { body:"#263238", shade:"rgba(0,0,0,0.2)",        beak:"#f28c28", legs:"#f28c28", belly:"#fff" },
  "🦉": { body:"#8d6e63", shade:"rgba(0,0,0,0.12)",       beak:"#fdd835", legs:"#a1887f", disc:"#d7ccc8", bigEyes:true, tufts:"#6d4c41" },
  "🦩": { body:"#f79ac0", shade:"rgba(198,40,110,0.16)",  beak:"#f7d3e2", legs:"#ef7da3", beakTip:"#2b2b33", head:"#fbb3d0", wing:"#f07fae", plan:"flamingo" },
  "🦜": { body:"#e53935", shade:"rgba(25,50,160,0.28)",   beak:"#eceff1", legs:"#78909c", tuft:"#fdd835" },
  "🦚": { body:"#00897b", shade:"rgba(13,71,161,0.28)",   beak:"#f0a500", legs:"#455a64", head:"#1565c0", tail:"#43a047", crown:"#1565c0" },
  "🦢": { body:"#fff",    shade:"rgba(0,0,0,0.05)",       beak:"#f57f17", legs:"#455a64", flatBill:true, mask:"#212121" },
  "🕊️": { body:"#eceff1", shade:"rgba(120,144,156,0.25)", beak:"#f9a825", legs:"#e57373" },
};

Object.assign(Art, {
  // Dispatch on the skin's body plan. Rosalie's note -- "the flamingo just
  // looks like a pink chicken" -- is why a variant that genuinely differs
  // gets its own painter instead of another colour flag.
  bird(ctx, s, sk, st) {
    if (sk.plan === "flamingo") this.birdFlamingo(ctx, s, sk, st);
    else this.birdStock(ctx, s, sk, st);
  },

  // The stock bird: one rounded body with optional combs, tufts, bills and
  // masks bolted on. Every skin but the flamingo is a dressing of this.
  birdStock(ctx, s, sk, st) {
    // legs
    ctx.strokeStyle=sk.legs; ctx.lineWidth=Math.max(2,s*0.09); ctx.lineCap="round";
    const lb = s*0.46;
    ctx.beginPath(); ctx.moveTo(-s*0.14,s*0.34); ctx.lineTo(-s*0.14,lb);
    ctx.moveTo(s*0.14,s*0.34); ctx.lineTo(s*0.14,lb); ctx.stroke();
    // tail plume behind the body (rooster, peacock)
    if (sk.tail){ ctx.fillStyle=sk.tail; ctx.beginPath();
      ctx.ellipse(-s*0.44,-s*0.1,s*0.17,s*0.3,-0.5,0,7); ctx.fill(); }
    // body, belly, shading
    ctx.fillStyle=sk.body; rr(ctx,-s*0.4,-s*0.28,s*0.8,s*0.66,s*0.28); ctx.fill();
    if (sk.belly){ ctx.fillStyle=sk.belly; rr(ctx,-s*0.24,-s*0.12,s*0.48,s*0.46,s*0.2); ctx.fill(); }
    ctx.fillStyle=sk.shade; rr(ctx,-s*0.4,0,s*0.8,s*0.38,s*0.24); ctx.fill();
    // head, neck ring (duck), face disc + ear tufts (owl)
    ctx.fillStyle=sk.head||sk.body; rr(ctx,-s*0.26,-s*0.5,s*0.52,s*0.4,s*0.2); ctx.fill();
    if (sk.ring){ ctx.fillStyle=sk.ring; rr(ctx,-s*0.26,-s*0.16,s*0.52,s*0.07,s*0.03); ctx.fill(); }
    if (sk.disc){ ctx.fillStyle=sk.disc; rr(ctx,-s*0.21,-s*0.47,s*0.42,s*0.3,s*0.14); ctx.fill(); }
    if (sk.tufts){ ctx.fillStyle=sk.tufts; ctx.beginPath();
      ctx.moveTo(-s*0.24,-s*0.44); ctx.lineTo(-s*0.16,-s*0.62); ctx.lineTo(-s*0.08,-s*0.48);
      ctx.moveTo(s*0.08,-s*0.48); ctx.lineTo(s*0.16,-s*0.62); ctx.lineTo(s*0.24,-s*0.44);
      ctx.fill(); }
    // comb + wattle (chickens), head tuft (chick, parrot), crown (peacock)
    if (sk.comb){ ctx.fillStyle=sk.comb; ctx.beginPath();
      ctx.arc(-s*0.06,-s*0.52,s*0.09,0,7); ctx.arc(s*0.06,-s*0.55,s*0.09,0,7);
      if (sk.bigComb) ctx.arc(-s*0.17,-s*0.49,s*0.08,0,7);
      ctx.fill(); }
    if (sk.wattle){ ctx.fillStyle=sk.wattle; rr(ctx,-s*0.03,-s*0.2,s*0.08,s*0.12,3); ctx.fill(); }
    if (sk.tuft){ ctx.fillStyle=sk.tuft; ctx.beginPath();
      ctx.arc(0,-s*0.56,s*0.07,0,7); ctx.arc(s*0.1,-s*0.53,s*0.055,0,7); ctx.fill(); }
    if (sk.crown){ ctx.strokeStyle=sk.crown; ctx.lineWidth=Math.max(1.5,s*0.04); ctx.beginPath();
      for (const dx of [-0.12,0,0.12]){ ctx.moveTo(dx*s,-s*0.5); ctx.lineTo(dx*s,-s*0.62); }
      ctx.stroke();
      ctx.fillStyle=sk.crown; ctx.beginPath();
      for (const dx of [-0.12,0,0.12]){ ctx.moveTo(dx*s+s*0.045,-s*0.64); ctx.arc(dx*s,-s*0.64,s*0.045,0,7); }
      ctx.fill(); }
    // beak: flat bill (duck/swan) or pointy triangle, optional dark tip (flamingo)
    if (sk.flatBill){ ctx.fillStyle=sk.beak; rr(ctx,s*0.16,-s*0.34,s*0.3,s*0.13,s*0.06); ctx.fill(); }
    else { ctx.fillStyle=sk.beak; ctx.beginPath();
      ctx.moveTo(s*0.2,-s*0.34); ctx.lineTo(s*0.42,-s*0.28); ctx.lineTo(s*0.2,-s*0.22); ctx.closePath(); ctx.fill();
      if (sk.beakTip){ ctx.fillStyle=sk.beakTip; ctx.beginPath();
        ctx.moveTo(s*0.33,-s*0.305); ctx.lineTo(s*0.42,-s*0.28); ctx.lineTo(s*0.33,-s*0.245); ctx.closePath(); ctx.fill(); } }
    if (sk.mask){ ctx.fillStyle=sk.mask; ctx.beginPath(); ctx.arc(s*0.19,-s*0.28,s*0.06,0,7); ctx.fill(); }
    // eyes
    if (sk.bigEyes){
      ctx.fillStyle="#fff"; ctx.beginPath();
      ctx.arc(-s*0.02,-s*0.34,s*0.1,0,7); ctx.moveTo(s*0.26,-s*0.34); ctx.arc(s*0.16,-s*0.34,s*0.1,0,7); ctx.fill();
      ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(-s*0.02,-s*0.34,s*0.05,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(s*0.16,-s*0.34,s*0.05,0,7); ctx.fill();
    } else {
      ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(s*0.02,-s*0.36,s*0.05,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(s*0.16,-s*0.36,s*0.05,0,7); ctx.fill();
    }
    if (st.dead){ ctx.strokeStyle="#222"; ctx.lineWidth=s*0.05; ctx.beginPath();
      ctx.moveTo(-s*0.02,-s*0.4); ctx.lineTo(s*0.06,-s*0.32); ctx.moveTo(s*0.06,-s*0.4); ctx.lineTo(-s*0.02,-s*0.32);
      ctx.moveTo(s*0.12,-s*0.4); ctx.lineTo(s*0.2,-s*0.32); ctx.moveTo(s*0.2,-s*0.4); ctx.lineTo(s*0.12,-s*0.32); ctx.stroke(); }
  },

  // The flamingo is the one skin whose silhouette has to do the work. At tile
  // size a colour swap only ever says "pink bird"; what says "flamingo" is the
  // S-neck, the stilt legs and the kinked black-tipped bill, so this paints a
  // different animal rather than dressing the chicken. The body is kept small
  // and carried high on purpose -- on a flamingo the legs and neck are most of
  // the animal, and a big body is exactly what made the old one read as poultry.
  //
  // Legibility budget: a car in the lane above has its lower edge at -0.69
  // tiles (T*0.62 tall, lane-centred), which is -1.38s here. The head tops out
  // at -1.00s standing, so 0.19 tiles of clearance. The hop arc lifts another
  // 0.84s and does cross into that band -- but what crosses is a neck 0.07s
  // wide at the top, where the stock bird's hop peak puts its full 0.8s body in
  // the same place. The road ahead stays readable.
  birdFlamingo(ctx, s, sk, st) {
    // one-legged stand once it has been still for a beat
    const idle=st.idle;
    const k=Math.min(1,Math.max(0,(idle-0.7)/0.35));
    const tuck = this.motion ? k*k*(3-2*k) : (k>0?1:0);
    const lerp=(a,b,u)=>a+(b-a)*u;

    // Legs: hip, a knee that juts backwards the way a flamingo's does, foot.
    // Drawn before the body so the hips tuck away under it -- and so the folded
    // leg vanishes into the plumage, which is what the real pose looks like.
    ctx.strokeStyle=sk.legs; ctx.lineWidth=Math.max(1.5,s*0.055); ctx.lineCap="round";
    ctx.lineJoin="round";
    const leg=(dx,up)=>{
      const kx=lerp(dx-0.10, dx+0.02, up), ky=lerp( 0.20,-0.12, up);
      const fx=lerp(dx,      dx+0.16, up), fy=lerp( 0.46,-0.22, up);
      ctx.beginPath(); ctx.moveTo(dx*s,-0.10*s); ctx.lineTo(kx*s,ky*s); ctx.lineTo(fx*s,fy*s);
      ctx.stroke();
      // toes, only worth drawing on a foot that is still on the ground
      if (up<0.5){ ctx.beginPath(); ctx.moveTo(fx*s,fy*s); ctx.lineTo((fx+0.085)*s,fy*s); ctx.stroke(); }
    };
    leg(-0.09, tuck);          // far leg is the one that folds up
    leg( 0.11, 0);

    // short tail tuft, swept up behind
    ctx.fillStyle=sk.body; ctx.beginPath();
    ctx.moveTo(-0.20*s,-0.19*s); ctx.lineTo(-0.40*s,-0.33*s); ctx.lineTo(-0.19*s,-0.39*s);
    ctx.closePath(); ctx.fill();

    // body, carried high on the legs
    ctx.beginPath(); ctx.ellipse(-0.02*s,-0.26*s,0.29*s,0.175*s,-0.10,0,7); ctx.fill();
    // underside shading, clipped to the body so it never spills onto the grass
    ctx.save(); ctx.clip();
    ctx.fillStyle=sk.shade; ctx.fillRect(-0.4*s,-0.22*s,0.8*s,0.4*s);
    ctx.restore();
    // folded wing
    ctx.fillStyle=sk.wing; ctx.beginPath();
    ctx.ellipse(-0.075*s,-0.255*s,0.16*s,0.075*s,-0.13,0,7); ctx.fill();

    // neck: the swept circles built once at load, scaled to this bird and
    // filled as one path so the overlaps union instead of banding
    ctx.fillStyle=sk.body; ctx.beginPath();
    for (let i=0;i<FLAMINGO_NECK.length;i+=3){
      const nx=FLAMINGO_NECK[i]*s, ny=FLAMINGO_NECK[i+1]*s, nr=FLAMINGO_NECK[i+2]*s;
      ctx.moveTo(nx+nr,ny); ctx.arc(nx,ny,nr,0,7);
    }
    ctx.fill();

    // head
    ctx.fillStyle=sk.head||sk.body; ctx.beginPath();
    ctx.ellipse(0.22*s,-0.90*s,0.115*s,0.10*s,-0.12,0,7); ctx.fill();

    // Bill: pale at the base, kinked sharply down at the halfway point, outer
    // third black. The kink is the single most flamingo thing about it. The
    // black is a clipped half-plane rather than a second traced outline, so it
    // can never creep outside the bill however the curve is tuned.
    const bill=()=>{ ctx.beginPath();
      ctx.moveTo(0.27*s,-0.945*s); ctx.lineTo(0.50*s,-0.905*s);
      ctx.quadraticCurveTo(0.525*s,-0.840*s, 0.450*s,-0.785*s);
      ctx.lineTo(0.420*s,-0.822*s);
      ctx.quadraticCurveTo(0.40*s,-0.865*s, 0.27*s,-0.865*s);
      ctx.closePath(); };
    ctx.fillStyle=sk.beak; bill(); ctx.fill();
    ctx.save(); bill(); ctx.clip();
    ctx.translate(0.45*s,-0.88*s); ctx.rotate(0.30);
    ctx.fillStyle=sk.beakTip; ctx.fillRect(0,-2*s,3*s,4*s);
    ctx.restore();

    // eyes -- near one full size, far one small on the turned head, so it still
    // reads as one of the family rather than a profile cut-out
    ctx.fillStyle="#222";
    ctx.beginPath(); ctx.arc(0.240*s,-0.925*s,0.042*s,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(0.155*s,-0.918*s,0.028*s,0,7); ctx.fill();
    if (st.dead){ ctx.strokeStyle="#222"; ctx.lineWidth=s*0.038; ctx.beginPath();
      ctx.moveTo(0.202*s,-0.963*s); ctx.lineTo(0.278*s,-0.887*s);
      ctx.moveTo(0.278*s,-0.963*s); ctx.lineTo(0.202*s,-0.887*s);
      ctx.moveTo(0.127*s,-0.950*s); ctx.lineTo(0.183*s,-0.886*s);
      ctx.moveTo(0.183*s,-0.950*s); ctx.lineTo(0.127*s,-0.886*s); ctx.stroke(); }
  },
});

/* ------------------------------------------------- the parts that move */
// Everything above is either baked or drawn at a position the simulation
// owns. These four are the exceptions: they animate off the clock, so they
// all multiply by Art.motion and vanish cleanly when it is 0.

Object.assign(Art, {
  // Shimmer and glints drifting with the current. The still part of a water
  // lane is baked; this is the part that tells you which way it is flowing,
  // which is gameplay -- so it survives reduced motion as a static pattern
  // rather than disappearing.
  waterShimmer(ctx, W, top, T, t, flow, row) {
    const tm = t * this.motion;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    for (let b = 0; b < 2; b++) {
      const yb = top + T * (b ? 0.62 : 0.32);
      const ph = tm * (b ? 1.7 : 1.1) + row * 2.1 + b * 3;
      const span = T * 1.4;
      const drift = ((tm * flow * (b ? 0.35 : 0.55)) % span + span) % span;
      for (let x = -span; x < W + span; x += T * 0.7) {
        const xx = x + drift;
        const yy = yb + Math.sin(xx * 0.045 + ph) * T * 0.06;
        rr(ctx, xx, yy, T * 0.34, Math.max(2, T * 0.035), 2); ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    const n = Math.ceil(W / T);
    for (let i = 0; i < n; i++) {
      const gx = ((GK.util.hash2(row, i) * W + tm * flow * 0.45) % W + W) % W;
      const gy = top + T * (0.2 + GK.util.hash2(i, row) * 0.6);
      const tw = 0.5 + 0.5 * Math.sin(tm * 3 + i * 2.4 + row);
      if (tw > 0.4) { ctx.beginPath(); ctx.ellipse(gx, gy, T * 0.05 * tw + 1, Math.max(1.2, T * 0.02), 0, 0, 7); ctx.fill(); }
    }
  },

  // Motes: pollen, snow, embers, fireflies. A fixed pool, wrapped rather than
  // respawned, so nothing is ever allocated after the first frame.
  _motes: null,
  motes(ctx, W, H, t, wi) {
    if (!this.motion) return;
    const m = this.pal(wi).mote;
    if (!m) return;
    if (!this._motes || this._motes.length < m.n) {
      this._motes = [];
      for (let i = 0; i < 24; i++) this._motes.push({ s: GK.util.hash2(i, 3), p: GK.util.hash2(i, 11) });
    }
    ctx.save();
    ctx.fillStyle = m.color;
    for (let i = 0; i < m.n; i++) {
      const o = this._motes[i];
      const x = ((o.s * W + t * m.drift * (0.5 + o.p)) % (W + 40) + W + 40) % (W + 40) - 20;
      const y = ((o.p * H + t * m.rise * (0.6 + o.s)) % (H + 40) + H + 40) % (H + 40) - 20;
      const tw = m.glow ? 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + i * 2.1)) : 1;
      ctx.globalAlpha = tw;
      if (m.glow) this.blob(ctx, x, y, m.size * 4, m.size * 4, m.color);
      ctx.beginPath(); ctx.arc(x, y, m.size, 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  // Two big soft shadows crossing the whole view. With a camera that only
  // scrolls, this is as close to parallax as the game gets -- and it is the
  // single cheapest thing that stops the ground feeling like wallpaper.
  cloudShadow(ctx, W, H, t) {
    if (!this.motion) return;
    ctx.save();
    ctx.globalAlpha = 0.055;
    for (let i = 0; i < 2; i++) {
      const span = W + H;
      const x = ((t * (7 + i * 4) + i * span * 0.55) % (span + 400)) - 200;
      this.blob(ctx, x, H * (0.3 + i * 0.42), W * 0.42, H * 0.34, "rgba(0,0,0,1)");
    }
    ctx.restore();
  },

  // The level crossing. `blink` drives the lamps, `gate` is 0..1 closed.
  railGate(ctx, x, y, T, gate, blink, on) {
    ctx.save();
    // post
    ctx.fillStyle = "rgba(20,20,26,0.35)";
    rr(ctx, x - T * 0.035 + 1.5, y - T * 0.40 + 2, T * 0.07, T * 0.80, T * 0.02); ctx.fill();
    ctx.fillStyle = "#e9edf0";
    rr(ctx, x - T * 0.035, y - T * 0.40, T * 0.07, T * 0.80, T * 0.02); ctx.fill();
    ctx.fillStyle = "#c2272d";
    for (let i = 0; i < 3; i++) rr(ctx, x - T * 0.035, y - T * 0.40 + i * T * 0.27, T * 0.07, T * 0.13, T * 0.02), ctx.fill();
    // the two lamps, alternating
    for (const s of [-1, 1]) {
      const lit = on && (s < 0 ? blink : !blink);
      const lx = x + s * T * 0.10, ly = y - T * 0.44;
      if (lit) { ctx.save(); ctx.globalAlpha = 0.7; this.blob(ctx, lx, ly, T * 0.16, T * 0.16, "rgba(255,60,50,1)"); ctx.restore(); }
      ctx.fillStyle = lit ? "#ff4438" : "#5a2b2b";
      ctx.beginPath(); ctx.arc(lx, ly, T * 0.045, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
});
