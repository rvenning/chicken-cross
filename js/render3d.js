// The 3D view: a second renderer for the same Game, drawn with three.js.
//
// Like js/render.js this only ever READS the simulation. Rows, columns, the
// camera row, hop progress and every hazard's x come straight from game.js, so
// switching view changes what you see and nothing about what happens. The one
// number it feeds back is Game.extC (how far past the playfield the hazards
// loop), because an angled camera sees further round the corners than a flat
// one -- see extFor().
//
// three.js is ~136 KB gzipped, so it is only fetched when a player turns 3D on.
// Until it arrives (or if the device has no WebGL) the 2D renderer carries on.
//
// World units are tiles: x = column - 4 (the playfield is centred on 0),
// z = -row (forward is into the screen), y is up with the ground top at 0.
//
// Everything that never moves -- ground, trees, rails -- is baked into ONE
// vertex-coloured mesh per lane, and every car, log and train is one mesh too,
// so a full screen is ~80 draw calls rather than a few thousand boxes.
"use strict";

const R3 = {
  ready: false, loading: false, failed: false,

  // Camera. Pitch is how far it looks down, yaw how far it sits to the right.
  // Orthographic, so a car is the same size at the top of the screen as at the
  // bottom -- perspective would shrink the road ahead, which is the part the
  // player is reading.
  PITCH: 57 * Math.PI / 180,
  YAW: 13 * Math.PI / 180,

  AHEAD: 4,              // rows built in advance above the top of the screen
  WATER_Y: -0.2,         // water surface; land is at 0
  LOG_TOP: 0.14,

  /* ------------------------------------------------------------ geometry */

  // Pixels per tile. Enough width for the nine columns and a sliver either
  // side, and never so zoomed out on a wide screen that the bird is a speck --
  // the flat view can show extra rows for free, the angled one pays for them
  // in size.
  pxPerTile(W, H) { return Math.min(W / 9.6, H / 9); },

  // How far the hazards must loop past the playfield for the angled camera
  // never to see one appear. Pure maths, no three.js, so resize() can call it
  // before the library has loaded and the headless tests can check it.
  extFor(W, H, TILE) {
    const P = this.pxPerTile(W, H), k = Math.sin(this.PITCH) * Math.cos(this.YAW);
    const halfW = W / (2 * P), zMax = H / (2 * P * k) + 3;
    const shift = Math.abs(this.shiftFor(H, P, TILE, Game.BASE_Y));
    const reach = (halfW + zMax * Math.sin(this.YAW)) / Math.cos(this.YAW) + shift;
    return reach - COLS / 2 + 1.2;
  },

  // With the camera yawed, rows below the middle of the screen slide left.
  // The bird lives below the middle, so slide the camera to put the playfield
  // centred on HER row rather than on the middle of the screen.
  shiftFor(H, P, TILE, BASE_Y) {
    const k = Math.sin(this.PITCH) * Math.cos(this.YAW);
    return -(H / (2 * P * k) - (1 - BASE_Y) * H / TILE) * Math.tan(this.YAW);
  },

  // Rows [lo, hi] the camera can see, and the row it is centred on. The bottom
  // edge is pinned to camBottomRow() -- the same line the engine refuses moves
  // behind -- so "off the bottom of the screen" means the same in both views.
  frame3(G) {
    const P = this.pxPerTile(G.W, G.H), k = Math.sin(this.PITCH) * Math.cos(this.YAW);
    const bottom = G.camRow - (G.H * (1 - G.BASE_Y)) / G.TILE;
    const half = G.H / (2 * P * k);
    return { P, bottom, anchor: bottom + half, lo: Math.floor(bottom) - 2, hi: Math.ceil(bottom + 2 * half) + 3 };
  },

  /* ------------------------------------------------------------- loading */

  load(quiet) {
    if (this.ready || this.loading || this.failed) return;
    this.quiet = !!quiet;
    if (!this.webgl()) return this.fail("no-webgl");
    this.loading = true;
    const s = document.createElement("script");
    s.src = "vendor/three/three.min.js";
    s.onload = () => {
      this.loading = false;
      try { this.init(window.THREE); } catch (e) { console.error(e); this.fail("init"); }
    };
    s.onerror = () => { this.loading = false; this.fail("fetch"); };
    document.head.appendChild(s);
  },

  webgl() {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  },

  fail(why) {
    this.failed = true;
    console.warn("3D view unavailable:", why);
    // Only worth saying when she asked for 3D; as a default it just quietly stays 2D.
    if (!this.quiet && typeof App !== "undefined" && App.toast) App.toast("3D isn't available here, so you're seeing 2D");
    if (typeof Game !== "undefined") { Game.view = "2d"; if (Game.canvas) Game.resize(); }
  },

  init(T) {
    this.T = T;
    const c = document.createElement("canvas");
    c.id = "c3d";
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = "position:fixed;inset:0;margin:auto;display:none;pointer-events:none;background:transparent";
    document.body.insertBefore(c, document.getElementById("c"));
    this.canvas = c;

    const r = new T.WebGLRenderer({ canvas: c, antialias: true, powerPreference: "high-performance" });
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFShadowMap;
    this.renderer = r;
    // A lost context (a tablet reclaiming the GPU in the background) would
    // leave a black screen; fall back to 2D rather than show nothing.
    c.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.ready = false; this.hide(); });
    c.addEventListener("webglcontextrestored", () => { this.rows.clear(); this.chickKey = ""; this.ready = true; });

    this.scene = new T.Scene();
    this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.hemi = new T.HemisphereLight(0xffffff, 0x6d6450, 1.9);
    this.sun = new T.DirectionalLight(0xffffff, 2.3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow;
    sc.mapSize.set(1024, 1024);   // fitted to the view each resize -- see fitShadow()
    Object.assign(sc.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 });
    sc.camera.updateProjectionMatrix();
    sc.bias = -0.0006; sc.normalBias = 0.02;
    // At night the bird carries a small pool of light, as the 2D bird carries
    // a glow: the one thing on screen she must never lose.
    this.lamp = new T.PointLight(0xffe6b0, 0, 3.2, 1.6);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.lamp);

    this.mat = new T.MeshLambertMaterial({ vertexColors: true });
    this.glowMat = new T.MeshBasicMaterial({ vertexColors: true });
    this.beamMat = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3,
      depthWrite: false, blending: T.AdditiveBlending });
    this.lampOn = new T.MeshBasicMaterial({ color: 0xff3b30 });
    this.lampOff = new T.MeshLambertMaterial({ color: 0x5a1c1c });

    this.G = {
      box: new T.BoxGeometry(1, 1, 1),
      cyl: new T.CylinderGeometry(0.5, 0.5, 1, 10),
      cyl6: new T.CylinderGeometry(0.5, 0.5, 1, 6),
      cone: new T.ConeGeometry(0.5, 1, 4),
      cone8: new T.ConeGeometry(0.5, 1, 8),
      ico: new T.IcosahedronGeometry(0.5, 0),
      dode: new T.DodecahedronGeometry(0.5, 0),
      oct: new T.OctahedronGeometry(0.5, 0),
      ring: new T.RingGeometry(0.8, 1, 28),
    };
    this._m = new T.Matrix4(); this._nm = new T.Matrix3(); this._q = new T.Quaternion();
    this._e = new T.Euler(); this._v = new T.Vector3(); this._s = new T.Vector3();
    this._c = new T.Color(); this._t = new T.Vector3();

    this.rows = new Map();
    this.cache = new Map();
    this.fx = this.makeFx();
    this.ready = true;
  },

  /* --------------------------------------------------------------- baking */

  // A bag of triangles that turns into one mesh. `glow` is a second bag drawn
  // unlit, for lamps and lava; `beam` a third, unlit and see-through, for
  // headlight pools on the road at night.
  bag() { return { p: [], n: [], c: [], i: [], glow: null, beam: null }; },
  lit(b) { return b.glow || (b.glow = this.bag()); },
  beamOf(b) { return b.beam || (b.beam = this.bag()); },

  // Add one primitive, positioned/rotated/scaled, in one colour.
  put(b, geo, color, x, y, z, sx, sy, sz, rx, ry, rz) {
    this._e.set(rx || 0, ry || 0, rz || 0);
    this._q.setFromEuler(this._e);
    this._m.compose(this._t.set(x, y, z), this._q, this._s.set(sx, sy, sz));
    const pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index;
    const nm = this._nm.getNormalMatrix(this._m), col = this._c.set(color), v = this._v;
    const base = b.p.length / 3;
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(this._m); b.p.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize(); b.n.push(v.x, v.y, v.z);
      b.c.push(col.r, col.g, col.b);
    }
    if (idx) for (let j = 0; j < idx.count; j++) b.i.push(base + idx.getX(j));
    else for (let k = 0; k < pos.count; k++) b.i.push(base + k);
  },
  // the common case: an axis-aligned box given by its centre and size
  box(b, color, x, y, z, sx, sy, sz, ry) { this.put(b, this.G.box, color, x, y, z, sx, sy, sz, 0, ry || 0, 0); },

  geometry(b) {
    const T = this.T, g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(b.n, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(b.c, 3));
    g.setIndex(b.i);
    return g;
  },

  // Bag -> Group of at most two meshes (lit + glow).
  object(b, shadows) {
    const T = this.T, grp = new T.Group();
    if (b.p.length) {
      const m = new T.Mesh(this.geometry(b), this.mat);
      m.castShadow = shadows !== false; m.receiveShadow = true;
      grp.add(m);
    }
    if (b.glow && b.glow.p.length) grp.add(new T.Mesh(this.geometry(b.glow), this.glowMat));
    if (b.beam && b.beam.p.length) grp.add(new T.Mesh(this.geometry(b.beam), this.beamMat));
    return grp;
  },

  // Cached template, cloned per use (clones share geometry).
  shared(key, build) {
    let t = this.cache.get(key);
    if (!t) { const b = this.bag(); build(b); t = this.object(b); this.cache.set(key, t); }
    return t.clone();
  },

  disposeGroup(g) { g.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); }); },

  /* -------------------------------------------------------------- colours */

  // Pure JS for #rgb/#rrggbb, so the character builders run headless in the
  // tests; anything else goes through three.js.
  hex(c) {
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + c.slice(1).split("").map(h => h + h).join("").toLowerCase();
    return "#" + this._c.set(c).getHexString();
  },
  // mix two colours in sRGB, t=0 -> a
  mix(a, b, t) {
    const pa = parseInt(this.hex(a).slice(1), 16), pb = parseInt(this.hex(b).slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  },
  dark(c, t) { return this.mix(c, "#000000", t); },
  light(c, t) { return this.mix(c, "#ffffff", t); },

  /* ----------------------------------------------------------------- rows */

  X(col) { return col - (COLS - 1) / 2; },

  // The ground reaches this far either side of centre -- well past anything
  // the camera can see, so the world never has an edge.
  halfWide() { return Math.ceil(Game.extC) + COLS / 2 + 10; },

  buildRow(row, lane) {
    // Two bags per lane: `b` for things that stand up and cast shadows, `f`
    // for everything flat. Flat ground can't shadow anything the camera sees,
    // so it stays out of the shadow pass; before, it covered the whole shadow
    // map every frame for nothing.
    // An endless run travels through the worlds, so each lane carries its own.
    const G = Game, wi = Art.laneWorld(lane, G.params && G.params.wi);
    const th = Art.themeOf(wi, lane && lane.blend), A = Art.pal(wi), b = this.bag(), f = this.bag();
    const lava = wi === 9, night = !!A.night;
    const rec = { row, lane, group: null, cars: [], logs: [], train: null, arms: [], lamps: [], coin: null, ripples: null };
    const z = -row, HW = this.halfWide(), PF = COLS / 2;

    // A lane's ground: the playfield strip, and darker ground beyond it on both
    // sides, which is what tells you where the edge of the game is.
    const ground = (color, top, depth, glow) => {
      const into = glow ? this.lit(f) : f;
      this.box(into, color, 0, top - depth / 2, z, COLS, depth, 1);
      const side = this.dark(color, 0.22), w = HW - PF;
      this.box(into, side, -(PF + w / 2), top - depth / 2, z, w, depth, 1);
      this.box(into, side, PF + w / 2, top - depth / 2, z, w, depth, 1);
    };

    if (!lane) {                                   // behind the start line
      ground(this.dark(th.water, 0.35), this.WATER_Y, 0.4, lava);
    } else if (lane.type === "grass") {
      ground(row % 2 ? th.grassA : th.grassB, 0, 0.7);
      // litter: flat flecks that break the colour up without looking solid
      for (let col = -Math.ceil(G.extC) - 4; col < COLS + Math.ceil(G.extC) + 4; col++) {
        const h = hash2(row * 5 + 3, col * 7 + 1);
        if (h < 0.3) this.box(f, A.litter, this.X(col) + (h * 7 % 1 - 0.5) * 0.6, 0.012, z + (h * 13 % 1 - 0.5) * 0.6, 0.14, 0.024, 0.1);
      }
      for (const col of lane.trees) this.obstacle(b, this.X(col), z, (col * 7 + row) % 3 === 0, row * 97 + col, wi);
      // planting beyond the playfield, same painters as the real obstacles
      const ext = Math.ceil(G.extC) + 3;
      for (let i = 1; i <= ext; i++) for (const col of [-i, COLS - 1 + i]) {
        const h = hash2(row, col);
        if (h < 0.55) this.obstacle(b, this.X(col), z, h < 0.12, row * 97 + col, wi);
      }
    } else if (lane.type === "road") {
      ground(th.road, -0.02, 0.7);
      // dashes between two road lanes, like the 2D road
      const next = G.world[row + 1];
      if (next && next.type === "road")
        for (let x = -HW; x < HW; x += 1) this.box(f, "#f2f2ea", x + 0.5, -0.012, z - 0.5, 0.42, 0.02, 0.06);
      // kerb where the road meets anything else
      const prev = G.world[row - 1];
      if (!prev || prev.type !== "road") this.box(f, this.light(th.road, 0.35), 0, -0.01, z + 0.47, HW * 2, 0.03, 0.06);
      const style = Art.vehicleStyle(row, lane, wi), color = Art.vehicleColor(lane.color, G.themeFx, style);
      for (const car of lane.cars) {
        const m = this.car(car.kind, color, lane.dir, car.width, style, night);
        m.position.set(this.X(car.x), 0, z);
        rec.cars.push(m);
      }
    } else if (lane.type === "water") {
      ground(th.water, this.WATER_Y, 0.4, lava);
      for (const lg of lane.logs) {
        const m = this.log(lg.len);
        rec.logs.push(m);
      }
      rec.ripples = this.ripples(th.water, lane.dir, lava);
      rec.ripples.position.z = z;
    } else if (lane.type === "rail") {
      ground(this.mix(th.road, "#a39788", 0.6), 0, 0.7);
      for (let x = -HW; x < HW; x += 0.5) this.box(f, "#6b4a33", x + 0.25, 0.03, z, 0.14, 0.05, 0.84);
      for (const dz of [-0.24, 0.24]) this.box(f, "#c9ced3", 0, 0.08, z + dz, HW * 2, 0.06, 0.06);
      rec.train = this.train(lane.dir, night);
      rec.train.position.z = z;
      rec.train.visible = false;
      this.gates(b, rec, z);
    }

    if (lane && lane.coin) { rec.coin = this.coin(); rec.coin.position.set(this.X(lane.coin.col), 0, z); }

    rec.group = this.object(b);
    const grp = rec.group;
    for (const m of this.object(f, false).children) grp.add(m);
    for (const m of rec.cars) grp.add(m);
    for (const m of rec.logs) grp.add(m);
    if (rec.train) grp.add(rec.train);
    if (rec.ripples) grp.add(rec.ripples);
    for (const a of rec.arms) grp.add(a);
    for (const l of rec.lamps) grp.add(l);
    if (rec.coin) grp.add(rec.coin);
    this.scene.add(grp);
    return rec;
  },

  dropRow(rec) {
    this.scene.remove(rec.group);
    // The lane's baked meshes, its gate arms and its ripples are its own; cars,
    // logs, trains and coins are clones of cached templates and share theirs.
    for (const m of rec.group.children) if (m.isMesh && !m.userData.keep) m.geometry.dispose();
    for (const g of rec.arms) this.disposeGroup(g);
    if (rec.ripples) this.disposeGroup(rec.ripples);
  },

  // Positions of everything that moves in this lane, from the simulation.
  updateRow(rec, G) {
    const lane = rec.lane; if (!lane) return;
    const z = -rec.row;
    if (lane.type === "road") {
      lane.cars.forEach((car, i) => { rec.cars[i].position.x = this.X(car.x); });
    } else if (lane.type === "water") {
      const bob = this.bob(rec.row, G);
      lane.logs.forEach((lg, i) => rec.logs[i].position.set(this.X(lg.x), bob, z));
      // the surface drifts with the current, a little slower than the logs
      const per = 3, off = (G.elapsed * lane.dir * lane.speed * 0.55 * Art.motion) % per;
      rec.ripples.position.x = off;
    } else if (lane.type === "rail") {
      rec.train.visible = lane.phase === "train";
      if (rec.train.visible) rec.train.position.x = this.X(lane.train.x);
      const up = (1 - lane.gate) * Math.PI / 2;
      rec.arms[0].rotation.z = up;
      rec.arms[1].rotation.z = -up;
      const on = lane.phase === "warn" || lane.phase === "train";
      const blink = !Art.motion || Math.floor(lane.blink * 3) % 2 === 0;
      rec.lamps.forEach((l, i) => { l.material = on && (blink === (i % 2 === 0)) ? this.lampOn : this.lampOff; });
    }
    if (rec.coin) {
      const coin = lane.coin;
      rec.coin.visible = !coin.taken;
      if (!coin.taken) {
        rec.coin.position.y = 0.36 + Math.sin(G.elapsed * 4 * Art.motion + coin.bob) * 0.05;
        rec.coin.rotation.y = G.elapsed * 2.2 * Art.motion + coin.bob;
      }
    }
  },

  // Water lanes bob as a whole, so a log and its rider move as one.
  bob(row, G) { return Math.sin(G.elapsed * 2.2 * Art.motion + row * 1.7) * 0.035; },

  /* ------------------------------------------------------------ obstacles */

  // One tile-sized solid thing on a grass lane: the world's tree, or its rock.
  obstacle(b, x, z, rock, seed, wi) {
    const A = Art.pal(wi);
    const h = (k) => hash2(seed * 31 + k * 13, 17 + k * 9);
    const ry = (h(9) - 0.5) * 0.5, s = 0.9 + h(4) * 0.22;
    if (rock) return this.rock(b, A, x, z, h, s, ry);
    const trunk = (w, top) => this.box(b, A.trunk, x, top / 2, z, w, top, w, ry);
    const G = this.G, c1 = A.canopy, c2 = A.canopy2;
    switch (A.tree) {
      case "clipped":
        trunk(0.14, 0.42 * s);
        this.box(b, c1, x, 0.62 * s, z, 0.56, 0.46 * s, 0.56, ry);
        this.box(b, c2, x - 0.06, 0.88 * s, z + 0.04, 0.34, 0.12, 0.34, ry);
        break;
      case "willow":
        trunk(0.16, 0.4 * s);
        this.box(b, c1, x, 0.58 * s, z, 0.78, 0.34 * s, 0.74, ry);
        this.box(b, c2, x, 0.8 * s, z, 0.5, 0.2, 0.5, ry);
        for (const [dx, dz] of [[-0.34, 0.2], [0.34, -0.1], [0.05, 0.34], [-0.2, -0.3]])
          this.box(b, c2, x + dx, 0.36 * s, z + dz, 0.12, 0.34 * s, 0.12, ry);
        break;
      case "fir": {
        trunk(0.14, 0.24);
        const snow = wi === 3;
        [[0.78, 0.46, 0.24], [0.6, 0.42, 0.5], [0.4, 0.36, 0.75]].forEach(([w, hh, y], i) => {
          this.put(b, G.cone, c1, x, (y + hh / 2) * s, z, w, hh * s, w, 0, Math.PI / 4 + ry, 0);
          if (snow) this.put(b, G.cone, "#f4fbff", x, (y + hh * 0.78) * s, z, w * 0.5, hh * 0.45 * s, w * 0.5, 0, Math.PI / 4 + ry, 0);
        });
        break;
      }
      case "hedge":
        this.box(b, c1, x, 0.24 * s, z, 0.86, 0.48 * s, 0.72, ry * 0.3);
        this.box(b, c2, x, 0.5 * s, z, 0.7, 0.08, 0.56, ry * 0.3);
        break;
      case "cactus": {
        const hh = 0.8 * s;
        this.box(b, c1, x, hh / 2, z, 0.24, hh, 0.24, ry);
        this.box(b, c2, x, hh + 0.02, z, 0.18, 0.05, 0.18, ry);
        const side = h(2) < 0.5 ? 1 : -1;
        this.box(b, c1, x + side * 0.2, 0.34, z, 0.18, 0.1, 0.14, ry);
        this.box(b, c1, x + side * 0.26, 0.5, z, 0.12, 0.34, 0.12, ry);
        this.box(b, c1, x - side * 0.19, 0.46, z, 0.14, 0.08, 0.12, ry);
        this.box(b, c1, x - side * 0.23, 0.58, z, 0.1, 0.22, 0.1, ry);
        if (h(3) < 0.4) this.box(b, "#f48fb1", x, hh + 0.07, z, 0.1, 0.08, 0.1, ry);
        break;
      }
      case "palm": {
        const lean = (h(5) - 0.5) * 0.3;
        for (let i = 0; i < 5; i++)
          this.box(b, i % 2 ? A.trunk : this.dark(A.trunk, 0.15), x + lean * i * 0.2, 0.1 + i * 0.19, z, 0.15, 0.2, 0.15, ry);
        const tx = x + lean, ty = 1.0 * s;
        for (let i = 0; i < 5; i++) {
          const a = ry + i * Math.PI * 2 / 5;
          this.put(b, G.box, i % 2 ? c1 : c2, tx + Math.sin(a) * 0.3, ty - 0.06, z + Math.cos(a) * 0.3, 0.16, 0.05, 0.6, 0.35, a, 0);
        }
        this.box(b, "#8d6e3f", tx, ty - 0.08, z, 0.14, 0.12, 0.14);
        break;
      }
      case "poplar":
        trunk(0.14, 0.3);
        this.box(b, c1, x, 0.78 * s, z, 0.38, 0.98 * s, 0.38, ry);
        this.box(b, c2, x - 0.05, 1.12 * s, z + 0.03, 0.24, 0.3, 0.24, ry);
        break;
      case "stump":
        this.put(b, G.cyl6, A.trunk, x, 0.18, z, 0.5, 0.36, 0.5, 0, ry, 0);
        this.put(b, G.cyl6, A.canopy, x, 0.365, z, 0.42, 0.02, 0.42, 0, ry, 0);
        this.box(b, this.dark(A.trunk, 0.2), x + 0.16, 0.5, z - 0.05, 0.08, 0.34, 0.08, ry);
        break;
      default: // broadleaf
        trunk(0.16, 0.32 * s);
        this.box(b, c1, x, 0.56 * s, z, 0.66, 0.5 * s, 0.66, ry);
        this.box(b, c2, x - 0.08, 0.86 * s, z + 0.06, 0.42, 0.22, 0.42, ry);
    }
  },

  rock(b, A, x, z, h, s, ry) {
    const G = this.G;
    switch (A.rock) {
      case "bollard":
        this.put(b, G.cyl, A.rockA, x, 0.26, z, 0.26, 0.52, 0.26);
        this.put(b, G.cyl, "#f2c230", x, 0.4, z, 0.27, 0.07, 0.27);
        this.put(b, G.cyl, A.rockB, x, 0.54, z, 0.22, 0.05, 0.22);
        break;
      case "ice":
        this.put(b, G.oct, A.rockA, x, 0.3, z, 0.5 * s, 0.62 * s, 0.5 * s, 0, ry, 0);
        this.put(b, G.oct, A.rockB, x + 0.2, 0.18, z + 0.1, 0.26, 0.36, 0.26, 0, ry + 0.6, 0);
        break;
      case "sandstone":
        this.box(b, A.rockA, x, 0.14, z, 0.72, 0.28, 0.62, ry);
        this.box(b, A.rockB, x + 0.05, 0.36, z - 0.03, 0.5, 0.18, 0.44, ry + 0.2);
        break;
      case "obsidian":
        this.put(b, G.dode, A.rockA, x, 0.26, z, 0.64 * s, 0.5 * s, 0.58 * s, 0, ry, 0);
        this.put(b, G.box, "#ff7a2f", x, 0.05, z + 0.32, 0.3, 0.02, 0.04, 0, ry, 0);
        break;
      default: // boulder
        this.put(b, G.dode, A.rockA, x, 0.24, z, 0.66 * s, 0.48 * s, 0.6 * s, 0, ry, 0);
        this.put(b, G.ico, A.rockB, x - 0.12, 0.38 * s, z - 0.05, 0.3, 0.2, 0.28, 0, ry, 0);
    }
  },

  /* ------------------------------------------------------------- vehicles */

  // Built facing +x and turned round for lanes that drive left. Every body is
  // width*0.9 long -- the same span the car hitbox is measured against --
  // whatever style it is; the styles differ in what sits on the chassis.
  car(kind, color, dir, width, style, night) {
    style = style || (kind === "truck" ? "box" : "sedan");
    const obj = this.shared(`car|${kind}|${style}|${color}|${!!night}`, (b) => {
      const L = width * 0.9, glass = "#bfe0ef", tyre = "#23232a";
      const lampB = night ? this.lit(b) : b;
      const wheels = (xs, r) => { for (const x of xs) for (const zz of [-0.3, 0.3]) this.box(b, tyre, x, r / 2, zz, r, r, 0.08); };
      if (kind === "truck") {
        const cab = 0.5, bodyL = L - cab - 0.04, bx = -L / 2 + bodyL / 2;
        if (style === "bus") {
          this.box(b, color, 0, 0.42, 0, L, 0.62, 0.66);
          this.box(b, glass, 0.04, 0.55, 0, L - 0.3, 0.16, 0.68);
          this.box(b, this.light(color, 0.35), 0, 0.745, 0, L - 0.1, 0.03, 0.6);
          this.box(b, glass, L / 2 + 0.005, 0.5, 0, 0.02, 0.24, 0.5);
          this.box(b, "#3a3a44", 0, 0.12, 0, L, 0.08, 0.5);
          wheels([-L / 2 + 0.3, L / 2 - 0.3], 0.2);
        } else {
          if (style === "tanker") {
            this.put(b, this.G.cyl, "#cfd6dc", bx, 0.46, 0, 0.6, bodyL, 0.6, 0, 0, Math.PI / 2);
            this.box(b, color, bx, 0.46, 0, bodyL * 0.3, 0.14, 0.62);
            this.box(b, "#3a3a44", bx, 0.14, 0, bodyL, 0.1, 0.5);
          } else if (style === "flatbed") {
            this.box(b, "#8a8f96", bx, 0.22, 0, bodyL, 0.08, 0.64);
            for (const [u, c] of [[0.22, "#c98f4a"], [0.55, "#b67a38"], [0.84, "#d9a35a"]])
              this.box(b, c, -L / 2 + bodyL * u, 0.4, 0, bodyL * 0.24, 0.3, 0.5);
            this.box(b, "#3a3a44", bx, 0.12, 0, bodyL, 0.08, 0.5);
          } else if (style === "fire") {
            this.box(b, color, bx, 0.38, 0, bodyL, 0.5, 0.64);
            for (const zz of [-0.16, 0.16]) this.box(b, "#e9edf0", bx, 0.67, zz, bodyL * 0.95, 0.04, 0.04);
            for (let i = 0; i < 7; i++) this.box(b, "#e9edf0", -L / 2 + 0.1 + i * (bodyL - 0.2) / 6, 0.67, 0, 0.03, 0.03, 0.34);
            this.box(b, "#3a3a44", bx, 0.12, 0, bodyL, 0.08, 0.5);
          } else {
            this.box(b, "#ecebe6", bx, 0.44, 0, bodyL, 0.62, 0.66);
            this.box(b, color, bx, 0.3, 0.335, bodyL * 0.92, 0.12, 0.01);
            this.box(b, color, bx, 0.3, -0.335, bodyL * 0.92, 0.12, 0.01);
            this.box(b, "#3a3a44", bx, 0.12, 0, bodyL, 0.08, 0.5);
          }
          this.box(b, color, L / 2 - cab / 2, 0.34, 0, cab, 0.44, 0.62);
          this.box(b, glass, L / 2 - cab / 2 + 0.06, 0.52, 0, cab * 0.6, 0.16, 0.64);
          if (style === "fire") this.box(night ? this.lit(b) : b, "#4a8fe8", L / 2 - cab / 2, 0.6, 0, 0.12, 0.06, 0.3);
          wheels([-L / 2 + 0.25, -L / 2 + 0.55, L / 2 - 0.25], 0.2);
        }
      } else if (style === "beetle") {
        this.box(b, color, 0, 0.22, 0, L, 0.22, 0.6);
        this.box(b, color, -0.02, 0.38, 0, L * 0.72, 0.14, 0.56);
        this.box(b, glass, -0.02, 0.4, 0, L * 0.6, 0.12, 0.58);
        this.box(b, this.light(color, 0.1), -0.02, 0.5, 0, L * 0.45, 0.06, 0.46);
        wheels([-L / 2 + 0.2, L / 2 - 0.2], 0.2);
      } else if (style === "tractor") {
        this.box(b, color, 0.12, 0.26, 0, L * 0.7, 0.24, 0.42);
        this.box(b, this.dark(color, 0.2), -L / 2 + 0.2, 0.3, 0, 0.32, 0.18, 0.4);
        for (const zz of [-0.28, 0.28]) {
          this.box(b, tyre, -L / 2 + 0.2, 0.2, zz, 0.4, 0.4, 0.12);
          this.box(b, tyre, L / 2 - 0.14, 0.1, zz, 0.2, 0.2, 0.08);
        }
        for (const [x, zz] of [[-L / 2 + 0.04, -0.14], [-L / 2 + 0.04, 0.14], [-L / 2 + 0.36, -0.14], [-L / 2 + 0.36, 0.14]])
          this.box(b, "#3a3a44", x, 0.55, zz, 0.03, 0.34, 0.03);
        this.box(b, "#3a3a44", -L / 2 + 0.2, 0.72, 0, 0.38, 0.03, 0.32);
        this.box(b, "#3a3a44", L / 2 - 0.2, 0.46, 0.1, 0.04, 0.2, 0.04);
      } else if (style === "pickup") {
        this.box(b, color, 0, 0.23, 0, L, 0.26, 0.62);
        this.box(b, this.light(color, 0.15), L * 0.1, 0.44, 0, L * 0.36, 0.18, 0.54);
        this.box(b, glass, L * 0.1, 0.43, 0, L * 0.38, 0.12, 0.56);
        for (const zz of [-0.28, 0.28]) this.box(b, color, -L * 0.24, 0.42, zz, L * 0.46, 0.12, 0.05);
        this.box(b, color, -L / 2 + 0.03, 0.42, 0, 0.05, 0.12, 0.6);
        wheels([-L / 2 + 0.2, L / 2 - 0.2], 0.2);
      } else if (style === "van" || style === "icecream") {
        this.box(b, color, -0.02, 0.4, 0, L - 0.04, 0.58, 0.62);
        this.box(b, glass, L / 2 - 0.1, 0.5, 0, 0.2, 0.2, 0.64);
        this.box(b, glass, -0.08, 0.53, 0, L * 0.5, 0.14, 0.64);
        if (style === "icecream") {
          this.put(b, this.G.cone8, "#e8b36a", -0.05, 0.78, 0, 0.16, 0.2, 0.16, Math.PI, 0, 0);
          this.put(b, this.G.ico, "#ff9ec4", -0.05, 0.93, 0, 0.2, 0.2, 0.2);
        }
        wheels([-L / 2 + 0.2, L / 2 - 0.2], 0.2);
      } else if (style === "jeep") {
        this.box(b, color, 0, 0.27, 0, L, 0.3, 0.62);
        this.box(b, glass, L * 0.12, 0.5, 0, 0.03, 0.18, 0.56);
        for (const zz of [-0.26, 0.26]) this.box(b, "#3a3a44", -L * 0.12, 0.56, zz, 0.04, 0.26, 0.04);
        this.box(b, "#3a3a44", -L * 0.12, 0.69, 0, 0.04, 0.04, 0.56);
        this.put(b, this.G.cyl, tyre, -L / 2 - 0.02, 0.32, 0, 0.26, 0.06, 0.26, 0, 0, Math.PI / 2);
        wheels([-L / 2 + 0.2, L / 2 - 0.2], 0.22);
      } else if (style === "plough") {
        this.box(b, color, 0, 0.26, 0, L - 0.1, 0.3, 0.62);
        this.box(b, glass, -0.04, 0.47, 0, L * 0.4, 0.14, 0.56);
        this.box(b, "#f2c230", L / 2 - 0.04, 0.16, 0, 0.06, 0.24, 0.66, 0, 0, 0);
        wheels([-L / 2 + 0.2, L / 2 - 0.26], 0.2);
      } else {                                      // sedan, hatch, taxi
        const hatch = style === "hatch", cx = hatch ? -0.1 : -0.04, cl = hatch ? 0.66 : 0.56;
        this.box(b, color, 0, 0.23, 0, L, 0.26, 0.62);
        this.box(b, this.light(color, 0.15), cx, 0.44, 0, L * cl, 0.18, 0.54);
        this.box(b, glass, cx, 0.43, 0, L * (cl + 0.02), 0.12, 0.56);
        this.box(b, this.dark(color, 0.1), cx, 0.54, 0, L * (cl - 0.06), 0.04, 0.5);
        if (style === "taxi") this.box(night ? this.lit(b) : b, "#fff6c8", cx, 0.6, 0, 0.14, 0.08, 0.26);
        wheels([-L / 2 + 0.2, L / 2 - 0.2], 0.2);
      }
      if (night) {   // two pools, brightest nearest the lamps
        this.box(this.beamOf(b), "#ffe7a0", L / 2 + 0.6, 0.004, 0, 1.2, 0.01, 0.6);
        this.box(this.beamOf(b), "#ffe7a0", L / 2 + 0.35, 0.006, 0, 0.7, 0.01, 0.5);
      }
      for (const zz of [-0.2, 0.2]) {
        this.box(lampB, "#fff4c2", L / 2 + 0.005, 0.28, zz, 0.02, 0.07, 0.1);
        this.box(b, "#d8322b", -L / 2 - 0.005, 0.28, zz, 0.02, 0.06, 0.1);
      }
    });
    if (dir < 0) obj.rotation.y = Math.PI;
    return obj;
  },

  log(len) {
    return this.shared(`log|${len}`, (b) => {
      const L = len * 0.94, r = 0.25;
      this.put(b, this.G.cyl, "#8a5a2b", 0, this.LOG_TOP - r, 0, r * 2, L, r * 2, 0, 0, Math.PI / 2);
      for (const s of [-1, 1]) this.put(b, this.G.cyl, "#d9b27c", s * (L / 2 + 0.005), this.LOG_TOP - r, 0, r * 1.9, 0.02, r * 1.9, 0, 0, Math.PI / 2);
      this.box(b, "#6f4521", -L * 0.2, this.LOG_TOP - 0.01, 0.06, L * 0.3, 0.03, 0.05);
      this.box(b, "#6f4521", L * 0.18, this.LOG_TOP - 0.01, -0.07, L * 0.22, 0.03, 0.05);
    });
  },

  // Engine and two carriages laid out inside the six tiles the train's hitbox
  // covers, exactly as the 2D train is.
  train(dir, night) {
    const obj = this.shared(`train|${night}`, (b) => {
      const lampB = night ? this.lit(b) : b;
      let front = 3;
      [[2.2, true], [1.7, false], [1.7, false]].forEach(([w, lead]) => {
        const cx = front - w / 2, body = lead ? "#b7332c" : "#c0473f";
        this.box(b, body, cx, 0.5, 0, w - 0.04, 0.7, 0.8);
        this.box(b, "#2f3238", cx, 0.9, 0, w - 0.1, 0.1, 0.74);
        this.box(b, "#1e2026", cx, 0.12, 0, w - 0.2, 0.16, 0.64);
        const n = Math.max(1, Math.round(w / 0.45));
        for (let i = 0; i < n; i++) {
          const wx = cx - (w - 0.3) / 2 + (i + 0.5) * (w - 0.3) / n;
          for (const s of [-1, 1]) this.box(lampB, "#f2d88a", wx, 0.6, s * 0.405, (w - 0.3) / n - 0.08, 0.18, 0.01);
        }
        if (lead) {
          this.box(b, "#2f3238", front - 0.02, 0.5, 0, 0.04, 0.5, 0.6);
          this.box(lampB, "#fff6c8", front + 0.01, 0.62, 0, 0.03, 0.12, 0.2);
        }
        front -= w + 0.15;
      });
    });
    if (dir < 0) obj.rotation.y = Math.PI;
    return obj;
  },

  // Posts just outside the playfield on the near side of the track; the arms
  // lie along the track when down and stand up when clear.
  gates(b, rec, z) {
    const T = this.T, zz = z + 0.42;
    [-1, 1].forEach((side) => {
      const x = side * (COLS / 2 + 0.3);
      this.box(b, "#e9ecef", x, 0.45, zz, 0.1, 0.9, 0.1);
      this.box(b, "#22252b", x, 0.82, zz + 0.05, 0.36, 0.16, 0.06);
      this.box(b, "#22252b", x, 0.02, zz, 0.26, 0.04, 0.26);
      for (const dx of [-0.1, 0.1]) {
        const lamp = new T.Mesh(this.G.box, this.lampOff);
        lamp.position.set(x + dx, 0.82, zz + 0.085); lamp.scale.set(0.1, 0.1, 0.02);
        lamp.userData.keep = true;
        rec.lamps.push(lamp);
      }
      // arm: pivot at the post, reaching inward along the track
      const ab = this.bag(), len = 1.6, seg = len / 5;
      for (let i = 0; i < 5; i++) this.box(ab, i % 2 ? "#f4f6f7" : "#e23b3b", -side * (i + 0.5) * seg, 0, 0, seg, 0.08, 0.06);
      const arm = this.object(ab);
      arm.position.set(x, 0.55, zz - 0.1);
      rec.arms.push(arm);
    });
  },

  coin() {
    return this.shared("coin", (b) => {
      this.put(b, this.G.cyl, "#e0a81e", 0, 0, 0, 0.4, 0.07, 0.4, Math.PI / 2, 0, 0);
      this.put(b, this.G.cyl, "#ffd54a", 0, 0, 0, 0.3, 0.09, 0.3, Math.PI / 2, 0, 0);
      this.box(b, "#fff2b0", -0.05, 0.05, 0, 0.05, 0.1, 0.1);
    });
  },

  // Light streaks on the water, one period (3 tiles) repeated across the lane
  // so sliding the whole mesh by less than a period looks endless.
  ripples(water, dir, lava) {
    const b = this.bag(), into = lava ? this.lit(b) : b, HW = this.halfWide() + 3;
    const col = lava ? "#ffb74d" : this.light(water, 0.35);
    for (let x = -HW; x < HW; x += 3) {
      this.box(into, col, x + 0.4, this.WATER_Y + 0.006, -0.22, 0.7, 0.01, 0.05);
      this.box(into, col, x + 1.9, this.WATER_Y + 0.006, 0.18, 0.5, 0.01, 0.05);
    }
    return this.object(b, false);
  },

  /* ---------------------------------------------------------------- birds */

  // Each skin gets its own body plan, as in 2D: a recoloured chicken reads as
  // a chicken in fancy dress. Built facing -z (away from the camera, the way
  // she is walking), feet at y=0, about half a tile tall.
  // The founding birds as boxes, emitted through bx(colour, x,y,z, sx,sy,sz,
  // rx,ry,rz). js/characters3d.js turns them (and every other plan) into a mesh.
  birdParts(bx, sk) {
    const wing = this.dark(sk.body, 0.14), eye = "#1b1b22";
    const legs = (h, spread, y0) => {
      for (const s of [-1, 1]) {
        bx(sk.legs, s * spread, (y0 || 0) + h / 2, 0.02, 0.05, h, 0.05);
        bx(sk.legs, s * spread, 0.012, -0.03, 0.09, 0.024, 0.13);
      }
    };
    const eyes = (y, z, x) => { for (const s of [-1, 1]) bx(eye, s * x, y, z, 0.03, 0.05, 0.05); };
    const wings = (y, z, x, h, d, c) => { for (const s of [-1, 1]) bx(c || wing, s * x, y, z, 0.05, h, d); };

    switch (sk.plan) {
      case "rooster":
      case "chicken": {
        const big = sk.plan === "rooster";
        legs(0.14, 0.08);
        bx(sk.body, 0, 0.32, 0.03, 0.38, 0.36, 0.44);
        bx(sk.body, 0, 0.56, -0.07, 0.3, 0.2, 0.26);
        wings(0.32, 0.05, 0.205, 0.18, 0.26);
        bx(sk.beak, 0, 0.55, -0.24, 0.1, 0.07, 0.1);
        bx(sk.wattle, 0, 0.47, -0.215, 0.06, 0.08, 0.04);
        eyes(0.59, -0.13, 0.152);
        if (big) {
          [[-0.1, 0.72], [0, 0.75], [0.1, 0.72]].forEach(([dz, y]) => bx(sk.comb, 0, y, -0.07 + dz, 0.06, 0.1, 0.09));
          [[0.34, 0.5, -0.5], [0.3, 0.62, -0.9], [0.26, 0.42, -0.2]].forEach(([z, y, r], i) =>
            bx(i === 1 ? sk.tail : this.dark(sk.tail, 0.2), 0, y, z, 0.08, 0.26, 0.1, r, 0, 0));
        } else {
          bx(sk.comb, 0, 0.7, -0.06, 0.06, 0.09, 0.16);
          bx(sk.body, 0, 0.44, 0.27, 0.22, 0.14, 0.1, -0.3, 0, 0);
        }
        break;
      }
      case "chick": {
        if (!sk.shell) legs(0.08, 0.07);
        bx(sk.body, 0, 0.26, 0, 0.34, 0.34, 0.34);
        wings(0.24, 0.02, 0.18, 0.12, 0.16);
        bx(sk.beak, 0, 0.3, -0.2, 0.08, 0.06, 0.07);
        eyes(0.34, -0.1, 0.172);
        if (sk.tuft) { bx(sk.tuft, 0, 0.46, -0.02, 0.05, 0.08, 0.05); bx(sk.tuft, 0.04, 0.47, 0.02, 0.04, 0.06, 0.04, 0, 0, -0.5); }
        if (sk.shell) {
          // the eggshell she hatched from, with a jagged rim
          bx(sk.shell, 0, 0.08, 0, 0.4, 0.16, 0.4);
          for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
            const o = -0.15 + i * 0.1;
            bx(sk.shell, s * 0.19, 0.18, o, 0.03, 0.06, 0.05, 0, 0.785, 0);
            bx(sk.shell, o, 0.18, s * 0.19, 0.05, 0.06, 0.03, 0, 0.785, 0);
          }
        }
        break;
      }
      case "duck":
        legs(0.08, 0.08);
        bx(sk.body, 0, 0.24, 0.04, 0.36, 0.26, 0.48);
        bx(sk.body, 0, 0.36, 0.28, 0.2, 0.12, 0.1, -0.5, 0, 0);
        wings(0.26, 0.08, 0.19, 0.14, 0.3, this.dark(sk.body, 0.25));
        bx(sk.ring, 0, 0.38, -0.14, 0.2, 0.03, 0.2);
        bx(sk.head, 0, 0.5, -0.14, 0.22, 0.22, 0.22);
        bx(sk.beak, 0, 0.46, -0.3, 0.16, 0.05, 0.14);
        eyes(0.53, -0.18, 0.112);
        break;
      // The camera mostly sees a bird from behind, so penguin, owl and dove
      // carry something on the back or in the silhouette -- from the front
      // they are obvious, from behind a plain box is just a box.
      case "penguin":
        legs(0.02, 0.08);
        bx(sk.body, 0, 0.2, 0, 0.36, 0.38, 0.34);
        bx(sk.body, 0, 0.47, -0.02, 0.28, 0.2, 0.26);
        bx(sk.belly, 0, 0.21, -0.172, 0.26, 0.3, 0.01);
        bx(sk.body, 0, 0.06, 0.2, 0.14, 0.06, 0.08, -0.4, 0, 0);
        for (const s of [-1, 1]) {
          bx(sk.body, s * 0.2, 0.24, 0.02, 0.05, 0.26, 0.16, 0, 0, s * 0.4);
          bx("#ffffff", s * 0.09, 0.49, -0.152, 0.08, 0.07, 0.01);
          bx(eye, s * 0.09, 0.49, -0.158, 0.04, 0.05, 0.01);
          bx("#f9a825", s * 0.142, 0.47, 0.02, 0.01, 0.07, 0.12);
        }
        bx(sk.beak, 0, 0.44, -0.18, 0.08, 0.05, 0.08);
        break;
      case "owl": {
        const back = this.dark(sk.body, 0.28);
        legs(0.06, 0.08);
        bx(sk.body, 0, 0.23, 0.02, 0.4, 0.34, 0.36);
        bx(sk.body, 0, 0.5, 0, 0.36, 0.22, 0.32);
        bx(sk.disc, 0, 0.42, -0.162, 0.32, 0.26, 0.01);
        wings(0.26, 0.05, 0.205, 0.3, 0.32, back);
        for (const [x, y] of [[-0.08, 0.3], [0.08, 0.3], [0, 0.2], [-0.08, 0.12], [0.08, 0.12]])
          bx(sk.disc, x, y, 0.202, 0.05, 0.04, 0.01);
        for (const s of [-1, 1]) {
          bx("#ffd54f", s * 0.08, 0.45, -0.168, 0.1, 0.1, 0.01);
          bx(eye, s * 0.08, 0.45, -0.175, 0.05, 0.05, 0.01);
          bx(sk.tufts, s * 0.13, 0.66, 0.0, 0.08, 0.14, 0.08, 0, 0, -s * 0.3);
        }
        bx(sk.beak, 0, 0.37, -0.18, 0.05, 0.07, 0.04);
        break;
      }
      case "flamingo":
        for (const s of [-1, 1]) {
          bx(sk.legs, s * 0.05, 0.19, 0.02, 0.035, 0.38, 0.035);
          bx(sk.legs, s * 0.05, 0.012, -0.03, 0.07, 0.024, 0.11);
        }
        bx(sk.body, 0, 0.47, 0.04, 0.26, 0.2, 0.38);
        wings(0.48, 0.06, 0.14, 0.14, 0.26, sk.wing);
        bx(sk.wing, 0, 0.5, 0.25, 0.14, 0.08, 0.08);
        [[-0.13, 0.58], [-0.19, 0.67], [-0.15, 0.76], [-0.19, 0.85]].forEach(([z, y]) => bx(sk.body, 0, y, z, 0.075, 0.1, 0.075));
        bx(sk.head, 0, 0.93, -0.23, 0.12, 0.1, 0.13);
        bx(sk.beak, 0, 0.91, -0.33, 0.06, 0.06, 0.1, 0.3, 0, 0);
        bx(sk.beakTip, 0, 0.87, -0.38, 0.05, 0.05, 0.05);
        eyes(0.95, -0.25, 0.062);
        break;
      case "parrot":
        legs(0.06, 0.08);
        bx(sk.body, 0, 0.3, 0.02, 0.32, 0.42, 0.32);
        wings(0.3, 0.06, 0.18, 0.26, 0.26, sk.wing);
        bx(sk.tail, 0, 0.18, 0.3, 0.1, 0.05, 0.34, 0.5, 0, 0);
        bx(sk.tuft, 0, 0.54, -0.02, 0.06, 0.1, 0.12);
        bx(sk.beak, 0, 0.42, -0.2, 0.08, 0.1, 0.08);
        bx(this.dark(sk.beak, 0.3), 0, 0.36, -0.22, 0.05, 0.05, 0.05);
        for (const s of [-1, 1]) { bx("#ffffff", s * 0.162, 0.45, -0.09, 0.01, 0.08, 0.08); bx(eye, s * 0.166, 0.45, -0.09, 0.01, 0.04, 0.04); }
        break;
      case "peacock": {
        legs(0.1, 0.07);
        bx(sk.body, 0, 0.28, 0.02, 0.3, 0.3, 0.4);
        bx(sk.head, 0, 0.5, -0.13, 0.14, 0.26, 0.14);
        bx(sk.beak, 0, 0.55, -0.23, 0.06, 0.04, 0.07);
        eyes(0.58, -0.16, 0.072);
        for (const dx of [-0.05, 0, 0.05]) { bx(sk.crown, dx, 0.7, -0.12, 0.012, 0.08, 0.012); bx(sk.crown, dx, 0.745, -0.12, 0.04, 0.04, 0.04); }
        // the fan faces backwards -- which is the side the camera sees
        for (let i = 0; i < 7; i++) {
          const a = (i - 3) * 0.32;
          const fx = Math.sin(a) * 0.26, fy = 0.46 + Math.cos(a) * 0.26;
          bx(i % 2 ? sk.tail : this.dark(sk.tail, 0.12), fx, fy, 0.24, 0.13, 0.52, 0.03, 0, 0, -a);
          bx("#f2c230", fx * 1.75, 0.46 + Math.cos(a) * 0.46, 0.262, 0.08, 0.08, 0.01, 0, 0, -a);
          bx("#1a3f9a", fx * 1.75, 0.46 + Math.cos(a) * 0.46, 0.27, 0.04, 0.04, 0.01, 0, 0, -a);
        }
        break;
      }
      case "swan":
        legs(0.04, 0.08);
        bx(sk.body, 0, 0.22, 0.04, 0.36, 0.26, 0.5);
        bx(sk.body, 0, 0.34, 0.3, 0.16, 0.1, 0.1, -0.6, 0, 0);
        wings(0.26, 0.08, 0.19, 0.16, 0.34, this.dark(sk.body, 0.06));
        bx(sk.body, 0, 0.45, -0.17, 0.08, 0.34, 0.08);
        bx(sk.body, 0, 0.62, -0.2, 0.12, 0.1, 0.15);
        bx(sk.mask, 0, 0.62, -0.28, 0.13, 0.05, 0.04);
        bx(sk.beak, 0, 0.6, -0.32, 0.06, 0.05, 0.08);
        break;
      default: // dove
        legs(0.08, 0.07);
        bx(sk.body, 0, 0.26, 0.03, 0.32, 0.28, 0.42);
        bx(sk.body, 0, 0.46, -0.12, 0.22, 0.2, 0.22);
        bx("#b9a3d6", 0, 0.37, -0.12, 0.23, 0.04, 0.23);
        wings(0.28, 0.06, 0.17, 0.18, 0.3, this.dark(sk.body, 0.2));
        for (const dz of [0.06, 0.15]) bx("#5f6b73", 0, 0.405, dz, 0.3, 0.012, 0.035);
        bx(this.dark(sk.body, 0.35), 0, 0.26, 0.27, 0.22, 0.05, 0.16, -0.3, 0, 0);
        bx("#3f474d", 0, 0.24, 0.345, 0.22, 0.05, 0.03, -0.3, 0, 0);
        bx(sk.beak, 0, 0.45, -0.25, 0.05, 0.04, 0.07);
        eyes(0.5, -0.17, 0.112);
    }
  },

  /* ---------------------------------------------------------- the chick */

  // Where a point in the world lands on the screen, for effects drawn on the
  // 2D overlay (coin sparkles, "Phew!", particles) so they sit on the bird.
  project(col, row, lift) {
    const v = this._pv || (this._pv = new this.T.Vector3());
    v.set(this.X(col), this.standY(row, Game) + lift, -row).project(this.camera);
    return [(v.x + 1) / 2 * Game.W, (1 - v.y) / 2 * Game.H];
  },

  // Standing height at (col,row): the log top on water, the surface behind
  // the start line, the ground everywhere else.
  standY(row, G) {
    const lane = G.world[Math.round(row)];
    if (!lane) return this.WATER_Y;
    if (lane.type === "water") return this.LOG_TOP + this.bob(Math.round(row), G);
    return lane.type === "road" ? -0.02 : 0;
  },

  updateChick(G, now) {
    const ch = G.character(), key = ch.id;
    if (key !== this.chickKey) {
      if (this.chick) { this.scene.remove(this.chick); this.chick.children[0].children[0].geometry.dispose(); }
      this.chick = this.character(ch);
      this.scene.add(this.chick);
      this.chickKey = key; this.face = 0;
    }
    const c = G.chick, grp = this.chick, body = grp.children[0], mesh = body.children[0];
    const pose = G.hopPose(c);
    const y0 = c.hop < 1 ? this.standY(c.fromRow, G) + (this.standY(c.toRow, G) - this.standY(c.fromRow, G)) * c.hop
                         : this.standY(c.row, G);

    // Face the way she is going; a refused move turns her too, so the bump
    // reads as "I tried to go there".
    let dx = 0, dz = 0;
    if (c.hop < 1) { dx = c.toCol - c.fromCol; dz = -(c.toRow - c.fromRow); }
    else if (G.bumpT > 0.5) { dx = G.bumpX; dz = -G.bumpY; }
    if (Math.abs(dx) + Math.abs(dz) > 0.05) this.faceWant = Math.atan2(-dx, -dz);
    let d = (this.faceWant || 0) - this.face;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.face += d * Math.min(1, (Art.motion ? 0.45 : 1));
    grp.rotation.set(0, this.face, 0);

    // The same hop pose the 2D bird uses: crouch, arc, stretch, landing squash,
    // and a lean into the jump -- all pivoting on the feet.
    let x = this.X(c.col), z = -c.row, y = y0 + pose.lift, sy = pose.sy, sxz = pose.sx;
    body.rotation.set(-pose.tilt * 1.6, 0, 0);
    if (G.bumpT > 0 && !G.dead) {
      const l = Math.sin(Math.PI * (1 - G.bumpT)) * 0.15;
      x += G.bumpX * l; z -= G.bumpY * l;
    }

    // Four deaths, four pictures, as in 2D: sinking, flattening, flung down
    // the line by a train, or tumbling away off the bottom of the screen.
    const under = G.world[Math.round(c.row)];
    const drown = G.dead && (G.deathReason === "water" ||
      (G.deathReason === "fell" && under && under.type === "water"));
    const fling = G.dead && G.deathReason === "train";
    const tumble = G.dead && G.deathReason === "fell" && !drown;
    mesh.material.opacity = 1;
    if (G.dead) {
      if (!this.deadAt) this.deadAt = now;
      const t = Math.min(1, (now - this.deadAt) / (drown ? 600 : fling ? 700 : tumble ? 600 : 300));
      if (drown) {
        y = this.WATER_Y + 0.05 - t * 0.55;
        mesh.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.3) / 0.7);
        this.fx.splash(x, z, t);
      } else if (fling) {
        const dir = (G.deathInfo && G.deathInfo.dir) || 1;
        x += dir * t * 5; y = y0 + Math.sin(Math.PI * Math.min(1, t * 1.2)) * 1.2;
        body.rotation.set(t * 7 * Art.motion, 0, -dir * t * 9 * Art.motion);
        mesh.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.5) / 0.5);
      } else if (tumble) {
        z += t * t * 2.4; y = y0 + Math.sin(Math.PI * t) * 0.3;
        body.rotation.set(t * 6 * Art.motion, 0, 0);
        mesh.material.opacity = Math.max(0, 1 - Math.max(0, t - 0.5) / 0.5);
      } else { sy = 1 - t * 0.82; sxz = 1 + t * 0.45; y = y0; }
    } else { this.deadAt = 0; this.fx.splash(0, 0, -1); }

    grp.position.set(x, y, z);
    grp.scale.set(sxz, sy, sxz);
    this.lamp.position.set(x, y0 + 0.9, z + 0.3);
    this.fx.shield(G.invince > 0 && !G.dead, x, y0, z, G.elapsed);
  },

  /* ------------------------------------------------------------- effects */

  // Pools, so a long run allocates nothing per frame.
  makeFx() {
    const T = this.T, sc = this.scene;
    const flat = (color) => {
      const m = new T.Mesh(this.G.ring, new T.MeshBasicMaterial({ color, transparent: true, side: T.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; sc.add(m); return m;
    };
    const cube = () => {
      const m = new T.Mesh(this.G.box, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      m.visible = false; sc.add(m); return m;
    };
    const rings = [flat(0xffffff), flat(0xffffff), flat(0xffffff)];
    const shield = flat(0xfff3b0);
    const dust = Array.from({ length: 48 }, cube);
    const ghosts = Array.from({ length: 3 }, () => {
      const g = this.coin();
      g.traverse(o => { if (o.isMesh) { o.material = new T.MeshBasicMaterial({ color: 0xffd54a, transparent: true, depthWrite: false }); o.castShadow = false; } });
      g.visible = false; sc.add(g); return g;
    });
    return {
      splash: (x, z, t) => rings.forEach((r, i) => {
        const p = t - i * 0.18;
        r.visible = p > 0 && p < 1;
        if (!r.visible) return;
        const s = 0.14 + p * 0.5;
        r.position.set(x, this.WATER_Y + 0.02, z); r.scale.set(s, s, 1);
        r.material.opacity = 0.7 * (1 - p);
      }),
      shield: (on, x, y, z, el) => {
        shield.visible = on;
        if (!on) return;
        const p = (el * 3 * Art.motion) % 1, s = 0.4 + p * 0.4;
        shield.position.set(x, y + 0.03, z); shield.scale.set(s, s, 1);
        shield.material.opacity = 0.6 * (1 - p);
      },
      // Game.juice() already derives puffs from the simulation; draw them.
      puffs: (G) => {
        let d = 0, gh = 0;
        for (const p of G._puffs) {
          const k = p.t / p.life, x = this.X(p.col), z = -p.row, y = this.standY(p.row, G);
          if (p.kind === "coin") {
            const g = ghosts[gh++]; if (!g) continue;
            g.visible = true;
            g.position.set(x, y + 0.4 + k * 0.5, z);
            const s = 1 + k * 0.8; g.scale.set(s, s, s);
            g.rotation.y = k * 6;
            g.traverse(o => { if (o.isMesh) o.material.opacity = 1 - k; });
          } else {
            const tint = p.kind === "water" ? 0xe6f8ff : p.kind === "road" || p.kind === "rail" ? 0xd2d2d6 : 0xfffae1;
            for (let i = 0; i < 3 && d < dust.length; i++) {
              const m = dust[d++], a = p.seed * 6.28 + i * 2.1, r = 0.12 + k * 0.32, s = 0.09 * (1 - k * 0.6);
              m.visible = true;
              m.position.set(x + Math.cos(a) * r, y + 0.04 + k * 0.1, z + Math.sin(a) * r * 0.7);
              m.scale.set(s, s, s);
              m.material.color.setHex(tint); m.material.opacity = 0.7 * (1 - k);
            }
          }
        }
        for (; d < dust.length; d++) dust[d].visible = false;
        for (; gh < ghosts.length; gh++) ghosts[gh].visible = false;
      },
    };
  },

  /* --------------------------------------------------------------- frame */

  reset() {
    for (const rec of this.rows.values()) this.dropRow(rec);
    this.rows.clear();
  },

  // Whenever the 3D view is not drawing, something else may paint the 2D canvas.
  hide() { if (this.canvas) this.canvas.style.display = "none"; this.overlayClean = false; },

  // Lights and sky follow the world, so Night Roads is night in 3D too.
  setWorld(G) {
    this.worldKey = G.world;
    this.nightK = Art.pal(G.wi).night ? 1 : 0;
    this.bg = null;
    // Hidden rather than dimmed would recompile every shader whenever an
    // endless run walks into the night; a lamp at zero costs less than that.
    this.lamp.visible = true;
    this.applyLight(G, 1);
    // Bake the traffic this world can show now, while the run is starting,
    // rather than the first time one scrolls into view.
    const A = Art.pal(G.wi), night = !!A.night;
    for (const color of CAR_COLORS) {
      for (const st of A.cars) this.car("car", Art.vehicleColor(color, G.themeFx, st), 1, 1, st, night);
      for (const st of A.trucks) this.car("truck", Art.vehicleColor(color, G.themeFx, st), 1, 2, st, night);
    }
    for (const len of [2, 3]) this.log(len);
    this.train(1, night);
    this.settle = performance.now() + 1500;   // shader compiles; don't judge pace yet
  },

  // Lights and sky follow the world the camera is in, easing across the
  // three-row meadow between two worlds, so Night Roads is night in 3D too
  // and walking into it is dusk rather than a switch.
  applyLight(G, k) {
    const want = Art.pal(G.wi).night ? 1 : 0;
    this.nightK += (want - this.nightK) * Math.min(1, k);
    const n = this.nightK, c = this._c;
    this.hemi.color.set(this.mix("#ffffff", "#8fa6ff", n));
    this.hemi.groundColor.set(this.mix("#6d6450", "#2a2a3a", n));
    this.hemi.intensity = 1.15 - 0.15 * n;
    this.sun.color.set(this.mix("#fff4e0", "#b8c8ff", n));
    this.sun.intensity = 2.6 - 1.3 * n;
    this.lamp.intensity = 3 * n;
    const bg = (G.sceneTheme || G.theme).bg;
    if (bg !== this.bg) {
      this.bgFrom = this.bg ? this.scene.background.clone() : null;
      this.bg = bg; this.bgT = this.bgFrom ? 0 : 1;
      if (!this.bgFrom) this.scene.background = new this.T.Color(bg);
    }
    if (this.bgT < 1) {
      this.bgT = Math.min(1, this.bgT + k);
      this.scene.background.copy(this.bgFrom).lerp(c.set(bg), this.bgT);
    }
  },

  /* ---------------------------------------------------------- pacing */

  // A safety net for slower tablets. If frames average slower than ~45 fps
  // for a second, drop the render resolution a step and see if that helped.
  // If it didn't -- a device capped at 30 fps in Low Power Mode, say --
  // put it back and stop trying, rather than blur the game for nothing.
  SCALES: [1, 0.85, 0.7, 0.6],
  step: 0, frozen: false, trial: null, win: null,

  pace(now) {
    const dt = now - (this.lastT || now);
    this.lastT = now;
    if (!(dt > 0) || dt > 100) { this.win = null; return; }   // first frame, pause, tab switch
    if (this.frozen || now < (this.settle || 0)) return;
    const w = this.win || (this.win = { n: 0, sum: 0 });
    w.n++; w.sum += dt;
    if (w.n < 60) return;
    const avg = w.sum / w.n;
    this.win = null;
    if (this.trial) {
      if (avg > this.trial.before * 0.85) { this.step--; this.frozen = true; this.resize(Game); }
      this.trial = null;
    } else if (avg > 22 && this.step < this.SCALES.length - 1) {
      this.trial = { before: avg };
      this.step++; this.resize(Game);
      this.settle = now + 300;
    }
  },

  sizeKey(G) { return G.W + "x" + G.H + "@" + Math.min(window.devicePixelRatio || 1, 2) + ":" + G.TILE; },

  resize(G) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr * this.SCALES[this.step]);
    this.renderer.setSize(G.W, G.H, false);
    this.canvas.style.width = G.W + "px"; this.canvas.style.height = G.H + "px";
    this.size = this.sizeKey(G);
    this.fitShadow(G);
  },

  // The sun, relative to the point the camera looks at.
  SUN: [6, 14, -3],

  // Fit the sun's shadow box to what the camera can actually see. A fixed
  // 30x30-tile box redrew every tree and car off the edges of the screen into
  // the shadow map each frame; fitted, it draws a third fewer and a 1024 map
  // is as sharp as the 2048 one was.
  fitShadow(G) {
    const T = this.T, P = this.pxPerTile(G.W, G.H), th = this.PITCH, ph = this.YAW;
    const back = new T.Vector3(Math.sin(ph) * Math.cos(th), Math.sin(th), Math.cos(ph) * Math.cos(th));
    const right = new T.Vector3(Math.cos(ph), 0, -Math.sin(ph));
    const up = new T.Vector3().crossVectors(back, right);
    const ax = new T.Vector3(), ay = new T.Vector3(), az = new T.Vector3();
    new T.Matrix4().lookAt(new T.Vector3(...this.SUN), new T.Vector3(), new T.Vector3(0, 1, 0)).extractBasis(ax, ay, az);
    const halfW = G.W / (2 * P), halfH = G.H / (2 * P), p = new T.Vector3();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    // each screen corner, walked down its view ray to the ground and to the
    // top of the tallest tree
    for (const a of [-halfW, halfW]) for (const b of [-halfH, halfH]) for (const h of [0, 1.3]) {
      p.copy(right).multiplyScalar(a).addScaledVector(up, b);
      p.addScaledVector(back, -(p.y - h) / back.y);
      const u = p.dot(ax), v = p.dot(ay);
      x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
    }
    const pad = 1.5, sc = this.sun.shadow.camera;   // pad: shadows cast from just off screen
    Object.assign(sc, { left: x0 - pad, right: x1 + pad, bottom: y0 - pad, top: y1 + pad });
    sc.updateProjectionMatrix();
    this.sunAxes = [ax, ay];
    this.texel = Math.max(x1 - x0, y1 - y0) / this.sun.shadow.mapSize.x;
  },

  // Aim the sun at the camera's target, snapped to whole shadow-map texels,
  // so the shadows of things standing still hold still as the camera creeps.
  aimSun(tx, tz) {
    const [ax, ay] = this.sunAxes, ts = this.texel, t = this._v.set(tx, 0, tz);
    const u = t.dot(ax), v = t.dot(ay);
    t.addScaledVector(ax, Math.round(u / ts) * ts - u).addScaledVector(ay, Math.round(v / ts) * ts - v);
    this.sun.target.position.copy(t);
    this.sun.position.set(t.x + this.SUN[0], t.y + this.SUN[1], t.z + this.SUN[2]);
  },

  frame() {
    const G = Game;
    // Which world's art -- the 2D render() sets these, and it is not running.
    G.sceneWorld();
    if (G.world !== this.worldKey) { this.reset(); this.setWorld(G); }
    const now = performance.now();
    this.applyLight(G, Math.min(1, (now - (this.lastL || now)) / 1000 * 1.5));
    this.lastL = now;
    if (this.size !== this.sizeKey(G)) { this.resize(G); this.reset(); }
    this.pace(now);
    this.canvas.style.display = "block";
    if (G.canvas.style.background !== "transparent") G.canvas.style.background = "transparent";

    // camera
    const f = this.frame3(G), cam = this.camera;
    const halfW = G.W / (2 * f.P), halfH = G.H / (2 * f.P);
    if (cam.right !== halfW || cam.top !== halfH) {
      Object.assign(cam, { left: -halfW, right: halfW, top: halfH, bottom: -halfH });
      cam.updateProjectionMatrix();
    }
    const tx = this.shiftFor(G.H, f.P, G.TILE, G.BASE_Y), tz = -f.anchor, D = 40;
    let sx = 0, sy = 0;
    if (G.shake > 0 && Art.motion) { sx = (Math.random() - 0.5) * G.shake * 0.25; sy = (Math.random() - 0.5) * G.shake * 0.25; }
    const cp = Math.cos(this.PITCH);
    cam.position.set(tx + sx + Math.sin(this.YAW) * cp * D, Math.sin(this.PITCH) * D + sy, tz + Math.cos(this.YAW) * cp * D);
    cam.lookAt(tx + sx, sy, tz);
    // Sun high on the right and a little ahead, so shadows fall left and
    // toward the camera -- onto ground the player can see -- and the lit
    // right-hand faces are the ones the camera looks at.
    this.aimSun(tx, tz);

    // Rows: everything on screen must exist this frame. Past the top edge,
    // build ahead one row per frame, so a lane is ready before it scrolls in
    // and building never lands on a frame the player is watching.
    let spare = 1;
    for (let r = f.lo; r <= f.hi + this.AHEAD; r++) {
      if (r > G.maxGen) G.ensureRows(r);
      const lane = r < 0 ? null : G.world[r];
      let rec = this.rows.get(r);
      if (rec && rec.lane !== lane) { this.dropRow(rec); rec = null; }
      if (!rec) {
        if (r > f.hi && spare-- <= 0) continue;
        rec = this.buildRow(r, lane); this.rows.set(r, rec);
      }
      this.updateRow(rec, G);
    }
    for (const [r, rec] of this.rows) if (r < f.lo - 3 || r > f.hi + this.AHEAD + 2) { this.dropRow(rec); this.rows.delete(r); }

    this.updateChick(G, now);
    this.fx.puffs(G);
    this.renderer.render(this.scene, cam);

    // The 2D canvas stays on top for the things that belong to the screen, not
    // the world: the camera-creep warning and the win confetti. It also keeps
    // receiving touches, so input needed no changes at all.
    //
    // Most frames it has nothing on it, and a canvas nobody touches costs
    // nothing: the browser only re-uploads and re-blends a full-screen layer
    // that changed. So it is cleared once when it empties, then left alone.
    const Fx = GK.Fx, weather = G.themeFx && G.themeFx.mote && Art.motion;
    const busy = G._danger >= 0.02 || Fx.parts.length || Fx.texts.length || Fx.flash > 0 || G.overlayBusy() || weather;
    if (!busy && this.overlayClean) return;
    const ctx = G.ctx;
    ctx.clearRect(0, 0, G.W, G.H);
    // a character theme's weather falls in front of the 3D world too
    if (weather) Art.motes(ctx, G.W, G.H, G.elapsed, G.wi, G.themeFx);
    G.drawDanger();
    G.drawOverlayFx(ctx);
    Fx.render(ctx);
    this.overlayClean = !busy;
  },
};

window.R3 = R3;
