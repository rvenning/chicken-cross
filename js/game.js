// The simulation.
//
// Everything here is about where things ARE and what happens when they touch:
// lane generation, the hop, the camera, collisions, winning and dying. It draws
// nothing and reads no pixels, which is what lets tests/bot.js run the real
// engine with no canvas at all.
//
// What the game LOOKS like is js/render.js, which Object.assigns its half of
// this same object on top -- one Game, two files, so `this` keeps working and
// no call site had to change when they were split apart.
"use strict";

const COLS = 9;
const CONFETTI_COLORS = ["#ffd93b","#e8403a","#4fc3f7","#7ac74f","#ff9f43","#c77dff"];
const HOP_TIME = 0.11;
const REVIVE_COST = 50;

// Endless mode is built from short themed chunks rather than one lane at a
// time; campaign levels keep their original generator. Neither has a
// creeping camera any more: the camera follows you, and only a player who
// stops making progress gets pushed along (STALL).
const ENDLESS = {
  SEG: 48,                               // rows of one world before the scenery moves on
  RAMP: 320,                             // rows until the difficulty stops climbing
  ORDER: [0, 1, 2, 3, 6, 7, 5, 8, 4, 9], // world art, in the order a long run visits it
};
// Anti-stall: seconds without a new furthest row before the warning, before
// the push, and how long the push takes to reach a bird that still won't move.
// A normal pause to judge a crossing is 1-4 s; waiting out a train is ~5.
const STALL = { grace: 2, warn: 6, push: 9, pushSeconds: 4, back: 2 };


