// The roster: every character in Chicken Cross, one line each, grouped into
// collections. The line format is described above parseLine() in
// js/roster.js; in short:
//
//   "Name | plan | colour=hex ... hat=kind[:hex] neck= face= back= mark= fx= voice= theme= r=rarity unlock"
//
// All names and designs are original to Chicken Cross.
"use strict";

const COLLECTIONS = [
  { id: "founding", name: "Founding Flock", emoji: "🐔", unlock: "founding",
    blurb: "The twelve birds who crossed the very first road.",
    chars: [
      "Chicken | chicken | f=🐔 id=hen",
      "Rooster | rooster | f=🐓 id=rooster",
      "Chick | chick | f=🐤 id=chick",
      "Hatchling | chick | f=🐥 id=hatchling",
      "Duck | duck | f=🦆 id=duck",
      "Penguin | penguin | f=🐧 id=penguin",
      "Owl | owl | f=🦉 id=owl",
      "Flamingo | flamingo | f=🦩 id=flamingo",
      "Parrot | parrot | f=🦜 id=parrot",
      "Peacock | peacock | f=🦚 id=peacock",
      "Swan | swan | f=🦢 id=swan",
      "Dove | dove | f=🕊️ id=dove",
    ] },
];

Roster.build(COLLECTIONS, PLANS);
