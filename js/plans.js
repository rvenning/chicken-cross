// The body plans beyond the birds: farm animals, woodland animals, pets,
// reptiles, minibeasts, sea creatures, fantasy creatures, a robot, food, a
// teapot and people. Twenty-eight silhouettes, each one a different SHAPE --
// what you would draw if you only had the outline.
//
// Every painter works in units of s (half a tile), faces right, and stands
// with its feet on y = 0.46s, exactly like the birds, and is drawn with the
// same pen (Art.bEll / bPoly / bLimb / bRibbon / bEye), so a pig and a
// peacock look like one illustrator's. `st.mark` is called straight after
// the body is drawn, so markings sit on the body and under the head.
//
// Painters read only their palette; the fields each one needs are listed in
// `needs` and asserted for all 420 characters by tests/roster.test.js.
"use strict";

// s-unit shorthands, bound to a context, a pen and a scale.
function pen(ctx, P, s) {
  return {
    E: (x, y, rx, ry, f, rot, hi) => Art.bEll(ctx, P, x * s, y * s, rx * s, ry * s, f, rot || 0, hi),
    Y: (pts, f) => Art.bPoly(ctx, P, pts.map(([x, y]) => [x * s, y * s]), f),
    L: (pts, w, f) => Art.bLimb(ctx, P, pts.map(([x, y]) => [x * s, y * s]), w * s, f),
    R: (x0, y0, cx, cy, x1, y1, w0, w1, f) => Art.bRibbon(ctx, P, x0 * s, y0 * s, cx * s, cy * s, x1 * s, y1 * s, w0 * s, w1 * s, f),
    I: (x, y, r, big, dead) => Art.bEye(ctx, P, x * s, y * s, r * s, big, dead),
    dot: (x, y, r, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x * s, y * s, Math.max(0.6, r * s), 0, 7); ctx.fill(); },
    line: (pts, w, f) => {
      ctx.strokeStyle = f; ctx.lineWidth = Math.max(0.8, w * s); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * s, y * s)); ctx.stroke();
    },
    smile: (x, y, r, f) => {
      ctx.strokeStyle = f || "#2a2a30"; ctx.lineWidth = Math.max(0.8, 0.025 * s); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x * s, y * s, r * s, 0.25, Math.PI - 0.25); ctx.stroke();
    },
  };
}
const dk = (c, n) => GK.util.shade(c, -(n || 26));
const lt = (c, n) => GK.util.shade(c, n || 26);

// Four legs from the hips to the ground: the far pair first and darker, so a
// side-on animal still reads as standing on four.
function legs4(d, o) {
  const hip = o.hip, w = o.w, col = o.col, hoof = o.hoof;
  for (const [x, c] of [[o.back + 0.05, dk(col)], [o.front + 0.05, dk(col)], [o.back - 0.02, col], [o.front - 0.02, col]]) {
    d.L([[x, hip], [x, 0.43]], w, c);
    if (hoof) d.E(x, 0.43, w * 0.62, 0.035, hoof, 0, false);
  }
}

/* ------------------------------------------------------------------ farm */
plan("pig", { cat: "Farm", label: "Pig", voice: "oink", needs: ["body", "snout"],
  pal: { body: "#f6a5b5", snout: "#ee8a9e", hoof: "#a8606e" },
  anchor: { head: [0.30, -0.16, 0.21], top: -0.40, eye: [0.36, -0.22], neck: [0.2, -0.02, 0.2], back: [-0.12, -0.2], body: [0, -0.02, 0.40, 0.28] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: 0.14, w: 0.10, back: -0.22, front: 0.18, col: p.body, hoof: p.hoof });
    d.line([[-0.38, -0.06], [-0.48, -0.12], [-0.44, -0.2], [-0.38, -0.14]], 0.03, dk(p.body, 30));
    d.E(0, -0.02, 0.40, 0.28, p.body);
    if (st.mark) st.mark();
    d.E(0.30, -0.16, 0.21, 0.20, p.body);
    d.Y([[0.20, -0.32], [0.26, -0.44], [0.32, -0.30]], dk(p.body, 12));
    d.E(0.48, -0.12, 0.08, 0.095, p.snout, 0, false);
    d.dot(0.47, -0.15, 0.018, dk(p.snout, 60)); d.dot(0.49, -0.09, 0.018, dk(p.snout, 60));
    d.I(0.36, -0.22, 0.042, false, st.dead);
  } });

plan("cow", { cat: "Farm", label: "Cow", voice: "moo", needs: ["body", "patch", "muzzle", "horn"],
  pal: { body: "#ffffff", patch: "#3a3a44", muzzle: "#f2b8c0", horn: "#efe6d0", hoof: "#3a3a44" },
  anchor: { head: [0.38, -0.34, 0.18], top: -0.54, eye: [0.40, -0.40], neck: [0.26, -0.18, 0.16], back: [-0.14, -0.26], body: [-0.02, -0.12, 0.42, 0.26] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: 0.0, w: 0.10, back: -0.26, front: 0.22, col: p.body, hoof: p.hoof });
    d.line([[-0.42, -0.2], [-0.5, -0.02], [-0.5, 0.14]], 0.028, dk(p.body, 40));
    d.E(-0.5, 0.17, 0.04, 0.06, p.patch, 0, false);
    d.E(-0.02, -0.12, 0.42, 0.26, p.body);
    c.save(); c.beginPath(); c.ellipse(-0.02 * s, -0.12 * s, 0.42 * s, 0.26 * s, 0, 0, 7); c.clip();
    c.fillStyle = p.patch;
    for (const [x, y, rx, ry] of [[-0.22, -0.22, 0.14, 0.1], [0.12, -0.02, 0.1, 0.12], [-0.3, 0.06, 0.08, 0.07]]) { c.beginPath(); c.ellipse(x * s, y * s, rx * s, ry * s, 0.3, 0, 7); c.fill(); }
    c.restore();
    if (st.mark) st.mark();
    d.E(0.24, -0.40, 0.1, 0.05, p.body, -0.4);
    d.R(0.33, -0.48, 0.34, -0.58, 0.28, -0.62, 0.05, 0.015, p.horn);
    d.R(0.44, -0.48, 0.46, -0.58, 0.52, -0.62, 0.05, 0.015, p.horn);
    d.E(0.38, -0.34, 0.15, 0.18, p.body);
    d.E(0.46, -0.22, 0.12, 0.09, p.muzzle, 0, false);
    d.dot(0.50, -0.23, 0.016, dk(p.muzzle, 70));
    d.I(0.40, -0.40, 0.04, false, st.dead);
  } });

