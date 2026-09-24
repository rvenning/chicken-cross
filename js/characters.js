// Characters in 2D: the body plans, and the cosmetic extras every plan can
// wear.
//
// A body plan is a silhouette -- a different ANIMAL (or teapot), not a
// recolour. There are thirty-odd of them and 420 characters, so each plan is
// painted once, from a palette, and a character is that plan plus a palette
// plus extras. The extras attach to ANCHORS each plan declares (where its
// head, eye, neck and back are, in units of s), which is what lets one hat
// painter sit correctly on a flamingo and on a teapot.
//
// Every plan is built from the shared pen in js/art.js -- one rim, one
// highlight, one eye -- so 420 characters still look like one illustrator.
//
// LEGIBILITY BUDGET, the same one the twelve birds always had: nothing may
// reach above -1.34s (a car in the lane above starts at -1.38s), spread past
// +-0.95s of its own column, or float off the ground. Hats are scaled to the
// room above each plan's head rather than trusted to fit, and
// tests/roster.test.js measures every one of the 420 against these numbers.
"use strict";

const CEIL = -1.32;      // highest any character may paint, in s (test allows -1.38)

// Each plan: `cat` (for browsing), `pal` defaults, `needs` (palette fields
// the painter reads), `anchor` (in s, facing right), and `paint`.
//   head: [x, y, r]  centre and radius of the head
//   top:  y of the top of the head, where a hat sits
//   eye:  [x, y]     the near eye (glasses, masks)
//   neck: [x, y, w]  where a scarf or bow goes, and how wide
//   back: [x, y]     where a cape or backpack hangs
//   body: [x, y, rx, ry]  the ellipse markings are clipped to
const PLANS = {};
const BIRD_CORE = ["body", "shade", "beak", "legs"];

function plan(id, def) { PLANS[id] = Object.assign({ id, needs: ["body"], pal: {} }, def); }

/* ------------------------------------------------------------ bird plans */
// The eleven originals. Their painters are Art.birdX in js/art.js, untouched;
// these entries only add the anchors so the extras know where to go.
plan("chicken",  { cat:"Birds", label:"Hen",      needs: BIRD_CORE.concat(["comb","wattle"]),
  pal:{ body:"#ffffff", shade:"rgba(0,0,0,0.07)", beak:"#f0a500", legs:"#f0a500", comb:"#e8403a", wattle:"#e8403a" },
  anchor:{ head:[0.13,-0.42,0.21], top:-0.66, eye:[0.19,-0.47], neck:[0.10,-0.24,0.2], back:[-0.14,-0.14], body:[0,-0.06,0.38,0.32] },
  paint:(c,s,p,st)=>Art.birdChicken(c,s,p,st) });
plan("rooster",  { cat:"Birds", label:"Rooster",  needs: BIRD_CORE.concat(["comb","wattle","tail"]),
  pal:{ body:"#f6ede1", shade:"rgba(140,60,20,0.16)", beak:"#f0a500", legs:"#e8952f", comb:"#d93025", wattle:"#d93025", tail:"#1f6b44" },
  anchor:{ head:[0.19,-0.58,0.18], top:-0.84, eye:[0.24,-0.63], neck:[0.14,-0.38,0.17], back:[-0.12,-0.16], body:[0.02,-0.10,0.35,0.30] },
  paint:(c,s,p,st)=>Art.birdRooster(c,s,p,st) });
plan("chick",    { cat:"Birds", label:"Chick",    needs: BIRD_CORE,
  pal:{ body:"#ffd93b", shade:"rgba(190,120,0,0.20)", beak:"#f28c28", legs:"#f28c28" },
  anchor:{ head:[0.04,-0.30,0.33], top:-0.62, eye:[0.17,-0.36], neck:[0.04,-0.02,0.24], back:[-0.22,-0.04], body:[0,0.04,0.30,0.26] },
  paint:(c,s,p,st)=>Art.birdChick(c,s,p,st) });
plan("duck",     { cat:"Birds", label:"Duck",     needs: BIRD_CORE.concat(["head","ring"]),
  pal:{ body:"#8d7f6e", shade:"rgba(0,0,0,0.13)", beak:"#fdd835", legs:"#f28c28", head:"#2e7d32", ring:"#ffffff" },
  anchor:{ head:[0.24,-0.46,0.20], top:-0.66, eye:[0.29,-0.52], neck:[0.19,-0.24,0.16], back:[-0.14,-0.06], body:[-0.02,0.02,0.42,0.26] },
  paint:(c,s,p,st)=>Art.birdDuck(c,s,p,st) });
plan("penguin",  { cat:"Birds", label:"Penguin",  needs: BIRD_CORE.concat(["belly"]),
  pal:{ body:"#2b3640", shade:"rgba(0,0,0,0.22)", beak:"#f28c28", legs:"#f0a500", belly:"#ffffff" },
  anchor:{ head:[0,-0.44,0.27], top:-0.68, eye:[0.13,-0.52], neck:[0.02,-0.24,0.26], back:[-0.30,-0.10], body:[0,-0.08,0.36,0.46] },
  paint:(c,s,p,st)=>Art.birdPenguin(c,s,p,st) });
