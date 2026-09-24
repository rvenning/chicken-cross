// Characters in 3D: the blocky twin of js/characters.js.
//
// Every body plan has a builder here that emits boxes through
// bx(colour, x, y, z, sx, sy, sz, rx, ry, rz) -- in tiles, feet at y=0, facing
// -z (away from the camera, the way she walks) -- and a set of anchors so the
// same hats, scarves, capes and markings the 2D painter draws can be built
// in boxes too. R3.character() turns the boxes into one mesh.
//
// Budget: nothing above 1.2 tiles (the angled camera looks over the bird at
// the lanes behind it, and a tall hat would stand in them), and nothing
// outside the bird's own tile (|x|, |z| <= 0.5). tests/roster.test.js builds
// all 420 through a recording bx and checks both.
"use strict";

const TOP3D = 1.2;

// anchors: head [y, z, r] (centre and half-size), top (y of the crown),
// neck [y, z, r], back [y, z], body [y, z, w, h, d] for markings, eye [y, z, x]
const PLAN3D = {};
function plan3d(id, anchor, build) { PLAN3D[id] = { anchor, build }; }

/* ------------------------------------------------------------ bird plans */
const birdBuild = (bx, p) => R3.birdParts(bx, p);
plan3d("chicken",  { head:[0.56,-0.07,0.15], top:0.74, neck:[0.44,-0.14,0.16], back:[0.36,0.24], body:[0.32,0.03,0.38,0.36,0.44], eye:[0.59,-0.13,0.15] }, birdBuild);
plan3d("rooster",  { head:[0.56,-0.07,0.15], top:0.80, neck:[0.44,-0.14,0.16], back:[0.36,0.24], body:[0.32,0.03,0.38,0.36,0.44], eye:[0.59,-0.13,0.15] }, birdBuild);
plan3d("chick",    { head:[0.30,0,0.17], top:0.43, neck:[0.16,-0.1,0.17], back:[0.26,0.18], body:[0.26,0,0.34,0.34,0.34], eye:[0.34,-0.1,0.17] }, birdBuild);
plan3d("duck",     { head:[0.50,-0.14,0.11], top:0.61, neck:[0.38,-0.14,0.1], back:[0.3,0.2], body:[0.24,0.04,0.36,0.26,0.48], eye:[0.53,-0.18,0.11] }, birdBuild);
plan3d("penguin",  { head:[0.47,-0.02,0.14], top:0.57, neck:[0.36,-0.1,0.17], back:[0.22,0.18], body:[0.2,0,0.36,0.38,0.34], eye:[0.49,-0.15,0.09] }, birdBuild);
plan3d("owl",      { head:[0.50,0,0.18], top:0.72, neck:[0.38,-0.12,0.18], back:[0.25,0.2], body:[0.23,0.02,0.4,0.34,0.36], eye:[0.45,-0.17,0.08] }, birdBuild);
plan3d("flamingo", { head:[0.93,-0.23,0.06], top:0.98, neck:[0.6,-0.14,0.05], back:[0.48,0.2], body:[0.47,0.04,0.26,0.2,0.38], eye:[0.95,-0.25,0.06] }, birdBuild);
plan3d("parrot",   { head:[0.44,-0.04,0.16], top:0.59, neck:[0.36,-0.12,0.16], back:[0.3,0.18], body:[0.3,0.02,0.32,0.42,0.32], eye:[0.45,-0.09,0.16] }, birdBuild);
plan3d("peacock",  { head:[0.5,-0.13,0.07], top:0.77, neck:[0.4,-0.14,0.08], back:[0.3,0.2], body:[0.28,0.02,0.3,0.3,0.4], eye:[0.58,-0.16,0.07] }, birdBuild);
plan3d("swan",     { head:[0.62,-0.2,0.07], top:0.67, neck:[0.45,-0.17,0.05], back:[0.28,0.22], body:[0.22,0.04,0.36,0.26,0.5], eye:[0.63,-0.25,0.06] }, birdBuild);
plan3d("dove",     { head:[0.46,-0.12,0.11], top:0.56, neck:[0.37,-0.14,0.12], back:[0.3,0.2], body:[0.26,0.03,0.32,0.28,0.42], eye:[0.5,-0.17,0.11] }, birdBuild);

/* ---------------------------------------------------- the other 28 plans */
// Same animals, in boxes. Built facing -z; the camera mostly sees them from
// behind and above, so each carries its tell on the back or the top too --
// the pig's curl, the fox's brush, the snail's shell, the robot's antenna.
const EYE3 = "#1b1b22";
const eyes3 = (bx, y, z, x, r) => { for (const s of [-1, 1]) bx(EYE3, s * x, y, z, r || 0.035, r || 0.045, 0.02); };
const legs3 = (bx, c, xs, zs, h, w) => { for (const x of xs) for (const z of zs) bx(c, x, h / 2, z, w, h, w); };
const d3 = (c, t) => R3.dark(c, t || 0.18), l3 = (c, t) => R3.light(c, t || 0.2);