plan("sheep", { cat: "Farm", label: "Sheep", voice: "baa", needs: ["body", "skin"],
  pal: { body: "#f4f1ea", skin: "#3a3a44" },
  anchor: { head: [0.36, -0.22, 0.15], top: -0.46, eye: [0.40, -0.26], neck: [0.24, -0.08, 0.16], back: [-0.14, -0.22], body: [-0.02, -0.08, 0.38, 0.28] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: 0.1, w: 0.065, back: -0.2, front: 0.16, col: p.skin });
    // a cloud, not an ellipse: the lumpy outline is what says wool
    const puffs = [[-0.30, -0.12, 0.14], [-0.14, -0.26, 0.15], [0.06, -0.28, 0.15], [0.22, -0.14, 0.13], [0.14, 0.04, 0.15], [-0.08, 0.06, 0.16], [-0.3, 0.02, 0.13], [-0.04, -0.1, 0.2]];
    c.fillStyle = P.line;
    c.beginPath(); for (const [x, y, r] of puffs) { c.moveTo((x + r) * s + P.lw, y * s); c.arc(x * s, y * s, r * s + P.lw, 0, 7); } c.fill();
    c.fillStyle = p.body;
    c.beginPath(); for (const [x, y, r] of puffs) { c.moveTo((x + r) * s, y * s); c.arc(x * s, y * s, r * s, 0, 7); } c.fill();
    if (st.mark) st.mark();
    d.E(0.28, -0.22, 0.07, 0.035, p.skin, -0.5);
    d.E(0.36, -0.20, 0.12, 0.16, p.skin, 0.35);
    d.E(0.33, -0.36, 0.1, 0.07, p.body, 0, false);
    d.I(0.40, -0.25, 0.035, true, st.dead);
  } });

plan("bunny", { cat: "Farm", label: "Bunny", voice: "squeak", needs: ["body", "inner", "tail"],
  pal: { body: "#c9b8a8", inner: "#ffb3c6", tail: "#ffffff" },
  anchor: { head: [0.12, -0.36, 0.19], top: -0.54, eye: [0.2, -0.40], neck: [0.08, -0.18, 0.18], back: [-0.2, -0.02], body: [-0.02, 0.08, 0.28, 0.34] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.E(-0.28, 0.16, 0.1, 0.1, p.tail, 0, false);
    d.E(0.02, 0.40, 0.22, 0.07, dk(p.body, 12));
    d.E(-0.02, 0.08, 0.28, 0.34, p.body);
    if (st.mark) st.mark();
    d.E(0.18, 0.38, 0.07, 0.07, p.body);
    // ears: tall, one leaning back, pink inside
    d.E(0.04, -0.66, 0.065, 0.22, p.body, -0.2); d.E(0.04, -0.66, 0.03, 0.15, p.inner, -0.2, false);
    d.E(0.18, -0.68, 0.065, 0.22, p.body, 0.12); d.E(0.18, -0.68, 0.03, 0.15, p.inner, 0.12, false);
    d.E(0.12, -0.36, 0.19, 0.18, p.body);
    d.dot(0.30, -0.33, 0.028, p.inner);
    d.I(0.2, -0.40, 0.045, true, st.dead);
  } });

plan("pony", { cat: "Farm", label: "Pony", voice: "whistle", needs: ["body", "mane", "hoof"],
  pal: { body: "#c68a5a", mane: "#6a4028", hoof: "#3a2a20" },
  anchor: { head: [0.42, -0.60, 0.13], top: -0.74, eye: [0.44, -0.64], neck: [0.3, -0.36, 0.12], back: [-0.14, -0.26], body: [-0.04, -0.14, 0.36, 0.2] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: -0.04, w: 0.085, back: -0.24, front: 0.18, col: p.body, hoof: p.hoof });
    d.R(-0.36, -0.2, -0.56, -0.1, -0.52, 0.24, 0.13, 0.05, p.mane);
    d.E(-0.04, -0.14, 0.36, 0.2, p.body);
    if (st.mark) st.mark();
    d.L([[0.22, -0.24], [0.36, -0.52]], 0.18, p.body);
    d.R(0.2, -0.3, 0.26, -0.5, 0.38, -0.7, 0.1, 0.06, p.mane);
    d.E(0.46, -0.58, 0.17, 0.10, p.body, 0.45);
    d.Y([[0.36, -0.68], [0.38, -0.8], [0.43, -0.7]], p.body);
    if (p.horn) d.Y([[0.44, -0.72], [0.52, -0.96], [0.5, -0.7]], p.horn);
    d.dot(0.58, -0.5, 0.016, dk(p.body, 70));
    d.I(0.44, -0.64, 0.035, false, st.dead);
  } });

/* -------------------------------------------------------------- woodland */
plan("fox", { cat: "Woodland", label: "Fox", voice: "squeak", needs: ["body", "chest", "socks", "tip"],
  pal: { body: "#e8772e", chest: "#ffffff", socks: "#3a2a24", tip: "#ffffff" },
  anchor: { head: [0.30, -0.26, 0.15], top: -0.40, eye: [0.34, -0.30], neck: [0.22, -0.10, 0.14], back: [-0.12, -0.16], body: [-0.02, -0.06, 0.32, 0.18] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: 0.06, w: 0.07, back: -0.2, front: 0.16, col: p.socks });
    d.R(-0.28, -0.08, -0.62, -0.02, -0.62, -0.42, 0.24, 0.06, p.body);
    d.E(-0.6, -0.4, 0.07, 0.06, p.tip, 0.6);
    d.E(-0.02, -0.06, 0.32, 0.18, p.body);
    if (st.mark) st.mark();
    d.E(0.22, -0.02, 0.12, 0.12, p.chest, 0, false);
    d.Y([[0.2, -0.34], [0.24, -0.58], [0.32, -0.36]], p.body);
    d.Y([[0.3, -0.36], [0.4, -0.58], [0.42, -0.32]], p.body);
    d.E(0.30, -0.26, 0.15, 0.13, p.body);
    d.Y([[0.38, -0.32], [0.6, -0.2], [0.38, -0.16]], p.body);
    d.E(0.44, -0.17, 0.07, 0.03, p.chest, 0, false);
    d.dot(0.6, -0.21, 0.025, "#1d1d24");
    d.I(0.34, -0.30, 0.035, false, st.dead);
  } });

