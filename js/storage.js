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
  // Settings (chosen bird, classic look, 2D/3D view) follow the newer copy.
  const newer = (b.updated || 0) > (a.updated || 0) ? b : a, older = newer === a ? b : a;
  const out = {
    coins: Math.max(a.coins || 0, b.coins || 0),
    best: Math.max(a.best || 0, b.best || 0),
    levels,
  };
  for (const k of ["bird", "look", "view"]) {
    const v = newer[k] !== undefined ? newer[k] : older[k];
    if (v !== undefined) out[k] = v;
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
  blankProgress: () => ({ coins: 0, best: 0, levels: {}, updated: 0 }),
  mergeProgress,
});
const levelsDone = (prog) => Object.keys(prog.levels).length;
const unlockedLevel = (prog) => { let m = -1; for (const k of Object.keys(prog.levels)) m = Math.max(m, +k); return m + 1; };