plan3d("pig", { head:[0.28,-0.26,0.13], top:0.42, neck:[0.22,-0.14,0.15], back:[0.36,0.12], body:[0.26,0.04,0.36,0.26,0.46], eye:[0.33,-0.341,0.08] }, (bx, p) => {
  legs3(bx, p.body, [-0.1, 0.1], [-0.12, 0.18], 0.14, 0.08);
  bx(p.body, 0, 0.26, 0.04, 0.36, 0.26, 0.46);
  bx(p.body, 0, 0.28, -0.26, 0.28, 0.24, 0.16);
  bx(p.snout, 0, 0.25, -0.36, 0.14, 0.1, 0.06);
  for (const s of [-1, 1]) { bx(d3(p.snout, 0.4), s * 0.03, 0.25, -0.395, 0.025, 0.03, 0.01); bx(d3(p.body, 0.1), s * 0.1, 0.43, -0.24, 0.07, 0.06, 0.05, 0.4, 0, 0); }
  eyes3(bx, 0.33, -0.341, 0.08);
  bx(d3(p.body, 0.25), 0, 0.32, 0.3, 0.04, 0.08, 0.04, 0, 0, 0.6);
});
plan3d("cow", { head:[0.52,-0.32,0.13], top:0.66, neck:[0.4,-0.22,0.14], back:[0.46,0.12], body:[0.4,0.04,0.36,0.3,0.54], eye:[0.58,-0.391,0.08] }, (bx, p) => {
  legs3(bx, p.body, [-0.11, 0.11], [-0.16, 0.22], 0.26, 0.08);
  for (const x of [-0.11, 0.11]) for (const z of [-0.16, 0.22]) bx(p.hoof || "#3a3a44", x, 0.02, z, 0.085, 0.04, 0.085);
  bx(p.body, 0, 0.4, 0.04, 0.36, 0.3, 0.54);
  bx(p.patch, 0.181, 0.44, 0.1, 0.01, 0.14, 0.2); bx(p.patch, -0.181, 0.38, -0.08, 0.01, 0.12, 0.14); bx(p.patch, 0, 0.551, 0.14, 0.18, 0.01, 0.16);
  bx(p.body, 0, 0.52, -0.3, 0.26, 0.24, 0.18);
  bx(p.muzzle, 0, 0.46, -0.4, 0.22, 0.12, 0.04);
  for (const s of [-1, 1]) { bx(p.horn, s * 0.1, 0.68, -0.3, 0.04, 0.1, 0.04); bx(p.body, s * 0.16, 0.58, -0.28, 0.08, 0.04, 0.06); }
  eyes3(bx, 0.58, -0.391, 0.08);
  bx(d3(p.body, 0.3), 0, 0.36, 0.32, 0.03, 0.2, 0.03);
});
plan3d("sheep", { head:[0.4,-0.3,0.1], top:0.54, neck:[0.32,-0.2,0.12], back:[0.44,0.12], body:[0.36,0.04,0.42,0.32,0.5], eye:[0.45,-0.352,0.05] }, (bx, p) => {
  legs3(bx, p.skin, [-0.1, 0.1], [-0.12, 0.18], 0.22, 0.06);
  bx(p.body, 0, 0.38, 0.04, 0.42, 0.3, 0.5);
  for (const [x, y, z] of [[-0.12, 0.54, -0.06], [0.1, 0.55, 0.12], [0, 0.52, 0.22], [-0.08, 0.5, 0.2]]) bx(p.body, x, y, z, 0.16, 0.08, 0.16);
  bx(p.skin, 0, 0.42, -0.28, 0.18, 0.2, 0.14);
  bx(p.body, 0, 0.53, -0.28, 0.16, 0.05, 0.12);
  for (const s of [-1, 1]) bx(p.skin, s * 0.13, 0.44, -0.26, 0.08, 0.04, 0.05);
  for (const s of [-1, 1]) { bx("#ffffff", s * 0.05, 0.45, -0.352, 0.035, 0.035, 0.01); bx(EYE3, s * 0.05, 0.45, -0.357, 0.018, 0.018, 0.01); }
});
plan3d("bunny", { head:[0.44,-0.08,0.13], top:0.56, neck:[0.32,-0.12,0.14], back:[0.24,0.16], body:[0.22,0.04,0.3,0.34,0.32], eye:[0.48,-0.191,0.07] }, (bx, p) => {
  for (const s of [-1, 1]) bx(d3(p.body, 0.08), s * 0.1, 0.03, -0.06, 0.1, 0.06, 0.2);
  bx(p.body, 0, 0.22, 0.04, 0.3, 0.34, 0.32);
  bx(p.tail, 0, 0.18, 0.22, 0.1, 0.1, 0.06);
  bx(p.body, 0, 0.44, -0.08, 0.24, 0.22, 0.22);
  for (const s of [-1, 1]) { bx(p.body, s * 0.06, 0.7, -0.04, 0.06, 0.3, 0.04, 0, 0, -s * 0.1); bx(p.inner, s * 0.06, 0.7, -0.062, 0.03, 0.22, 0.01, 0, 0, -s * 0.1); }
  bx(p.inner, 0, 0.4, -0.195, 0.04, 0.03, 0.02);
  eyes3(bx, 0.48, -0.191, 0.07);
});
plan3d("pony", { head:[0.66,-0.34,0.09], top:0.78, neck:[0.56,-0.24,0.08], back:[0.44,0.12], body:[0.42,0.06,0.28,0.24,0.5], eye:[0.74,-0.46,0.05] }, (bx, p) => {
  legs3(bx, p.body, [-0.08, 0.08], [-0.14, 0.24], 0.3, 0.07);
  for (const x of [-0.08, 0.08]) for (const z of [-0.14, 0.24]) bx(p.hoof, x, 0.02, z, 0.075, 0.04, 0.075);
  bx(p.body, 0, 0.42, 0.06, 0.28, 0.24, 0.5);
  bx(p.body, 0, 0.6, -0.2, 0.14, 0.3, 0.14, -0.4, 0, 0);
  bx(p.mane, 0, 0.66, -0.14, 0.06, 0.3, 0.06, -0.4, 0, 0);
  bx(p.body, 0, 0.72, -0.34, 0.14, 0.14, 0.24);
  for (const s of [-1, 1]) bx(p.body, s * 0.05, 0.82, -0.26, 0.04, 0.08, 0.04);
  if (p.horn) bx(p.horn, 0, 0.9, -0.36, 0.04, 0.18, 0.04, -0.3, 0, 0);
  eyes3(bx, 0.74, -0.41, 0.071);
  bx(p.mane, 0, 0.36, 0.34, 0.08, 0.3, 0.08, 0.3, 0, 0);
});
plan3d("fox", { head:[0.36,-0.26,0.11], top:0.48, neck:[0.3,-0.16,0.12], back:[0.34,0.12], body:[0.3,0.04,0.26,0.2,0.46], eye:[0.4,-0.351,0.07] }, (bx, p) => {
  legs3(bx, p.socks, [-0.08, 0.08], [-0.12, 0.2], 0.2, 0.06);
  bx(p.body, 0, 0.3, 0.04, 0.26, 0.2, 0.46);
  bx(p.chest, 0, 0.28, -0.2, 0.18, 0.14, 0.02);
  bx(p.body, 0, 0.36, -0.26, 0.22, 0.2, 0.18);
  bx(p.body, 0, 0.32, -0.4, 0.1, 0.08, 0.12);
  bx(EYE3, 0, 0.33, -0.465, 0.04, 0.035, 0.02);
  for (const s of [-1, 1]) bx(p.body, s * 0.07, 0.52, -0.24, 0.07, 0.14, 0.05);
  eyes3(bx, 0.4, -0.351, 0.07);
  bx(p.body, 0, 0.38, 0.34, 0.16, 0.16, 0.26, 0.5, 0, 0);
  bx(p.tip, 0, 0.5, 0.46, 0.1, 0.1, 0.06, 0.5, 0, 0);
});
plan3d("bear", { head:[0.46,-0.24,0.14], top:0.66, neck:[0.36,-0.16,0.16], back:[0.38,0.16], body:[0.3,0.06,0.42,0.36,0.5], eye:[0.54,-0.381,0.08] }, (bx, p) => {
  legs3(bx, p.body, [-0.12, 0.12], [-0.12, 0.2], 0.16, 0.12);
  bx(p.body, 0, 0.3, 0.06, 0.42, 0.34, 0.5);
  bx(p.body, 0, 0.5, -0.24, 0.3, 0.28, 0.26);
  for (const s of [-1, 1]) bx(p.body, s * 0.13, 0.66, -0.22, 0.09, 0.08, 0.06);
  bx(p.muzzle, 0, 0.44, -0.39, 0.14, 0.1, 0.06);
  bx("#2a2020", 0, 0.47, -0.425, 0.05, 0.04, 0.02);
  eyes3(bx, 0.54, -0.381, 0.08);
});
plan3d("hedgehog", { head:[0.2,-0.3,0.09], top:0.3, neck:[0.18,-0.2,0.1], back:[0.32,0.16], body:[0.18,0.06,0.36,0.3,0.42], eye:[0.24,-0.271,0.08] }, (bx, p) => {
  legs3(bx, d3(p.skin, 0.3), [-0.1, 0.1], [-0.1, 0.16], 0.05, 0.06);
  bx(p.skin, 0, 0.18, -0.2, 0.26, 0.2, 0.14);
  bx(p.skin, 0, 0.16, -0.32, 0.1, 0.08, 0.12);
  bx("#2a2020", 0, 0.17, -0.385, 0.04, 0.04, 0.02);
  bx(p.body, 0, 0.2, 0.08, 0.36, 0.3, 0.4);
  for (let i = 0; i < 9; i++) { const x = ((i % 3) - 1) * 0.12, z = Math.floor(i / 3) * 0.13 - 0.06; bx(d3(p.body, 0.12), x, 0.38, z, 0.06, 0.1, 0.06, 0.3, 0, x * 2); }
  eyes3(bx, 0.24, -0.271, 0.08);
});
plan3d("frog", { head:[0.34,-0.08,0.16], top:0.48, neck:[0.22,-0.14,0.16], back:[0.26,0.16], body:[0.22,0.02,0.4,0.3,0.4], eye:[0.43,-0.141,0.11] }, (bx, p) => {
  for (const s of [-1, 1]) { bx(d3(p.body, 0.1), s * 0.2, 0.1, 0.1, 0.12, 0.14, 0.26); bx(p.body, s * 0.12, 0.03, -0.14, 0.08, 0.06, 0.08); }
  bx(p.body, 0, 0.22, 0.02, 0.4, 0.3, 0.4);
  bx(p.belly, 0, 0.16, -0.181, 0.3, 0.16, 0.01);
  for (const s of [-1, 1]) { bx(p.body, s * 0.11, 0.42, -0.08, 0.12, 0.1, 0.12); bx("#ffffff", s * 0.11, 0.43, -0.141, 0.08, 0.07, 0.01); bx(EYE3, s * 0.11, 0.43, -0.146, 0.04, 0.04, 0.01); }
  bx(d3(p.body, 0.4), 0, 0.28, -0.181, 0.2, 0.015, 0.01);
});
plan3d("cat", { head:[0.44,-0.1,0.13], top:0.58, neck:[0.3,-0.12,0.13], back:[0.26,0.14], body:[0.2,0.04,0.26,0.36,0.3], eye:[0.47,-0.191,0.06] }, (bx, p) => {
  for (const s of [-1, 1]) bx(p.body, s * 0.07, 0.1, -0.12, 0.06, 0.2, 0.06);
  bx(p.body, 0, 0.2, 0.04, 0.26, 0.36, 0.3);
  bx(p.body, 0, 0.44, -0.08, 0.26, 0.22, 0.22);
  for (const s of [-1, 1]) { bx(p.body, s * 0.08, 0.6, -0.08, 0.07, 0.1, 0.05); bx(p.inner, s * 0.08, 0.59, -0.107, 0.035, 0.06, 0.01); }
  bx(p.inner, 0, 0.42, -0.195, 0.03, 0.025, 0.02);
  for (const s of [-1, 1]) bx(d3(p.body, 0.4), s * 0.15, 0.41, -0.18, 0.1, 0.008, 0.008);
  eyes3(bx, 0.47, -0.191, 0.06);
  bx(p.body, 0, 0.22, 0.24, 0.05, 0.05, 0.14); bx(p.body, 0, 0.36, 0.3, 0.05, 0.26, 0.05);
});
plan3d("dog", { head:[0.44,-0.26,0.13], top:0.58, neck:[0.34,-0.18,0.13], back:[0.36,0.12], body:[0.32,0.04,0.28,0.22,0.46], eye:[0.5,-0.351,0.07] }, (bx, p) => {
  legs3(bx, p.body, [-0.08, 0.08], [-0.12, 0.2], 0.22, 0.07);
  bx(p.body, 0, 0.32, 0.04, 0.28, 0.22, 0.46);
  bx(p.body, 0, 0.46, -0.24, 0.24, 0.22, 0.22);
  bx(p.muzzle, 0, 0.4, -0.38, 0.14, 0.1, 0.1);
  bx("#1d1d24", 0, 0.44, -0.43, 0.05, 0.04, 0.02);
  for (const s of [-1, 1]) bx(p.ear, s * 0.13, 0.46, -0.22, 0.04, 0.16, 0.1);
  eyes3(bx, 0.5, -0.351, 0.07);
  bx(p.body, 0, 0.5, 0.3, 0.05, 0.2, 0.05, 0.5, 0, 0);
});
plan3d("mouse", { head:[0.24,-0.2,0.1], top:0.36, neck:[0.18,-0.14,0.1], back:[0.2,0.12], body:[0.16,0.06,0.26,0.24,0.34], eye:[0.26,-0.261,0.05] }, (bx, p) => {
  for (const s of [-1, 1]) bx(p.inner, s * 0.08, 0.02, -0.08, 0.06, 0.04, 0.08);
  bx(p.body, 0, 0.16, 0.06, 0.26, 0.24, 0.34);
  bx(p.body, 0, 0.22, -0.18, 0.18, 0.16, 0.16);
  bx(p.body, 0, 0.2, -0.28, 0.08, 0.07, 0.08);
  bx(p.inner, 0, 0.21, -0.325, 0.03, 0.03, 0.02);
  for (const s of [-1, 1]) { bx(p.body, s * 0.1, 0.36, -0.14, 0.12, 0.12, 0.03); bx(p.inner, s * 0.1, 0.36, -0.157, 0.07, 0.07, 0.01); }
  eyes3(bx, 0.26, -0.261, 0.05);
  bx(p.tail, 0, 0.06, 0.3, 0.025, 0.025, 0.24); bx(p.tail, 0, 0.12, 0.42, 0.025, 0.14, 0.025);
});
plan3d("turtle", { head:[0.2,-0.34,0.08], top:0.3, neck:[0.18,-0.26,0.08], back:[0.34,0.1], body:[0.2,0.04,0.44,0.24,0.46], eye:[0.23,-0.421,0.05] }, (bx, p) => {
  legs3(bx, p.body, [-0.16, 0.16], [-0.14, 0.18], 0.08, 0.1);
  bx(p.body, 0, 0.14, -0.3, 0.1, 0.1, 0.16);
  bx(p.body, 0, 0.2, -0.36, 0.14, 0.12, 0.12);
  eyes3(bx, 0.23, -0.421, 0.05);
  bx(l3(p.shell, 0.25), 0, 0.1, 0.04, 0.46, 0.06, 0.48);
  bx(p.shell, 0, 0.22, 0.04, 0.42, 0.2, 0.44);
  bx(p.shell, 0, 0.34, 0.04, 0.28, 0.08, 0.3);
  for (const [x, z] of [[-0.08, -0.06], [0.08, -0.06], [-0.08, 0.12], [0.08, 0.12]]) bx(p.plate, x, 0.385, z, 0.1, 0.01, 0.1);
});
plan3d("lizard", { head:[0.16,-0.3,0.07], top:0.24, neck:[0.12,-0.2,0.07], back:[0.18,0.06], body:[0.1,0.0,0.2,0.14,0.4], eye:[0.19,-0.356,0.08] }, (bx, p) => {
  for (const x of [-0.14, 0.14]) for (const z of [-0.12, 0.12]) bx(d3(p.body, 0.1), x, 0.05, z, 0.1, 0.05, 0.05);
  bx(p.body, 0, 0.1, 0.0, 0.2, 0.14, 0.4);
  bx(p.belly, 0, 0.03, 0, 0.16, 0.01, 0.34);
  bx(p.body, 0, 0.14, -0.28, 0.16, 0.12, 0.18);
  if (p.crest) for (let i = 0; i < 4; i++) bx(p.crest, 0, 0.2, -0.12 + i * 0.1, 0.03, 0.06, 0.05);
  for (const s of [-1, 1]) { bx("#ffffff", s * 0.07, 0.19, -0.33, 0.05, 0.05, 0.05); bx(EYE3, s * 0.08, 0.19, -0.356, 0.03, 0.03, 0.01); }
  bx(p.body, 0, 0.07, 0.3, 0.08, 0.06, 0.24); bx(p.body, 0, 0.05, 0.44, 0.05, 0.04, 0.1);
});
plan3d("snail", { head:[0.34,-0.3,0.08], top:0.42, neck:[0.2,-0.3,0.07], back:[0.3,0.1], body:[0.28,0.08,0.26,0.36,0.34], eye:[0.5,-0.33,0.05] }, (bx, p) => {
  bx(p.body, 0, 0.05, -0.04, 0.22, 0.1, 0.8 * 0.56);
  bx(p.body, 0, 0.22, -0.3, 0.14, 0.3, 0.12);
  for (const s of [-1, 1]) { bx(p.body, s * 0.05, 0.42, -0.3, 0.025, 0.14, 0.025); bx("#ffffff", s * 0.05, 0.5, -0.3, 0.05, 0.05, 0.05); bx(EYE3, s * 0.05, 0.5, -0.328, 0.025, 0.025, 0.01); }
  bx(p.shell, 0, 0.3, 0.08, 0.26, 0.36, 0.34);
  bx(p.spiral, 0.131, 0.3, 0.08, 0.01, 0.2, 0.2); bx(p.shell, 0.137, 0.3, 0.08, 0.01, 0.12, 0.12); bx(p.spiral, 0.142, 0.3, 0.08, 0.01, 0.05, 0.05);
  bx(p.spiral, -0.131, 0.3, 0.08, 0.01, 0.2, 0.2); bx(p.shell, -0.137, 0.3, 0.08, 0.01, 0.12, 0.12);
});
plan3d("bee", { head:[0.34,-0.24,0.1], top:0.46, neck:[0.3,-0.14,0.1], back:[0.4,0.14], body:[0.34,0.06,0.3,0.28,0.4], eye:[0.38,-0.297,0.06] }, (bx, p) => {
  for (const s of [-1, 1]) bx(p.band, s * 0.06, 0.1, 0, 0.02, 0.2, 0.02);
  bx(p.body, 0, 0.34, 0.06, 0.3, 0.28, 0.4);
  for (const z of [0, 0.14]) bx(p.band, 0, 0.34, z, 0.31, 0.29, 0.06);
  bx(p.band, 0, 0.32, 0.29, 0.06, 0.06, 0.06);
  bx(p.band, 0, 0.36, -0.22, 0.22, 0.22, 0.14);
  for (const s of [-1, 1]) { bx("#ffffff", s * 0.06, 0.38, -0.292, 0.06, 0.06, 0.01); bx(EYE3, s * 0.06, 0.38, -0.297, 0.03, 0.03, 0.01); bx(p.band, s * 0.05, 0.53, -0.26, 0.02, 0.12, 0.02, 0.3, 0, 0); }
  for (const s of [-1, 1]) bx(p.wing, s * 0.16, 0.54, 0.06, 0.2, 0.02, 0.16, 0, 0, -s * 0.4);
});
plan3d("ladybug", { head:[0.14,-0.28,0.08], top:0.26, neck:[0.12,-0.2,0.08], back:[0.34,0.1], body:[0.2,0.06,0.4,0.28,0.46], eye:[0.17,-0.335,0.06] }, (bx, p) => {
  legs3(bx, p.spot, [-0.16, 0.16], [-0.1, 0.06, 0.2], 0.05, 0.03);
  bx(p.spot, 0, 0.14, -0.26, 0.2, 0.14, 0.14);
  for (const s of [-1, 1]) { bx("#ffffff", s * 0.06, 0.17, -0.332, 0.04, 0.04, 0.01); bx(p.spot, s * 0.04, 0.28, -0.3, 0.015, 0.1, 0.015, -0.4, 0, 0); }
  bx(p.body, 0, 0.2, 0.06, 0.4, 0.28, 0.46);
  bx(p.body, 0, 0.36, 0.06, 0.3, 0.06, 0.36);
  bx(p.spot, 0, 0.391, 0.06, 0.02, 0.005, 0.36);
  for (const [x, z] of [[-0.09, -0.06], [0.09, -0.06], [-0.1, 0.14], [0.1, 0.14], [0, 0.22]]) bx(p.spot, x, 0.392, z, 0.07, 0.01, 0.07);
});
plan3d("fish", { head:[0.44,-0.18,0.12], top:0.62, neck:[0.3,-0.2,0.12], back:[0.42,0.12], body:[0.4,0.04,0.2,0.36,0.46], eye:[0.46,-0.19,0.08] }, (bx, p) => {
  for (const s of [-1, 1]) { bx(p.fin, s * 0.06, 0.1, 0, 0.03, 0.2, 0.03); bx(p.fin, s * 0.06, 0.02, -0.03, 0.06, 0.04, 0.08); }
  bx(p.body, 0, 0.4, 0.04, 0.2, 0.36, 0.46);
  bx(p.belly, 0, 0.3, -0.04, 0.201, 0.14, 0.34);
  bx(p.fin, 0, 0.62, 0.04, 0.04, 0.1, 0.2);
  bx(p.fin, 0, 0.4, 0.34, 0.04, 0.3, 0.16);
  for (const s of [-1, 1]) { bx(p.fin, s * 0.11, 0.36, -0.02, 0.02, 0.08, 0.12); bx("#ffffff", s * 0.101, 0.46, -0.1, 0.01, 0.1, 0.1); bx(EYE3, s * 0.104, 0.46, -0.11, 0.01, 0.05, 0.05); }
  bx(d3(p.body, 0.3), 0, 0.38, -0.195, 0.08, 0.04, 0.01);
});
plan3d("octopus", { head:[0.44,0,0.16], top:0.66, neck:[0.18,-0.1,0.18], back:[0.4,0.18], body:[0.44,0,0.36,0.4,0.34], eye:[0.45,-0.177,0.08] }, (bx, p) => {
  for (let i = 0; i < 6; i++) { const a = i * 1.047; bx(i % 2 ? d3(p.body, 0.12) : p.body, Math.cos(a) * 0.14, 0.1, Math.sin(a) * 0.14, 0.07, 0.2, 0.07, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); }
  bx(p.body, 0, 0.26, 0, 0.3, 0.12, 0.3);
  bx(p.body, 0, 0.46, 0, 0.36, 0.34, 0.34);
  for (const s of [-1, 1]) { bx("#ffffff", s * 0.08, 0.46, -0.172, 0.08, 0.09, 0.01); bx(EYE3, s * 0.08, 0.45, -0.177, 0.04, 0.05, 0.01); }
});
plan3d("crab", { head:[0.2,-0.16,0.1], top:0.36, neck:[0.18,-0.18,0.12], back:[0.26,0.14], body:[0.18,0.04,0.42,0.18,0.3], eye:[0.4,-0.11,0.07] }, (bx, p) => {
  for (const s of [-1, 1]) for (const z of [-0.08, 0.02, 0.12]) bx(d3(p.body, 0.1), s * 0.26, 0.06, z, 0.14, 0.03, 0.03, 0, 0, s * 0.5);
  bx(p.body, 0, 0.18, 0.04, 0.42, 0.18, 0.3);
  bx(p.belly, 0, 0.14, -0.111, 0.3, 0.08, 0.01);
  for (const s of [-1, 1]) {
    bx(p.body, s * 0.3, 0.26, -0.14, 0.06, 0.18, 0.06, 0, 0, -s * 0.5);
    bx(p.body, s * 0.36, 0.38, -0.18, 0.12, 0.1, 0.12);
    bx(l3(p.body, 0.2), s * 0.4, 0.46, -0.2, 0.04, 0.08, 0.04);
    bx(p.body, s * 0.07, 0.32, -0.08, 0.025, 0.12, 0.025);
    bx("#ffffff", s * 0.07, 0.4, -0.08, 0.05, 0.05, 0.05); bx(EYE3, s * 0.07, 0.4, -0.107, 0.025, 0.025, 0.01);
  }
});
plan3d("dragon", { head:[0.68,-0.2,0.1], top:0.82, neck:[0.5,-0.1,0.1], back:[0.46,0.14], body:[0.42,0.04,0.3,0.4,0.3], eye:[0.72,-0.301,0.06] }, (bx, p) => {
  for (const s of [-1, 1]) bx(d3(p.body, 0.1), s * 0.08, 0.1, 0.02, 0.1, 0.2, 0.12);
  bx(p.body, 0, 0.36, 0.04, 0.3, 0.36, 0.3);
  bx(p.belly, 0, 0.34, -0.111, 0.2, 0.28, 0.01);
  bx(p.body, 0, 0.58, -0.1, 0.16, 0.16, 0.16);
  bx(p.body, 0, 0.68, -0.2, 0.2, 0.18, 0.2);
  bx(p.body, 0, 0.64, -0.34, 0.14, 0.1, 0.12);
  for (const s of [-1, 1]) { bx(p.horn, s * 0.06, 0.82, -0.16, 0.03, 0.12, 0.03, 0.4, 0, 0); bx(p.wing, s * 0.2, 0.54, 0.14, 0.26, 0.02, 0.22, 0, 0, -s * 0.5); }
  eyes3(bx, 0.72, -0.301, 0.06);
  bx(p.body, 0, 0.14, 0.28, 0.1, 0.08, 0.24); bx(p.wing, 0, 0.1, 0.44, 0.1, 0.1, 0.06);
  for (let i = 0; i < 3; i++) bx(p.wing, 0, 0.56 - i * 0.14, 0.2, 0.03, 0.06, 0.05);
});
plan3d("ghost", { head:[0.5,0,0.16], top:0.72, neck:[0.32,-0.14,0.18], back:[0.4,0.18], body:[0.4,0,0.34,0.5,0.32], eye:[0.52,-0.162,0.07] }, (bx, p) => {
  bx(p.body, 0, 0.36, 0, 0.34, 0.56, 0.32);
  bx(p.body, 0, 0.68, 0, 0.26, 0.08, 0.24);
  for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) bx(p.body, x, 0.05, z, 0.08, 0.06, 0.08);
  for (const s of [-1, 1]) { bx(EYE3, s * 0.07, 0.52, -0.162, 0.04, 0.06, 0.01); bx(p.cheek || "#ffb6d0", s * 0.12, 0.44, -0.162, 0.05, 0.025, 0.01); bx(p.body, s * 0.19, 0.4, -0.02, 0.05, 0.12, 0.08, 0, 0, s * 0.5); }
  bx("#3a3a52", 0, 0.43, -0.162, 0.03, 0.04, 0.01);
});
plan3d("blob", { head:[0.3,0,0.2], top:0.5, neck:[0.12,-0.12,0.2], back:[0.24,0.2], body:[0.24,0,0.42,0.46,0.4], eye:[0.3,-0.177,0.08] }, (bx, p) => {
  bx(p.body, 0, 0.12, 0, 0.44, 0.24, 0.42);
  bx(p.body, 0, 0.3, 0, 0.36, 0.2, 0.34);
  bx(p.body, 0, 0.44, 0, 0.22, 0.1, 0.2);
  bx(l3(p.body, 0.35), -0.1, 0.4, -0.1, 0.06, 0.06, 0.06);
  for (const s of [-1, 1]) { bx("#ffffff", s * 0.08, 0.3, -0.172, 0.08, 0.09, 0.01); bx(EYE3, s * 0.08, 0.29, -0.177, 0.04, 0.05, 0.01); }
  bx(d3(p.body, 0.4), 0, 0.2, -0.212, 0.1, 0.02, 0.01);
});
plan3d("robot", { head:[0.7,-0.02,0.14], top:0.86, neck:[0.52,-0.04,0.12], back:[0.36,0.14], body:[0.36,0,0.36,0.34,0.26], eye:[0.67,-0.147,0.05] }, (bx, p) => {
  for (const s of [-1, 1]) { bx(d3(p.body, 0.15), s * 0.08, 0.1, 0, 0.1, 0.2, 0.12); bx(p.visor, s * 0.08, 0.02, -0.02, 0.12, 0.04, 0.16); }
  bx(p.body, 0, 0.36, 0, 0.36, 0.34, 0.26);
  bx(p.visor, 0, 0.38, -0.131, 0.2, 0.12, 0.01);
  for (const [x, c] of [[-0.05, "#ff5a5a"], [0, "#ffd23f"], [0.05, "#5ad97a"]]) bx(c, x, 0.38, -0.137, 0.025, 0.025, 0.01);
  for (const s of [-1, 1]) bx(p.accent, s * 0.22, 0.36, 0, 0.06, 0.24, 0.08);
  bx(p.body, 0, 0.66, -0.02, 0.28, 0.24, 0.24);
  bx(p.visor, 0, 0.67, -0.141, 0.22, 0.1, 0.01);
  for (const s of [-1, 1]) bx(p.accent, s * 0.05, 0.67, -0.147, 0.035, 0.035, 0.01);
  bx(p.visor, 0, 0.84, -0.02, 0.02, 0.12, 0.02); bx(p.accent, 0, 0.91, -0.02, 0.05, 0.05, 0.05);
});
plan3d("cupcake", { head:[0.52,0,0.18], top:0.64, neck:[0.34,-0.12,0.2], back:[0.24,0.2], body:[0.18,0,0.32,0.28,0.32], eye:[0.22,-0.161,0.07] }, (bx, p) => {
  for (const s of [-1, 1]) bx(d3(p.wrapper, 0.3), s * 0.08, 0.02, -0.02, 0.08, 0.04, 0.1);
  bx(p.wrapper, 0, 0.18, 0, 0.3, 0.28, 0.3);
  for (let i = -1; i <= 1; i++) bx(d3(p.wrapper, 0.15), i * 0.1, 0.18, -0.152, 0.015, 0.26, 0.01);
  bx(p.body, 0, 0.36, 0, 0.38, 0.1, 0.38);
  bx(p.body, 0, 0.46, 0, 0.28, 0.1, 0.28);
  bx(p.body, 0, 0.55, 0, 0.16, 0.08, 0.16);
  bx(p.cherry, 0, 0.63, 0, 0.08, 0.08, 0.08);
  for (const [x, z, c] of [[-0.12, -0.14, "#ffd23f"], [0.1, -0.12, "#5ad9c0"], [0.06, 0.1, "#8e7bff"]]) bx(c, x, 0.41, z, 0.03, 0.01, 0.03);
  eyes3(bx, 0.22, -0.161, 0.07);
});
plan3d("fruit", { head:[0.34,0,0.18], top:0.54, neck:[0.12,-0.12,0.2], back:[0.3,0.2], body:[0.3,0,0.4,0.4,0.4], eye:[0.34,-0.201,0.08] }, (bx, p) => {
  for (const s of [-1, 1]) { bx("#3a3a44", s * 0.08, 0.06, 0, 0.04, 0.12, 0.04); bx("#3a3a44", s * 0.08, 0.01, -0.03, 0.06, 0.03, 0.08); }
  const f = p.form || "apple";
  if (f === "lemon") { bx(p.body, 0, 0.32, 0, 0.44, 0.32, 0.34); bx(p.body, 0.24, 0.32, 0, 0.08, 0.1, 0.1); bx(p.body, -0.24, 0.32, 0, 0.08, 0.1, 0.1); }
  else if (f === "pear") { bx(p.body, 0, 0.26, 0, 0.36, 0.28, 0.36); bx(p.body, 0, 0.46, 0, 0.22, 0.16, 0.22); }
  else if (f === "berry") { bx(p.body, 0, 0.36, 0, 0.4, 0.2, 0.38); bx(p.body, 0, 0.2, 0, 0.26, 0.14, 0.26); for (const [x, z] of [[-0.12, -0.2], [0.1, -0.2]]) bx("#fff2a0", x, 0.34, z, 0.03, 0.03, 0.01); }
  else if (f === "grape") { for (const [x, y, z] of [[-0.1, 0.38, 0], [0.1, 0.38, 0], [0, 0.38, 0.12], [0, 0.24, 0], [-0.1, 0.24, 0.1], [0.1, 0.24, 0.1], [0, 0.12, 0.05]]) bx(p.body, x, y, z, 0.18, 0.16, 0.18); }
  else bx(p.body, 0, 0.3, 0, 0.4, 0.36, 0.38);
  bx("#6a4a2a", 0, 0.52, 0, 0.03, 0.08, 0.03);
  bx(p.leaf, 0.06, 0.52, 0, 0.1, 0.02, 0.06, 0, 0, -0.3);
  eyes3(bx, 0.34, -0.201, 0.08);
  bx(d3(p.body, 0.45), 0, 0.26, -0.201, 0.08, 0.02, 0.01);
});
plan3d("teapot", { head:[0.44,0,0.16], top:0.54, neck:[0.4,-0.08,0.18], back:[0.3,0.2], body:[0.24,0,0.4,0.34,0.36], eye:[0.3,-0.181,0.08] }, (bx, p) => {
  for (const [x, z] of [[-0.12, -0.1], [0.12, -0.1], [-0.12, 0.12], [0.12, 0.12]]) bx(d3(p.body, 0.2), x, 0.03, z, 0.07, 0.06, 0.07);
  bx(p.body, 0, 0.24, 0, 0.4, 0.34, 0.36);
  bx(p.accent, 0, 0.26, 0, 0.41, 0.04, 0.37);
  bx(d3(p.body, 0.1), 0, 0.43, 0, 0.26, 0.06, 0.24);
  bx(p.accent, 0, 0.5, 0, 0.07, 0.06, 0.07);
  bx(p.body, 0, 0.3, -0.26, 0.06, 0.06, 0.18, -0.6, 0, 0);
  bx(p.body, 0, 0.26, 0.24, 0.05, 0.2, 0.06); bx(p.body, 0, 0.36, 0.22, 0.05, 0.05, 0.06); bx(p.body, 0, 0.16, 0.22, 0.05, 0.05, 0.06);
  eyes3(bx, 0.3, -0.181, 0.08);
});
plan3d("person", { head:[0.66,-0.02,0.13], top:0.8, neck:[0.5,-0.02,0.1], back:[0.38,0.12], body:[0.38,0,0.3,0.28,0.2], eye:[0.66,-0.141,0.06] }, (bx, p) => {
  const f = p.form || "short";
  for (const s of [-1, 1]) { bx(p.pants, s * 0.07, 0.14, 0, 0.1, 0.26, 0.1); bx(p.shoes, s * 0.07, 0.02, -0.02, 0.11, 0.04, 0.14); }
  bx(p.body, 0, 0.38, 0, 0.3, 0.28, 0.2);
  for (const s of [-1, 1]) { bx(p.body, s * 0.19, 0.4, 0, 0.08, 0.2, 0.08); bx(p.skin, s * 0.19, 0.27, 0, 0.07, 0.06, 0.07); }
  bx(p.skin, 0, 0.64, -0.02, 0.26, 0.26, 0.24);
  eyes3(bx, 0.66, -0.141, 0.06);
  bx(d3(p.skin, 0.4), 0, 0.58, -0.141, 0.07, 0.015, 0.01);
  if (f !== "bald") {
    bx(p.hair, 0, 0.78, 0.0, 0.28, 0.05, 0.26);
    bx(p.hair, 0, 0.66, 0.11, 0.28, 0.2, 0.05);
    if (f === "long" || f === "braid") bx(p.hair, 0, 0.5, 0.13, 0.26, f === "braid" ? 0.36 : 0.26, 0.05);
    if (f === "bun") bx(p.hair, 0, 0.78, 0.12, 0.1, 0.1, 0.1);
    if (f === "curly") for (const [x, z] of [[-0.1, -0.08], [0.1, -0.08], [0, 0.08]]) bx(p.hair, x, 0.8, z, 0.1, 0.08, 0.1);
  }
});