plan("owl",      { cat:"Birds", label:"Owl",      needs: BIRD_CORE.concat(["disc","tufts"]),
  pal:{ body:"#8d6e63", shade:"rgba(0,0,0,0.14)", beak:"#fdd835", legs:"#a1887f", disc:"#e4d9d2", tufts:"#6d4c41" },
  anchor:{ head:[0,-0.48,0.33], top:-0.78, eye:[0.13,-0.50], neck:[0,-0.20,0.28], back:[-0.30,-0.04], body:[0,-0.02,0.34,0.34] },
  paint:(c,s,p,st)=>Art.birdOwl(c,s,p,st) });
plan("flamingo", { cat:"Birds", label:"Flamingo", needs: BIRD_CORE.concat(["beakTip","head","wing"]),
  pal:{ body:"#f79ac0", shade:"rgba(198,40,110,0.16)", beak:"#f7d3e2", legs:"#ef7da3", beakTip:"#2b2b33", head:"#fbb3d0", wing:"#f07fae" },
  anchor:{ head:[0.22,-0.90,0.11], top:-1.00, eye:[0.24,-0.925], neck:[0.10,-0.50,0.10], back:[-0.10,-0.30], body:[-0.02,-0.26,0.29,0.175] },
  paint:(c,s,p,st)=>Art.birdFlamingo(c,s,p,st) });
plan("parrot",   { cat:"Birds", label:"Parrot",   needs: BIRD_CORE.concat(["tuft","wing","tail"]),
  pal:{ body:"#e53935", shade:"rgba(25,50,160,0.26)", beak:"#cfd8dc", legs:"#78909c", tuft:"#fdd835", wing:"#1e88e5", tail:"#1565c0" },
  anchor:{ head:[0.12,-0.44,0.21], top:-0.64, eye:[0.16,-0.50], neck:[0.10,-0.26,0.18], back:[-0.14,-0.10], body:[0,-0.08,0.32,0.30] },
  paint:(c,s,p,st)=>Art.birdParrot(c,s,p,st) });
plan("peacock",  { cat:"Birds", label:"Peacock",  needs: BIRD_CORE.concat(["head","tail","crown"]),
  pal:{ body:"#00897b", shade:"rgba(13,71,161,0.26)", beak:"#f0a500", legs:"#455a64", head:"#1565c0", tail:"#2e9e5b", crown:"#1565c0" },
  anchor:{ head:[0.18,-0.66,0.15], top:-0.80, eye:[0.22,-0.70], neck:[0.12,-0.34,0.13], back:[-0.12,-0.10], body:[0,-0.04,0.30,0.27] },
  paint:(c,s,p,st)=>Art.birdPeacock(c,s,p,st) });
plan("swan",     { cat:"Birds", label:"Swan",     needs: BIRD_CORE.concat(["mask"]),
  pal:{ body:"#ffffff", shade:"rgba(0,0,0,0.06)", beak:"#f57f17", legs:"#455a64", mask:"#212121" },
  anchor:{ head:[0.19,-0.82,0.11], top:-0.93, eye:[0.21,-0.86], neck:[0.20,-0.46,0.10], back:[-0.16,-0.08], body:[-0.04,-0.02,0.40,0.28] },
  paint:(c,s,p,st)=>Art.birdSwan(c,s,p,st) });
plan("dove",     { cat:"Birds", label:"Dove",     needs: BIRD_CORE,
  pal:{ body:"#eceff1", shade:"rgba(120,144,156,0.22)", beak:"#f9a825", legs:"#e57373" },
  anchor:{ head:[0.22,-0.54,0.17], top:-0.72, eye:[0.27,-0.58], neck:[0.16,-0.34,0.15], back:[-0.14,-0.12], body:[0,-0.08,0.36,0.29] },
  paint:(c,s,p,st)=>Art.birdDove(c,s,p,st) });