const Game = {
  canvas: null, ctx: null, W:0, H:0, TILE:60, DPR:1,
  BASE_Y: 0.64,
  active:false, running:false,
  profile:null, progress:null,
  level:null, mode:"level", target:0, params:null, theme:null,
  world:null, maxGen:-1, roadStreak:0, waterStreak:0,
  chick:null, camRow:0, camForced:0, shake:0, elapsed:0,
  runCoins:0, invince:0, revived:false, dead:false, result:null,
  inputQueue:null, paused:false,
  bumpT:0, bumpX:0, bumpY:0,
  // Presentation and bookkeeping only: events the renderer drains, and the
  // per-run counters the character collection reads when a run ends.
  events:null, runStats:null, stallT:0, pushV:0,

  /* ----- start a game ----- */
  begin(cfg) {
    this.profile = App.profile;
    this.progress = Storage.getProgress(this.profile.id);
    this.mode = cfg.mode; this.level = cfg.level||null;
    this.target = cfg.target||0; this.params = cfg.params; this.theme = cfg.params.theme;
    this.canvas.style.background = this.theme.bg;

    this.world = {}; this.maxGen=-1; this.roadStreak=0; this.waterStreak=0;
    this.pending=[]; this.hazardRun=0; this.ewi=0; this.nextSwitch=ENDLESS.SEG;
    this.lastChunk=""; this.prevChunk="";
    this.ensureRows(45);
    this.chick = { col:4, row:0, fromCol:4, fromRow:0, toCol:4, toRow:0, hop:1, maxRow:0,
                   rideLog:null, rideOff:0 };
    this.camRow=0; this.camForced=0; this.shake=0; this.elapsed=0;
    this.runCoins=0; this.invince=0; this.revived=false; this.dead=false; this.result=null;
    this.inputQueue=null; this.paused=false; this.bumpT=0; GK.Fx.reset();
    this.events=[]; this.stallT=-STALL.grace; this.pushV=0;
    this.startBest=this.progress.best||0; this.bestFired=false; this.nextMilestone=25;
    this.runStats={ fwd:0, back:0, side:0, backRun:0, maxBackRun:0, bumpEdge:0, bumpTree:0,
      near:0, logs:0, logRide:0, maxLogRide:0, rails:0, railWarn:0, coinRun:0, maxCoinRun:0,
      edges:0, pauses:0, revived:false, bestAfterRevive:false, rowAt15:0, blown:false };
    this.running=true; this.active=true;
    App.closeModal("result-modal");
    App.showScreen("game");
    this.updateHud();
  },


  /* ----- lane generation ----- */
  makeLane(row) {
    if (row <= 3) return { type:"grass", trees:new Set(), coin:null };
    if (this.mode==="endless") return this.endlessLane(row);
    const w = this.params.weights;
    let type;
    const r = Math.random();
    // Streak guards. Roads have always been capped at 3 in a row; water never
    // was -- waterStreak was tracked and then never read, so the river worlds
    // (43-46% water) could deal 4 or 5 consecutive log lanes with no dry ground
    // between them. That was the one pattern the old camera creep made genuinely
    // unfair: you can't wait out a bad log phase when you can't stand still.
    // Water goes first so a road streak can't be broken *into* a water streak.
    if (this.waterStreak >= 2) type = "grass";
    else if (this.roadStreak >= 3) type = r<0.5 ? "grass" : (w.water>0?"water":"grass");
    else {
      // weighted pick
      const roll = Math.random();
      let acc=0; type="grass";
      for (const t of ["grass","road","water","rail"]) { acc += w[t]||0; if (roll<=acc){ type=t; break; } }
    }
    this.roadStreak = type==="road" ? this.roadStreak+1 : 0;
    this.waterStreak = type==="water" ? this.waterStreak+1 : 0;

    let lane;
    if (type==="grass") {
      const trees = new Set(); const n = irand(0,3); let guard=0;
      while (trees.size<n && guard++<20) trees.add(irand(0,COLS-1));
      if (trees.size>=COLS) trees.delete(irand(0,COLS-1));
      this.openPaths(trees, this.world[row-1]);
      lane = { type:"grass", trees, coin:null };
    } else if (type==="road") {
      const dir = Math.random()<0.5?-1:1;
      const speed = rand(this.params.carMin, this.params.carMax);
      const kind = Math.random()<this.params.truckChance ? "truck":"car";
      const width = kind==="truck"?2.0:1.0;
      const color = pick(CAR_COLORS);
      // Vehicles loop over the full visible width so nothing pops in mid-screen.
      const ext = this.extC, loop = COLS + 2*ext;
      // Spacing is centre-to-centre, so a 2-tile truck ate its extra width out
      // of the gap the player crosses -- truck lanes were tighter than car
      // lanes with nothing to signal it. Add the width back so the actual
      // opening is the same whatever is driving down it.
      const count = Math.max(2, Math.round(loop / (rand(4.2,5.4) + width-1)));
      const gap = loop/count, off = rand(0,gap);
      const cars = [];
      for (let i=0;i<count;i++) cars.push({ x:i*gap+off-ext, width, kind });
      lane = { type:"road", dir, speed, color, cars, ext, loop, coin:null };
    } else if (type==="water") {
      const dir = Math.random()<0.5?-1:1;
      const speed = rand(0.9,1.9);
      const ext = this.extC, loop = COLS + 2*ext;
      const count = Math.max(2, Math.round(loop / rand(3.6,4.8)));
      const gap = loop/count, off = rand(0,gap);
      const logs = [];
      for (let i=0;i<count;i++) logs.push({ x:i*gap+off-ext, len:irand(2,3) });
      lane = { type:"water", dir, speed, logs, ext, loop };
    } else { // rail
      const dir = Math.random()<0.5?-1:1;
      lane = { type:"rail", dir, phase:"clear", timer:rand(2.5,5.5),
               gate:0, blink:0, train:{x:0}, warned:false, coin:null };
    }
    // coins on grass / road
    if ((lane.type==="grass"||lane.type==="road") && Math.random()<this.params.coinRate) {
      let col = irand(0,COLS-1), guard=0;
      while (lane.type==="grass" && lane.trees.has(col) && guard++<10) col = irand(0,COLS-1);
      if (!(lane.type==="grass" && lane.trees.has(col))) lane.coin = { col, taken:false, bob:Math.random()*6 };
    }
    return lane;
  },

  /* ----- endless: themed chunks ----- */
  // How far into its difficulty ramp a row of an endless run sits, 0..1.
  endlessD(row) { return clamp(row/ENDLESS.RAMP, 0, 1); },
  // Which world's art the endless run is currently wearing.
  endlessWorld() { return ENDLESS.ORDER[this.ewi % ENDLESS.ORDER.length]; },

  endlessLane(row) {
    while (!this.pending.length) this.planChunk(row);
    return this.buildLane(row, this.pending.shift());
  },

  // Queue the next few lanes as one readable unit: a block of two to four
  // related roads, a river, a railway. Hazard blocks are followed by grass
  // often enough that there is always somewhere to stop and look.
  planChunk(row) {
    const d = this.endlessD(row), P = this.pending, wi = this.endlessWorld();
    // The scenery moves on to the next world across a short safe meadow, its
    // ground colour easing over three rows, so the change reads as travelling
    // somewhere rather than as a level loading.
    if (row >= this.nextSwitch) {
      this.ewi++;
      const to = this.endlessWorld();
      for (let i=1;i<=3;i++) P.push({ type:"grass", trees: i===2 ? 0 : 1, wi: i<2 ? wi : to,
                                      blend: i<3 ? { from:wi, to, t:i/3 } : null });
      this.nextSwitch = row + 3 + ENDLESS.SEG; this.hazardRun = 0;
      this.prevChunk = this.lastChunk; this.lastChunk = "meadow";
      return;
    }
    const w = WORLDS[wi].w;
    // The hazard mix follows the world (the river world is mostly river), with
    // a floor so every kind still turns up, and never the same block 3 times.
    const opts = [["roads", w.road+0.1], ["river", Math.max(0.1, w.water)], ["rail", Math.max(0.08, w.rail)]]
      .filter(([k]) => !(k === this.lastChunk && k === this.prevChunk));
    let roll = Math.random()*opts.reduce((a,o)=>a+o[1],0), kind = opts[0][0];
    for (const [k,p] of opts) { if ((roll -= p) <= 0) { kind = k; break; } }

    const lanes = this["chunk_"+kind](d);
    const limit = 3 + (d>0.35 ? 1 : 0) + (d>0.7 ? 1 : 0);
    if (this.hazardRun && this.hazardRun + lanes.length > limit) { P.push(this.restSpec(wi)); this.hazardRun = 0; }
    for (const l of lanes) { l.wi = wi; P.push(l); }
    this.hazardRun += lanes.length;
    this.prevChunk = this.lastChunk; this.lastChunk = kind;
    // A rest row after most blocks, a two-row meadow now and then; always one
    // once the run of hazards reaches the limit.
    if (this.hazardRun >= limit || Math.random() < 0.62 - d*0.25) {
      P.push(this.restSpec(wi));
      if (Math.random() < 0.22) P.push(this.restSpec(wi));
      this.hazardRun = 0;
    }
  },

  restSpec(wi) { return { type:"grass", trees: irand(0,2), wi }; },

  // Two to four road lanes that belong together: a convoy all going one way
  // and speeding up, a zig-zag of alternating directions at one pace, an
  // express lane between two slow ones, or a hauliers' block with one lane
  // of trucks. One spacing for the whole block, so the gaps rhyme.
  chunk_roads(d) {
    const n = Math.min(4, 2 + (Math.random() < 0.25+0.35*d ? 1 : 0) + (d>0.6 && Math.random()<0.3 ? 1 : 0));
    const lo = lerp(1.5, 2.9, d), hi = lerp(2.6, 4.9, d);
    const base = rand(lo, (lo+hi)/2);
    const pattern = pick(n >= 3 ? ["convoy","zigzag","express","haulers"] : ["convoy","zigzag","haulers"]);
    const sp = rand(4.4, 5.3) + (1-d)*0.5;
    let dir = Math.random()<0.5 ? -1 : 1;
    const truckAt = irand(0, n-1), truckChance = lerp(0.18, 0.34, d);
    const out = [];
    for (let i=0;i<n;i++) {
      let speed = base, kind = Math.random()<truckChance ? "truck" : "car";
      if (pattern === "convoy") speed = base*(1 + 0.14*i);
      else if (pattern === "zigzag") { speed = base*(i%2 ? 1.08 : 0.94); if (i) dir = -dir; }
      else if (pattern === "express") { const fast = i === 1; speed = fast ? base*1.45 : base*0.88; if (i) dir = -dir; if (fast) kind = "car"; }
      else { kind = i === truckAt ? "truck" : "car"; speed = kind === "truck" ? base*0.82 : base*1.1; }
      out.push({ type:"road", dir, speed: Math.min(hi, Math.max(1.3, speed)), kind, spacing: sp*rand(0.95,1.06), pattern });
    }
    return out;
  },

  // One to three log lanes, alternating current, related speeds. Early logs
  // are all long ones, and a wide river packs its logs closer.
  chunk_river(d) {
    const n = Math.min(3, 1 + (Math.random() < 0.3+0.4*d ? 1 : 0) + (d>0.5 && Math.random()<0.3 ? 1 : 0));
    const base = lerp(0.9, 1.45, d) + rand(0, 0.35);
    let dir = Math.random()<0.5 ? -1 : 1;
    const out = [];
    for (let i=0;i<n;i++) {
      out.push({ type:"water", dir, speed: base*(i%2 ? 1.1 : 0.94),
                 len: d < 0.25 ? 3 : irand(2,3), spacing: rand(3.6, n === 3 ? 4.2 : 4.8) });
      dir = -dir;
    }
    return out;
  },

  // A railway encounter: one line, a double line, or a line beside a road.
  chunk_rail(d) {
    const fast = lerp(12, 19, d), roll = Math.random();
    const rail = () => ({ type:"rail", dir: Math.random()<0.5?-1:1, fast });
    if (d > 0.3 && roll < 0.22) return [rail(), rail()];
    if (roll > 0.78) {
      const road = this.chunk_roads(d)[0];
      return Math.random()<0.5 ? [road, rail()] : [rail(), road];
    }
    return [rail()];
  },

  // A lane from a spec. The same construction as makeLane's, so everything
  // the renderers, the bots and the collision code know about lanes holds.
  buildLane(row, spec) {
    let lane;
    const ext = this.extC, loop = COLS + 2*ext;
    if (spec.type === "grass") {
      const trees = new Set(); let guard = 0;
      while (trees.size < spec.trees && guard++ < 20) trees.add(irand(0, COLS-1));
      this.openPaths(trees, this.world[row-1]);
      lane = { type:"grass", trees, coin:null };
    } else if (spec.type === "road") {
      const width = spec.kind === "truck" ? 2.0 : 1.0;
      const count = Math.max(2, Math.round(loop / (spec.spacing + width-1)));
      const gap = loop/count, off = rand(0, gap), cars = [];
      for (let i=0;i<count;i++) cars.push({ x:i*gap+off-ext, width, kind:spec.kind });
      lane = { type:"road", dir:spec.dir, speed:spec.speed, color:pick(CAR_COLORS), cars, ext, loop, coin:null };
    } else if (spec.type === "water") {
      const count = Math.max(2, Math.round(loop / spec.spacing));
      const gap = loop/count, off = rand(0, gap), logs = [];
      for (let i=0;i<count;i++) logs.push({ x:i*gap+off-ext, len:spec.len });
      lane = { type:"water", dir:spec.dir, speed:spec.speed, logs, ext, loop };
    } else {
      lane = { type:"rail", dir:spec.dir, phase:"clear", timer:rand(2.5,5.5), fast:spec.fast,
               gate:0, blink:0, train:{x:0}, warned:false, coin:null };
    }
    lane.wi = spec.wi;
    if (spec.blend) lane.blend = spec.blend;
    if ((lane.type==="grass"||lane.type==="road") && Math.random()<this.params.coinRate) {
      let col = irand(0,COLS-1), guard=0;
      while (lane.type==="grass" && lane.trees.has(col) && guard++<10) col = irand(0,COLS-1);
      if (!(lane.type==="grass" && lane.trees.has(col))) lane.coin = { col, taken:false, bob:Math.random()*6 };
    }
    return lane;
  },

  // Trees were placed at random per lane, so two grass rows could conspire to
  // wall the chick in: trees either side of it on its own row, and a tree
  // directly ahead. It can't step sideways, can't go forward, and the camera
  // takes it -- a death the player couldn't have avoided. Walk the previous
  // lane's pockets (runs of treeless columns the chick could be standing in)
  // and make sure each one has at least one open column directly above it.
  // Applied to every lane as it is generated, this keeps the whole world
  // connected without making the trees look any more regular.
  openPaths(trees, prev) {
    const blocked = (prev && prev.type==="grass") ? prev.trees : new Set();
    let start = 0;
    for (let col=0; col<=COLS; col++) {
      if (col<COLS && !blocked.has(col)) continue; // still inside a pocket
      if (col>start) {                             // pocket spans [start, col-1]
        let open = false;
        for (let c=start; c<col; c++) if (!trees.has(c)) { open = true; break; }
        if (!open) trees.delete(irand(start, col-1));
      }
      start = col+1;
    }
  },

  ensureRows(upTo) { while (this.maxGen<upTo){ this.maxGen++; this.world[this.maxGen]=this.makeLane(this.maxGen); } },


  move(dc,dr) {
    if (!this.running || this.dead || this.paused) return;
    if (this.chick.hop<1){ this.inputQueue=[dc,dr]; return; }
    this.doMove(dc,dr);
  },

  camBottomRow(){ return Math.floor(this.camForced - (this.H*(1-this.BASE_Y))/this.TILE)+1; },

  doMove(dc,dr) {
    let tr = this.chick.row+dr;
    if (tr<0) tr=0;
    tr = Math.max(tr, this.camBottomRow());
    // Shuffling along a log moves one tile from where the bird actually is, not
    // from the nearest grid column. Rounding to the grid each hop threw away the
    // fractional offset the current had given it, cancelling part of the carry
    // and walking it off the back of the log. Landings on dry ground still snap
    // to a column, so the grid is intact everywhere it matters.
    const from = this.world[this.chick.row], dest = this.world[tr];
    const afloat = from && from.type==="water" && dest && dest.type==="water";
    const base = afloat ? this.chick.col : Math.round(this.chick.col);
    let tc = clamp(base+dc, 0, COLS-1);
    // The move went nowhere -- the playfield edge or the camera floor refused
    // it. The world art carries on past column 0/8, so an edge swipe used to
    // land in silence and read as a dropped input; answer it instead.
    if (tc===base && tr===this.chick.row) { this.bump(dc,dr,"edge"); return; }
    if (dest && dest.type==="grass" && dest.trees.has(tc)) { this.bump(dc,dr,"tree"); return; } // blocked
    const c=this.chick;
    // A close call is judged at take-off: leaving a road just ahead of a car,
    // or a crossing just ahead of a train. It only counts if the landing is
    // survived, so it is confirmed when the hop completes.
    c.close = from ? this.closeCall(from, c.col) : null;
    c.fromCol=c.col; c.fromRow=c.row; c.toCol=tc; c.toRow=tr; c.hop=0;
    c.rideLog=null;   // re-take the offset on landing, wherever that turns out to be
    this.countHop(tr - c.fromRow);
    Sfx.hop();
  },

  // Bookkeeping for the collection's achievements and secrets. Counters only:
  // nothing here is read by any rule.
  countHop(dr) {
    const s=this.runStats; if (!s) return;
    if (dr>0) { s.fwd++; s.backRun=0; }
    else if (dr<0) { s.back++; s.backRun++; s.maxBackRun=Math.max(s.maxBackRun, s.backRun); }
    else { s.side++; s.backRun=0; }
  },

  // How narrowly a hazard in `lane` would have met a bird at `col` that is
  // leaving now: the gap left, in tiles, to the nearest thing bearing down on
  // it, or null when nothing was close. Cars must be heading towards the bird;
  // a train only counts while it is actually on the line.
  closeCall(lane, col) {
    if (lane.type==="road") {
      let best=null;
      for (const car of lane.cars) {
        const dx = col - car.x, toward = Math.sign(dx) === lane.dir;
        const gap = Math.abs(dx) - (car.width*0.45+0.18);
        if (toward && gap < 0.55 && (best===null || gap<best)) best=gap;
      }
      return best===null ? null : { kind:"car", gap:best };
    }
    if (lane.type==="rail" && (lane.phase==="train" || (lane.phase==="warn" && lane.timer<0.5))) {
      const gap = Math.abs(lane.train.x - col) - 3;
      if (lane.phase==="warn" || gap < 2.5) return { kind:"train", gap };
    }
    return null;
  },

  emit(type, data) {
    if (!this.events) return;
    if (this.events.length > 40) this.events.shift();
    this.events.push(Object.assign({ type }, data));
  },


  // Refused input: lean the chick a fraction of a tile the way it tried to go
  // and spring back, so "you can't go there" is visible as well as audible.
  bump(dc,dr,why) {
    if (this.runStats) { if (why==="tree") this.runStats.bumpTree++; else this.runStats.bumpEdge++; }
    if (this.bumpT>0.55) return; // still leaning from the last one
    this.bumpT=1; this.bumpX=dc||0; this.bumpY=dr||0;
    Sfx.thud();
  },


  /* ----- pause ----- */
  pause() {
    if (!this.active || !this.running || this.dead || this.paused) return;
    this.paused = true;
    if (this.runStats) this.runStats.pauses++;
    App.openModal("pause-modal");
  },

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._last = performance.now(); // avoid a dt jump after the freeze
    App.closeModal("pause-modal");
  },

  togglePause() { if (this.paused) this.resume(); else this.pause(); },


  update(dt) {
    this.elapsed+=dt;
    if (this.shake>0) this.shake=Math.max(0,this.shake-dt*2.2);
    if (this.bumpT>0) this.bumpT=Math.max(0,this.bumpT-dt*6);
    if (this.invince>0) this.invince-=dt;
    // Above the !running gate on purpose: winning stops the run, and the
    // confetti has to keep falling behind the result card.
    GK.Fx.update(dt);

    // animate hazards near camera even if paused? only when running
    this.animateHazards(dt, this.camRow);

    if (!this.running) return;

    this.antiStall(dt);

    const c = this.chick;
    if (c.hop<1) {
      // A hop launched from a log has to travel with it. Carrying the rider
      // only once it had landed meant the log slid out from under it during
      // the 110ms flight -- about 0.2 of a tile at full current, so a few
      // nudges along a log walked the bird off the back through no fault of
      // its own. Translate the whole arc by the lane's drift instead. Hops
      // onto dry land keep their target, so they still land squarely on it.
      const src = this.world[c.fromRow], dst = this.world[c.toRow];
      if (!this.dead && src && src.type==="water" && dst && dst.type==="water") {
        const drift = src.dir*src.speed*dt;
        c.fromCol += drift; c.toCol += drift;
      }
      c.hop = Math.min(1, c.hop + dt/HOP_TIME);
      c.col = lerp(c.fromCol,c.toCol,c.hop); c.row = lerp(c.fromRow,c.toRow,c.hop);
      if (c.hop>=1) {
        c.col=c.toCol; c.row=c.toRow;
        this.landed();
        if (c.row>c.maxRow){ c.maxRow=c.row; this.newRow(); this.updateHud(); this.checkWin(); }
        if (this.inputQueue){ const q=this.inputQueue; this.inputQueue=null; this.doMove(q[0],q[1]); }
      }
    }

    this.ensureRows(Math.ceil(this.camForced)+50);
    // The camera eases onto each new furthest row.
    this.camRow = lerp(this.camRow, Math.max(c.row,this.camForced), 1-Math.exp(-6*dt));

    if (c.hop>=1 && !this.dead) this.laneEffects(dt);
    if (this.runStats) this.tallyLane(dt);

    // Taken at the bottom edge of the screen -- which only the push can do.
    if (!this.dead && c.row < this.floorRow() + 0.35) { this.runStats.blown = true; this.die("fell"); }
  },

  // The exact row at the bottom edge of the screen, for the camera floor.
  floorRow() { return this.camForced - (this.H*(1-this.BASE_Y))/this.TILE; },

  // No creep, in endless or the campaign. The camera floor trails the furthest row by a
  // couple of rows (so a step back is allowed), and only a bird that has not
  // reached a new row for STALL.push seconds is pushed: the floor then rises
  // fast enough to reach it in STALL.pushSeconds, whatever the screen size,
  // and stops the moment it makes progress again.
  antiStall(dt) {
    const c = this.chick;
    this.camForced = Math.max(this.camForced, c.maxRow - STALL.back);
    if (this.dead) return;
    this.stallT += dt;
    if (this.stallT < STALL.push) { this.pushV = 0; return; }
    if (!this.pushV) {
      const dist = Math.max(1, c.row - (this.floorRow() + 0.35));
      this.pushV = dist / STALL.pushSeconds;
    }
    this.pushV *= 1 + dt*0.15;
    this.camForced += this.pushV*dt;
  },

  // 0 nothing, 1 warning, 2 being pushed. Read by the renderer and the HUD.
  stallLevel() {
    if (!this.running || this.dead) return 0;
    return this.stallT >= STALL.push ? 2 : this.stallT >= STALL.warn ? 1 : 0;
  },
  stallProgress() { return clamp((this.stallT - STALL.warn)/(STALL.push - STALL.warn), 0, 1); },

  // Just landed (before any new-row bookkeeping).
  landed() {
    const c = this.chick, s = this.runStats, lane = this.world[c.row];
    if (c.close && !this.dead) {
      s.near++;
      this.emit("close", { kind:c.close.kind, gap:c.close.gap, col:c.col, row:c.row });
    }
    c.close = null;
    // a car that has only just gone by the square landed on is a close call too
    if (lane && lane.type==="road") for (const car of lane.cars) {
      const dx = c.col - car.x, away = Math.sign(dx) === -lane.dir;
      if (away && Math.abs(dx) - (car.width*0.45+0.18) < 0.3 && Math.abs(dx) - (car.width*0.45+0.18) > 0) {
        s.near++; this.emit("close", { kind:"car", gap:0.2, col:c.col, row:c.row }); break;
      }
    }
    const col = Math.round(c.col);
    if (col <= 0) s.edges |= 1;
    if (col >= COLS-1) s.edges |= 2;
    if (lane && lane.type==="rail" && lane.phase!=="clear") s.railWarn++;
  },

  // A new furthest row: milestones, a new best, and the stall clock.
  newRow() {
    const c = this.chick, s = this.runStats;
    this.stallT = 0; this.pushV = 0;
    if (this.elapsed <= 15) s.rowAt15 = c.maxRow;
    const prev = this.world[c.maxRow-1];
    if (prev && prev.type==="rail") s.rails++;
    if (this.mode!=="endless") return;
    if (c.maxRow >= this.nextMilestone) {
      this.emit("milestone", { n:this.nextMilestone });
      this.nextMilestone += 25;
    }
    if (!this.bestFired && this.startBest >= 5 && c.maxRow > this.startBest) {
      this.bestFired = true;
      if (s.revived) s.bestAfterRevive = true;
      this.emit("newBest", { n:c.maxRow });
    }
  },

  // Per-frame counters: how long the bird has ridden the log it is on, and
  // how many logs it has boarded.
  tallyLane(dt) {
    const s = this.runStats, c = this.chick;
    if (c.rideLog) {
      if (c.rideLog !== this._countedLog) { this._countedLog = c.rideLog; s.logs++; s.logRide = 0; }
      s.logRide += dt; s.maxLogRide = Math.max(s.maxLogRide, s.logRide);
    } else if (c.hop>=1) { this._countedLog = null; s.logRide = 0; }
  },


  animateHazards(dt, center) {
    const lo=Math.floor(center-16), hi=Math.ceil(center+22);
    for (let r=lo;r<=hi;r++){
      const lane=this.world[r]; if(!lane) continue;
      if (lane.type==="road") {
        const M=lane.ext??1.2, L=lane.loop??(COLS+2.4);
        for (const car of lane.cars){ car.x += lane.dir*lane.speed*dt;
          if (lane.dir>0 && car.x>COLS+M) car.x-=L;
          else if (lane.dir<0 && car.x<-M) car.x+=L; }
      } else if (lane.type==="water") {
        const M=lane.ext??1.2, L=lane.loop??(COLS+2.4);
        for (const lg of lane.logs){ lg.x += lane.dir*lane.speed*dt;
          const span=L+lg.len;
          if (lane.dir>0 && lg.x-lg.len/2>COLS+M) lg.x-=span;
          else if (lane.dir<0 && lg.x+lg.len/2<-M) lg.x+=span; }
      } else if (lane.type==="rail") {
        this.updateRail(lane, dt, r, center);
      }
    }
  },


  updateRail(lane, dt, row, center) {
    const visible = this.running && Math.abs(row-center)<13;
    lane.blink += dt;
    if (lane.phase==="clear") {
      lane.gate = Math.max(0, lane.gate - dt*4);
      lane.timer -= dt;
      if (lane.timer<=0){ lane.phase="warn"; lane.timer=1.4; lane.warned=false; }
    } else if (lane.phase==="warn") {
      lane.gate = Math.min(1, lane.gate + dt*3);
      lane.timer -= dt;
      if (visible && !lane.warned){ Sfx.bell(); lane.warned=true; }
      if (lane.timer<=0){ lane.phase="train";
        const edge = this.extC + 7; // fully beyond the visible edge (train is 6 tiles)
        lane.train.x = lane.dir>0 ? -edge : COLS+edge;
        if (visible) Sfx.horn(); }
    } else { // train
      lane.gate = 1;
      lane.train.x += lane.dir*(lane.fast||this.params.railFast)*dt;
      const edge = this.extC + 7;
      const done = lane.dir>0 ? lane.train.x>COLS+edge : lane.train.x<-edge;
      if (done){ lane.phase="clear"; lane.timer=rand(3,6.5); }
    }
  },


  laneEffects(dt) {
    const c=this.chick, lane=this.world[c.row];
    if (!lane) return;
    // coin pickup
    if (lane.coin && !lane.coin.taken && Math.round(c.col)===lane.coin.col) {
      lane.coin.taken=true; this.runCoins++; Collection.earn(this.progress, 1);
      Storage.saveProgress(this.profile.id, this.progress); Sfx.coin(); this.updateHud();
      const s=this.runStats;
      if (s) { s.coinRun = s.lastCoinRow===c.row-1 ? s.coinRun+1 : 1; s.lastCoinRow=c.row;
               s.maxCoinRun=Math.max(s.maxCoinRun, s.coinRun); }
      this.emit("coin", { col:c.col, row:c.row });
    }
    // Riding happens even while invincible -- a bird that stood still on a
    // moving log until the invincibility ran out would be dumped in open water.
    if (lane.type==="water") {
      const riding = this.rideLog(lane);
      if (this.invince>0 || GK.Debug.flag("invincible")) return;
      if (!riding) { this.die("water"); return; }
      if (c.col<-0.35 || c.col>COLS-0.65) this.die("fell");
      return;
    }
    if (this.invince>0 || GK.Debug.flag("invincible")) return;
    if (lane.type==="road") {
      // Hitbox matches the rendered sprites: car body half-width is car.width*0.45
      // (drawn at car.width*T*0.9) and the chick body half-width is ~0.2 tiles, so
      // sprites touch at car.width*0.45+0.2. Small -0.02 keeps deaths from firing on
      // a still-visible gap (old car.width/2+0.42 left a ~0.27-tile gap = unfair).
      for (const car of lane.cars){ if (Math.abs(car.x-c.col) < car.width*0.45+0.18){ this.die("car", { dir:lane.dir, kind:car.kind }); return; } }
    } else if (lane.type==="rail") {
      // Train sprite is 6 tiles wide (half-width 3); firing at <3 means the chick's
      // centre is already under the body (near edge overlapping) — fair, so unchanged.
      if (lane.phase==="train" && Math.abs(lane.train.x - c.col) < 3) this.die("train", { dir:lane.dir });
    }
  },


  // Lock the rider to the log it boarded, by a fixed offset from the log's
  // centre, rather than re-integrating the current every frame. The logs have
  // already moved by the time this runs, so integrating left the bird a frame
  // behind the timber it was standing on and biased it toward the trailing
  // edge. Returns false when it is in open water. The on-log test matches the
  // drawn log (len*0.94 wide) plus a toe's worth of overhang, so "it looks
  // like I'm on it" and "I'm on it" agree.
  rideLog(lane) {
    const c=this.chick;
    const log = lane.logs.find(lg => Math.abs(c.col-lg.x) < lg.len*0.47+0.12);
    if (!log){ c.rideLog=null; return false; }
    if (c.rideLog!==log){ c.rideLog=log; c.rideOff=c.col-log.x; }
    const next = log.x + c.rideOff;
    // the log looped round to the far bank without its passenger
    if (Math.abs(next-c.col) > 0.5){ c.rideLog=null; return false; }
    c.col = next;
    return true;
  },


  checkWin() {
    if (this.mode==="level" && !this.dead && this.chick.maxRow >= this.target) this.win();
  },


  win() {
    this.running=false;
    if (this.chick.maxRow>this.progress.best){ this.progress.best=this.chick.maxRow; }
    // stars: complete=1, +1 if >=5 coins this run, +1 if >=10
    let stars=1; if (this.runCoins>=5) stars++; if (this.runCoins>=10) stars++;
    const gi=this.level.gi, prev=this.progress.levels[gi];
    if (!prev || stars>prev.stars) this.progress.levels[gi]={ stars, coins:this.runCoins };
    else this.progress.levels[gi]=prev;
    Storage.saveProgress(this.profile.id, this.progress);
    Sfx.win();
    // Win juice: a confetti shower over the finish, from the kit's shared pool.
    GK.Fx.confetti(this.W, this.H, CONFETTI_COLORS, 90);
    this.result={ type:"win", stars, coins:this.runCoins };
    setTimeout(()=>App.showResult(this.result), 500);
  },


  die(reason, info) {
    if (this.dead) return;
    this.dead=true; this.running=false; this.shake=reason==="train" ? 1.4 : 1;
    this.deathReason=reason; this.deathInfo=info||{};
    this.emit("death", { reason, col:this.chick.col, row:this.chick.row, dir:this.deathInfo.dir||0 });
    if (reason==="water"||reason==="fell") Sfx.splash(); else Sfx.squash();
    Sfx.lose();
    if (this.chick.maxRow>this.progress.best){ this.progress.best=this.chick.maxRow;
      Storage.saveProgress(this.profile.id, this.progress); }
    this.result={ type:"lose", reason, dist:this.chick.maxRow, coins:this.runCoins };
    // Quick: the death has to read, and then the player wants to go again.
    setTimeout(()=>{ if (this.result && this.dead) App.showResult(this.result); }, 520);
  },


  revive() {
    if (!Collection.spend(this.progress, REVIVE_COST)) return false;
    Storage.saveProgress(this.profile.id, this.progress);
    const c=this.chick;
    const sr = this.safeRow(Math.floor(c.row));
    c.row=sr; c.maxRow=Math.max(c.maxRow,sr);
    c.col=this.safeCol(sr, clamp(Math.round(c.col),0,COLS-1));
    c.hop=1; c.fromRow=c.toRow=sr; c.fromCol=c.toCol=c.col; c.rideLog=null;
    this.bumpT=0;
    this.dead=false; this.running=true; this.invince=2.2; this.revived=true;
    this.stallT=-STALL.grace; this.pushV=0; this.runStats.revived=true; this.runStats.blown=false;
    App.closeModal("result-modal"); this.updateHud();
    return true;
  },


  // Revive costs 50 coins, so it must never hand back a doomed run -- the old
  // six-row search gave up silently and left the chick standing in the water
  // lane that had just drowned it. Prefer ground below the death row (losing a
  // little distance is fairer than gaining it), then look ahead, and if this
  // stretch of world is all hazard, turn the landing row into grass outright.
  safeRow(from) {
    const floor = Math.max(0, this.camBottomRow()+1); // below this the camera takes you
    for (let r=Math.max(from,floor); r>=floor; r--) if (this.isSafeRow(r)) return r;
    for (let r=from+1; r<=from+10; r++){ this.ensureRows(r); if (this.isSafeRow(r)) return r; }
    const r = Math.max(from, floor);
    this.world[r] = { type:"grass", trees:new Set(), coin:null };
    return r;
  },

  isSafeRow(r){ const lane=this.world[r]; return !!lane && lane.type==="grass"; },

  // ...and never inside a tree, where the first hop out would be refused.
  safeCol(row, want) {
    const lane=this.world[row];
    if (!lane || lane.type!=="grass" || !lane.trees.has(want)) return want;
    for (let d=1; d<COLS; d++) for (const col of [want-d, want+d])
      if (col>=0 && col<COLS && !lane.trees.has(col)) return col;
    return want;
  },


  exitToMap() {
    this.running=false; this.active=false; this.paused=false;
    App.closeModal("result-modal");
    App.closeModal("pause-modal");
    App.showMap();
  },


  /* ----- render ----- */
  screen(col,row){ const x=this.X0+(col+0.5)*this.TILE, y=this.H*this.BASE_Y-(row-this.camRow)*this.TILE; return [x,y]; },
};
