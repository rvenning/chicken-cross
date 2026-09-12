// The app shell: screens, profiles, the level map and the modals.
"use strict";

// Profiles, PINs, delete flow and the leaderboard renderer all come from
// gamekit (GK.Profiles); App keeps only what is Chicken-Cross-specific.
const AVATARS = ["🐔","🐤","🦆","🐧","🦉","🦩","🐓","🦜","🐥","🦚","🦢","🕊️"];

const App = {
  profile:null, screen:"splash",
  el(id){ return document.getElementById(id); },

  init() {
    Sfx.enabled = Storage.getSettings().sound;
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
      meta: (p, g) => `🏁 best ${g.best} · 🪙 ${g.coins} · 🗺️ ${levelsDone(g)}/${LEVELS.length}`,
      onEnter: (p) => { this.profile = p; this.showMap(); },
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
      .action("endless", () => this.startEndless());
    Game.boot();
    this.el("lb-back").onclick = () => this.showScreen(this.profile?"map":"splash");
    this.refreshSplash();
    // Firestore sync runs in the background; the game is playable immediately.
    Storage.initFirebase().then(ok => {
      this.el("sync-badge").textContent = ok ? "☁️ synced" : "📴 offline";
      // refresh whatever the player is looking at with the merged data
      if (ok && this.screen === "profiles") GK.Profiles.renderList();
      if (ok && this.screen === "splash") this.refreshSplash();
    });
  },

  showScreen(name) { GK.UI.showScreen(name); },

  // One-tap "Continue as <last player>" on the splash; Play becomes Switch.
  // The hero bird. Same painter as the game, at a size the canvas picks, so a
  // new skin shows up here the moment it exists.
  drawHero() {
    const c = this.el("hero");
    if (!c || !c.getContext) return;
    const g = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 264, h = 244;
    if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const last = GK.Profiles.lastProfile();
    const sk = SKINS[(this.profile && this.profile.avatar) || (last && last.avatar)] || SKINS["🐔"];
    g.save(); g.translate(w / 2, h * 0.84);
    g.globalAlpha = 0.30;
    Art.blob(g, 0, 8, 62, 17, "rgba(20,40,60,1)");
    g.globalAlpha = 1;
    Art.bird(g, 112, sk, { dead: false, idle: 3 });   // idle: the flamingo tucks
    g.restore();
  },

  refreshSplash() {
    this.drawHero();
    const last = GK.Profiles.lastProfile();
    const cont = this.el("btn-continue-as"), play = this.el("btn-play");
    if (last) {
      cont.style.display = "";
      cont.textContent = `▶ Continue as ${last.avatar} ${last.name}`;
      cont.onclick = () => { Sfx.init(); GK.Profiles.select(last); };
      play.className = "btn blue wide"; play.textContent = "👥 Switch Player";
    } else {
      cont.style.display = "none";
      play.className = "btn green wide"; play.textContent = "▶ Play";
    }
  },

  play() { Sfx.init(); Sfx.click(); GK.Profiles.renderList(); this.showScreen("profiles"); },

  /* ----- map ----- */
  showMap() {
    if (!this.profile) return this.play();
    const g=Storage.getProgress(this.profile.id), unlocked=unlockedLevel(g);
    this.el("map-player").innerHTML=`${this.profile.avatar} ${esc(this.profile.name)}
      <span class="pmeta">🪙 ${g.coins} · 🏁 ${g.best}</span>`;
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
    this.showScreen("map");
  },

  startLevel(gi) {
    const lv=LEVELS[gi];
    Game.begin({ mode:"level", level:lv, target:lv.target, params:lv.params });
  },
  startEndless() {
    Sfx.click();
    // hardest params for a proper endless challenge
    const params={ weights:{ grass:0.32, road:0.40, water:0.16, rail:0.12 },
      theme:WORLDS[4].theme, wi:4, carMin:2.0, carMax:4.2, truckChance:0.3, creep:0.6, coinRate:0.4, railFast:15 };
    Game.begin({ mode:"endless", params, target:0 });
  },

  /* ----- result modal ----- */
  showResult(res) {
    const sheet=this.el("result-sheet");
    if (res.type==="win") {
      const next = Game.level.gi+1;
      const hasNext = next<LEVELS.length;
      sheet.innerHTML=`<h2>${Game.level.world.emoji} Level Complete!</h2>
        <div class="stars">${[0,1,2].map(i=>`<span>${i<res.stars?"★":"☆"}</span>`).join("")}</div>
        <p>🪙 ${res.coins} coins collected</p>
        <div class="row-btns2">
          <button class="btn grey" id="r-map">🗺️ Map</button>
          <button class="btn blue" id="r-retry">↻ Retry</button>
          ${hasNext?`<button class="btn green" id="r-next">Next ▶</button>`:``}
        </div>`;
      this.openModal("result-modal");
      this.el("r-map").onclick=()=>{ Sfx.click(); Game.exitToMap(); };
      this.el("r-retry").onclick=()=>{ Sfx.click(); this.startLevel(Game.level.gi); };
      if (hasNext) this.el("r-next").onclick=()=>{ Sfx.click(); this.startLevel(next); };
    } else {
      const reason = { car:"🚗 Squashed!", train:"🚂 Flattened by a train!", water:"💦 Splash!", fell:"🌀 Swept away!" }[res.reason]||"Game Over";
      const g=Storage.getProgress(this.profile.id);
      const canRevive = Game.mode!=="level" ? g.coins>=REVIVE_COST : g.coins>=REVIVE_COST;
      sheet.innerHTML=`<h2>${reason}</h2>
        <div class="bigscore">${res.dist} m</div>
        <p>🏁 Best: ${g.best} m · 🪙 ${res.coins} this run</p>
        <div class="row-btns2">
          <button class="btn grey" id="r-map">🗺️ Map</button>
          <button class="btn blue" id="r-retry">↻ Retry</button>
        </div>
        ${canRevive?`<button class="btn green wide" id="r-revive" style="margin-top:10px">💛 Continue for 🪙${REVIVE_COST}</button>`:``}`;
      this.openModal("result-modal");
      this.el("r-map").onclick=()=>{ Sfx.click(); Game.exitToMap(); };
      this.el("r-retry").onclick=()=>{ Sfx.click();
        if (Game.mode==="level") this.startLevel(Game.level.gi); else this.startEndless(); };
      if (canRevive) this.el("r-revive").onclick=()=>{ Sfx.click(); if(!Game.revive()) this.toast("Not enough coins"); };
    }
  },

  /* ----- leaderboard ----- */
  showLeaderboard() {
    Sfx.init(); Sfx.click();
    GK.Profiles.renderLeaderboard("lb-rows", {
      cols: r => `<span class="lb-stat">🗺️ ${levelsDone(r.progress)}</span>
        <span class="lb-stat">🏁 ${r.progress.best||0}m · 🪙 ${r.progress.coins||0}</span>`,
      sort: (a,b) => (b.progress.best||0)-(a.progress.best||0) || levelsDone(b.progress)-levelsDone(a.progress),
      meId: this.profile?.id,
      empty: "No players yet — tap Play to begin!",
    });
    this.showScreen("leaderboard");
  },

  /* ----- misc ----- */
  openModal(id){ GK.UI.openModal(id); },
  closeModal(id){ GK.UI.closeModal(id); },
  toast(msg){ GK.UI.toast(msg); },
};

// expose for inline handlers (and for the headless balance bot in tests/)
window.App=App; window.Game=Game; window.LEVELS=LEVELS;
window.addEventListener("DOMContentLoaded", ()=>App.init());
