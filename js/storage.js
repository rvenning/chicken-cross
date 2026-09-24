// Profiles, progress and scores.
"use strict";

// gamekit storage: localStorage source of truth + Firestore family sync.
// Same data keys (cc_*) and Firestore collection as before the migration,
// so existing profiles and scores carry straight over.
// Cross-device merge: best stars per level, max coins / best distance.
const mergeProgress = (a, b) => {
  const levels = { ...a.levels };
  for (const [gi, lv] of Object.entries(b.levels || {})) {
    if (!levels[gi] || (lv.stars || 0) > (levels[gi].stars || 0)) levels[gi] = lv;
  }
  // Settings (chosen bird/character, favourites, classic look, 2D/3D view)
  // follow the newer copy.
  const newer = (b.updated || 0) > (a.updated || 0) ? b : a, older = newer === a ? b : a;
  const out = {
    coins: Math.max(a.coins || 0, b.coins || 0),
    best: Math.max(a.best || 0, b.best || 0),
    levels,
  };
  for (const k of ["bird", "look", "view", "char", "fav", "unseen"]) {
    const v = newer[k] !== undefined ? newer[k] : older[k];
    if (v !== undefined) out[k] = v;
  }
  // Characters are never lost: the owned list merges as a union, and so does
  // the queue of earned-but-not-yet-arrived ones (minus any now owned).
  if (a.owned || b.owned) out.owned = [...new Set([...(a.owned || []), ...(b.owned || [])])];
  if (a.pending || b.pending) {
    const own = new Set(out.owned || []);
    out.pending = [...new Set([...(a.pending || []), ...(b.pending || [])])].filter(id => !own.has(id));
  }
  // Lifetime counters only ever grow, so the larger of each is the truth.
  if (a.stats || b.stats) {
    out.stats = { ...(a.stats || {}) };
    for (const [k, v] of Object.entries(b.stats || {})) out.stats[k] = Math.max(out.stats[k] || 0, v || 0);
  }
  // Coins. Taking the larger balance, as this always did, would hand back
  // coins spent at the Prize Machine on the other device. So both copies keep
  // a ledger -- everything ever earned, everything ever spent, each only ever
  // growing -- and the balance is the difference of the merged totals. A copy
  // from before the ledger counts its balance as earned, nothing spent.
  if (a.earned !== undefined || b.earned !== undefined) {
    const led = (p) => p.earned !== undefined ? [p.earned, p.spent || 0] : [p.coins || 0, 0];
    const [ea, sa] = led(a), [eb, sb] = led(b);
    out.earned = Math.max(ea, eb); out.spent = Math.max(sa, sb);
    out.coins = Math.max(0, out.earned - out.spent);
  }
  return out;
};

const Storage = GK.createStorage({
  prefix: "cc",
  collection: "chickencross",
  firebaseConfig: {
    apiKey: "AIzaSyD1h2aN_9spXt8usZ_ycpGFnIIGztESXWk",
    authDomain: "wordvoyage-e5a5c.firebaseapp.com",
    projectId: "wordvoyage-e5a5c",
    storageBucket: "wordvoyage-e5a5c.firebasestorage.app",
    messagingSenderId: "569011992319",
    appId: "1:569011992319:web:bdcd6019d112006b5cbeca"
  },
  blankProgress: () => ({ coins: 0, best: 0, levels: {}, updated: 0,
                          owned: [], fav: [], stats: {}, earned: 0, spent: 0 }),
  mergeProgress,
});
const levelsDone = (prog) => Object.keys(prog.levels).length;
const unlockedLevel = (prog) => { let m = -1; for (const k of Object.keys(prog.levels)) m = Math.max(m, +k); return m + 1; };

