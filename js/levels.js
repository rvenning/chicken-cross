// The campaign: six worlds of four levels, plus the endless mode's parameters.
"use strict";

// Worlds -> levels. Each level = target distance + difficulty params + theme.
const WORLDS = [
  { name:"Sunny Meadows", emoji:"🌻", accent:"#c8f0a0",
    theme:{ grassA:"#7ac74f", grassB:"#72bd47", road:"#4b4b55", water:"#3f9be0", bg:"#6bbf4a" },
    w:{ grass:0.55, road:0.35, water:0.10, rail:0.0 } },
  { name:"Busy City", emoji:"🏙️", accent:"#cfd6dd",
    theme:{ grassA:"#8ad39a", grassB:"#7ec98d", road:"#42424c", water:"#3f9be0", bg:"#5a6b60" },
    w:{ grass:0.35, road:0.48, water:0.05, rail:0.12 } },
  { name:"Rushing River", emoji:"🌊", accent:"#a9dcf5",
    theme:{ grassA:"#6fc24d", grassB:"#66b845", road:"#4b4b55", water:"#2f8fd8", bg:"#3f9be0" },
    w:{ grass:0.30, road:0.22, water:0.43, rail:0.05 } },
  { name:"Frozen Tracks", emoji:"❄️", accent:"#dff1fb",
    theme:{ grassA:"#cfe8ef", grassB:"#c3e0e9", road:"#6d7a83", water:"#7fc3e8", bg:"#bfe3f0" },
    w:{ grass:0.30, road:0.28, water:0.10, rail:0.32 } },
  { name:"Rush Hour", emoji:"🚦", accent:"#f4c8a0",
    theme:{ grassA:"#5f8f4a", grassB:"#578442", road:"#38383f", water:"#2f6fa8", bg:"#3a4a3a" },
    w:{ grass:0.25, road:0.42, water:0.18, rail:0.15 } },
  { name:"Night Roads", emoji:"🌙", accent:"#9fb4d8",
    theme:{ grassA:"#3f6b3a", grassB:"#396234", road:"#2b2b33", water:"#1f5e8e", bg:"#2e4030" },
    w:{ grass:0.30, road:0.45, water:0.10, rail:0.15 } },
  { name:"Desert Dash", emoji:"🏜️", accent:"#f0dca0",
    theme:{ grassA:"#d9b866", grassB:"#d2b05e", road:"#5a4f46", water:"#3f9be0", bg:"#cfae5e" },
    w:{ grass:0.38, road:0.40, water:0.07, rail:0.15 } },
  { name:"Jungle Rapids", emoji:"🌴", accent:"#b3e6a0",
    theme:{ grassA:"#4e9e44", grassB:"#46943c", road:"#454f43", water:"#2a7fc4", bg:"#3e8a38" },
    w:{ grass:0.28, road:0.18, water:0.46, rail:0.08 } },
  { name:"Grand Central", emoji:"🚂", accent:"#d8c4b0",
    theme:{ grassA:"#8fae7a", grassB:"#86a471", road:"#3e3e46", water:"#3f89c8", bg:"#6e8560" },
    w:{ grass:0.30, road:0.25, water:0.05, rail:0.40 } },
  { name:"Volcano Finale", emoji:"🌋", accent:"#f4a888",
    theme:{ grassA:"#6e5a50", grassB:"#665349", road:"#33272a", water:"#d84315", bg:"#4a3733" },
    w:{ grass:0.22, road:0.38, water:0.20, rail:0.20 } },
];
const LEVELS_PER_WORLD = 4;
const LEVELS = [];
WORLDS.forEach((world, wi) => {
  for (let j=0; j<LEVELS_PER_WORLD; j++) {
    const gi = LEVELS.length;
    const diff = wi*LEVELS_PER_WORLD + j;         // 0..39
    // How far along the campaign this level sits, 0 at level 1 and 1 at level 40.
    // (Local ramp rather than GK.util's lerp: this runs at load, above the
    // destructure at the foot of the file, so lerp is still in its TDZ here.)
    const t = diff/(WORLDS.length*LEVELS_PER_WORLD - 1);
    const ramp = (from, to) => from + (to-from)*t;
    LEVELS.push({
      gi, world, wi, indexInWorld: j,
      // Rows to reach. Worlds 1-5 keep their original targets (saved progress
      // and star records stay valid). Past that the target barely grows: with
      // the ramp below now still climbing all the way to level 40, length is no
      // longer the thing that has to carry the late difficulty, and asking for
      // 95 unbroken rows was making the finale a test of not blinking.
      target: gi < 20 ? 12 + gi*3 : 69 + (gi-19),
      // Every ramp is a straight line from the level-1 value to the level-40
      // cap. They used to be steep slopes with a Math.min on top, and every one
      // of them hit its cap by level 18 -- so levels 19-40 were parameterically
      // IDENTICAL and only the target length grew. That read as a wall at world
      // 5 followed by twenty levels of the same fight at increasing length.
      // Same endpoints as before, spread over the whole campaign instead. The
      // caps are still the fastest values that leave a lane readable: a hop
      // takes HOP_TIME, so a car much past ~5 tiles/sec crosses a tile faster
      // than the player can commit to a move.
      params: {
        weights: world.w,
        theme: world.theme,
        carMin: ramp(1.5, 3.0),
        carMax: ramp(3.0, 5.2),
        truckChance: ramp(0.22, 0.34),
        creep: ramp(0.45, 0.95),
        coinRate: 0.42,
        railFast: ramp(12, 19),
      },
    });
  }
});