plan("bear", { cat: "Woodland", label: "Bear", voice: "rumble", needs: ["body", "muzzle"],
  pal: { body: "#8a5a3c", muzzle: "#d8b890" },
  anchor: { head: [0.30, -0.34, 0.21], top: -0.58, eye: [0.36, -0.40], neck: [0.2, -0.14, 0.2], back: [-0.14, -0.2], body: [-0.02, -0.06, 0.4, 0.3] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: 0.12, w: 0.15, back: -0.2, front: 0.2, col: p.body });
    d.E(-0.02, -0.06, 0.40, 0.30, p.body);
    if (st.mark) st.mark();
    d.E(0.18, -0.52, 0.075, 0.075, p.body); d.E(0.38, -0.52, 0.075, 0.075, p.body);
    d.E(0.30, -0.34, 0.21, 0.20, p.body);
    d.E(0.44, -0.27, 0.10, 0.075, p.muzzle, 0, false);
    d.E(0.51, -0.3, 0.035, 0.028, "#2a2020", 0, false);
    d.I(0.36, -0.40, 0.04, false, st.dead);
  } });

plan("hedgehog", { cat: "Woodland", label: "Hedgehog", voice: "squeak", needs: ["body", "skin"],
  pal: { body: "#7a5a44", skin: "#e8d0b0" },
  anchor: { head: [0.30, -0.02, 0.14], top: -0.18, eye: [0.34, -0.06], neck: [0.18, 0.06, 0.12], back: [-0.14, -0.3], body: [-0.04, -0.02, 0.36, 0.3] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const x of [-0.2, 0.12]) d.E(x, 0.42, 0.06, 0.04, dk(p.skin, 30));
    // spines: a ring of points round the back, drawn before the body
    const spikes = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (0.95 + i * 0.09), r = i % 2 ? 0.34 : 0.46;
      spikes.push([-0.04 + Math.cos(a) * r * 1.05, -0.02 + Math.sin(a) * r]);
    }
    spikes.push([0.24, 0.1], [-0.36, 0.3]);
    d.Y(spikes, dk(p.body, 10));
    d.E(-0.04, -0.02, 0.36, 0.30, p.body);
    if (st.mark) st.mark();
    d.E(0.28, 0.04, 0.16, 0.14, p.skin);
    d.Y([[0.36, -0.04], [0.54, 0.06], [0.36, 0.14]], p.skin);
    d.dot(0.54, 0.06, 0.03, "#2a2020");
    d.I(0.34, -0.02, 0.035, false, st.dead);
  } });

plan("frog", { cat: "Pond", label: "Frog", voice: "ribbit", needs: ["body", "belly"],
  pal: { body: "#5cb85c", belly: "#c8e89a" },
  anchor: { head: [0.12, -0.2, 0.22], top: -0.42, eye: [0.22, -0.32], neck: [0.1, 0.02, 0.2], back: [-0.2, -0.1], body: [0, 0.02, 0.36, 0.3] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.E(-0.26, 0.28, 0.2, 0.13, dk(p.body, 14), -0.2);
    d.E(-0.12, 0.43, 0.14, 0.04, dk(p.body, 18));
    d.E(0, 0.02, 0.36, 0.30, p.body);
    if (st.mark) st.mark();
    d.E(0.1, 0.12, 0.24, 0.16, p.belly, 0, false);
    d.L([[0.22, 0.12], [0.28, 0.42]], 0.07, p.body);
    d.E(0.33, 0.43, 0.08, 0.035, p.body);
    d.E(0.02, -0.26, 0.1, 0.1, p.body); d.E(0.22, -0.28, 0.1, 0.1, p.body);
    d.I(0.03, -0.28, 0.065, true, st.dead); d.I(0.23, -0.30, 0.065, true, st.dead);
    d.smile(0.2, -0.1, 0.13, dk(p.body, 60));
  } });

/* ------------------------------------------------------------------ pets */
plan("cat", { cat: "Pets", label: "Cat", voice: "meow", needs: ["body", "inner"],
  pal: { body: "#f0a04a", inner: "#ffc0cb" },
  anchor: { head: [0.10, -0.40, 0.2], top: -0.60, eye: [0.18, -0.42], neck: [0.06, -0.20, 0.18], back: [-0.18, -0.06], body: [-0.02, 0.06, 0.26, 0.36] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.R(-0.2, 0.34, -0.6, 0.2, -0.46, -0.32, 0.09, 0.05, p.body);
    d.E(-0.02, 0.06, 0.26, 0.36, p.body);
    if (st.mark) st.mark();
    d.L([[0.12, 0.08], [0.14, 0.43]], 0.08, p.body);
    d.E(0.16, 0.43, 0.06, 0.03, p.body);
    d.Y([[-0.04, -0.46], [-0.02, -0.72], [0.12, -0.52]], p.body);
    d.Y([[0.12, -0.52], [0.24, -0.72], [0.28, -0.44]], p.body);
    d.Y([[0.18, -0.52], [0.23, -0.64], [0.25, -0.48]], p.inner);
    d.E(0.10, -0.40, 0.21, 0.18, p.body);
    d.line([[0.3, -0.33], [0.46, -0.36]], 0.012, dk(p.body, 60)); d.line([[0.3, -0.3], [0.46, -0.28]], 0.012, dk(p.body, 60));
    d.dot(0.29, -0.35, 0.022, p.inner);
    d.I(0.19, -0.42, 0.045, false, st.dead); d.I(0.03, -0.42, 0.038, false, st.dead);
  } });