/* ------------------------------------------------------------- extras */
const X3 = {
  // "name" or "name:rrggbb"
  xc(spec, fallback) { const i = spec.indexOf(":"); return i < 0 ? [spec, fallback] : [spec.slice(0, i), "#" + spec.slice(i + 1)]; },

  hat(bx, A, spec) {
    const [kind, col] = this.xc(spec, "#e84a4a");
    const [, hz, hr] = A.head, y = A.top, r = Math.max(0.08, hr);
    const room = Math.max(0.05, TOP3D - y);
    const H = (h) => Math.min(h, room);           // a hat never pokes above TOP3D
    const dk = R3.dark(col, 0.25), red = col === "#e84a4a";
    switch (kind) {
      case "cap": bx(col, 0, y + H(0.06), hz, r * 1.9, H(0.12), r * 1.9); bx(dk, 0, y + 0.01, hz - r * 1.2, r * 1.5, 0.03, r * 1.1); break;
      case "beanie": bx(col, 0, y + H(0.08), hz, r * 2, H(0.16), r * 2); bx(dk, 0, y + 0.02, hz, r * 2.1, 0.05, r * 2.1); bx("#ffffff", 0, y + H(0.2), hz, 0.07, H(0.07), 0.07); break;
      case "bow": for (const s of [-1, 1]) bx(col, s * 0.07, y + 0.05, hz, 0.1, 0.09, 0.05, 0, 0, s * 0.4); bx(dk, 0, y + 0.05, hz, 0.05, 0.05, 0.06); break;
      case "flower": for (let i = 0; i < 5; i++) { const a = i * 1.2566; bx(col, Math.cos(a) * 0.06, y + 0.04, hz + Math.sin(a) * 0.06, 0.07, 0.03, 0.07); } bx("#ffd23f", 0, y + 0.05, hz, 0.06, 0.04, 0.06); break;
      case "crown": { const c = red ? "#f6c531" : col; bx(c, 0, y + H(0.05), hz, r * 1.7, H(0.1), r * 1.7); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(c, dx * r * 0.7, y + H(0.13), hz + dz * r * 0.7, 0.04, H(0.08), 0.04); break; }
      case "tophat": bx(col, 0, y + 0.015, hz, r * 2.6, 0.03, r * 2.6); bx(col, 0, y + H(0.2) / 2, hz, r * 1.5, H(0.2), r * 1.5); bx("#e84a4a", 0, y + 0.05, hz, r * 1.55, 0.03, r * 1.55); break;
      case "party": for (let i = 0; i < 4; i++) bx(i % 2 ? "#ffffff" : col, 0, y + i * H(0.26) / 4 + 0.03, hz, r * (1.3 - i * 0.3), H(0.26) / 4, r * (1.3 - i * 0.3)); bx("#ffd23f", 0, y + H(0.28), hz, 0.05, 0.05, 0.05); break;
      case "chef": bx("#ffffff", 0, y + 0.05, hz, r * 1.6, 0.1, r * 1.6); bx("#ffffff", 0, y + H(0.17), hz, r * 2.1, H(0.12), r * 2.1); break;
      case "straw": bx("#e8c56a", 0, y + 0.015, hz, r * 3.2, 0.03, r * 3.2); bx("#efd07a", 0, y + H(0.07), hz, r * 1.6, H(0.1), r * 1.6); bx(col, 0, y + 0.04, hz, r * 1.65, 0.03, r * 1.65); break;
      case "helmet": case "miner": { const c = kind === "miner" && red ? "#f2c230" : col; bx(c, 0, y + H(0.06), hz, r * 2.1, H(0.12), r * 2.1); bx(R3.dark(c, 0.2), 0, y + 0.01, hz, r * 2.4, 0.03, r * 2.4); if (kind === "miner") bx("#fff6c8", 0, y + 0.07, hz - r * 1.1, 0.06, 0.06, 0.03); break; }
      case "wizard": bx(col, 0, y + 0.015, hz, r * 2.8, 0.03, r * 2.8); for (let i = 0; i < 4; i++) bx(col, 0, y + 0.03 + i * H(0.3) / 4, hz, r * (1.5 - i * 0.33), H(0.3) / 4, r * (1.5 - i * 0.33)); bx("#ffd23f", 0, y + H(0.12), hz - r * 0.6, 0.05, 0.05, 0.02); break;
      case "pirate": { const c = red ? "#26262e" : col; bx(c, 0, y + H(0.06), hz, r * 2.6, H(0.12), r * 1.4); bx("#ffffff", 0, y + H(0.07), hz - r * 0.72, 0.05, 0.05, 0.02); break; }
      case "santa": bx("#d9313a", 0, y + H(0.1), hz, r * 1.7, H(0.2), r * 1.7, 0, 0, 0.3); bx("#ffffff", 0, y + 0.02, hz, r * 2, 0.05, r * 2); bx("#ffffff", r * 0.9, y + H(0.17), hz, 0.06, 0.06, 0.06); break;
      case "antlers": for (const s of [-1, 1]) { bx("#9a6a44", s * r * 0.8, y + H(0.12), hz, 0.03, H(0.24), 0.03); bx("#9a6a44", s * r * 1.1, y + H(0.2), hz, 0.12, 0.03, 0.03); } break;
      case "headphones": bx(col, 0, y + 0.02, hz, r * 2.2, 0.03, 0.04); for (const s of [-1, 1]) bx(col, s * (r * 1.1), y - r * 0.6, hz, 0.05, 0.1, 0.1); break;
      case "tiara": bx("#f2d36b", 0, y + 0.03, hz - r * 0.4, r * 1.6, 0.05, 0.03); bx(col, 0, y + 0.07, hz - r * 0.42, 0.04, 0.04, 0.03); break;
      case "cowboy": bx(col, 0, y + 0.015, hz, r * 3, 0.03, r * 2.4); bx(col, 0, y + H(0.08), hz, r * 1.5, H(0.14), r * 1.5); bx(R3.dark(col, 0.35), 0, y + 0.04, hz, r * 1.55, 0.03, r * 1.55); break;
      case "beret": bx(col, 0.02, y + 0.03, hz, r * 2.2, 0.06, r * 2.2, 0, 0, -0.2); break;
      case "sprout": bx("#5cae3a", 0, y + H(0.08), hz, 0.02, H(0.16), 0.02); for (const s of [-1, 1]) bx(red ? "#6cc04a" : col, s * 0.05, y + H(0.15), hz, 0.08, 0.02, 0.05, 0, 0, s * 0.4); break;
      case "ears": for (const s of [-1, 1]) { bx(col, s * r * 0.7, y + H(0.14), hz, 0.06, H(0.28), 0.04); bx("#ff9ab8", s * r * 0.7, y + H(0.14), hz - 0.021, 0.03, H(0.2), 0.01); } break;
      case "propeller": bx(col, 0, y + H(0.05), hz, r * 1.9, H(0.1), r * 1.9); bx("#555555", 0, y + H(0.13), hz, 0.02, H(0.06), 0.02); bx("#e84a4a", 0.07, y + H(0.17), hz, 0.14, 0.02, 0.04); bx("#4a8fe8", -0.07, y + H(0.17), hz, 0.14, 0.02, 0.04); break;
      case "grad": { const c = red ? "#26262e" : col; bx(c, 0, y + 0.04, hz, r * 1.5, 0.08, r * 1.5); bx(c, 0, y + H(0.1), hz, r * 2.5, 0.03, r * 2.5, 0, 0.78, 0); bx("#f6c531", r * 1.1, y + 0.05, hz, 0.02, 0.1, 0.02); break; }
      case "viking": bx("#9aa3ad", 0, y + H(0.06), hz, r * 2.1, H(0.12), r * 2.1); for (const s of [-1, 1]) bx("#f3ead0", s * r * 1.2, y + H(0.12), hz, 0.04, H(0.14), 0.04, 0, 0, -s * 0.5); break;
      case "laurel": for (let i = 0; i < 6; i++) { const a = i * 1.047; bx("#6cae4a", Math.cos(a) * r, y + 0.01, hz + Math.sin(a) * r, 0.06, 0.03, 0.04, 0, a, 0); } break;
      case "sailor": bx("#ffffff", 0, y + H(0.05), hz, r * 1.9, H(0.1), r * 1.9); bx(red ? "#2f5aa8" : col, 0, y + 0.02, hz, r * 1.95, 0.03, r * 1.95); break;
      case "bucket": bx(col, 0, y + 0.02, hz, r * 2.6, 0.03, r * 2.6); bx(col, 0, y + H(0.08), hz, r * 1.7, H(0.12), r * 1.7); break;
      case "halo": for (let i = 0; i < 8; i++) { const a = i * 0.785; bx("#f6d743", Math.cos(a) * r, y + H(0.14), hz + Math.sin(a) * r, 0.04, 0.02, 0.04); } break;
      case "horns": for (const s of [-1, 1]) bx(red ? "#f3ead0" : col, s * r * 0.7, y + H(0.07), hz, 0.05, H(0.14), 0.05, 0, 0, -s * 0.3); break;
      case "pumpkin": bx("#f08a24", 0, y + H(0.08), hz, r * 2, H(0.16), r * 2); bx("#4a7a2a", 0, y + H(0.18), hz, 0.03, H(0.05), 0.03); break;
      case "snorkel": bx(col, 0, y - r * 0.4, hz, r * 2.1, 0.04, r * 2.1); bx(red ? "#f2c230" : col, r * 1.05, y + H(0.06), hz, 0.03, H(0.2), 0.03); break;
      case "astronaut": bx("#dfe6ee", 0, y + 0.02, hz, r * 2.4, 0.04, r * 2.4); for (const s of [-1, 1]) bx("#dfe6ee", s * r * 1.2, y - r, hz, 0.03, r * 2, r * 2.4); break;
    }
  },

  neck(bx, A, spec) {
    const [kind, col] = this.xc(spec, "#e84a4a");
    const [y, z, r] = A.neck, w = r * 2;
    switch (kind) {
      case "scarf": bx(col, 0, y, z + r * 0.4, w + 0.02, 0.06, w * 0.9); bx(col, r * 0.5, y - 0.08, z - r * 0.4, 0.06, 0.12, 0.04); break;
      case "bow": case "bowtie": for (const s of [-1, 1]) bx(col, s * 0.045, y, z - r * 0.1, 0.06, 0.06, 0.03, 0, 0, s * 0.3); bx(R3.dark(col, 0.2), 0, y, z - r * 0.12, 0.03, 0.03, 0.03); break;
      case "bandana": bx(col, 0, y, z + r * 0.3, w, 0.05, w * 0.9); bx(col, 0, y - 0.05, z - r * 0.35, w * 0.5, 0.08, 0.03); break;
      case "medal": bx("#2f6fd6", 0, y - 0.02, z - r * 0.2, 0.04, 0.08, 0.02); bx(col === "#e84a4a" ? "#f6c531" : col, 0, y - 0.08, z - r * 0.25, 0.07, 0.07, 0.02); break;
      case "bell": bx("#c0463d", 0, y, z + r * 0.3, w, 0.04, w * 0.9); bx("#f6c531", 0, y - 0.05, z - r * 0.35, 0.06, 0.06, 0.06); break;
      case "lei": for (let i = 0; i < 8; i++) { const a = i * 0.785; bx([col, "#ffd23f", "#ff7eb6", "#ffffff"][i % 4], Math.cos(a) * r, y, z + Math.sin(a) * r, 0.05, 0.05, 0.05); } break;
      case "tie": bx(col, 0, y - 0.07, z - r * 0.25, 0.05, 0.14, 0.02); break;
      case "collar": bx(col, 0, y, z + r * 0.3, w, 0.04, w * 0.9); bx("#f6c531", 0, y - 0.04, z - r * 0.35, 0.04, 0.04, 0.03); break;
    }
  },

  face(bx, A, spec) {
    const [kind, col] = this.xc(spec, "#1d1d24");
    const [y, z, x] = A.eye, zf = z - 0.012;   // just in front of the eyes
    switch (kind) {
      case "glasses": case "specs": case "monocle": for (const s of kind === "monocle" ? [1] : [-1, 1]) { bx(col, s * x * 0.7, y, zf, 0.08, 0.015, 0.01); bx(col, s * x * 0.7, y - 0.04, zf, 0.08, 0.015, 0.01); } break;
      case "shades": bx(col, 0, y, zf, x * 2.2, 0.05, 0.015); break;
      case "mask": bx(col, 0, y, zf, x * 2.4, 0.07, 0.015); break;
      case "goggles": bx("#6b4a2f", 0, y, zf + 0.005, x * 2.5, 0.03, 0.01); for (const s of [-1, 1]) bx(col === "#1d1d24" ? "#9fd8f0" : col, s * x * 0.7, y, zf - 0.005, 0.07, 0.07, 0.015); break;
      case "blush": for (const s of [-1, 1]) bx(col === "#1d1d24" ? "#ff8aa8" : col, s * x * 0.9, y - 0.06, zf, 0.05, 0.03, 0.01); break;
      case "stache": bx(col, 0, y - 0.08, zf, 0.12, 0.03, 0.015); break;
    }
  },

  back(bx, A, spec) {
    const [kind, col] = this.xc(spec, "#d93a4a");
    const [y, z] = A.back;
    switch (kind) {
      case "cape": bx(col, 0, y - 0.04, z + 0.04, 0.34, 0.34, 0.02, 0.25, 0, 0); break;
      case "backpack": bx(col, 0, y, z + 0.06, 0.24, 0.24, 0.12); bx(R3.light(col, 0.2), 0, y - 0.06, z + 0.13, 0.18, 0.08, 0.03); break;
      case "wings": for (const s of [-1, 1]) bx(col, s * 0.16, y + 0.08, z + 0.08, 0.22, 0.16, 0.02, 0, s * 0.5, s * 0.3); break;
      case "jetpack": for (const s of [-1, 1]) { bx(col, s * 0.07, y, z + 0.1, 0.1, 0.24, 0.1); bx("#ffb03a", s * 0.07, y - 0.16, z + 0.1, 0.06, 0.06, 0.06); } break;
      case "shell": bx(col, 0, y + 0.04, z + 0.08, 0.26, 0.26, 0.14); break;
      case "leaf": bx(col, 0, y + 0.12, z + 0.1, 0.04, 0.34, 0.16, 0.3, 0, 0); break;
    }
  },

  // Markings: thin panels just proud of the body box's sides and back.
  mark(bx, A, spec, pal) {
    const [kind, col] = this.xc(spec, pal.mark || R3.dark(pal.body, 0.3));
    const [y, z, w, h, d] = A.body, sx = w / 2 + 0.006;
    const side = (u, v, pw, ph, c) => { for (const s of [-1, 1]) bx(c || col, s * sx, y + v * h / 2, z + u * d / 2, 0.012, ph, pw); };
    switch (kind) {
      case "spots": case "speckle": case "stars": case "hearts":
        for (const [u, v, r] of [[-0.5, 0.3, 0.3], [0.3, -0.2, 0.25], [0.1, 0.5, 0.2]]) side(u, v, d * r * (kind === "speckle" ? 0.4 : 0.5), h * r * (kind === "speckle" ? 0.4 : 0.5));
        break;
      case "stripes": for (const u of [-0.5, 0, 0.5]) side(u, 0, d * 0.12, h * 0.9); bx(col, 0, y + h / 2 + 0.006, z, w * 0.9, 0.012, d * 0.12); break;
      case "bands": for (const v of [-0.4, 0.2]) { side(0, v, d * 0.95, h * 0.14); bx(col, 0, y + v * h / 2, z + d / 2 + 0.006, w * 0.95, h * 0.14, 0.012); } break;
      case "patch": side(-0.3, 0.2, d * 0.45, h * 0.5); side(0.4, -0.3, d * 0.25, h * 0.3); break;
      case "belly": bx(col, 0, y - h * 0.1, z - d / 2 - 0.006, w * 0.7, h * 0.6, 0.012); break;
      case "check": for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) side(-0.66 + i * 0.66, -0.66 + j * 0.66, d * 0.3, h * 0.3); break;
      case "rainbow": ["#e84a4a", "#f4a13a", "#f6d743", "#5cc46a", "#4a8fe8"].forEach((c, i) => side(0, 0.8 - i * 0.4, d * 0.95, h * 0.2, c)); break;
    }
  },
};