/* ---------------------------------------------------- painting a character */
Object.assign(Art, {
  PLANS,

  // One character, feet at y=0.46s, facing right. `st` is { dead, idle }.
  character(ctx, s, ch, st) {
    const P = PLANS[ch.plan] || PLANS.chicken, A = P.anchor, pal = ch.pal;
    st = st || {};
    if (ch.back) this.extraBack(ctx, s, A, ch.back, pal);
    P.paint(ctx, s, pal, st);
    if (ch.mark) this.marking(ctx, s, A, ch.mark, pal);
    if (ch.neck) this.extraNeck(ctx, s, A, ch.neck, pal);
    if (ch.face && !st.dead) this.extraFace(ctx, s, A, ch.face, pal);
    if (ch.hat) this.hat(ctx, s, A, ch.hat, pal);
  },

  // "name" or "name:rrggbb" -> [name, colour or fallback]
  _xc(spec, fallback) {
    const i = spec.indexOf(":");
    return i < 0 ? [spec, fallback] : [spec.slice(0, i), "#" + spec.slice(i + 1)];
  },

  /* --- markings, clipped to the plan's body ellipse --------------------- */
  marking(ctx, s, A, spec, pal) {
    const [kind, col] = this._xc(spec, pal.mark || GK.util.shade(pal.body, -40));
    const [bx, by, rx, ry] = A.body, [hx, hy, hr] = A.head;
    ctx.save();
    // the body, minus the head where the two overlap: spots on a cheek read
    // as a rash, not as markings
    ctx.beginPath(); ctx.ellipse(bx * s, by * s, rx * s, ry * s, 0, 0, 7); ctx.clip();
    ctx.beginPath(); ctx.rect(-4 * s, -4 * s, 8 * s, 8 * s); ctx.arc(hx * s, hy * s, hr * s * 1.02, 0, 7); ctx.clip("evenodd");
    ctx.fillStyle = col; ctx.globalAlpha = 0.9;
    const X = (u) => (bx + u * rx) * s, Y = (v) => (by + v * ry) * s;
    if (kind === "spots") {
      for (const [u, v, r] of [[-0.5,-0.3,0.22],[0.2,-0.45,0.16],[0.45,0.2,0.2],[-0.15,0.35,0.18],[-0.7,0.3,0.14]]) {
        ctx.beginPath(); ctx.ellipse(X(u), Y(v), r * rx * s, r * ry * s * 1.1, 0, 0, 7); ctx.fill();
      }
    } else if (kind === "speckle") {
      for (let i = 0; i < 14; i++) {
        const u = GK.util.hash2(i, 3) * 1.8 - 0.9, v = GK.util.hash2(i, 7) * 1.6 - 0.8;
        ctx.beginPath(); ctx.arc(X(u), Y(v), Math.max(0.6, s * 0.022), 0, 7); ctx.fill();
      }
    } else if (kind === "stripes") {
      for (const u of [-0.55, -0.1, 0.35]) { ctx.fillRect(X(u), Y(-1.2), rx * s * 0.2, ry * s * 2.4); }
    } else if (kind === "bands") {
      for (const v of [-0.45, 0.05, 0.55]) ctx.fillRect(X(-1.2), Y(v), rx * s * 2.4, ry * s * 0.22);
    } else if (kind === "patch") {
      ctx.beginPath(); ctx.ellipse(X(-0.35), Y(-0.1), rx * s * 0.45, ry * s * 0.55, 0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(X(0.45), Y(0.35), rx * s * 0.3, ry * s * 0.35, -0.3, 0, 7); ctx.fill();
    } else if (kind === "belly") {
      ctx.beginPath(); ctx.ellipse(X(0.25), Y(0.45), rx * s * 0.65, ry * s * 0.6, 0, 0, 7); ctx.fill();
    } else if (kind === "stars") {
      for (const [u, v] of [[-0.45,-0.2],[0.3,-0.35],[0.1,0.35],[-0.6,0.4]]) this.star(ctx, X(u), Y(v), s * 0.07);
    } else if (kind === "hearts") {
      for (const [u, v] of [[-0.45,-0.15],[0.35,-0.3],[0.05,0.4]]) this.heart(ctx, X(u), Y(v), s * 0.07);
    } else if (kind === "check") {
      const n = 6, w = rx * s * 2 / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) ctx.fillRect(X(-1) + i * w, Y(-1) + j * w, w, w);
    } else if (kind === "rainbow") {
      const cs = ["#e84a4a", "#f4a13a", "#f6d743", "#5cc46a", "#4a8fe8", "#8e5ae8"];
      cs.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(X(-1.1), Y(-1 + i * 0.34), rx * s * 2.2, ry * s * 0.35); });
    }
    ctx.restore();
  },

  star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  },
  heart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.fill();
  },

  /* --- the back: drawn before the body so the body sits in front -------- */
  extraBack(ctx, s, A, spec, pal) {
    const [kind, col] = this._xc(spec, "#d93a4a");
    const [x, y] = A.back, P = { line: GK.util.shade(col, -58), lw: Math.max(0.8, s * 0.038) };
    if (kind === "cape") {
      this.bPoly(ctx, P, [[(x + 0.10) * s, (y - 0.16) * s], [(x - 0.26) * s, (y + 0.34) * s],
                          [(x + 0.02) * s, (y + 0.40) * s], [(x + 0.22) * s, (y - 0.10) * s]], col);
    } else if (kind === "backpack") {
      ctx.fillStyle = P.line; rr(ctx, (x - 0.16) * s - P.lw, (y - 0.14) * s - P.lw, 0.24 * s + 2 * P.lw, 0.30 * s + 2 * P.lw, 0.06 * s); ctx.fill();
      ctx.fillStyle = col; rr(ctx, (x - 0.16) * s, (y - 0.14) * s, 0.24 * s, 0.30 * s, 0.06 * s); ctx.fill();
      ctx.fillStyle = GK.util.shade(col, 22); rr(ctx, (x - 0.13) * s, (y + 0.02) * s, 0.18 * s, 0.09 * s, 0.03 * s); ctx.fill();
    } else if (kind === "wings") {
      ctx.save(); ctx.globalAlpha = 0.75;
      for (const [dx, dy, r] of [[-0.12, -0.26, 0.2], [-0.2, -0.06, 0.14]]) {
        this.bEll(ctx, P, (x + dx) * s, (y + dy) * s, r * s, r * 0.62 * s, col, -0.5, false);
      }
      ctx.restore();
    } else if (kind === "jetpack") {
      for (const dx of [-0.13, -0.02]) {
        this.bEll(ctx, P, (x + dx) * s, y * s, 0.06 * s, 0.16 * s, col, 0, true);
        ctx.fillStyle = "#ffb03a"; ctx.beginPath(); ctx.ellipse((x + dx) * s, (y + 0.2) * s, 0.03 * s, 0.05 * s, 0, 0, 7); ctx.fill();
      }
    } else if (kind === "shell") {
      this.bEll(ctx, P, x * s, (y - 0.02) * s, 0.18 * s, 0.2 * s, col, 0.2, true);
      ctx.strokeStyle = P.line; ctx.lineWidth = P.lw;
      ctx.beginPath(); ctx.arc(x * s, (y - 0.02) * s, 0.09 * s, 0, 5); ctx.stroke();
    } else if (kind === "leaf") {
      this.bRibbon(ctx, P, x * s, (y + 0.1) * s, (x - 0.3) * s, (y - 0.1) * s, (x - 0.1) * s, (y - 0.42) * s, 0.04 * s, 0.2 * s, col);
    }
  },

  /* --- the neck --------------------------------------------------------- */
  extraNeck(ctx, s, A, spec, pal) {
    const [kind, col] = this._xc(spec, "#e84a4a");
    const [x, y, w] = A.neck, P = { line: GK.util.shade(col, -58), lw: Math.max(0.8, s * 0.034) };
    if (kind === "scarf") {
      ctx.fillStyle = P.line; rr(ctx, (x - w) * s - P.lw, (y - 0.05) * s - P.lw, 2 * w * s + 2 * P.lw, 0.11 * s + 2 * P.lw, 0.05 * s); ctx.fill();
      ctx.fillStyle = col; rr(ctx, (x - w) * s, (y - 0.05) * s, 2 * w * s, 0.11 * s, 0.05 * s); ctx.fill();
      this.bPoly(ctx, P, [[(x - w * 0.6) * s, (y + 0.03) * s], [(x - w * 0.9) * s, (y + 0.26) * s],
                          [(x - w * 0.5) * s, (y + 0.24) * s], [(x - w * 0.3) * s, (y + 0.04) * s]], col);
      ctx.fillStyle = GK.util.shade(col, 30);
      ctx.fillRect((x - w * 0.8) * s, (y - 0.01) * s, 2 * w * s * 0.8, 0.02 * s);
    } else if (kind === "bow" || kind === "bowtie") {
      const cx = (x + w * 0.5) * s, cy = y * s, r = 0.075 * s;
      this.bPoly(ctx, P, [[cx, cy], [cx - r * 1.4, cy - r], [cx - r * 1.4, cy + r]], col);
      this.bPoly(ctx, P, [[cx, cy], [cx + r * 1.4, cy - r], [cx + r * 1.4, cy + r]], col);
      this.bEll(ctx, P, cx, cy, r * 0.45, r * 0.45, GK.util.shade(col, -12), 0, false);
    } else if (kind === "bandana") {
      this.bPoly(ctx, P, [[(x - w) * s, (y - 0.04) * s], [(x + w) * s, (y - 0.04) * s], [(x + w * 0.2) * s, (y + 0.2) * s]], col);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      for (const u of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.arc((x + u * w) * s, (y + 0.02) * s, 0.012 * s + 0.4, 0, 7); ctx.fill(); }
    } else if (kind === "medal") {
      ctx.strokeStyle = "#2f6fd6"; ctx.lineWidth = Math.max(1, 0.04 * s);
      ctx.beginPath(); ctx.moveTo((x - w * 0.6) * s, (y - 0.04) * s); ctx.lineTo((x + w * 0.3) * s, (y + 0.12) * s);
      ctx.lineTo((x + w * 0.9) * s, (y - 0.04) * s); ctx.stroke();
      this.bEll(ctx, { line: "#8a5a00", lw: P.lw }, (x + w * 0.3) * s, (y + 0.16) * s, 0.06 * s, 0.06 * s, col === "#e84a4a" ? "#f6c531" : col, 0, true);
    } else if (kind === "bell") {
      ctx.fillStyle = "#c0463d"; ctx.fillRect((x - w) * s, (y - 0.03) * s, 2 * w * s, 0.06 * s);
      this.bEll(ctx, { line: "#8a5a00", lw: P.lw }, (x + w * 0.4) * s, (y + 0.07) * s, 0.05 * s, 0.05 * s, "#f6c531", 0, true);
    } else if (kind === "lei") {
      const cs = [col, "#ffd23f", "#ff7eb6", "#ffffff"];
      for (let i = 0; i < 6; i++) {
        const u = -1 + i * 0.4;
        ctx.fillStyle = cs[i % cs.length];
        ctx.beginPath(); ctx.arc((x + u * w) * s, (y + 0.04 * (1 - u * u)) * s, 0.045 * s, 0, 7); ctx.fill();
      }
    } else if (kind === "tie") {
      this.bPoly(ctx, P, [[(x + w * 0.35) * s, (y - 0.04) * s], [(x + w * 0.55) * s, (y - 0.04) * s],
                          [(x + w * 0.62) * s, (y + 0.24) * s], [(x + w * 0.45) * s, (y + 0.30) * s], [(x + w * 0.28) * s, (y + 0.24) * s]], col);
    } else if (kind === "collar") {
      ctx.fillStyle = col; ctx.fillRect((x - w) * s, (y - 0.035) * s, 2 * w * s, 0.07 * s);
      ctx.fillStyle = "#f6c531"; ctx.beginPath(); ctx.arc((x + w * 0.5) * s, (y + 0.06) * s, 0.035 * s, 0, 7); ctx.fill();
    }
  },

  /* --- the face ---------------------------------------------------------- */
  extraFace(ctx, s, A, spec, pal) {
    const [kind, col] = this._xc(spec, "#1d1d24");
    const [x, y] = A.eye, r = 0.075 * s;
    ctx.save();
    if (kind === "glasses" || kind === "specs") {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 0.028 * s);
      ctx.beginPath(); ctx.arc(x * s, y * s, r, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x * s - r, y * s); ctx.lineTo(x * s - r * 2.2, y * s - r * 0.2); ctx.stroke();
    } else if (kind === "shades") {
      ctx.fillStyle = col;
      rr(ctx, x * s - r * 1.1, y * s - r * 0.75, r * 2.3, r * 1.4, r * 0.5); ctx.fill();
      ctx.fillRect(x * s - r * 2.3, y * s - r * 0.5, r * 1.3, Math.max(1, 0.025 * s));
      ctx.fillStyle = "rgba(255,255,255,0.35)"; rr(ctx, x * s - r * 0.6, y * s - r * 0.5, r * 0.7, r * 0.35, r * 0.15); ctx.fill();
    } else if (kind === "mask") {
      ctx.fillStyle = col;
      rr(ctx, x * s - r * 2.4, y * s - r * 0.8, r * 3.6, r * 1.6, r * 0.7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x * s, y * s, r * 0.45, 0, 7); ctx.fill();
      ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(x * s + r * 0.1, y * s, r * 0.25, 0, 7); ctx.fill();
    } else if (kind === "goggles") {
      ctx.fillStyle = "#6b4a2f"; ctx.fillRect(x * s - r * 2.6, y * s - r * 0.35, r * 2.2, r * 0.7);
      ctx.fillStyle = col === "#1d1d24" ? "#9fd8f0" : col; ctx.strokeStyle = "#6b4a2f"; ctx.lineWidth = Math.max(1, 0.03 * s);
      ctx.beginPath(); ctx.arc(x * s, y * s, r * 1.05, 0, 7); ctx.fill(); ctx.stroke();
    } else if (kind === "blush") {
      ctx.globalAlpha = 0.55; ctx.fillStyle = col === "#1d1d24" ? "#ff8aa8" : col;
      ctx.beginPath(); ctx.ellipse(x * s - r * 0.2, y * s + r * 1.5, r * 0.9, r * 0.55, 0, 0, 7); ctx.fill();
    } else if (kind === "monocle") {
      ctx.strokeStyle = "#c9a227"; ctx.lineWidth = Math.max(1, 0.03 * s);
      ctx.beginPath(); ctx.arc(x * s, y * s, r * 1.1, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x * s, y * s + r * 1.1); ctx.quadraticCurveTo(x * s - r, y * s + r * 3, x * s - r * 0.4, y * s + r * 4); ctx.stroke();
    } else if (kind === "stache") {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x * s + r * 1.2, y * s + r * 1.8, r * 1.1, r * 0.4, 0.2, 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  /* --- headwear ---------------------------------------------------------- */
  // Every hat is authored `h` head-radii tall and scaled down if the plan has
  // less room than that above its head -- a flamingo gets a smaller top hat
  // than a duck, rather than a hat in the lane above.
  hat(ctx, s, A, spec, pal) {
    const [kind, col] = this._xc(spec, "#e84a4a");
    const def = HATS[kind]; if (!def) return;
    const [hx, , hr] = A.head, top = A.top;
    const room = top - CEIL;                       // s units available above the head
    const k = Math.max(0.35, Math.min(1, room / (def.h * hr)));
    const P = { line: GK.util.shade(col, -58), lw: Math.max(0.8, s * 0.034) };
    ctx.save();
    ctx.translate(hx * s, (top + hr * 0.12) * s);  // sits a touch into the head
    ctx.scale(hr * s * k, hr * s * k);             // hats are drawn in head radii
    P.lw /= hr * s * k;
    def.draw(ctx, P, col, this);
    ctx.restore();
  },
});