plan("dog", { cat: "Pets", label: "Dog", voice: "woof", needs: ["body", "ear", "muzzle"],
  pal: { body: "#d9a066", ear: "#8a5a3a", muzzle: "#f0d8b0" },
  anchor: { head: [0.32, -0.34, 0.17], top: -0.52, eye: [0.36, -0.40], neck: [0.22, -0.16, 0.16], back: [-0.12, -0.18], body: [-0.02, -0.08, 0.34, 0.22] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    legs4(d, { hip: 0.04, w: 0.09, back: -0.22, front: 0.18, col: p.body });
    d.R(-0.32, -0.12, -0.46, -0.2, -0.44, -0.44, 0.08, 0.03, p.body);
    d.E(-0.02, -0.08, 0.34, 0.22, p.body);
    if (st.mark) st.mark();
    d.E(0.32, -0.34, 0.17, 0.17, p.body);
    d.E(0.48, -0.28, 0.1, 0.08, p.muzzle, 0, false);
    d.E(0.56, -0.31, 0.04, 0.03, "#1d1d24", 0, false);
    d.E(0.2, -0.3, 0.07, 0.15, p.ear, 0.25);
    d.I(0.36, -0.40, 0.04, false, st.dead);
  } });

plan("mouse", { cat: "Pets", label: "Mouse", voice: "squeak", needs: ["body", "inner", "tail"],
  pal: { body: "#b8b8c0", inner: "#ffb6c8", tail: "#e8a0b0" },
  anchor: { head: [0.24, -0.02, 0.15], top: -0.18, eye: [0.30, -0.06], neck: [0.14, 0.08, 0.12], back: [-0.12, -0.04], body: [-0.04, 0.12, 0.28, 0.24] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.line([[-0.3, 0.2], [-0.5, 0.28], [-0.62, 0.12], [-0.56, 0.0]], 0.025, p.tail);
    for (const x of [-0.16, 0.12]) d.E(x, 0.42, 0.06, 0.035, p.inner);
    d.E(-0.04, 0.12, 0.28, 0.24, p.body);
    if (st.mark) st.mark();
    d.E(0.12, -0.26, 0.14, 0.14, p.body); d.E(0.12, -0.26, 0.08, 0.08, p.inner, 0, false);
    d.E(0.24, -0.02, 0.16, 0.14, p.body);
    d.Y([[0.34, -0.08], [0.48, 0.02], [0.34, 0.08]], p.body);
    d.dot(0.48, 0.02, 0.025, p.inner);
    d.E(0.32, -0.22, 0.1, 0.1, p.body); d.E(0.32, -0.22, 0.055, 0.055, p.inner, 0, false);
    d.I(0.30, -0.05, 0.035, false, st.dead);
  } });

/* -------------------------------------------------------------- reptiles */
plan("turtle", { cat: "Reptiles", label: "Turtle", voice: "bloop", needs: ["body", "shell", "plate"],
  pal: { body: "#8ec060", shell: "#3f7a3a", plate: "#6aa34a" },
  anchor: { head: [0.42, -0.06, 0.12], top: -0.18, eye: [0.46, -0.1], neck: [0.3, 0.02, 0.1], back: [-0.1, -0.3], body: [-0.04, -0.04, 0.38, 0.28] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const [x, c2] of [[-0.18, dk(p.body)], [0.18, dk(p.body)], [-0.26, p.body], [0.26, p.body]]) d.E(x, 0.36, 0.08, 0.1, c2);
    d.L([[0.26, 0.06], [0.4, -0.04]], 0.1, p.body);
    d.E(0.44, -0.06, 0.13, 0.1, p.body);
    d.I(0.48, -0.1, 0.035, false, st.dead);
    d.E(-0.04, 0.18, 0.42, 0.08, lt(p.shell, 20));
    d.E(-0.04, -0.04, 0.38, 0.28, p.shell);
    if (st.mark) st.mark();
    for (const [x, y, r] of [[-0.04, -0.14, 0.11], [-0.24, -0.02, 0.08], [0.16, -0.02, 0.08], [-0.04, 0.08, 0.08]]) d.E(x, y, r, r * 0.8, p.plate, 0, false);
  } });

plan("lizard", { cat: "Reptiles", label: "Lizard", voice: "blip", needs: ["body", "belly"],
  pal: { body: "#7bc043", belly: "#d8f0a0" },
  anchor: { head: [0.36, 0.0, 0.13], top: -0.14, eye: [0.40, -0.04], neck: [0.24, 0.1, 0.1], back: [-0.08, -0.06], body: [0, 0.1, 0.32, 0.15] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.R(-0.24, 0.12, -0.56, 0.3, -0.76, 0.12, 0.16, 0.02, p.body);
    for (const [x, c2] of [[-0.14, dk(p.body)], [0.16, dk(p.body)], [-0.2, p.body], [0.1, p.body]])
      d.L([[x, 0.16], [x - 0.08, 0.32], [x - 0.02, 0.43]], 0.06, c2);
    if (p.crest) for (let i = 0; i < 5; i++) d.Y([[-0.22 + i * 0.1, -0.02], [-0.18 + i * 0.1, -0.14], [-0.14 + i * 0.1, -0.02]], p.crest);
    d.E(0, 0.1, 0.32, 0.15, p.body);
    if (st.mark) st.mark();
    d.E(0.04, 0.16, 0.24, 0.07, p.belly, 0, false);
    d.E(0.36, 0.02, 0.16, 0.11, p.body, 0.1);
    d.I(0.38, -0.03, 0.045, true, st.dead);
    d.line([[0.42, 0.06], [0.5, 0.05]], 0.014, dk(p.body, 60));
  } });

/* ------------------------------------------------------------ minibeasts */
plan("snail", { cat: "Minibeasts", label: "Snail", voice: "bloop", needs: ["body", "shell", "spiral"],
  pal: { body: "#c9d88a", shell: "#d9884a", spiral: "#8a4a20" },
  anchor: { head: [0.40, -0.12, 0.1], top: -0.26, eye: [0.42, -0.34], neck: [0.36, 0.1, 0.08], back: [-0.24, -0.04], body: [-0.08, -0.02, 0.3, 0.32] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.E(0.04, 0.36, 0.46, 0.1, p.body);
    d.L([[0.32, 0.3], [0.4, -0.08]], 0.14, p.body);
    d.line([[0.37, -0.12], [0.34, -0.36]], 0.02, p.body); d.line([[0.43, -0.12], [0.48, -0.34]], 0.02, p.body);
    d.I(0.34, -0.37, 0.04, true, st.dead); d.I(0.48, -0.35, 0.04, true, st.dead);
    d.E(-0.08, -0.02, 0.30, 0.32, p.shell);
    if (st.mark) st.mark();
    c.strokeStyle = p.spiral; c.lineWidth = Math.max(1, 0.03 * s); c.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i * 0.32, r = 0.24 - i * 0.0055; c[i ? "lineTo" : "moveTo"]((-0.08 + Math.cos(a) * r) * s, (-0.02 + Math.sin(a) * r) * s); }
    c.stroke();
    d.smile(0.44, -0.02, 0.05, dk(p.body, 60));
  } });