/* ------------------------------------------------------------ the builder */
Object.assign(R3, {
  PLAN3D, X3,

  // Emit every box of a character, without three.js -- the tests call this
  // with a recording bx to measure all 420.
  characterParts(bx, ch) {
    const P = PLAN3D[ch.plan] || PLAN3D.chicken, A = P.anchor;
    P.build(bx, ch.pal, A);
    if (ch.mark) X3.mark(bx, A, ch.mark, ch.pal);
    if (ch.back) X3.back(bx, A, ch.back);
    if (ch.neck) X3.neck(bx, A, ch.neck);
    if (ch.face) X3.face(bx, A, ch.face);
    if (ch.hat) X3.hat(bx, A, ch.hat);
  },

  // One mesh for the whole character, inside a body group that the hop pose
  // tilts, inside the group that is positioned and faced.
  character(ch) {
    const b = this.bag(), T = this.T;
    this.characterParts((c, x, y, z, sx, sy, sz, rx, ry, rz) =>
      this.put(b, this.G.box, c, x, y, z, sx, sy, sz, rx, ry, rz), ch);
    const mat = new T.MeshLambertMaterial({ vertexColors: true, transparent: true });
    const mesh = new T.Mesh(this.geometry(b), mat);
    mesh.castShadow = true;
    const body = new T.Group(); body.add(mesh);
    const grp = new T.Group(); grp.add(body);
    return grp;
  },
});