// Headwear in head-radius units: origin at the crown, y up is negative. `h` is
// the full height in those units, used for the fit above.
const HATS = {
  cap:    { h: 0.7, draw(c, P, col, A) {
    A.bEll(c, P, 0, -0.1, 0.95, 0.55, col, 0, true);
    c.fillStyle = P.line; c.fillRect(-0.95, 0.02, 2.2, 0.12);
    A.bPoly(c, P, [[0.3, 0.0], [1.5, 0.05], [1.4, 0.2], [0.3, 0.18]], GK.util.shade(col, -15)); } },
  beanie: { h: 1.2, draw(c, P, col, A) {
    A.bEll(c, P, 0, -0.05, 0.95, 0.72, col, 0, true);
    c.fillStyle = GK.util.shade(col, -20); c.fillRect(-0.98, 0.0, 1.96, 0.2);
    A.bEll(c, P, 0, -0.82, 0.26, 0.26, "#ffffff", 0, false); } },
  bow:    { h: 0.7, draw(c, P, col, A) {
    A.bPoly(c, P, [[0.2, -0.2], [-0.5, -0.6], [-0.5, 0.15]], col);
    A.bPoly(c, P, [[0.2, -0.2], [0.9, -0.6], [0.9, 0.15]], col);
    A.bEll(c, P, 0.2, -0.2, 0.18, 0.18, GK.util.shade(col, -15), 0, false); } },
  flower: { h: 0.8, draw(c, P, col, A) {
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; A.bEll(c, P, Math.cos(a) * 0.3, -0.35 + Math.sin(a) * 0.3, 0.24, 0.24, col, 0, false); }
    A.bEll(c, P, 0, -0.35, 0.18, 0.18, "#ffd23f", 0, false); } },
  crown:  { h: 0.9, draw(c, P, col, A) {
    A.bPoly(c, P, [[-0.7, 0.1], [-0.8, -0.75], [-0.4, -0.35], [0, -0.85], [0.4, -0.35], [0.8, -0.75], [0.7, 0.1]], col === "#e84a4a" ? "#f6c531" : col);
    c.fillStyle = "#e84a8a"; c.beginPath(); c.arc(0, -0.2, 0.13, 0, 7); c.fill(); } },
  tophat: { h: 1.5, draw(c, P, col, A) {
    A.bPoly(c, P, [[-1.1, 0.12], [1.1, 0.12], [1.1, -0.04], [-1.1, -0.04]], col);
    A.bPoly(c, P, [[-0.6, 0], [0.6, 0], [0.55, -1.35], [-0.55, -1.35]], col);
    c.fillStyle = "#e84a4a"; c.fillRect(-0.58, -0.35, 1.16, 0.2); } },
  party:  { h: 1.6, draw(c, P, col, A) {
    A.bPoly(c, P, [[-0.6, 0.05], [0.6, 0.05], [0, -1.4]], col);
    c.fillStyle = "#ffffff"; for (const [x, y] of [[-0.2, -0.35], [0.15, -0.65], [-0.02, -0.95]]) { c.beginPath(); c.arc(x, y, 0.09, 0, 7); c.fill(); }
    A.bEll(c, P, 0, -1.45, 0.16, 0.16, "#ffd23f", 0, false); } },
  chef:   { h: 1.4, draw(c, P, col, A) {
    A.bPoly(c, P, [[-0.6, 0.1], [0.6, 0.1], [0.6, -0.5], [-0.6, -0.5]], "#ffffff");
    for (const x of [-0.45, 0, 0.45]) A.bEll(c, { line: "#b9bec4", lw: P.lw }, x, -0.85, 0.42, 0.45, "#ffffff", 0, false); } },
  straw:  { h: 0.9, draw(c, P, col, A) {
    A.bEll(c, { line: "#8a6a2a", lw: P.lw }, 0, 0.0, 1.45, 0.24, "#e8c56a", 0, false);
    A.bEll(c, { line: "#8a6a2a", lw: P.lw }, 0, -0.35, 0.7, 0.5, "#efd07a", 0, true);
    c.fillStyle = col; c.fillRect(-0.7, -0.22, 1.4, 0.16); } },
  helmet: { h: 0.9, draw(c, P, col, A) {
    A.bEll(c, P, 0, -0.05, 1.0, 0.8, col, 0, true);
    c.fillStyle = GK.util.shade(col, -20); c.fillRect(-1.15, 0.02, 2.3, 0.14);
    c.fillStyle = "rgba(255,255,255,0.4)"; c.fillRect(-0.08, -0.8, 0.16, 0.8); } },
  wizard: { h: 2.0, draw(c, P, col, A) {
    A.bEll(c, P, 0, 0.04, 1.25, 0.2, col, 0, false);
    A.bPoly(c, P, [[-0.65, 0.05], [0.65, 0.05], [0.25, -1.2], [-0.45, -1.8]], col);
    c.fillStyle = "#ffd23f"; A.star(c, 0, -0.5, 0.24); } },
  pirate: { h: 1.0, draw(c, P, col, A) {
    A.bPoly(c, P, [[-1.2, 0.05], [1.2, 0.05], [0.9, -0.55], [0, -0.9], [-0.9, -0.55]], col === "#e84a4a" ? "#26262e" : col);
    c.fillStyle = "#ffffff"; c.beginPath(); c.arc(0, -0.42, 0.16, 0, 7); c.fill(); } },
  santa:  { h: 1.4, draw(c, P, col, A) {
    A.bPoly(c, P, [[-0.85, 0.05], [0.85, 0.05], [0.4, -0.8], [-0.9, -1.2]], "#d9313a");
    A.bEll(c, { line: "#c6cbd0", lw: P.lw }, 0, 0.02, 0.95, 0.2, "#ffffff", 0, false);
    A.bEll(c, { line: "#c6cbd0", lw: P.lw }, -0.95, -1.2, 0.22, 0.22, "#ffffff", 0, false); } },
  antlers:{ h: 1.1, draw(c, P, col, A) {
    for (const d of [-1, 1]) {
      A.bLimb(c, { line: "#4a3322", lw: P.lw }, [[d * 0.35, 0], [d * 0.55, -0.6], [d * 0.9, -0.95]], 0.14, "#9a6a44");
      A.bLimb(c, { line: "#4a3322", lw: P.lw }, [[d * 0.55, -0.6], [d * 0.25, -0.95]], 0.12, "#9a6a44");
    } } },
  headphones: { h: 0.6, draw(c, P, col, A) {
    c.strokeStyle = P.line; c.lineWidth = 0.2; c.beginPath(); c.arc(0, 0.35, 0.95, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.strokeStyle = col; c.lineWidth = 0.12; c.beginPath(); c.arc(0, 0.35, 0.95, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    A.bEll(c, P, -0.02, 0.45, 0.3, 0.36, col, 0, false); } },
  tiara:  { h: 0.6, draw(c, P, col, A) {
    A.bPoly(c, { line: "#8a6a2a", lw: P.lw }, [[-0.6, 0.05], [-0.3, -0.25], [0, -0.55], [0.3, -0.25], [0.6, 0.05]], "#f2d36b");
    c.fillStyle = col; c.beginPath(); c.arc(0, -0.2, 0.12, 0, 7); c.fill(); } },
  cowboy: { h: 1.1, draw(c, P, col, A) {
    A.bPoly(c, P, [[-1.5, -0.1], [-1.2, 0.12], [1.2, 0.12], [1.5, -0.1], [0.9, 0.0], [-0.9, 0.0]], col);
    A.bPoly(c, P, [[-0.65, 0.02], [0.65, 0.02], [0.55, -0.9], [0, -0.75], [-0.55, -0.9]], col);
    c.fillStyle = GK.util.shade(col, -35); c.fillRect(-0.62, -0.2, 1.24, 0.14); } },
  beret:  { h: 0.6, draw(c, P, col, A) {
    A.bEll(c, P, 0.1, -0.2, 1.05, 0.38, col, -0.12, true);
    c.fillStyle = P.line; c.fillRect(0.05, -0.68, 0.08, 0.14); } },
  sprout: { h: 1.0, draw(c, P, col, A) {
    A.bLimb(c, { line: "#2d5a1e", lw: P.lw }, [[0, 0], [0.05, -0.55]], 0.1, "#5cae3a");
    A.bRibbon(c, { line: "#2d5a1e", lw: P.lw }, 0.05, -0.5, 0.5, -0.85, 0.75, -0.55, 0.1, 0.34, col === "#e84a4a" ? "#6cc04a" : col);
    A.bRibbon(c, { line: "#2d5a1e", lw: P.lw }, 0.05, -0.55, -0.4, -0.95, -0.6, -0.6, 0.1, 0.28, "#6cc04a"); } },
  ears:   { h: 1.5, draw(c, P, col, A) {
    for (const d of [-1, 1]) A.bEll(c, P, d * 0.35, -0.75, 0.22, 0.7, col, d * 0.2, true);
    c.fillStyle = "#ff9ab8"; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 0.35, -0.75, 0.1, 0.5, d * 0.2, 0, 7); c.fill(); } } },
  propeller: { h: 1.0, draw(c, P, col, A) {
    A.bEll(c, P, 0, -0.05, 0.9, 0.55, col, 0, true);
    c.fillStyle = "#555"; c.fillRect(-0.05, -0.8, 0.1, 0.35);
    A.bEll(c, { line: "#8a2a2a", lw: P.lw }, -0.35, -0.82, 0.38, 0.1, "#e84a4a", 0, false);
    A.bEll(c, { line: "#2a4a8a", lw: P.lw }, 0.35, -0.82, 0.38, 0.1, "#4a8fe8", 0, false); } },
  grad:   { h: 0.8, draw(c, P, col, A) {
    A.bPoly(c, P, [[-0.6, 0.05], [0.6, 0.05], [0.6, -0.3], [-0.6, -0.3]], col === "#e84a4a" ? "#26262e" : col);
    A.bPoly(c, P, [[-1.3, -0.4], [0, -0.75], [1.3, -0.4], [0, -0.1]], col === "#e84a4a" ? "#26262e" : col);
    c.strokeStyle = "#f6c531"; c.lineWidth = 0.08; c.beginPath(); c.moveTo(0, -0.42); c.lineTo(0.9, -0.3); c.lineTo(0.95, 0.2); c.stroke(); } },
  viking: { h: 1.0, draw(c, P, col, A) {
    A.bEll(c, P, 0, -0.02, 0.95, 0.75, "#9aa3ad", 0, true);
    for (const d of [-1, 1]) A.bRibbon(c, { line: "#8a7a5a", lw: P.lw }, d * 0.7, -0.3, d * 1.2, -0.4, d * 1.1, -0.95, 0.3, 0.05, "#f3ead0");
    c.fillStyle = col; c.fillRect(-0.95, -0.08, 1.9, 0.16); } },
  laurel: { h: 0.5, draw(c, P, col, A) {
    for (let i = 0; i < 7; i++) { const u = -0.9 + i * 0.3; A.bEll(c, { line: "#2d5a1e", lw: P.lw * 0.7 }, u, -0.05 - 0.2 * (1 - u * u), 0.16, 0.08, "#6cae4a", u * 0.8, false); } } },
  sailor: { h: 0.8, draw(c, P, col, A) {
    A.bPoly(c, { line: "#9aa3ad", lw: P.lw }, [[-0.85, 0.05], [0.85, 0.05], [0.7, -0.5], [-0.7, -0.5]], "#ffffff");
    c.fillStyle = col === "#e84a4a" ? "#2f5aa8" : col; c.fillRect(-0.85, -0.02, 1.7, 0.12); } },
  bucket: { h: 0.9, draw(c, P, col, A) {
    A.bPoly(c, P, [[-1.15, 0.12], [1.15, 0.12], [0.65, -0.2], [0.55, -0.8], [-0.55, -0.8], [-0.65, -0.2]], col); } },
  miner:  { h: 0.9, draw(c, P, col, A) {
    A.bEll(c, P, 0, -0.05, 1.0, 0.78, col === "#e84a4a" ? "#f2c230" : col, 0, true);
    A.bEll(c, { line: "#555", lw: P.lw }, 0.55, -0.35, 0.2, 0.2, "#fff6c8", 0, false); } },
  halo:   { h: 0.9, draw(c, P, col, A) {
    c.strokeStyle = "#f6d743"; c.lineWidth = 0.14; c.beginPath(); c.ellipse(0, -0.65, 0.7, 0.2, 0, 0, 7); c.stroke(); } },
  horns:  { h: 0.9, draw(c, P, col, A) {
    for (const d of [-1, 1]) A.bRibbon(c, P, d * 0.4, 0.05, d * 0.55, -0.4, d * 0.3, -0.85, 0.34, 0.04, col === "#e84a4a" ? "#f3ead0" : col); } },
  pumpkin:{ h: 1.0, draw(c, P, col, A) {
    A.bEll(c, { line: "#8a4a10", lw: P.lw }, 0, -0.35, 0.9, 0.55, "#f08a24", 0, true);
    c.strokeStyle = "#c46a14"; c.lineWidth = 0.06; for (const x of [-0.35, 0.35]) { c.beginPath(); c.ellipse(x, -0.35, 0.18, 0.5, 0, 0, 7); c.stroke(); }
    c.fillStyle = "#4a7a2a"; c.fillRect(-0.06, -1.0, 0.12, 0.2); } },
  snorkel:{ h: 0.9, draw(c, P, col, A) {
    c.fillStyle = col; c.fillRect(-0.9, -0.05, 1.8, 0.16);
    A.bLimb(c, P, [[-0.6, 0.0], [-0.65, -0.8]], 0.16, col === "#e84a4a" ? "#f2c230" : col); } },
  astronaut: { h: 0.4, draw(c, P, col, A) {
    c.strokeStyle = "#dfe6ee"; c.lineWidth = 0.18; c.beginPath(); c.arc(0, 0.85, 1.12, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.fillStyle = "rgba(170,220,255,0.25)"; c.beginPath(); c.arc(0, 0.85, 1.05, Math.PI, 0); c.fill(); } },
};

