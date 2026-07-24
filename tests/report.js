"use strict";
// Full balance report — every level, N bot attempts each.
//
//   cd chicken-cross && npm run balance
//   cd chicken-cross && npm run balance -- 12      # 12 attempts per level
//
// This is a human-read diagnostic, not a test. The bot is competent but not
// optimal (see the note at the top of balance.test.js), so read a low win rate
// as "this level is hard for a decent player", not as a defect. What's worth
// looking at is the SHAPE: the rate should decline gradually across the
// campaign, and no level should stand out as far harder than its neighbours.

const { loadGame, playLevel } = require("./bot.js");

const attempts = Number(process.argv[2]) || 8;
const game = loadGame();
const { LEVELS } = game;

const bar = (n, max) => "█".repeat(n) + "·".repeat(max - n);
const rows = [];

console.log(`\nChicken Cross — bot sweep, ${attempts} attempts per level\n`);
console.log("  lvl  world              target   wins        best   common death");
console.log("  " + "─".repeat(66));

for (let gi = 0; gi < LEVELS.length; gi++) {
  const lv = LEVELS[gi];
  let wins = 0, best = null;
  const reasons = {};
  for (let a = 0; a < attempts; a++) {
    const r = playLevel(game, gi, 120);
    if (r.outcome === "win") { wins++; if (!best || r.seconds < best) best = r.seconds; }
    else reasons[r.reason || r.outcome] = (reasons[r.reason || r.outcome] || 0) + 1;
  }
  const worst = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  rows.push({ gi, wins, best });
  console.log(
    `  ${String(gi + 1).padStart(3)}  ${lv.world.name.padEnd(16)} ${String(lv.target + "m").padStart(6)}   ` +
    `${bar(wins, attempts)} ${String(wins).padStart(2)}/${attempts}  ` +
    `${(best === null ? "—" : best + "s").padStart(6)}   ${worst ? worst[0] : ""}`
  );
}

const won = rows.filter(r => r.best !== null);
const times = won.map(r => r.best).sort((a, b) => a - b);
const half = Math.floor(LEVELS.length / 2);
const avg = (xs) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);

console.log("  " + "─".repeat(66));
console.log(`  cleared at least once: ${won.length}/${LEVELS.length}`);
if (times.length)
  console.log(`  best times: fastest ${times[0]}s · median ${times[Math.floor(times.length / 2)]}s · slowest ${times[times.length - 1]}s`);
console.log(`  mean win rate — first half ${avg(rows.slice(0, half).map(r => r.wins))}/${attempts}` +
            ` · second half ${avg(rows.slice(half).map(r => r.wins))}/${attempts}   (should decline)`);
const never = rows.filter(r => r.best === null).map(r => "L" + (r.gi + 1));
if (never.length) console.log(`  never cleared: ${never.join(", ")}  — likely bot limits on water/rail, worth a human look`);
console.log("");