plan("bee", { cat: "Minibeasts", label: "Bee", voice: "buzz", needs: ["body", "band", "wing"],
  pal: { body: "#f6c531", band: "#2a2a30", wing: "#e8f4ff" },
  anchor: { head: [0.30, -0.18, 0.14], top: -0.34, eye: [0.34, -0.22], neck: [0.2, -0.06, 0.12], back: [-0.1, -0.34], body: [0, -0.1, 0.32, 0.26] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const x of [-0.12, 0.08]) d.line([[x, 0.1], [x - 0.02, 0.44]], 0.022, p.band);
    d.Y([[-0.3, -0.14], [-0.44, -0.08], [-0.3, -0.04]], p.band);
    c.save(); c.globalAlpha = 0.75;
    d.E(-0.12, -0.42, 0.16, 0.1, p.wing, -0.5, false); d.E(0.06, -0.44, 0.14, 0.09, p.wing, 0.4, false);
    c.restore();
    d.E(0, -0.1, 0.32, 0.26, p.body);
    c.save(); c.beginPath(); c.ellipse(0, -0.1 * s, 0.32 * s, 0.26 * s, 0, 0, 7); c.clip();
    c.fillStyle = p.band; for (const x of [-0.18, 0.02]) c.fillRect(x * s, -0.4 * s, 0.09 * s, 0.6 * s);
    c.restore();
    if (st.mark) st.mark();
    d.E(0.30, -0.18, 0.14, 0.14, p.band);
    d.line([[0.32, -0.3], [0.36, -0.46]], 0.016, p.band); d.line([[0.38, -0.3], [0.46, -0.42]], 0.016, p.band);
    d.I(0.36, -0.2, 0.05, true, st.dead);
  } });

plan("ladybug", { cat: "Minibeasts", label: "Ladybird", voice: "blip", needs: ["body", "spot"],
  pal: { body: "#e53a3a", spot: "#1d1d24" },
  anchor: { head: [0.34, 0.02, 0.14], top: -0.12, eye: [0.40, -0.02], neck: [0.26, 0.12, 0.1], back: [-0.1, -0.3], body: [-0.02, -0.02, 0.36, 0.34] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const x of [-0.18, 0.02, 0.2]) d.line([[x, 0.24], [x + 0.06, 0.44]], 0.022, p.spot);
    d.E(0.34, 0.04, 0.15, 0.14, p.spot);
    d.line([[0.4, -0.08], [0.48, -0.22]], 0.014, p.spot); d.line([[0.34, -0.08], [0.34, -0.24]], 0.014, p.spot);
    d.E(-0.02, -0.02, 0.36, 0.34, p.body);
    c.save(); c.beginPath(); c.ellipse(-0.02 * s, -0.02 * s, 0.36 * s, 0.34 * s, 0, 0, 7); c.clip();
    c.fillStyle = p.spot;
    for (const [x, y, r] of [[-0.2, -0.16, 0.07], [0.1, -0.2, 0.06], [-0.1, 0.12, 0.07], [0.18, 0.06, 0.06], [-0.32, 0.04, 0.05]]) { c.beginPath(); c.arc(x * s, y * s, r * s, 0, 7); c.fill(); }
    c.restore();
    if (st.mark) st.mark();
    d.dot(0.4, 0.0, 0.03, "#ffffff"); d.dot(0.41, 0.0, 0.015, "#1d1d24");
  } });

/* ------------------------------------------------------------------- sea */
plan("fish", { cat: "Sea", label: "Fish", voice: "bloop", needs: ["body", "fin", "belly"],
  pal: { body: "#ff9a3a", fin: "#ff6a2a", belly: "#fff0c0" },
  anchor: { head: [0.2, -0.2, 0.2], top: -0.40, eye: [0.2, -0.24], neck: [0.02, -0.02, 0.18], back: [-0.14, -0.26], body: [0, -0.16, 0.36, 0.26] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const x of [-0.08, 0.1]) { d.line([[x, 0.08], [x, 0.4]], 0.035, p.fin); d.E(x + 0.04, 0.42, 0.06, 0.03, p.fin); }
    d.Y([[-0.3, -0.16], [-0.58, -0.4], [-0.5, -0.16], [-0.58, 0.08]], p.fin);
    d.Y([[-0.14, -0.38], [0.02, -0.52], [0.12, -0.38]], p.fin);
    d.E(0, -0.16, 0.36, 0.26, p.body);
    if (st.mark) st.mark();
    d.E(0.04, -0.04, 0.26, 0.1, p.belly, 0, false);
    d.E(-0.02, -0.12, 0.1, 0.06, p.fin, 0.4);
    d.E(0.36, -0.14, 0.04, 0.05, dk(p.body, 40), 0, false);
    d.I(0.2, -0.24, 0.07, true, st.dead);
  } });

plan("octopus", { cat: "Sea", label: "Octopus", voice: "bloop", needs: ["body"],
  pal: { body: "#b86ad9" },
  anchor: { head: [0, -0.24, 0.3], top: -0.56, eye: [0.12, -0.24], neck: [0, 0.04, 0.26], back: [-0.24, -0.2], body: [0, -0.22, 0.3, 0.32] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const [x0, cx, x1, col] of [[-0.18, -0.4, -0.36, dk(p.body)], [0.18, 0.4, 0.36, dk(p.body)], [-0.1, -0.2, -0.16, p.body], [0.1, 0.2, 0.18, p.body], [0, 0.04, 0.02, p.body]])
      d.R(x0, 0.02, cx, 0.3, x1, 0.44, 0.12, 0.05, col);
    d.E(0, -0.22, 0.30, 0.34, p.body);
    if (st.mark) st.mark();
    d.I(0.12, -0.24, 0.07, true, st.dead); d.I(-0.08, -0.24, 0.06, true, st.dead);
    d.E(0.2, -0.1, 0.05, 0.03, lt(p.body, 40), 0, false);
    d.smile(0.04, -0.1, 0.05, dk(p.body, 60));
  } });

