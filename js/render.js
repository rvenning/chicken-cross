// Drawing, input and the frame loop -- the half of Game that knows there is a
// screen. Assigned onto the object js/game.js built, so these methods share
// its `this` and its state.
//
// Nothing in here may move a creature or change a score: the simulation is
// authoritative and this file only ever reads it.
"use strict";


Object.assign(Game, {

  // The bird the player chose in Settings, or the one matching their profile
  // avatar if they never chose. Read from the progress the level loaded, so
  // the renderer never touches storage per frame.
  bird() {
    return (this.progress && this.progress.bird) || (this.profile && this.profile.avatar) || "🐔";
  },

  // Players who ask their OS for less movement get a world that holds still:
  // no shake, no drift, no sway, a steady warning lamp. One number, so it can
  // be checked from the console and there is nowhere for a stray animation to
  // hide. The CSS half is a @media block in css/style.css.
  applyMotion() {
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    Art.motion = mq && mq.matches ? 0 : 1;
    document.body.classList.toggle("reduced-motion", !Art.motion);
    Art._gen = "";           // baked strips may have consulted the flag
  },

  boot() {
    this.canvas = document.getElementById("c");
    this.applyMotion();
    const mq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq && mq.addEventListener) mq.addEventListener("change", () => this.applyMotion());
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
    if (this.active) { if (!this.paused) { this.update(dt); this.juice(dt); } this.render(); }
    else this.ctx.clearRect(0,0,this.W,this.H);
    requestAnimationFrame(t=>this.loop(t));
  },


  updateHud() {
    const prog = document.getElementById("g-progress");
    const dist = this.mode==="level" ? `${this.chick.maxRow} / ${this.target}`
                                     : `${this.chick.maxRow} m`;
    this.setPill(prog, dist);
    this.setPill(document.getElementById("g-coins"),
                 "🪙 " + (this.progress ? this.progress.coins : 0));
  },

  // Write only on change, and pop when it does. Restarting a CSS animation
  // needs the class removed, a reflow forced, and the class added again --
  // without the reflow the browser coalesces the two and nothing happens.
  setPill(el, text) {
    if (!el || el.dataset.v === text) return;
    const first = el.dataset.v === undefined;
    el.dataset.v = text;
    el.textContent = text;
    if (first || !Art.motion) return;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
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













  drawChick() {
    const ctx=this.ctx, T=this.TILE, c=this.chick;
    const sk = SKINS[this.bird()] || SKINS["🐔"];
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
      Art.shadow(ctx, x, yBase+s*0.40, s*0.44*(1+arc*0.15), s*0.19, 0.85 - arc*0.25);
    }
    if (!drown){
      ctx.save(); ctx.globalAlpha = 0.20;
      Art.blob(ctx, x, yBase+s*0.10, s*1.15, s*0.78, "rgba(255,246,200,1)");
      ctx.restore();
    }
    // Invulnerable after a revive. The old version strobed the bird itself,
    // which hid her at the exact moment she most needed to see where she was;
    // a soft ring around her reads better and never takes her off the screen.
    if (this.invince>0){
      const p = (this.elapsed*3*Art.motion)%1;
      ctx.save();
      ctx.globalAlpha = 0.5*(1-p);
      ctx.strokeStyle="#fff3b0"; ctx.lineWidth=Math.max(2,s*0.09);
      ctx.beginPath(); ctx.ellipse(x, yBase+s*0.18, s*(0.5+p*0.75), s*(0.24+p*0.34), 0, 0, 7); ctx.stroke();
      ctx.restore();
    }
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
    Art.bird(ctx, s, sk, { dead:this.dead, idle:this.elapsed-this._movedAt });
    ctx.restore();
    // ripples last, so they spread across the surface the bird went under
    if (drown) this.drawRipples(x, yBase, t);
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
  render() {
    const ctx=this.ctx, TILE=this.TILE;
    // Which world's art to use. params.wi is presentation-only data the
    // simulation never reads; endless mode carries one too.
    this.wi = (this.params && this.params.wi) || 0;
    this.night = !!Art.pal(this.wi).night;
    Art.ensure(this.wi, this.theme, this.W, TILE, this.DPR);

    ctx.save();
    if (this.shake>0 && Art.motion){ const s=this.shake*10; ctx.translate((Math.random()-0.5)*s,(Math.random()-0.5)*s); }
    ctx.clearRect(-20,-20,this.W+40,this.H+40);
    ctx.fillStyle=this.theme.bg; ctx.fillRect(-20,-20,this.W+40,this.H+40);

    const lo=Math.floor(this.camRow-(this.H*(1-this.BASE_Y))/TILE)-2;
    const hi=Math.ceil(this.camRow+(this.H*this.BASE_Y)/TILE)+2;
    for (let r=hi;r>=lo;r--){ if (r>this.maxGen) this.ensureRows(r);
      this.drawLane(r, this.world[r]); }
    this.drawPuffs(false);
    this.drawChick();
    this.drawPuffs(true);

    // Cloud shadow over the ground and motes in the air. Both are the only
    // depth a camera that just scrolls can buy, and both are drawn over the
    // lanes but under the edge darkening so they read as being in the world.
    Art.cloudShadow(ctx, this.W, this.H, this.elapsed);
    Art.motes(ctx, this.W, this.H, this.elapsed, this.wi);

    // darken the world beyond the playfield edges (Crossy-Road style). This is
    // a surround vignette, never over the playfield -- shading the ground the
    // player reads cars against is the one place it must not go.
    if (this.X0 > 2) {
      const g1=ctx.createLinearGradient(0,0,this.X0,0);
      g1.addColorStop(0,"rgba(0,0,0,0.35)"); g1.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g1; ctx.fillRect(0,-20,this.X0,this.H+40);
      const g2=ctx.createLinearGradient(this.W,0,this.W-this.X0,0);
      g2.addColorStop(0,"rgba(0,0,0,0.35)"); g2.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g2; ctx.fillRect(this.W-this.X0,-20,this.X0,this.H+40);
    }
    this.drawDanger();
    ctx.restore();
    // Win confetti sits in screen space, outside the shake transform, so the
    // celebration doesn't judder along with the world.
    GK.Fx.render(ctx);
    this.drawDebug(ctx);
  },

  drawLane(row, lane) {
    const ctx=this.ctx, T=this.TILE, W=this.W;
    const [,cy]=this.screen(0,row), top=cy-T/2;
    // Rows behind the start line: the same water the game uses, darkened, so
    // the world has an EDGE rather than a colour change -- and it still moves,
    // because a dead flat slab is the one thing that reads as unfinished.
    if (row<0 || !lane){
      Art.ground(ctx, "water", row, top, W, T);
      ctx.fillStyle="rgba(0,10,30,0.34)"; ctx.fillRect(0,top,W,T+2);
      Art.waterShimmer(ctx,W,top,T,this.elapsed,-T*0.5,row);
      return;
    }

    Art.ground(ctx, lane.type, row, top, W, T);

    if (lane.type==="grass") {
      // Planting beyond the playfield, drawn with the same painter as the real
      // obstacles: the boundary should read as the world carrying on, not as a
      // second biome starting.
      const ext = Math.ceil(this.X0/T);
      for (let i=1;i<=ext;i++) for (const col of [-i, COLS-1+i]) {
        const h = hash2(row,col);
        if (h < 0.55) { const [x,y]=this.screen(col,row); Art.obstacle(ctx,x,y,T,this.wi,h<0.12,row*97+col); }
      }
      for (const col of lane.trees){
        const [x,y]=this.screen(col,row);
        Art.obstacle(ctx,x,y,T,this.wi,(col*7+row)%3===0,row*97+col);
      }
    } else if (lane.type==="road") {
      for (const car of lane.cars){
        const [x,y]=this.screen(car.x,row);
        Art.car(ctx,x,y,T,car.width*T*0.9,car.kind,lane.color,lane.dir,this.night);
      }
    } else if (lane.type==="water") {
      Art.waterShimmer(ctx,W,top,T,this.elapsed,lane.dir*lane.speed*T,row);
      for (const lg of lane.logs){
        let [x,y]=this.screen(lg.x,row); y += this.waterBob(row);
        Art.log(ctx,x,y,T,lg.len,lane.dir);
      }
    } else if (lane.type==="rail") {
      this.drawRail(lane,row,top);
    }
    if (lane.coin && !lane.coin.taken) this.drawCoin(lane.coin, row);
  },

  // Whole water lanes bob in phase so logs and their rider move as one unit.
  waterBob(row) { return Math.sin(this.elapsed*2.2*Art.motion + row*1.7) * this.TILE*0.03; },

  drawRail(lane,row,top) {
    const ctx=this.ctx, T=this.TILE;
    // the ballast, sleepers and rails are baked; only the crossing moves
    if (lane.phase==="train"){
      const [x,y]=this.screen(lane.train.x,row);
      // The hitbox is |train.x - col| < 3, i.e. exactly six tiles centred on
      // train.x. The engine and two carriages are laid out inside that span so
      // what you can see is what can hit you.
      const dir = lane.dir>=0 ? 1 : -1;
      const front = x + dir*3*T;
      let cursor = front;
      [[2.2,true],[1.7,false],[1.7,false]].forEach(([w,lead])=>{
        const cw = w*T;
        Art.carriage(ctx, cursor - dir*cw/2, y, T, cw, dir, lead);
        cursor -= dir*(cw + T*0.15);
      });
    }
    // Warning lights + gates. blink*3 => the lamp lights ~1.5 times/sec, safely
    // under the 3 Hz photosensitivity ceiling (was blink*6). Reduced-motion
    // players get a steady lamp -- the bell/horn still cue the crossing.
    const on = (lane.phase==="warn"||lane.phase==="train");
    const blink = !Art.motion || Math.floor(lane.blink*3)%2===0;
    [-1,1].forEach(side=>{
      const gx = side<0 ? this.X0+T*0.5 : this.X0+COLS*T-T*0.5;
      Art.railGate(ctx, gx, top+T*0.5, T, lane.gate, blink, on);
      // the arm, hinged at the post and swinging down across the track
      const a = lane.gate*(Math.PI/2);
      ctx.save(); ctx.translate(gx, top+T*0.5);
      ctx.rotate(side<0 ? a : -a);
      const len = T*1.6, seg = len/5;
      ctx.fillStyle="rgba(0,0,0,0.25)";
      rr(ctx, (side<0?0:-len)+1.5, -T*0.045+2, len, T*0.09, T*0.03); ctx.fill();
      for (let i=0;i<5;i++){
        const sx = side<0 ? i*seg : -(i+1)*seg;
        ctx.fillStyle = i%2===0 ? "#e23b3b" : "#f4f6f7";
        rr(ctx, sx, -T*0.045, seg, T*0.09, T*0.02); ctx.fill();
      }
      ctx.restore();
    });
  },

  drawCoin(coin,row) {
    const ctx=this.ctx, T=this.TILE, [x,y0]=this.screen(coin.col,row);
    const bob=Math.sin(this.elapsed*4*Art.motion+coin.bob)*3, y=y0+bob;
    Art.shadow(ctx, x, y0+T*0.28, T*0.15, T*0.07, 0.7);
    ctx.save(); ctx.globalAlpha=0.5;
    Art.blob(ctx, x, y, T*0.34, T*0.34, "rgba(255,215,90,1)");
    ctx.restore();
    Art.coin(ctx, x, y, T, this.elapsed*2.2*Art.motion + coin.bob);
  },

  /* ------------------------------------------------------------- juice */
  // Three things in this game used to happen in total silence, visually: a hop
  // landing, a coin being taken, and the camera creeping up behind you. The
  // last one is the worst of the three, because being caught by the camera is
  // the only death in the game the player gets no warning about at all.
  //
  // None of this is in the engine. Every one is DERIVED here from state the
  // simulation already maintains -- hop crossing 1, runCoins going up,
  // camBottomRow() against the chick's row -- so there is no new field to
  // reset between levels, nothing for the bots to see, and no way for a
  // presentation bug to move a bird.

  _puffs: [],
  _prevHop: 1,
  _prevCoins: 0,
  _danger: 0,

  juice(dt) {
    const c = this.chick;
    if (!c) return;

    // a hop that just finished -> dust where the feet landed
    if (this._prevHop < 1 && c.hop >= 1 && !this.dead) {
      const lane = this.world[c.row];
      this.puff(c.col, c.row, lane && lane.type);
    }
    this._prevHop = c.hop;

    // the counter went up -> a ghost of the coin, rising and fading. Taking a
    // coin always happens on the chick's own tile, so that is where it goes.
    if (this.runCoins > this._prevCoins) this.puff(c.col, c.row, "coin");
    this._prevCoins = this.runCoins;

    // How close the camera is to taking us: 0 while there is room, 1 at the
    // edge. A read, not a rule -- camBottomRow() is the same function the
    // engine kills on.
    const margin = c.row - this.camBottomRow();
    const want = this.dead ? 0 : Math.max(0, Math.min(1, (2.2 - margin) / 2.2));
    this._danger += (want - this._danger) * Math.min(1, dt * 6);

    for (let i = this._puffs.length - 1; i >= 0; i--) {
      const p = this._puffs[i];
      p.t += dt;
      if (p.t >= p.life) this._puffs.splice(i, 1);
    }
  },

  // Capped, so a long run cannot grow this list without bound.
  puff(col, row, kind) {
    if (!Art.motion) return;
    if (this._puffs.length > 14) this._puffs.shift();
    this._puffs.push({ col, row, kind, t: 0, life: kind === "coin" ? 0.5 : 0.36,
                       seed: Math.random() });
  },

  drawPuffs(coin) {
    const ctx = this.ctx, T = this.TILE;
    for (const p of this._puffs) {
      if ((p.kind === "coin") !== !!coin) continue;
      const k = p.t / p.life, [x, y] = this.screen(p.col, p.row);
      ctx.save();
      if (p.kind === "coin") {
        // A GHOST of the thing you just took, redrawn with the same painter,
        // swelling and fading. A generic sparkle would not be recognisably the
        // coin that was there a moment ago.
        ctx.globalAlpha = 1 - k;
        Art.coin(ctx, x, y - T * (0.18 + k * 0.34), T * (1 + k * 0.7), 0);
        ctx.globalAlpha = 0.5 * (1 - k);
        ctx.strokeStyle = "#ffe58a"; ctx.lineWidth = Math.max(1.5, T * 0.035 * (1 - k));
        ctx.beginPath(); ctx.ellipse(x, y, T * (0.16 + k * 0.5), T * (0.07 + k * 0.22), 0, 0, 7); ctx.stroke();
      } else {
        // Dust kicked out sideways from the feet, in the colour of whatever was
        // landed on -- tarmac grit, river spray, snow.
        const tint = p.kind === "water" ? "rgba(230,248,255,1)"
                   : p.kind === "road" || p.kind === "rail" ? "rgba(210,210,214,1)"
                   : "rgba(255,250,225,1)";
        ctx.globalAlpha = 0.42 * (1 - k);
        for (let i = 0; i < 3; i++) {
          const dir = i === 0 ? 0 : i === 1 ? -1 : 1;
          Art.blob(ctx, x + dir * T * (0.10 + k * 0.28), y + T * (0.26 - k * 0.10),
                   T * (0.10 + k * 0.16), T * (0.05 + k * 0.07), tint);
        }
      }
      ctx.restore();
    }
  },

  // The camera closing in. A warm band creeping up from the bottom edge, over
  // ground the player has already crossed and under nothing they need to read.
  // It pulses faster as it gets worse, which is the part a five-year-old
  // notices before they can read anything else on the screen.
  drawDanger() {
    if (this._danger < 0.02) return;
    const ctx = this.ctx, d = this._danger;
    const pulse = Art.motion ? 0.72 + 0.28 * Math.sin(this.elapsed * (5 + d * 7)) : 1;
    const band = this.H * 0.30;
    const g = ctx.createLinearGradient(0, this.H, 0, this.H - band);
    g.addColorStop(0, "rgba(214,62,48," + (0.46 * d * pulse).toFixed(3) + ")");
    g.addColorStop(1, "rgba(214,62,48,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, this.H - band, this.W, band);
  },

});