/* ---------------------------------------------------------------- themes */
// Presentation-only themes a few characters bring with them: weather over the
// world, and "costumes" for the traffic (the same seven lane colours, mapped
// to a new set). A theme never touches a lane, a timer or a hitbox -- the
// simulation does not know it exists. Vehicle bodies, lights and sizes stay
// exactly as they are, so traffic reads the same whatever it is wearing.
const THEMES = {
  snowfall:  { name: "Snowfall",      mote: { color: "rgba(255,255,255,0.85)", n: 20, rise: 12, drift: 8, size: 2.2 } },
  blossom:   { name: "Blossom",       mote: { color: "rgba(255,182,214,0.85)", n: 16, rise: 7, drift: 16, size: 2.1 } },
  autumn:    { name: "Autumn leaves", mote: { color: "rgba(226,132,52,0.8)", n: 14, rise: 9, drift: 20, size: 2.3 },
               cars: ["#c8553d", "#e0a03a", "#8a6a3a", "#b0413e", "#d98e32", "#7a8a3a", "#a4633a"] },
  bubbles:   { name: "Bubbles",       mote: { color: "rgba(210,240,255,0.7)", n: 16, rise: -12, drift: 6, size: 2.6 } },
  fireflies: { name: "Fireflies",     mote: { color: "rgba(200,255,150,0.9)", n: 14, rise: -3, drift: 9, size: 2.1, glow: true } },
  candy:     { name: "Candy traffic", cars: ["#ff8fb8", "#ffc46b", "#8fd3ff", "#c9a0ff", "#7fe0b0", "#f0d860", "#ff9e9e"] },
  neon:      { name: "Neon nights",   cars: ["#ff3df0", "#3dfff0", "#f0ff3d", "#ff8a3d", "#3d8aff", "#9dff3d", "#ff3d6a"],
               mote: { color: "rgba(160,120,255,0.8)", n: 10, rise: -4, drift: 12, size: 1.8, glow: true } },
  stardust:  { name: "Stardust",      mote: { color: "rgba(255,236,150,0.85)", n: 14, rise: -5, drift: 10, size: 1.8, glow: true } },
  retro:     { name: "Retro rides",   cars: ["#d9a441", "#6fa38c", "#c46d5e", "#8fa8c4", "#e2c9a0", "#7d6b9e", "#b5c46b"] },
  embers:    { name: "Embers",        mote: { color: "rgba(255,150,70,0.8)", n: 14, rise: -14, drift: 8, size: 1.8, glow: true } },
};