plan("crab", { cat: "Sea", label: "Crab", voice: "clank", needs: ["body", "belly"],
  pal: { body: "#e8583a", belly: "#f7a58a" },
  anchor: { head: [0, -0.04, 0.2], top: -0.20, eye: [0.08, -0.36], neck: [0, 0.12, 0.2], back: [-0.2, -0.1], body: [0, 0.06, 0.36, 0.22] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const side of [-1, 1]) for (const k of [0, 1, 2]) {
      const x = side * (0.18 + k * 0.08);
      d.L([[x, 0.12], [x + side * 0.14, 0.24], [x + side * 0.18, 0.43]], 0.045, k === 1 ? dk(p.body) : p.body);
    }
    for (const side of [-1, 1]) {
      d.L([[side * 0.26, -0.02], [side * 0.46, -0.16], [side * 0.5, -0.3]], 0.07, p.body);
      d.E(side * 0.52, -0.38, 0.1, 0.09, p.body);
      d.Y([[side * 0.52, -0.38], [side * 0.62, -0.5], [side * 0.46, -0.44]], lt(p.body, 20));
    }
    d.E(0, 0.06, 0.36, 0.22, p.body);
    if (st.mark) st.mark();
    d.E(0, 0.16, 0.24, 0.08, p.belly, 0, false);
    for (const x of [-0.08, 0.1]) { d.line([[x, -0.1], [x, -0.3]], 0.025, p.body); d.I(x, -0.34, 0.05, true, st.dead); }
    d.smile(0.01, 0.04, 0.06, dk(p.body, 60));
  } });

/* --------------------------------------------------------------- fantasy */
plan("dragon", { cat: "Fantasy", label: "Dragon", voice: "rumble", needs: ["body", "belly", "wing", "horn"],
  pal: { body: "#4caf50", belly: "#f2e08a", wing: "#2e7d32", horn: "#f3ead0" },
  anchor: { head: [0.22, -0.44, 0.17], top: -0.62, eye: [0.28, -0.5], neck: [0.14, -0.24, 0.14], back: [-0.16, -0.2], body: [0, -0.02, 0.26, 0.3] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    d.R(-0.18, 0.2, -0.46, 0.4, -0.68, 0.2, 0.16, 0.03, p.body);
    d.Y([[-0.68, 0.2], [-0.8, 0.1], [-0.7, 0.3]], p.wing);
    d.Y([[-0.06, -0.2], [-0.28, -0.62], [-0.4, -0.4], [-0.54, -0.36], [-0.44, -0.1], [-0.2, -0.02]], p.wing);
    for (const x of [-0.12, 0.08]) { d.L([[x, 0.12], [x + 0.02, 0.42]], 0.12, x < 0 ? dk(p.body) : p.body); d.E(x + 0.06, 0.43, 0.08, 0.03, dk(p.body, 30)); }
    d.E(0, -0.02, 0.26, 0.30, p.body);
    if (st.mark) st.mark();
    d.E(0.08, 0.02, 0.15, 0.22, p.belly, 0, false);
    d.L([[0.16, -0.06], [0.28, 0.04]], 0.06, p.body);
    d.L([[0.06, -0.24], [0.18, -0.38]], 0.16, p.body);
    d.R(0.12, -0.56, 0.06, -0.66, 0.0, -0.68, 0.06, 0.015, p.horn);
    d.R(0.22, -0.58, 0.2, -0.7, 0.14, -0.74, 0.06, 0.015, p.horn);
    d.E(0.22, -0.44, 0.17, 0.14, p.body);
    d.E(0.38, -0.4, 0.12, 0.08, p.body);
    d.dot(0.46, -0.42, 0.016, dk(p.body, 60));
    d.I(0.26, -0.5, 0.045, true, st.dead);
  } });

plan("ghost", { cat: "Fantasy", label: "Ghost", voice: "whistle", needs: ["body"],
  pal: { body: "#f7f7ff", cheek: "#ffb6d0" },
  anchor: { head: [0, -0.34, 0.28], top: -0.62, eye: [0.1, -0.32], neck: [0, -0.1, 0.26], back: [-0.24, -0.16], body: [0, -0.06, 0.3, 0.44] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s);
    const sheet = (g) => {
      c.beginPath();
      c.moveTo((-0.32 - g) * s, 0.38 * s);
      c.lineTo((-0.32 - g) * s, -0.3 * s);
      c.arc(0, -0.3 * s, (0.32 + g) * s, Math.PI, 0);
      c.lineTo((0.32 + g) * s, 0.38 * s);
      for (let i = 0; i < 4; i++) {
        const x0 = 0.32 - i * 0.16;
        c.quadraticCurveTo((x0 - 0.04) * s, (0.46 + g) * s, (x0 - 0.08) * s, (0.4 + g) * s);
        c.quadraticCurveTo((x0 - 0.12) * s, (0.34 + g) * s, (x0 - 0.16) * s, (0.4 + g) * s);
      }
      c.closePath();
    };
    c.fillStyle = P.line; sheet(P.lw / s); c.fill();
    c.fillStyle = p.body; sheet(0); c.fill();
    if (st.mark) st.mark();
    const d = pen(c, P, s);
    d.E(0.3, -0.02, 0.06, 0.1, p.body, -0.4);
    d.I(0.14, -0.32, 0.06, false, st.dead); d.I(-0.06, -0.32, 0.055, false, st.dead);
    d.E(0.2, -0.2, 0.05, 0.03, p.cheek || "#ffb6d0", 0, false);
    d.E(0.05, -0.16, 0.03, 0.04, "#3a3a52", 0, false);
  } });

