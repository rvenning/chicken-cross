// The app shell: screens, profiles, home, the worlds map and the modals.
"use strict";

// Profiles, PINs, delete flow and the leaderboard renderer all come from
// gamekit (GK.Profiles); App keeps only what is Chicken-Cross-specific.
const AVATARS = ["🐔","🐤","🦆","🐧","🦉","🦩","🐓","🦜","🐥","🦚","🦢","🕊️"];

const App = {
  profile:null, screen:"splash", lastMode:"endless",
  el(id){ return document.getElementById(id); },

  init() {
    Sfx.enabled = Storage.getSettings().sound;
    GK.Fx.configure({ font: "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif" });
    GK.UI.onScreenChange = (name) => {
      this.screen = name;
      Game.active = (name === "game");
      if (name === "splash") this.refreshSplash();
    };
    GK.UI.bindSoundToggle(Storage);
    // Every menu button clicks; buttons that make their own sound keep it.
    GK.UI.bindMenuClicks();
    GK.Profiles.init({
      storage: Storage,
      avatars: AVATARS,
      meta: (p, g) => `🏁 best ${g.best} · 🪙 ${g.coins} · 🐣 ${Collection.count(g)}/${Roster.list.length}`,
      onEnter: (p) => this.enter(p),
      addLabel: "New Player",
    });
    GK.initPWA({ appName: "Chicken Cross" });
    // ?debug=1 only. Passing Storage makes the kit suppress progress writes,
    // so jumping levels or turning on invincibility can't pollute a real
    // profile or the family leaderboard.
    GK.Debug.init({ storage: Storage, title: "CHICKEN CROSS" })
      .toggle("hitboxes", "hitboxes")
      .toggle("lanes", "lanes")
      .toggle("invincible", "invincible")
      .jump("level", LEVELS.length, n => this.startLevel(n - 1))
      .action("endless", () => this.startEndless())
      .action("+500 coins", () => { if (this.profile) { const g = this.prog(); Collection.earn(g, 500); this.save(g); this.showHome(); } });
    Game.boot();
    // Before a player is picked, show the look their last session used.
    const lastP = GK.Profiles.lastProfile();
    if (lastP) this.applyPrefs(Storage.getProgress(lastP.id));
    else { this.applyLook(this.deviceLook()); this.applyView(undefined); }
    this.el("lb-back").onclick = () => this.showScreen(this.profile?"map":"splash");
    this.el("home-hero").onclick = () => this.helloHero();
    this.bindRetry();
    Coll.init();
    this.refreshSplash();
    // Firestore sync runs in the background; the game is playable immediately.
    Storage.initFirebase().then(ok => {
      this.el("sync-badge").textContent = ok ? "☁️ synced" : "📴 offline";
      // refresh whatever the player is looking at with the merged data
      if (ok && this.screen === "profiles") GK.Profiles.renderList();
      // a synced player may have picked a different look on another device
      const p = this.profile || GK.Profiles.lastProfile();
      if (ok && p) this.applyPrefs(Storage.getProgress(p.id));
      if (ok && this.screen === "splash") this.refreshSplash();
      if (ok && this.screen === "map") this.showHome();
    });
  },

  showScreen(name) { GK.UI.showScreen(name); },
  prog() { return Storage.getProgress(this.profile.id); },
  save(g) { Storage.saveProgress(this.profile.id, g); },

  // A player has been picked (and passed their PIN, if they have one).
  enter(p) {
    this.profile = p;
    const g = this.prog();
    this.applyPrefs(g);
    // Anything already earned before the collection existed -- a finished
    // world, a long-standing best -- unlocks the moment she arrives.
    const got = Collection.checkAchievements(g);
    if (got.length) { this.save(g); this.toast(`🎉 ${got.length} new character${got.length > 1 ? "s" : ""} unlocked!`); }
    const go = this.pendingStart; this.pendingStart = null;
    if (go === "endless") this.startEndless();
    else this.showHome();
  },

  /* ----- splash ----- */
  // The hero bird. Same painter as the game, at a size the canvas picks, so a
  // new character shows up here the moment it exists.
  drawHero() {
    const p = this.profile || GK.Profiles.lastProfile();
    const ch = p ? Roster.get(Storage.getProgress(p.id).char) : Roster.get("hen");
    this.paintChar(this.el("hero"), ch, { w: 264, h: 244, size: 112, shadow: true });
  },

  // Paint one character on a canvas at a given CSS size. Used by the splash,
  // the home screen and every card in the collection.
  paintChar(c, ch, o) {
    if (!c || !c.getContext) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = o.w, h = o.h;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.save(); g.translate(w / 2, h * (o.base || 0.84));
    if (o.shadow) { g.globalAlpha = 0.30; Art.blob(g, 0, o.size * 0.07, o.size * 0.55, o.size * 0.15, "rgba(20,40,60,1)"); g.globalAlpha = 1; }
    if (o.hop) { const k = o.hop; g.translate(0, -Math.sin(Math.PI * k) * o.size * 0.3); }
    Art.character(g, o.size, ch, { dead: false, idle: o.idle === undefined ? 3 : o.idle });
    g.restore();
    if (o.silhouette) {
      g.save(); g.globalCompositeOperation = "source-in";
      g.fillStyle = o.silhouette; g.fillRect(0, 0, w, h); g.restore();
    }
  },

  refreshSplash() {
    this.drawHero();
    const last = GK.Profiles.lastProfile();
    const hop = this.el("btn-hop"), more = this.el("splash-more"), play = this.el("btn-play");
    if (last) {
      hop.style.display = ""; more.style.display = ""; play.style.display = "none";
      hop.innerHTML = `▶ Hop In<small>as ${esc(last.avatar)} ${esc(last.name)}</small>`;
      hop.onclick = () => { Sfx.init(); this.pendingStart = "endless"; GK.Profiles.select(last); };
      this.el("btn-continue-as").onclick = () => { Sfx.init(); Sfx.click(); GK.Profiles.select(last); };
    } else {
      hop.style.display = "none"; more.style.display = "none"; play.style.display = "";
    }
  },

  play() { Sfx.init(); Sfx.click(); GK.Profiles.renderList(); this.showScreen("profiles"); },

  /* ----- home ----- */
  showHome() {
    if (!this.profile) return this.play();
    const g = this.prog(), ch = Roster.get(g.char);
    this.el("map-player").innerHTML = `${esc(this.profile.avatar)} ${esc(this.profile.name)}`;
    this.paintChar(this.el("home-canvas"), ch, { w: 180, h: 150, size: 70, shadow: true, base: 0.8 });
    this.el("home-name").innerHTML = `${esc(ch.name)} <span>change ›</span>`;
    this.el("home-stats").innerHTML =
      `<span>🏁 <b>${g.best || 0}</b> best</span><span>🪙 <b>${g.coins || 0}</b></span>`;
    this.el("home-worlds").textContent = `${levelsDone(g)}/${LEVELS.length} levels`;
    this.el("home-chars").textContent = `${Collection.count(g)}/${Roster.list.length}`;
    const can = (g.coins || 0) >= PRIZE_COST && Collection.prizePool(g).length;
    const btn = this.el("btn-prize");
    btn.innerHTML = can ? `🎰 Prize Machine <b>— you can win one!</b>` : `🎰 Prize Machine · 🪙${PRIZE_COST}`;
    btn.classList.toggle("ready", !!can);
    this.showScreen("map");
  },
  // The old name, still called by the game when a run is abandoned.
  showMap() { if (this.lastMode === "level") this.showWorlds(); else this.showHome(); },

  // Tap your character to say hello: a hop and its call. (Ten in a row is a
  // secret.)
  helloHero() {
    if (!this.profile) return;
    Sfx.init();
    const g = this.prog(), ch = Roster.get(g.char);
    Sfx.call(ch.voice || (PLANS[ch.plan] && PLANS[ch.plan].voice));
    const c = this.el("home-canvas"), t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 320);
      this.paintChar(c, ch, { w: 180, h: 150, size: 70, shadow: true, base: 0.8, hop: Art.motion ? k : 0 });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    this.unlocked(Collection.trigger(g, "heroTaps"), g);
  },

  /* ----- worlds ----- */
  showWorlds() {
    if (!this.profile) return this.play();
    const g=this.prog(), unlocked=unlockedLevel(g);
    const wrap=this.el("world-list"); wrap.innerHTML="";
    WORLDS.forEach((world,wi)=>{
      const start=wi*LEVELS_PER_WORLD;
      const done=LEVELS.slice(start,start+LEVELS_PER_WORLD).filter(l=>g.levels[l.gi]).length;
      const wUnlocked = start<=unlocked;
      const card=document.createElement("div"); card.className="world-card"+(wUnlocked?"":" locked");
      card.style.setProperty("--wa", world.accent);
      card.style.setProperty("--wb", world.theme.bg);
      const dots=[];
      for (let j=0;j<LEVELS_PER_WORLD;j++){ const gi=start+j; const lv=LEVELS[gi];
        const rec=g.levels[gi];
        const cls = rec?"done":(gi===unlocked?"next":(gi<unlocked?"done":"locked"));
        const label = rec ? "★".repeat(rec.stars) : (gi<=unlocked?"▶":"🔒");
        // debug unlocks every dot so any level is one click away
        dots.push(`<button class="lvl-dot ${cls}" data-gi="${gi}" ${(gi>unlocked && !GK.Debug.on)?"disabled":""}>${label}<small>${lv.target}m</small></button>`);
      }
      card.innerHTML=`<div class="world-head"><span class="world-emoji">${world.emoji}</span>
        <div><div class="world-name">${world.name}</div>
        <div class="world-tag">${wUnlocked?"Reach the far side!":"Finish earlier worlds to unlock"}</div></div>
        <span class="world-count">${done}/${LEVELS_PER_WORLD}</span></div>
        <div class="dots">${dots.join("")}</div>`;
      wrap.appendChild(card);
    });
    wrap.querySelectorAll(".lvl-dot:not([disabled])").forEach(b=>{
      b.onclick=()=>{ Sfx.click(); this.startLevel(+b.dataset.gi); };
    });
    this.showScreen("worlds");
  },

  /* ----- starting a run ----- */
  // The character's voice and theme ride along with every run. Presentation
  // only: neither is read by the simulation.
  dressGame() {
    const ch = Roster.get(this.prog().char);
    Sfx.voice = ch.voice || (PLANS[ch.plan] && PLANS[ch.plan].voice) || "peep";
    Game.themeFx = (ch.theme && THEMES[ch.theme]) || null;
  },
  startLevel(gi) {
    const lv=LEVELS[gi];
    this.lastMode = "level"; this.dressGame(); this.runSerial = (this.runSerial||0) + 1;
    Game.begin({ mode:"level", level:lv, target:lv.target, params:lv.params });
  },
  startEndless() {
    Sfx.init(); Sfx.click();
    this.lastMode = "endless"; this.dressGame(); this.runSerial = (this.runSerial||0) + 1;
    // Endless builds its own lanes in themed chunks (Game.planChunk) and ramps
    // its own difficulty with distance, so only the coin rate, the fallback
    // train speed and the opening world's art are read from here.
    const params={ weights:WORLDS[0].w, theme:WORLDS[0].theme, wi:0,
      carMin:1.5, carMax:4.9, truckChance:0.3, creep:0, coinRate:0.42, railFast:15 };
    Game.begin({ mode:"endless", params, target:0 });
  },
  again() {
    if (this.screen !== "game" || !Game.result) return;
    Sfx.click();
    if (Game.mode === "level") this.startLevel(Game.level.gi); else this.startEndless();
  },

  // Quick retry. Once the result card is up, a tap anywhere that is not a
  // button, or Space / Enter / Up, goes straight into the next run. A short
  // guard stops the frantic tap that caused the death from also skipping the
  // card before the score has been seen.
  bindRetry() {
    const ready = () => this.screen === "game" && Game.result && Game.result.type === "lose" &&
      this.el("result-modal").classList.contains("visible") && performance.now() - this.resultAt > 350;
    window.addEventListener("keydown", (e) => {
      if (!ready()) return;
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); this.again(); }
    });
    this.el("result-modal").addEventListener("click", (e) => {
      if (!ready() || e.target.closest("button")) return;
      this.again();
    });
  },

  /* ----- settings: view + look, saved per player ----- */
  // Both live in the player's progress, so they follow her to other devices.
  // A player who has never chosen a view gets 3D wherever WebGL works.
  applyPrefs(g) { this.applyLook(g.look); this.applyView(g.view); },
  defaultView() { return R3.webgl() ? "3d" : "2d"; },
  applyView(view) {
    const chosen = view === "3d" || view === "2d";
    Game.setView(chosen ? view : this.defaultView(), !chosen);
  },
  deviceLook() {
    try { return localStorage.getItem("cc_look") || "new"; } catch (e) { return "new"; }
  },
  applyLook(look) {
    look = look === "classic" ? "classic" : "new";
    Game.setLook(look);
    this.el("css-new").disabled = look === "classic";
    this.el("css-classic").disabled = look !== "classic";
    try { localStorage.setItem("cc_look", look); } catch (e) {}
    this.drawHero();
  },
  openSettings() {
    if (!this.profile) return;
    Sfx.click();
    this.renderSettings();
    this.openModal("settings-modal");
  },
  closeSettings() { Sfx.click(); this.closeModal("settings-modal"); },
  saveSetting(key, val) {
    const g = this.prog();
    g[key] = val;
    let got = [];
    if (key === "view") got = Collection.trigger(g, "viewFlip");
    this.save(g);
    if (key === "look") this.applyLook(val);
    if (key === "view") this.applyView(val);
    Sfx.click();
    this.renderSettings();
    this.unlocked(got, g);
  },
  renderSettings() {
    const g = this.prog();
    const look = g.look === "classic" ? "classic" : "new";
    const view = Game.view;
    document.querySelectorAll("#settings-modal [data-view]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.view === view));
      b.onclick = () => { if (b.dataset.view !== view) this.saveSetting("view", b.dataset.view); };
    });
    // In 3D the look only styles the menus; say so rather than let it seem broken.
    this.el("look-note").style.display = view === "3d" ? "" : "none";
    document.querySelectorAll("#settings-modal [data-look]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.look === look));
      b.onclick = () => { if (b.dataset.look !== look) this.saveSetting("look", b.dataset.look); };
    });
  },

  /* ----- the end of a run ----- */
  // Fold the run into the save: lifetime stats, secrets, events and
  // achievements. A revive continues the same run, so a second ending only
  // adds what happened since the first.
  recordRun(res) {
    const g = this.prog(), s = Game.runStats, first = this._recSerial !== this.runSerial;
    const prev = first ? { fwd: 0, near: 0, logs: 0, rails: 0 } : this._recPrev;
    this._recSerial = this.runSerial;
    this._recPrev = { fwd: s.fwd, near: s.near, logs: s.logs, rails: s.rails };
    const delta = Object.assign({}, s, { fwd: s.fwd - prev.fwd, near: s.near - prev.near,
                                         logs: s.logs - prev.logs, rails: s.rails - prev.rails });
    const got = Collection.recordRun(g, {
      mode: Game.mode, maxRow: Game.chick.maxRow, coins: Game.runCoins, reason: res.reason,
      won: res.type === "win", elapsed: Game.elapsed, charId: g.char, stats: s, delta, first,
      newBest: Game.mode === "endless" && Game.chick.maxRow > Game.startBest,
    });
    this.save(g);
    Game.progress = g;
    return got;
  },

  showResult(res) {
    const sheet=this.el("result-sheet");
    const got = this.recordRun(res);
    const g=this.prog();
    const unlock = got.length ? `<button class="unlock-strip" id="r-unlock">${got.slice(0,3).map(id =>
      `<canvas data-id="${id}"></canvas>`).join("")}<span>🎉 <b>${got.length === 1 ? esc(Roster.get(got[0]).name) : got.length + " characters"}</b> unlocked!</span></button>` : "";
    if (res.type==="win") {
      const next = Game.level.gi+1;
      const hasNext = next<LEVELS.length;
      sheet.innerHTML=`<h2>${Game.level.world.emoji} Level Complete!</h2>
        <div class="stars">${[0,1,2].map(i=>`<span>${i<res.stars?"★":"☆"}</span>`).join("")}</div>
        <p>🪙 ${res.coins} coins collected</p>
        ${unlock}
        <div class="row-btns2">
          <button class="btn grey" id="r-map">🗺️ Worlds</button>
          <button class="btn blue" id="r-retry">↻ Retry</button>
          ${hasNext?`<button class="btn green" id="r-next">Next ▶</button>`:``}
        </div>`;
      this.openModal("result-modal");
      this.el("r-map").onclick=()=>{ Sfx.click(); Game.exitToMap(); };
      this.el("r-retry").onclick=()=>{ Sfx.click(); this.startLevel(Game.level.gi); };
      if (hasNext) this.el("r-next").onclick=()=>{ Sfx.click(); this.startLevel(next); };
    } else {
      const reason = { car:"🚗 Squashed!", train:"🚂 Flattened by a train!", water:"💦 Splash!",
                       fell: Game.runStats.blown ? "💨 Blown away!" : "🌀 Swept away!" }[res.reason]||"Game Over";
      const isBest = Game.mode === "endless" && Game.startBest > 0 && res.dist > Game.startBest;
      const canRevive = g.coins>=REVIVE_COST;
      const level = Game.mode === "level";
      sheet.innerHTML=`<p class="res-why">${reason}</p>
        <div class="res-dist">${res.dist}<small>${level ? `of ${Game.target} rows` : "rows"}</small></div>
        ${isBest ? `<div class="res-best new">★ NEW BEST ★</div>` : `<div class="res-best">🏁 Best ${g.best}</div>`}
        <p class="res-coins">🪙 +${res.coins} this run · ${g.coins} saved</p>
        ${unlock}
        <button class="btn green wide res-again" id="r-retry">↻ Again</button>
        <div class="row-btns2">
          <button class="btn grey" id="r-map">${level ? "🗺️ Worlds" : "🏠 Home"}</button>
          ${canRevive?`<button class="btn blue" id="r-revive">💛 Continue 🪙${REVIVE_COST}</button>`:``}
        </div>
        <p class="res-hint">Tap anywhere or press Space to go again</p>`;
      this.openModal("result-modal");
      this.el("r-map").onclick=()=>{ Sfx.click(); Game.exitToMap(); };
      this.el("r-retry").onclick=()=>this.again();
      if (canRevive) this.el("r-revive").onclick=()=>{ Sfx.click(); if(!Game.revive()) this.toast("Not enough coins"); };
      try { this.el("r-retry").focus({ preventScroll: true }); } catch (e) {}
    }
    this.resultAt = performance.now();
    sheet.querySelectorAll(".unlock-strip canvas").forEach(c =>
      this.paintChar(c, Roster.get(c.dataset.id), { w: 44, h: 44, size: 22, base: 0.78 }));
    const u = this.el("r-unlock");
    if (u) u.onclick = () => { Sfx.click(); this.closeModal("result-modal"); Game.exitToMap(); Coll.show(got[0]); };
    if (got.length) Sfx.prize();
  },

  // Tell her about new characters from anywhere in the menus.
  unlocked(ids, g) {
    if (!ids || !ids.length) return;
    this.save(g || this.prog());
    Sfx.prize();
    this.toast(`🎉 ${ids.length === 1 ? Roster.get(ids[0]).name : ids.length + " characters"} unlocked!`);
  },

  /* ----- leaderboard ----- */
  showLeaderboard() {
    Sfx.init(); Sfx.click();
    GK.Profiles.renderLeaderboard("lb-rows", {
      cols: r => `<span class="lb-stat">🗺️ ${levelsDone(r.progress)} · 🐣 ${Collection.count(r.progress)}</span>
        <span class="lb-stat">🏁 ${r.progress.best||0}m · 🪙 ${r.progress.coins||0}</span>`,
      sort: (a,b) => (b.progress.best||0)-(a.progress.best||0) || levelsDone(b.progress)-levelsDone(a.progress),
      meId: this.profile?.id,
      empty: "No players yet — tap Play to begin!",
    });
    this.showScreen("leaderboard");
    if (this.profile) { const g = this.prog(); const got = Collection.trigger(g, "scoreFan"); this.save(g); this.unlocked(got, g); }
  },

  /* ----- the collection (js/collection-ui.js) ----- */
  showCollection() { Coll.show(); },
  openPrize() { Coll.openPrize(); },

  /* ----- misc ----- */
  openModal(id){ GK.UI.openModal(id); },
  closeModal(id){ GK.UI.closeModal(id); },
  toast(msg){ GK.UI.toast(msg); },
};

// expose for inline handlers (and for the headless balance bot in tests/)
window.App=App; window.Game=Game; window.LEVELS=LEVELS;
window.addEventListener("DOMContentLoaded", ()=>App.init());
