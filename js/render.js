// Drawing, input and the frame loop -- the half of Game that knows there is a
// screen. Assigned onto the object js/game.js built, so these methods share
// its `this` and its state.
//
// Nothing in here may move a creature or change a score: the simulation is
// authoritative and this file only ever reads it.
"use strict";

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

Object.assign(Game, {

  boot() {
    this.canvas = document.getElementById("c");
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
    // Auto-pause when the tab is hidden / the tablet locks, so an interrupted
    // run isn't lost. The player resumes from the overlay when they're back.
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.pause(); });
    this.bindInput();
    requestAnimationFrame((t)=>this.loop(t));
  },


  resize() {
    this.DPR = Math.min(window.devicePixelRatio||1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    // A hidden/background tab can report 0x0 at boot; retry until real
    // dimensions arrive so world geometry never goes NaN.
    if (!w || !h) { setTimeout(() => this.resize(), 200); return; }
    this.canvas.style.width = w+"px"; this.canvas.style.height = h+"px";
    this.canvas.width = Math.round(w*this.DPR); this.canvas.height = Math.round(h*this.DPR);
    this.ctx.setTransform(this.DPR,0,0,this.DPR,0,0);
    this.W=w; this.H=h;
    // Playfield is COLS tiles wide, centred; on wide screens (iPad landscape,
    // desktop) the world art extends past it, Crossy-Road style.
    this.TILE = Math.min(w/COLS, h/11);
    this.X0 = (w - COLS*this.TILE)/2;
    this.extC = this.X0/this.TILE + 1.2; // tiles of travel beyond the playfield
  },


  /* ----- input ----- */
  bindInput() {
    const km = { ArrowUp:[0,1],KeyW:[0,1],ArrowDown:[0,-1],KeyS:[0,-1],
                 ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0] };
    window.addEventListener("keydown", e => {
      if (App.screen!=="game") return;
      if (e.code==="Escape" || e.code==="KeyP"){ e.preventDefault(); if (!this.dead) this.togglePause(); return; }
      if (!this.running || this.paused) return;
      if (e.code==="Space"){ e.preventDefault(); this.move(0,1); return; }
      const m = km[e.code]; if (m){ e.preventDefault(); this.move(m[0],m[1]); }
    });
    // Crossy-Road-style touch: tap = hop forward; a swipe fires the moment the
    // finger crosses the threshold (during the gesture, not on release).
    const SWIPE = 18; // px
    let tp = null;    // { id, x, y, t, fired }
    const start = (id,x,y) => { Sfx.init(); if (tp) return; tp = { id, x, y, t: performance.now(), fired:false }; };
    const drag = (id,x,y) => {
      if (!tp || tp.id !== id || tp.fired) return;
      const dx = x - tp.x, dy = y - tp.y;
      if (Math.hypot(dx,dy) < SWIPE) return;
      tp.fired = true;
      if (App.screen !== "game" || !this.running) return;
      if (Math.abs(dx) > Math.abs(dy)) this.move(dx>0?1:-1, 0);
      else this.move(0, dy<0?1:-1);
    };
    const end = (id) => {
      if (!tp || tp.id !== id) return;
      const fired = tp.fired, dt = performance.now() - tp.t;
      tp = null;
      if (fired) return;
      if (App.screen === "game" && this.running && dt < 400) this.move(0,1); // tap
    };
    const cancel = (id) => { if (tp && tp.id === id) tp = null; };
    this.canvas.addEventListener("touchstart", e=>{ e.preventDefault(); const t=e.changedTouches[0]; start(t.identifier,t.clientX,t.clientY); }, { passive:false });
    this.canvas.addEventListener("touchmove",  e=>{ e.preventDefault(); for (const t of e.changedTouches) drag(t.identifier,t.clientX,t.clientY); }, { passive:false });
    this.canvas.addEventListener("touchend",   e=>{ e.preventDefault(); for (const t of e.changedTouches) end(t.identifier); }, { passive:false });
    this.canvas.addEventListener("touchcancel",e=>{ for (const t of e.changedTouches) cancel(t.identifier); });
    // mouse fallback for desktop
    this.canvas.addEventListener("mousedown", e=>start("m",e.clientX,e.clientY));
    window.addEventListener("mousemove", e=>drag("m",e.clientX,e.clientY));
    window.addEventListener("mouseup",   ()=>end("m"));
    // Block iOS pinch-zoom during gameplay only. On menu screens we let it
    // through so low-vision players can zoom to read (accessibility).
    document.addEventListener("gesturestart", e=>{ if (App.screen==="game") e.preventDefault(); });
  },


  /* ----- main loop ----- */
  loop(now) {
    let dt = (now-(this._last||now))/1000; this._last=now;
    GK.Debug.frame(dt);        // real delta, before the clamp, so fps is honest
    if (dt>0.05) dt=0.05;
    // paused: keep rendering the frozen frame (behind the overlay), don't advance
    if (this.active) { if (!this.paused) this.update(dt); this.render(); }
    else this.ctx.clearRect(0,0,this.W,this.H);
    requestAnimationFrame(t=>this.loop(t));
  },


  updateHud() {
    const prog = document.getElementById("g-progress");
    if (this.mode==="level") prog.textContent = `${this.chick.maxRow} / ${this.target}`;
    else prog.textContent = `${this.chick.maxRow} m`;
    document.getElementById("g-coins").textContent = "🪙 " + (this.progress ? this.progress.coins : 0);
  },


  render() {
    const ctx=this.ctx, TILE=this.TILE;
    ctx.save();
    if (this.shake>0 && !REDUCE_MOTION){ const s=this.shake*10; ctx.translate((Math.random()-0.5)*s,(Math.random()-0.5)*s); }
    ctx.clearRect(-20,-20,this.W+40,this.H+40);
    ctx.fillStyle=this.theme.bg; ctx.fillRect(-20,-20,this.W+40,this.H+40);

    const lo=Math.floor(this.camRow-(this.H*this.BASE_Y)/TILE)-2;
    const hi=Math.ceil(this.camRow+(this.H*(1-this.BASE_Y))/TILE)+2;
    for (let r=hi;r>=lo;r--){ if (r>this.maxGen) this.ensureRows(r);
      this.drawLane(r, this.world[r]); }
    this.drawChick();
    // darken the world beyond the playfield edges (Crossy-Road style)
    if (this.X0 > 2) {
      const g1=ctx.createLinearGradient(0,0,this.X0,0);
      g1.addColorStop(0,"rgba(0,0,0,0.35)"); g1.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g1; ctx.fillRect(0,-20,this.X0,this.H+40);
      const g2=ctx.createLinearGradient(this.W,0,this.W-this.X0,0);
      g2.addColorStop(0,"rgba(0,0,0,0.35)"); g2.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g2; ctx.fillRect(this.W-this.X0,-20,this.X0,this.H+40);
    }
    ctx.restore();
    // Win confetti sits in screen space, outside the shake transform, so the
    // celebration doesn't judder along with the world.
    GK.Fx.render(ctx);
    this.drawDebug(ctx);
  },


  // Debug overlays. The hitbox bands are computed from the SAME expressions
  // laneEffects() tests against, so the overlay can't drift from the real
  // collision -- a lying overlay would be worse than none.
  drawDebug(ctx) {
    const boxes = GK.Debug.flag("hitboxes"), labels = GK.Debug.flag("lanes");
    if (!boxes && !labels) return;
    const T = this.TILE;
    const lo = Math.floor(this.camRow - (this.H*this.BASE_Y)/T) - 1;
    const hi = Math.ceil(this.camRow + (this.H*(1-this.BASE_Y))/T) + 1;
    ctx.save();
    ctx.font = `700 ${Math.max(10, T*0.2)}px ui-monospace,monospace`;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    // A band spanning columns [from,to] across one lane.
    const band = (from, to, cy, fill) => {
      const x1 = this.X0 + (from+0.5)*T, x2 = this.X0 + (to+0.5)*T;
      ctx.fillStyle = fill; ctx.fillRect(x1, cy - T*0.5, x2-x1, T);
    };
    for (let r=lo; r<=hi; r++) {
      const lane = this.world[r]; if (!lane) continue;
      const cy = this.screen(0, r)[1];
      if (boxes) {
        if (lane.type==="road")
          // laneEffects: |car.x - col| < car.width*0.45 + 0.18
          for (const car of lane.cars) { const h = car.width*0.45+0.18; band(car.x-h, car.x+h, cy, "rgba(255,45,45,0.30)"); }
        else if (lane.type==="rail" && lane.phase==="train")
          // laneEffects: |train.x - col| < 3
          band(lane.train.x-3, lane.train.x+3, cy, "rgba(255,45,45,0.30)");
        else if (lane.type==="water")
          // rideLog: |col - lg.x| < lg.len*0.47 + 0.12  (green = the SAFE span)
          for (const lg of lane.logs) { const h = lg.len*0.47+0.12; band(lg.x-h, lg.x+h, cy, "rgba(60,255,140,0.28)"); }
        else if (lane.type==="grass")
          for (const col of lane.trees) band(col-0.5, col+0.5, cy, "rgba(255,255,255,0.16)");
      }
      if (labels) {
        const txt = `${r} ${lane.type}`;
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(2, cy-T*0.17, ctx.measureText(txt).width+10, T*0.34);
        ctx.fillStyle = "#ffd93b"; ctx.fillText(txt, 7, cy);
      }
    }
    if (boxes) {   // the chick's own footprint (~0.2 tiles half-width)
      const c = this.chick, [cx, cyy] = this.screen(c.col, c.row);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.strokeRect(cx - T*0.2, cyy - T*0.2, T*0.4, T*0.4);
    }
    ctx.restore();
  },


  drawLane(row, lane) {
    const ctx=this.ctx, TILE=this.TILE, th=this.theme;
    const [,cy]=this.screen(0,row), top=cy-TILE/2;
    if (row<0 || !lane){ ctx.fillStyle="#2a6db0"; ctx.fillRect(0,top,this.W,TILE+1); return; }

    if (lane.type==="grass") {
      ctx.fillStyle = (row%2===0)?th.grassA:th.grassB; ctx.fillRect(0,top,this.W,TILE+1);
      ctx.fillStyle="rgba(255,255,255,0.04)"; ctx.fillRect(0,top,this.W,3);
      // dense decorative forest beyond the playfield (wide screens)
      const ext = Math.ceil(this.X0/TILE);
      for (let i=1;i<=ext;i++) for (const col of [-i, COLS-1+i]) {
        const h = hash2(row,col);
        if (h < 0.55) { const [x,y]=this.screen(col,row); this.drawTree(x,y,h<0.12); }
      }
      for (const col of lane.trees){ const [x,y]=this.screen(col,row); this.drawTree(x,y,(col*7+row)%3===0); }
    } else if (lane.type==="road") {
      ctx.fillStyle=th.road; ctx.fillRect(0,top,this.W,TILE+1);
      ctx.fillStyle="rgba(255,255,255,0.5)"; const dy=top+TILE/2-2;
      for (let x=0;x<this.W;x+=TILE) ctx.fillRect(x+TILE*0.25,dy,TILE*0.4,4);
      ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.fillRect(0,top,this.W,4);
      for (const car of lane.cars) this.drawCar(car,lane,row);
    } else if (lane.type==="water") {
      this.drawWater(lane,row,top);
      for (const lg of lane.logs) this.drawLog(lg,row,lane);
    } else if (lane.type==="rail") {
      this.drawRail(lane,row,top);
    }
    if (lane.coin && !lane.coin.taken) this.drawCoin(lane.coin, row);
  },


  drawTree(x,y,rock) {
    const ctx=this.ctx, T=this.TILE;
    ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(x,y+T*0.3,T*0.3,T*0.13,0,0,7); ctx.fill();
    if (rock){ ctx.fillStyle="#9aa1a8"; rr(ctx,x-T*0.26,y-T*0.18,T*0.52,T*0.5,8); ctx.fill();
      ctx.fillStyle="#b5bcc2"; rr(ctx,x-T*0.2,y-T*0.22,T*0.3,T*0.22,6); ctx.fill(); return; }
    ctx.fillStyle="#7a4a1e"; ctx.fillRect(x-T*0.07,y-T*0.05,T*0.14,T*0.35);
    ctx.fillStyle="#3f8f3a"; rr(ctx,x-T*0.3,y-T*0.6,T*0.6,T*0.62,12); ctx.fill();
    ctx.fillStyle="#4aa544"; rr(ctx,x-T*0.24,y-T*0.66,T*0.4,T*0.4,10); ctx.fill();
  },

  drawCar(car,lane,row) {
    const ctx=this.ctx, T=this.TILE, [x,y]=this.screen(car.x,row);
    const w=car.width*T*0.9, h=T*0.62;
    ctx.fillStyle="rgba(0,0,0,0.22)"; rr(ctx,x-w/2+4,y-h/2+6,w,h,10); ctx.fill();
    ctx.fillStyle=lane.color; rr(ctx,x-w/2,y-h/2,w,h,10); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.22)";
    const cw=car.kind==="truck"?w*0.35:w*0.5, cx=lane.dir>=0?x-w/2+w*0.08:x+w/2-w*0.08-cw;
    rr(ctx,cx,y-h/2+5,cw,h*0.45,6); ctx.fill();
    ctx.fillStyle="rgba(120,190,240,0.85)"; rr(ctx,cx+3,y-h/2+8,cw-6,h*0.3,4); ctx.fill();
    ctx.fillStyle="#fff4c2"; const lx=lane.dir>=0?x+w/2-5:x-w/2+1;
    ctx.fillRect(lx,y-h*0.28,4,5); ctx.fillRect(lx,y+h*0.18,4,5);
  },

  // Whole water lanes bob in phase so logs and their rider move as one unit.
  waterBob(row) { return Math.sin(this.elapsed*2.2 + row*1.7) * this.TILE*0.03; },


  drawWater(lane,row,top) {
    const ctx=this.ctx, T=this.TILE, W=this.W, t=this.elapsed;
    ctx.fillStyle=(row%2===0)?this.theme.water:shade(this.theme.water,-8);
    ctx.fillRect(0,top,W,T+1);
    // depth: darker along the top bank, lighter in the shallows below
    ctx.fillStyle="rgba(0,0,20,0.10)"; ctx.fillRect(0,top,W,T*0.18);
    ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(0,top+T*0.8,W,T*0.2);
    // two ribbons of drifting sine shimmer, moving with the current
    const flow = lane.dir*lane.speed*T;             // current, px/sec
    ctx.fillStyle="rgba(255,255,255,0.10)";
    for (let b=0;b<2;b++){
      const yb = top + T*(b?0.62:0.32);
      const ph = t*(b?1.7:1.1) + row*2.1 + b*3;
      const span = T*1.4;
      const drift = ((t*flow*(b?0.35:0.55))%span+span)%span;
      for (let x=-span;x<W+span;x+=T*0.7){
        const xx = x + drift;
        const yy = yb + Math.sin(xx*0.045 + ph)*T*0.06;
        rr(ctx, xx, yy, T*0.34, Math.max(2,T*0.035), 2); ctx.fill();
      }
    }
    // twinkling sparkle glints, deterministic per row, drifting downstream
    ctx.fillStyle="rgba(255,255,255,0.22)";
    const n = Math.ceil(W/T);
    for (let i=0;i<n;i++){
      const gx = ((hash2(row,i)*W + t*flow*0.45)%W + W)%W;
      const gy = top + T*(0.2 + hash2(i,row)*0.6);
      const tw = 0.5 + 0.5*Math.sin(t*3 + i*2.4 + row);
      if (tw > 0.4){ ctx.beginPath(); ctx.ellipse(gx,gy,T*0.05*tw+1,Math.max(1.2,T*0.02),0,0,7); ctx.fill(); }
    }
  },


  drawLog(lg,row,lane) {
    const ctx=this.ctx, T=this.TILE;
    let [x,y]=this.screen(lg.x,row);
    y += this.waterBob(row);
    const w=lg.len*T*0.94, h=T*0.56;
    // wake: fading streaks trailing behind the log
    const back = -lane.dir;
    ctx.fillStyle="rgba(255,255,255,0.16)";
    for (let k=0;k<3;k++){
      const wx = x + back*(w/2 + T*0.08 + k*T*0.16);
      const wy = y + (k===1 ? -h*0.22 : k===2 ? h*0.22 : 0);
      rr(ctx, wx - T*0.09, wy-1.5, (T*0.18)*(1-k*0.25), 3, 1.5); ctx.fill();
    }
    ctx.fillStyle="rgba(0,0,0,0.14)"; rr(ctx,x-w/2+3,y-h/2+5,w,h,h/2); ctx.fill();
    ctx.fillStyle="#8a5a2b"; rr(ctx,x-w/2,y-h/2,w,h,h/2); ctx.fill();
    ctx.fillStyle="#734a22";
    for (let i=1;i<lg.len;i++){ const gx=x-w/2+w*i/lg.len; ctx.fillRect(gx-1.5,y-h/2+4,3,h-8); }
    ctx.fillStyle="#c79a5f";
    ctx.beginPath(); ctx.ellipse(x-w/2+6,y,5,h*0.32,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+w/2-6,y,5,h*0.32,0,0,7); ctx.fill();
  },

  drawRail(lane,row,top) {
    const ctx=this.ctx, T=this.TILE, W=this.W;
    ctx.fillStyle="#5a5148"; ctx.fillRect(0,top,W,T+1);
    // sleepers
    ctx.fillStyle="#6f6458"; for (let x=0;x<W;x+=T*0.5) ctx.fillRect(x+4,top+8,T*0.32,T-16);
    // rails
    ctx.fillStyle="#c9ccd2"; ctx.fillRect(0,top+T*0.32,W,4); ctx.fillRect(0,top+T*0.62,W,4);
    // train
    if (lane.phase==="train"){ const [x,y]=this.screen(lane.train.x,row);
      const w=6*T, h=T*0.8;
      ctx.fillStyle="rgba(0,0,0,0.28)"; rr(ctx,x-w/2+5,y-h/2+6,w,h,10); ctx.fill();
      ctx.fillStyle="#c0392b"; rr(ctx,x-w/2,y-h/2,w,h,10); ctx.fill();
      ctx.fillStyle="#e2554a"; ctx.fillRect(x-w/2,y-h/2,w,6);
      ctx.fillStyle="#ffe08a";
      for (let i=0;i<6;i++) rr(ctx,x-w/2+18+i*(w-36)/6,y-h*0.28,(w-36)/6-8,h*0.32,4), ctx.fill();
      // front light
      ctx.fillStyle="#fff6c8"; const fx=lane.dir>0?x+w/2-6:x-w/2+2; ctx.fillRect(fx,y-6,5,12);
    }
    // warning lights + gates. blink*3 => the lamp lights ~1.5 times/sec, safely
    // under the 3 Hz photosensitivity ceiling (was blink*6). Reduced-motion
    // players get a steady lamp -- the bell/horn still cue the crossing.
    const on = (lane.phase==="warn"||lane.phase==="train");
    const flash = on && (REDUCE_MOTION || Math.floor(lane.blink*3)%2===0);
    [-1,1].forEach(side=>{
      const gx = side<0 ? this.X0+T*0.5 : this.X0+COLS*T-T*0.5;
      // pole
      ctx.fillStyle="#333"; ctx.fillRect(gx-3, top+2, 6, T*0.5);
      // lamp
      ctx.beginPath(); ctx.arc(gx, top+8, 6, 0, 7);
      ctx.fillStyle = flash ? "#ff2d2d" : (on?"#7a1414":"#801a1a"); ctx.fill();
      // gate arm rotating down
      const a = lane.gate * (Math.PI/2); // 0 up -> down
      ctx.save(); ctx.translate(gx, top+T*0.5);
      ctx.rotate(side<0 ? a : -a);
      const len = T*1.6;
      ctx.fillStyle="#fff"; rr(ctx,0,-4, side<0?len:0, 8, 3);
      // draw arm toward center
      ctx.fillStyle="#e23b3b";
      for (let i=0;i<5;i++){ const seg=len/5; const sx=(side<0? i*seg : -(i+1)*seg);
        ctx.fillStyle = i%2===0 ? "#e23b3b":"#ffffff"; rr(ctx,sx,-4,seg,8,2); ctx.fill(); }
      ctx.restore();
    });
  },

  drawCoin(coin,row) {
    const ctx=this.ctx, T=this.TILE, [x,y0]=this.screen(coin.col,row);
    const bob=Math.sin(this.elapsed*4+coin.bob)*3, y=y0+bob;
    ctx.fillStyle="rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(x,y0+T*0.28,T*0.16,T*0.07,0,0,7); ctx.fill();
    ctx.fillStyle="#f6c531"; ctx.beginPath(); ctx.arc(x,y,T*0.2,0,7); ctx.fill();
    ctx.fillStyle="#ffe58a"; ctx.beginPath(); ctx.arc(x,y,T*0.14,0,7); ctx.fill();
    ctx.fillStyle="#d99a1a"; ctx.font=`900 ${T*0.22}px system-ui`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("★",x,y+1);
  },

  drawChick() {
    const ctx=this.ctx, T=this.TILE, c=this.chick;
    const sk = SKINS[this.profile && this.profile.avatar] || SKINS["🐔"];
    let [x,yBase]=this.screen(c.col,c.row);
    // riding a log: bob with the lane so bird and log move as one
    const under=this.world[c.row];
    if (under && under.type==="water" && c.hop>=1 && !this.dead) yBase += this.waterBob(c.row);
    const arc = c.hop<1 ? Math.sin(Math.PI*c.hop) : 0;
    let y = yBase - arc*T*0.42, sx=1, sy=1;
    if (c.hop<1){ sy=1+arc*0.18; sx=1-arc*0.12; }
    // Water deaths used to play the road-squash flatten, which read as being run
    // over by the river. Drowning sinks instead: the bird drops below the
    // surface, shrinks with the depth and fades out, leaving ripples behind.
    // "fell" covers both being swept off a log and being left behind by the
    // camera, so check the lane rather than the reason -- falling behind on a
    // road should still squash, not sink into the tarmac.
    const drown = this.dead && (this.deathReason==="water" ||
      (this.deathReason==="fell" && under && under.type==="water"));
    let t=0;
    if (this.dead){
      t=Math.min(1,(performance.now()-(this._deadAt||(this._deadAt=performance.now())))/(drown?600:300));
      if (drown){ const k=1-t*0.45; sx=k; sy=k; y=yBase+t*T*0.5; }
      else { sy=1-t*0.7; sx=1+t*0.5; y=yBase; }
    }
    if (!this.dead) this._deadAt=0;
    const s=T*0.5;
    // shadow -- nothing to cast one onto once the bird is under the surface
    if (!drown){
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath();
      ctx.ellipse(x,yBase+s*0.42,s*0.42*(1+arc*0.15),s*0.18,0,0,7); ctx.fill();
    }
    // invincible blink
    if (this.invince>0 && Math.floor(this.invince*10)%2===0){ return; }
    // refused-move lean: body only, so the shadow anchors it to the tile
    let lx=0, ly=0;
    if (this.bumpT>0 && !this.dead){ const l=Math.sin(Math.PI*(1-this.bumpT))*T*0.15;
      lx=this.bumpX*l; ly=-this.bumpY*l; }
    ctx.save(); ctx.translate(x+lx,y+ly); ctx.scale(sx,sy);
    // sinking below the surface: hold full opacity for the first moments so the
    // drop is legible, then fade the bird out as the water closes over it
    if (drown) ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t-0.3)/0.7);
    // Idle timer, presentation-only: the flamingo tucks a leg up once it has
    // been standing still for a moment. Derived from hop here in the renderer
    // rather than tracked in the engine, so the bots never see it.
    // elapsed restarts with each level, so a _movedAt left over from the last
    // one reads as time travel -- treat a clock that went backwards as a reset.
    if (this._movedAt===undefined || this._movedAt>this.elapsed || c.hop<1 || this.dead)
      this._movedAt=this.elapsed;
    // Skins with their own body plan paint themselves; the rest share the stock
    // bird. Rosalie's note -- "the flamingo just looks like a pink chicken" --
    // was exactly right: what makes a flamingo is the silhouette, not the
    // colour, so it gets its own painter instead of another colour flag.
    if (sk.plan==="flamingo") this.paintFlamingo(s,sk);
    else this.paintBird(s,sk);
    ctx.restore();
    // ripples last, so they spread across the surface the bird went under
    if (drown) this.drawRipples(x, yBase, t);
  },


  // The stock bird: one rounded body with optional combs, tufts, bills and
  // masks bolted on. Every skin but the flamingo is a dressing of this.
  paintBird(s, sk) {
    const ctx=this.ctx;
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
    if (this.dead){ ctx.strokeStyle="#222"; ctx.lineWidth=s*0.05; ctx.beginPath();
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
  paintFlamingo(s, sk) {
    const ctx=this.ctx;
    // one-legged stand once it has been still for a beat
    const idle=this.elapsed-(this._movedAt||0);
    const k=Math.min(1,Math.max(0,(idle-0.7)/0.35));
    const tuck = REDUCE_MOTION ? (k>0?1:0) : k*k*(3-2*k);
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
    if (this.dead){ ctx.strokeStyle="#222"; ctx.lineWidth=s*0.038; ctx.beginPath();
      ctx.moveTo(0.202*s,-0.963*s); ctx.lineTo(0.278*s,-0.887*s);
      ctx.moveTo(0.278*s,-0.963*s); ctx.lineTo(0.202*s,-0.887*s);
      ctx.moveTo(0.127*s,-0.950*s); ctx.lineTo(0.183*s,-0.886*s);
      ctx.moveTo(0.183*s,-0.950*s); ctx.lineTo(0.127*s,-0.886*s); ctx.stroke(); }
  },


  // Three rings staggered in time, each expanding and thinning as it fades --
  // the tell that the bird went into the water rather than under a truck.
  drawRipples(x, y, t) {
    const ctx=this.ctx, T=this.TILE;
    ctx.save();
    ctx.strokeStyle="#ffffff";
    for (let i=0;i<3;i++){
      const p = t - i*0.18;
      if (p<=0) continue;
      const r = T*(0.12 + p*0.42);
      ctx.globalAlpha = Math.max(0, 0.7*(1-p));
      ctx.lineWidth = Math.max(1.5, T*0.035*(1-p*0.6));
      ctx.beginPath(); ctx.ellipse(x, y, r, r*0.42, 0, 0, 7); ctx.stroke();
    }
    ctx.restore();
  },
});