plan("blob", { cat: "Fantasy", label: "Blob", voice: "pop", needs: ["body"],
  pal: { body: "#7ad97a" },
  anchor: { head: [0, -0.1, 0.34], top: -0.36, eye: [0.12, -0.08], neck: [0, 0.14, 0.3], back: [-0.28, 0.0], body: [0, 0.06, 0.40, 0.40] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    const drop = (g) => {
      c.beginPath();
      c.moveTo((-0.42 - g) * s, (0.44 + g) * s);
      c.bezierCurveTo((-0.46 - g) * s, (-0.1) * s, (-0.26) * s, (-0.38 - g) * s, 0, (-0.38 - g) * s);
      c.bezierCurveTo(0.26 * s, (-0.38 - g) * s, (0.46 + g) * s, -0.1 * s, (0.42 + g) * s, (0.44 + g) * s);
      c.closePath();
    };
    c.fillStyle = P.line; drop(P.lw / s); c.fill();
    c.fillStyle = p.body; drop(0); c.fill();
    if (st.mark) st.mark();
    c.fillStyle = "rgba(255,255,255,0.35)"; c.beginPath(); c.ellipse(-0.18 * s, -0.18 * s, 0.07 * s, 0.1 * s, -0.5, 0, 7); c.fill();
    d.E(0.34, 0.3, 0.05, 0.08, p.body, 0, false);
    d.I(0.16, -0.08, 0.07, true, st.dead); d.I(-0.04, -0.08, 0.065, true, st.dead);
    d.smile(0.06, 0.04, 0.07, dk(p.body, 60));
  } });

/* ----------------------------------------------------------------- robot */
plan("robot", { cat: "Robots", label: "Robot", voice: "clank", needs: ["body", "accent", "visor"],
  pal: { body: "#b8c4cc", accent: "#4a8fe8", visor: "#26323a" },
  anchor: { head: [0.02, -0.56, 0.18], top: -0.72, eye: [0.1, -0.56], neck: [0.02, -0.34, 0.12], back: [-0.26, -0.12], body: [0, -0.1, 0.24, 0.22] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    const box = (x, y, w, h, f, r) => { c.fillStyle = P.line; rr(c, (x - P.lw / s) * s, (y - P.lw / s) * s, (w + 2 * P.lw / s) * s, (h + 2 * P.lw / s) * s, (r || 0.04) * s); c.fill();
      c.fillStyle = f; rr(c, x * s, y * s, w * s, h * s, (r || 0.04) * s); c.fill(); };
    for (const x of [-0.14, 0.06]) { box(x, 0.12, 0.08, 0.28, dk(p.body, x < 0 ? 26 : 10)); box(x - 0.02, 0.36, 0.14, 0.08, p.visor); }
    box(-0.24, -0.34, 0.48, 0.46, p.body, 0.08);
    if (st.mark) st.mark();
    box(-0.12, -0.22, 0.24, 0.16, p.visor, 0.03);
    for (const [x, f] of [[-0.08, "#ff5a5a"], [0, "#ffd23f"], [0.08, "#5ad97a"]]) d.dot(x, -0.14, 0.022, f);
    box(0.26, -0.26, 0.08, 0.26, p.accent);
    d.line([[0.02, -0.7], [0.02, -0.82]], 0.02, p.visor); d.E(0.02, -0.84, 0.035, 0.035, p.accent);
    box(-0.16, -0.72, 0.36, 0.3, p.body, 0.07);
    box(-0.08, -0.64, 0.26, 0.12, p.visor, 0.04);
    if (st.dead) { d.line([[0.02, -0.62], [0.08, -0.56]], 0.02, p.accent); d.line([[0.08, -0.62], [0.02, -0.56]], 0.02, p.accent); }
    else { d.dot(0.04, -0.58, 0.03, p.accent); d.dot(0.13, -0.58, 0.03, p.accent); }
  } });

/* ------------------------------------------------------------------ food */
plan("cupcake", { cat: "Food", label: "Cupcake", voice: "pop", needs: ["body", "wrapper", "cherry"],
  pal: { body: "#ffc0d9", wrapper: "#6ab0e8", cherry: "#e8304a" },
  anchor: { head: [0.02, -0.34, 0.24], top: -0.62, eye: [0.1, 0.1], neck: [0, -0.04, 0.3], back: [-0.3, 0.1], body: [0, 0.2, 0.3, 0.2] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const x of [-0.12, 0.1]) d.E(x, 0.43, 0.06, 0.035, dk(p.wrapper, 30));
    d.Y([[-0.3, -0.02], [0.3, -0.02], [0.22, 0.42], [-0.22, 0.42]], p.wrapper);
    c.strokeStyle = dk(p.wrapper, 20); c.lineWidth = Math.max(0.8, 0.018 * s);
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 0.11 * s, 0.0); c.lineTo(i * 0.085 * s, 0.4 * s); c.stroke(); }
    if (st.mark) st.mark();
    d.E(0, -0.08, 0.34, 0.12, p.body);
    d.E(0.02, -0.24, 0.25, 0.11, p.body);
    d.E(0.04, -0.38, 0.14, 0.09, p.body);
    for (const [x, y, f] of [[-0.18, -0.1, "#ffd23f"], [0.1, -0.06, "#5ad9c0"], [-0.02, -0.24, "#8e7bff"], [0.18, -0.22, "#ffd23f"]]) d.dot(x, y, 0.018, f);
    d.E(0.06, -0.52, 0.07, 0.07, p.cherry);
    d.line([[0.07, -0.58], [0.12, -0.66]], 0.014, "#4a7a2a");
    d.I(0.1, 0.1, 0.045, false, st.dead); d.I(-0.08, 0.1, 0.04, false, st.dead);
    d.smile(0.02, 0.18, 0.05);
  } });

