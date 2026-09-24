// The character collection screen, a character's card, and the Prize Machine.
//
// 420 characters is a lot to browse on an iPad held by a seven-year-old, so
// the screen leans on three things: collections as sections (with their own
// counters), a search box, and four filters -- all, owned, locked, favourites.
// Cards paint their character lazily, as they scroll into view, so opening
// the screen never paints 420 canvases at once.
"use strict";

// Capsules piled in the dome of the Prize Machine: fixed spots, fixed colours.
const CAPSULES = [[8, 60, 0], [40, 68, 50], [74, 58, 200], [100, 70, 120], [22, 86, 280], [58, 88, 30], [90, 90, 320], [30, 40, 170], [80, 34, 90]]
  .map(([x, y, h]) => `<i style="left:${x}px;top:${y}px;background:hsl(${h} 80% 62%)"></i>`).join("");

const Coll = {
  filter: "all", col: "", query: "",

  init() {
    const sel = App.el("coll-col");
    sel.innerHTML = `<option value="">All collections</option>` +
      Roster.collections.map(c => `<option value="${c.id}">${esc(c.emoji + " " + c.name)}</option>`).join("");
    sel.onchange = () => { this.col = sel.value; this.render(); };
    const q = App.el("coll-search");
    q.oninput = () => {
      this.query = q.value.trim().toLowerCase();
      this.render();
      if (this.query === "egg" && App.profile) { const g = App.prog(); App.unlocked(Collection.trigger(g, "eggSearch"), g); }
    };
    App.el("coll-filter").querySelectorAll("button").forEach(b => {
      b.onclick = () => {
        this.filter = b.dataset.f; Sfx.click();
        App.el("coll-filter").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        this.render();
      };
    });
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver((ents) => {
        for (const e of ents) if (e.isIntersecting) { this.io.unobserve(e.target); this.paintCard(e.target); }
      }, { rootMargin: "200px" });
    }
  },

  show(focusId) {
    if (!App.profile) return App.play();
    Sfx.click();
    App.showScreen("collection");
    this.render();
    if (focusId) this.open(focusId);
  },

  matches(ch, g, own) {
    if (this.col && ch.col !== this.col) return false;
    if (this.filter === "owned" && !own.has(ch.id)) return false;
    if (this.filter === "locked" && own.has(ch.id)) return false;
    if (this.filter === "fav" && !g.fav.includes(ch.id)) return false;
    if (this.query) {
      const secretHidden = !own.has(ch.id) && ch.unlock.type === "secret";
      const hay = (secretHidden ? "" : ch.name + " ") + Roster.colById.get(ch.col).name + " " + (PLANS[ch.plan].label || ch.plan);
      if (!hay.toLowerCase().includes(this.query)) return false;
    }
    return true;
  },

  render() {
    const g = App.prog(), own = new Set(Roster.list.filter(c => Collection.owns(g, c.id)).map(c => c.id));
    const unseen = new Set(g.unseen || []);
    App.el("coll-count").textContent = `${own.size} / ${Roster.list.length}`;
    App.el("coll-coins").textContent = `🪙 ${g.coins || 0}`;
    const wrap = App.el("coll-list");
    if (this.io) this.io.disconnect();
    const parts = [];
    let shown = 0;
    for (const col of Roster.collections) {
      const list = col.ids.map(id => Roster.byId.get(id)).filter(ch => this.matches(ch, g, own));
      if (!list.length) continue;
      shown += list.length;
      const have = col.ids.filter(id => own.has(id)).length;
      parts.push(`<section class="coll-sec"><h3><span>${esc(col.emoji)} ${esc(col.name)}</span>
        <span class="coll-n${have === col.ids.length ? " full" : ""}">${have}/${col.ids.length}</span></h3>
        ${col.blurb ? `<p class="coll-blurb">${esc(col.blurb)}</p>` : ""}<div class="coll-grid">` +
        list.map(ch => {
          const o = own.has(ch.id), hidden = !o && ch.unlock.type === "secret";
          const tag = !o ? (Collection.isPending(g, ch.id) ? "🎁" : ch.unlock.type === "prize" ? "🎰" : ch.unlock.type === "secret" ? "❓" : ch.unlock.type === "season" ? "📅" : "🏅") : "";
          return `<button class="cc-card${o ? "" : " locked"}${ch.id === g.char ? " current" : ""}" data-id="${ch.id}"
            aria-label="${esc(hidden ? "Secret character" : ch.name)}${o ? "" : ", locked"}">
            <canvas></canvas>${unseen.has(ch.id) ? `<i class="cc-new">NEW</i>` : ""}${g.fav.includes(ch.id) ? `<i class="cc-fav">♥</i>` : ""}
            ${tag ? `<i class="cc-how">${tag}</i>` : ""}<span>${esc(hidden ? "???" : ch.name)}</span></button>`;
        }).join("") + `</div></section>`);
    }
    wrap.innerHTML = parts.length ? parts.join("") :
      `<p class="coll-empty">${this.filter === "fav" ? "No favourites yet — open a character and tap ♡." : "Nobody matches that."}</p>`;
    wrap.querySelectorAll(".cc-card").forEach(b => {
      b.onclick = () => this.open(b.dataset.id);
      if (this.io) this.io.observe(b); else this.paintCard(b);
    });
  },

  paintCard(b) {
    const ch = Roster.byId.get(b.dataset.id);
    App.paintChar(b.querySelector("canvas"), ch, { w: 64, h: 64, size: 30, base: 0.8,
      silhouette: b.classList.contains("locked") ? "rgba(28,42,51,0.78)" : null });
  },

  // One character's card: a big picture, where it is from, how to get it,
  // and -- if it is hers -- play as it or make it a favourite.
  open(id) {
    const g = App.prog(), ch = Roster.get(id), own = Collection.owns(g, id);
    const col = Roster.colById.get(ch.col), R = RARITIES.find(r => r.id === ch.rarity);
    const hidden = !own && ch.unlock.type === "secret", fav = g.fav.includes(id);
    if (g.unseen && g.unseen.includes(id)) { g.unseen = g.unseen.filter(x => x !== id); App.save(g); }
    const sheet = App.el("char-sheet");
    sheet.innerHTML = `<canvas class="char-big" aria-hidden="true"></canvas>
      <h2>${esc(hidden ? "Secret character" : ch.name)}</h2>
      <p class="char-meta">${esc(col.emoji + " " + col.name)} · <b style="color:${R.color}">${R.label}</b> · #${ch.n}</p>
      <p class="char-how${own ? " owned" : ""}">${own ? "✓ In your collection" : esc(Collection.hint(ch, g))}</p>
      ${own ? `<div class="row-btns2">
        <button class="btn grey" id="ch-fav" aria-pressed="${fav}">${fav ? "♥ Favourite" : "♡ Favourite"}</button>
        <button class="btn green" id="ch-pick">${id === g.char ? "✓ Playing" : "Play as ▶"}</button></div>` : ""}
      <button class="btn blue wide" id="ch-close">Close</button>`;
    App.openModal("char-modal");
    App.paintChar(sheet.querySelector("canvas"), ch, { w: 180, h: 160, size: 74, base: 0.82, shadow: own,
      silhouette: own ? null : "rgba(28,42,51,0.82)" });
    App.el("ch-close").onclick = () => { Sfx.click(); App.closeModal("char-modal"); };
    if (!own) return;
    Sfx.call(ch.voice || PLANS[ch.plan].voice);
    App.el("ch-fav").onclick = () => {
      const g2 = App.prog();
      g2.fav = g2.fav.includes(id) ? g2.fav.filter(x => x !== id) : g2.fav.concat([id]);
      const got = g2.fav.length >= 10 ? Collection.trigger(g2, "favTen") : [];
      App.save(g2); Sfx.click(); this.open(id); this.render(); App.unlocked(got, g2);
    };
    App.el("ch-pick").onclick = () => this.choose(id);
  },

  choose(id) {
    const g = App.prog();
    g.char = id;
    // keep the old per-bird field in step for the founding twelve, so an
    // older copy of the game on another device still shows the right bird
    const ch = Roster.get(id);
    if (ch.unlock.type === "founding") g.bird = ch.unlock.emoji;
    App.save(g);
    Sfx.call(ch.voice || PLANS[ch.plan].voice);
    App.closeModal("char-modal");
    App.drawHero();
    this.render();
  },

  /* ----------------------------------------------------- the Prize Machine */
  // Coins in, one character out. The odds are printed on the machine: every
  // character it can still give is equally likely, and it never gives one
  // you already have. No timers, no "almost", no paid anything.
  openPrize() {
    if (!App.profile) return;
    Sfx.init(); Sfx.click();
    this.prizeIdle();
    App.openModal("prize-modal");
  },

  prizeIdle(msg) {
    const g = App.prog(), left = Collection.prizePool(g).length, can = (g.coins || 0) >= PRIZE_COST;
    const sheet = App.el("prize-sheet");
    sheet.innerHTML = `<h2>🎰 Prize Machine</h2>
      <div class="machine" id="machine"><div class="dome">${CAPSULES}</div>
        <div class="base"><div class="slot"></div></div><div class="capsule" id="capsule"></div></div>
      <p class="prize-odds">${left ? `${left} characters left to win. Each one is equally likely, and you never get one you already have.` : "You have won every prize there is. Amazing!"}</p>
      <p class="prize-coins">🪙 <b>${g.coins || 0}</b> ${can || !left ? "" : `· ${PRIZE_COST - (g.coins || 0)} more to go`}</p>
      ${msg ? `<p class="prize-msg">${esc(msg)}</p>` : ""}
      <button class="btn green wide pz-go" id="pz-go" ${can && left ? "" : "disabled"}>Turn the handle<small>🪙${PRIZE_COST}</small></button>
      <button class="btn blue wide" id="pz-close">Close</button>`;
    App.el("pz-close").onclick = () => { Sfx.click(); App.closeModal("prize-modal"); this.refreshBehind(); };
    App.el("pz-go").onclick = () => this.pull();
  },

  pull() {
    const g = App.prog(), res = Collection.pull(g);
    if (res.error) { this.prizeIdle(res.error === "coins" ? "Not enough coins yet — hop some more!" : ""); return; }
    App.save(g);
    App.el("pz-go").disabled = true;
    Sfx.crank();
    const reveal = () => this.prizeReveal(res);
    if (!Art.motion) return reveal();
    App.el("machine").classList.add("turning");
    setTimeout(reveal, 950);
  },

  prizeReveal(res) {
    const g = App.prog(), ch = Roster.get(res.id), R = RARITIES.find(r => r.id === ch.rarity);
    const col = Roster.colById.get(ch.col), can = (g.coins || 0) >= PRIZE_COST && Collection.prizePool(g).length;
    const sheet = App.el("prize-sheet");
    sheet.innerHTML = `<p class="prize-new">✨ New character! ✨</p>
      <canvas class="char-big pop" aria-hidden="true"></canvas>
      <h2>${esc(ch.name)}</h2>
      <p class="char-meta">${esc(col.emoji + " " + col.name)} · <b style="color:${R.color}">${R.label}</b></p>
      <div class="row-btns2">
        <button class="btn green" id="pz-play">▶ Play</button>
        <button class="btn" id="pz-again" ${can ? "" : "disabled"}>Again<small>🪙${PRIZE_COST}</small></button>
      </div>
      <button class="btn blue wide" id="pz-close">Done</button>`;
    App.paintChar(sheet.querySelector("canvas"), ch, { w: 180, h: 160, size: 74, base: 0.82, shadow: true });
    Sfx.prize(); setTimeout(() => Sfx.call(ch.voice || PLANS[ch.plan].voice), 420);
    App.el("pz-play").onclick = () => { this.choose(res.id); App.closeModal("prize-modal"); this.refreshBehind(); };
    App.el("pz-again").onclick = () => { this.prizeIdle(); setTimeout(() => this.pull(), 0); };
    App.el("pz-close").onclick = () => { Sfx.click(); App.closeModal("prize-modal"); this.refreshBehind(); };

  },

  // Whatever is behind the modal shows the new coin total and collection.
  refreshBehind() {
    if (App.screen === "collection") this.render();
    else if (App.screen === "map") App.showHome();
  },
};
