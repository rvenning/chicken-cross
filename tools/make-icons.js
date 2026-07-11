// Generates the PWA icons (icons/icon-192.png, icon-512.png, maskable-512.png)
// using the gamekit PNG painter (lib/tools/png.js — vendored from the gamekit
// repo by its tools/sync-to-game.js).
//
// Run: node tools/make-icons.js   (from the repo root)
//
// The artwork mirrors the in-game chicken sprite (see drawChick in index.html)
// on the game's grass green. The maskable icon draws the bird smaller so the
// OS can crop the outer ~10% into a circle/squircle without clipping it.

const fs = require("fs");
const path = require("path");
const { makeCanvas, downsample, encodePNG } = require("../lib/tools/png.js");

// Same proportions as drawChick in index.html; s = sprite half-size.
function drawIcon(size, spriteScale) {
  const SS = 4, big = size * SS;
  const cv = makeCanvas(big);
  // grass background with a subtle darker band at the bottom, like a lane edge
  cv.fillRect(0, 0, big, big, "#6bbf4a");
  cv.fillRect(0, big * 0.86, big, big * 0.14, "#5fae40");
  const cx = big / 2, cy = big * 0.52, s = big * spriteScale;
  // shadow
  cv.fillEllipse(cx, cy + s * 0.46, s * 0.44, s * 0.16, "#3d7a2a", 0.55);
  // legs
  cv.fillRoundRect(cx - s * 0.18, cy + s * 0.3, s * 0.09, s * 0.18, s * 0.045, "#f0a500");
  cv.fillRoundRect(cx + s * 0.09, cy + s * 0.3, s * 0.09, s * 0.18, s * 0.045, "#f0a500");
  // body + head
  cv.fillRoundRect(cx - s * 0.4, cy - s * 0.28, s * 0.8, s * 0.66, s * 0.28, "#ffffff");
  cv.fillRoundRect(cx - s * 0.26, cy - s * 0.5, s * 0.52, s * 0.4, s * 0.2, "#ffffff");
  // comb + wattle
  cv.fillCircle(cx - s * 0.06, cy - s * 0.52, s * 0.09, "#e8403a");
  cv.fillCircle(cx + s * 0.06, cy - s * 0.55, s * 0.09, "#e8403a");
  cv.fillRoundRect(cx - s * 0.03, cy - s * 0.2, s * 0.08, s * 0.12, s * 0.03, "#e8403a");
  // beak
  cv.fillTriangle(cx + s * 0.2, cy - s * 0.34, cx + s * 0.42, cy - s * 0.28, cx + s * 0.2, cy - s * 0.22, "#f0a500");
  // eyes
  cv.fillCircle(cx + s * 0.02, cy - s * 0.36, s * 0.05, "#222222");
  cv.fillCircle(cx + s * 0.16, cy - s * 0.36, s * 0.05, "#222222");
  return encodePNG(size, size, downsample(cv.px, big, SS));
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-512.png"), drawIcon(512, 0.42));
fs.writeFileSync(path.join(outDir, "icon-192.png"), drawIcon(192, 0.42));
// maskable: bird shrunk into the inner "safe zone" so circular masks don't clip it
fs.writeFileSync(path.join(outDir, "maskable-512.png"), drawIcon(512, 0.30));
console.log("icons written to", outDir);