plan("fruit", { cat: "Food", label: "Fruit", voice: "pop", needs: ["body", "leaf"],
  pal: { body: "#e8403a", leaf: "#4caf50", form: "apple" },
  anchor: { head: [0, -0.1, 0.32], top: -0.40, eye: [0.12, -0.12], neck: [0, 0.2, 0.26], back: [-0.28, -0.04], body: [0, -0.02, 0.32, 0.34] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s), f = p.form || "apple";
    for (const x of [-0.1, 0.1]) { d.line([[x, 0.28], [x, 0.42]], 0.04, "#3a3a44"); d.E(x + 0.03, 0.43, 0.05, 0.025, "#3a3a44"); }
    if (f === "lemon") d.E(0, -0.04, 0.38, 0.28, p.body, -0.25);
    else if (f === "pear") { d.E(0, 0.08, 0.3, 0.26, p.body); d.E(0.02, -0.2, 0.18, 0.2, p.body, 0, false); }
    else if (f === "berry") {
      d.Y([[-0.34, -0.26], [0.34, -0.26], [0.26, 0.1], [0, 0.34], [-0.26, 0.1]], p.body);
      d.E(0, -0.18, 0.34, 0.14, p.body, 0, false);
    } else if (f === "grape") {
      for (const [x, y] of [[-0.16, -0.18], [0.12, -0.18], [-0.26, 0.04], [0, 0.0], [0.24, 0.02], [-0.12, 0.2], [0.12, 0.2]]) d.E(x, y, 0.13, 0.13, p.body);
    } else d.E(0, -0.02, 0.32, 0.30, p.body);
    if (st.mark) st.mark();
    if (f === "berry") {
      for (const [x, y] of [[-0.14, -0.1], [0.08, -0.12], [-0.04, 0.06], [0.16, 0.04], [-0.18, 0.1]]) d.dot(x, y, 0.014, "#fff2a0");
      d.Y([[-0.26, -0.3], [-0.1, -0.42], [0, -0.3], [0.12, -0.44], [0.26, -0.3]], p.leaf);
    } else {
      d.line([[0.0, -0.3], [0.03, -0.42]], 0.03, "#6a4a2a");
      d.R(0.03, -0.38, 0.18, -0.5, 0.26, -0.38, 0.03, 0.08, p.leaf);
    }
    if (f === "orange") for (const [x, y] of [[-0.14, -0.12], [0.18, 0.1], [-0.02, 0.16]]) d.dot(x, y, 0.012, dk(p.body, 20));
    c.fillStyle = "rgba(255,255,255,0.3)"; c.beginPath(); c.ellipse(-0.14 * s, -0.16 * s, 0.05 * s, 0.08 * s, -0.5, 0, 7); c.fill();
    d.I(0.12, -0.08, 0.05, false, st.dead); d.I(-0.06, -0.08, 0.045, false, st.dead);
    d.smile(0.04, 0.02, 0.06);
  } });

plan("teapot", { cat: "Objects", label: "Teapot", voice: "whistle", needs: ["body", "accent"],
  pal: { body: "#7ac0e8", accent: "#ffffff" },
  anchor: { head: [0, -0.2, 0.3], top: -0.42, eye: [0.1, -0.06], neck: [0, -0.24, 0.2], back: [-0.36, -0.04], body: [0, 0.0, 0.32, 0.28] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s);
    for (const x of [-0.14, 0.14]) d.E(x, 0.36, 0.07, 0.08, dk(p.body, 20));
    c.strokeStyle = P.line; c.lineWidth = 0.1 * s; c.beginPath(); c.arc(-0.34 * s, 0, 0.14 * s, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
    c.strokeStyle = p.body; c.lineWidth = 0.06 * s; c.stroke();
    d.L([[0.24, 0.04], [0.42, -0.08], [0.52, -0.24]], 0.09, p.body);
    d.E(0, 0.0, 0.32, 0.28, p.body);
    if (st.mark) st.mark();
    d.E(0, 0.02, 0.33, 0.04, p.accent, 0, false);
    d.E(0, -0.28, 0.2, 0.06, dk(p.body, 12));
    d.E(0, -0.37, 0.05, 0.05, p.accent);
    d.I(0.12, -0.08, 0.045, false, st.dead); d.I(-0.06, -0.08, 0.04, false, st.dead);
    d.smile(0.04, 0.06, 0.05);
  } });

/* ---------------------------------------------------------------- people */
plan("person", { cat: "People", label: "Person", voice: "peep", needs: ["body", "skin", "hair", "pants", "shoes"],
  pal: { body: "#4a8fe8", skin: "#f1c7a0", hair: "#5a3a22", pants: "#3a4a6a", shoes: "#2a2a30", form: "short" },
  anchor: { head: [0.02, -0.58, 0.19], top: -0.78, eye: [0.10, -0.60], neck: [0.02, -0.36, 0.13], back: [-0.2, -0.16], body: [0.02, -0.12, 0.2, 0.24] },
  paint(c, s, p, st) {
    const P = Art.pen(p, s), d = pen(c, P, s), f = p.form || "short";
    if (f === "long" || f === "braid") d.R(-0.1, -0.64, -0.24, -0.4, -0.2, f === "braid" ? -0.02 : -0.2, 0.18, 0.08, p.hair);
    for (const [x, col] of [[-0.06, dk(p.pants)], [0.08, p.pants]]) { d.L([[x, 0.08], [x, 0.4]], 0.1, col); d.E(x + 0.04, 0.42, 0.08, 0.04, p.shoes); }
    d.L([[-0.14, -0.26], [-0.2, 0.0]], 0.08, dk(p.body));
    c.fillStyle = P.line; rr(c, -0.19 * s - P.lw, -0.36 * s - P.lw, 0.42 * s + 2 * P.lw, 0.48 * s + 2 * P.lw, 0.12 * s); c.fill();
    c.fillStyle = p.body; rr(c, -0.19 * s, -0.36 * s, 0.42 * s, 0.48 * s, 0.12 * s); c.fill();
    if (st.mark) st.mark();
    d.L([[0.18, -0.26], [0.26, 0.0]], 0.08, p.body); d.E(0.27, 0.03, 0.045, 0.045, p.skin, 0, false);
    d.E(0.02, -0.58, 0.19, 0.19, p.skin);
    if (f === "curly") for (const [x, y] of [[-0.12, -0.72], [0.0, -0.78], [0.12, -0.74], [-0.16, -0.6]]) d.E(x, y, 0.08, 0.08, p.hair);
    else if (f !== "bald") {
      c.fillStyle = p.hair; c.beginPath(); c.ellipse(0, -0.66 * s, 0.2 * s, 0.13 * s, 0, Math.PI * 0.95, Math.PI * 2.05); c.fill();
      c.beginPath(); c.ellipse(-0.1 * s, -0.6 * s, 0.1 * s, 0.14 * s, 0, 0, 7); c.fill();
      if (f === "bun") d.E(-0.12, -0.78, 0.08, 0.08, p.hair);
    }
    d.I(0.10, -0.58, 0.035, false, st.dead);
    d.smile(0.1, -0.5, 0.05);
    d.dot(0.2, -0.54, 0.018, dk(p.skin, 20));
  } });
