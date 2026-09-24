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

  /* ============================================ the Prize Machine (290) */

  { id: "farmyard", name: "Farmyard Friends", emoji: "🚜",
    blurb: "Mud, hay and an early start.",
    chars: [
      "Tilly Truffle | pig | mark=spots:c9707f",
      "Sir Oinksalot | pig | body=f2b3a0 hat=tophat:3a3a44 neck=bowtie:d33a3a r=2",
      "Mudpuddle Maisie | pig | body=d99a7e snout=c8826a mark=patch:8a5a3c fx=drops",
      "Daisy Buttercup | cow | hat=flower:ffd23f",
      "Clover Moo | cow | patch=8a5a3c muzzle=f7c8b8 neck=bell",
      "Bramble Bull | cow | body=6a4a3a patch=3a2a24 horn=fff4d6 muzzle=c89a8a r=1",
      "Woolly Winifred | sheep | neck=scarf:e05a8a",
      "Dusty Fleece | sheep | body=e8dcc8 skin=6a4a3a",
      "Midnight Merino | sheep | body=4a4a58 skin=1d1d24 r=1",
      "Parsnip | bunny | body=e8e0d8 hat=straw:e05a8a",
      "Hay Bale Hattie | pony | body=d8a86a mane=f4e0b0 hat=straw:d33a3a",
      "Gravel Gertie | chicken | body=c98a4a mark=speckle:7a4a2a",
      "Farmer Fenwick | person | body=6a9a3a pants=3a5a8a hat=straw:6a9a3a hair=8a5a3a",
      "Tractor Tess | person | body=d9412e pants=3a4a6a hat=cap:d9412e form=braid hair=c8783a skin=e8b890",
      "Old Mac Rooster | rooster | body=c86a3a tail=2a4a2a hat=straw:3a7ad9 r=2",
    ] },

  { id: "woodland", name: "Woodland Wanderers", emoji: "🌲",
    blurb: "Rustlers of leaves and keepers of acorns.",
    chars: [
      "Fern Foxglove | fox |",
      "Russet Rascal | fox | body=c8582a neck=bandana:3a7ad9",
      "Silver Brush | fox | body=b8c0c8 socks=5a5a66 r=2",
      "Bramble Bear | bear |",
      "Honeypot Hugo | bear | body=d99a4a muzzle=f4dcb0 neck=scarf:d33a3a",
      "Moss Grizzle | bear | body=6a5a4a muzzle=b8a080 hat=sprout",
      "Prickles | hedgehog |",
      "Conker Quill | hedgehog | body=5a3a2a skin=f0dcc0 hat=cap:3a8a3a",
      "Acorn Ada | mouse | body=a8805a inner=ffc0c8 hat=beret:6a9a3a",
      "Hazel Hoard | mouse | body=c8a078 back=backpack:d98e32",
      "Tawny Hoot | owl | body=b07a4a disc=f0dcc0 hat=laurel",
      "Barnaby Barn Owl | owl | body=e8c890 disc=ffffff tufts=d8b070 r=1",
      "Pip Woodpecker | parrot | body=2a2a30 wing=f4f4f4 tuft=d33a3a tail=2a2a30 beak=6a6a70 legs=6a6a70",
      "Fawn Hollow | pony | body=c8905a mane=8a5a3a mark=spots:f4e8d8",
      "Toadstool Tim | frog | body=8a6a4a belly=d8c8a0 hat=beret:d33a3a",
    ] },

  { id: "pond", name: "Pond & River", emoji: "🐸",
    blurb: "Paddlers, dabblers and one very slow swimmer.",
    chars: [
      "Lily Leapwell | frog | hat=flower:ff9ec4",
      "Bogsworth | frog | body=4a7a3a belly=a8c878 face=monocle",
      "Tadpole Tom | frog | body=3a5a3a belly=8aa878 fx=bubbles",
      "Marsh Mallow | duck | body=c8b8a0 head=f4f0e8 ring=e8c8a0",
      "Dabbler Dot | duck | head=3a5ad9 body=6a6a70",
      "Paddles | duck | body=f6d43a head=f6d43a ring=f6d43a beak=f28c28 fx=bubbles voice=squeak",
      "Grace Glide | swan | hat=tiara:e84a8a",
      "Nocturne | swan | body=2a2a30 beak=d33a3a mask=1d1d24 r=2",
      "Shelly Slowtide | turtle |",
      "Mossback | turtle | shell=5a6a3a plate=8a9a5a hat=sprout",
      "Reed Runner | lizard | body=6aa04a belly=d0e8a0",
      "Kingfisher Kit | parrot | body=2a8ad9 wing=1a6ab0 tuft=2a8ad9 tail=1a5a9a beak=2a2a30 mark=belly:f08a3a",
      "Crayfish Cal | crab | body=a8503a belly=d88a6a",
      "Harriet Heron | flamingo | body=b8c0c8 head=e8ecf0 wing=8a929a legs=d8c070 beak=e8c040 beakTip=d8a030",
    ] },

  { id: "pets", name: "Pet Parade", emoji: "🐾",
    blurb: "Everyone's best friend, and a goldfish.",
    chars: [
      "Whiskers McPurr | cat |",
      "Marmalade | cat | mark=stripes:c8702a",
      "Inky | cat | body=2a2a30 inner=d88aa0 neck=collar:d33a3a",
      "Snowdrop | cat | body=f4f4f4 inner=ffb6c8 neck=bell",
      "Biscuit | dog |",
      "Pepper Pup | dog | body=f4f0e8 ear=2a2a30 muzzle=ffffff mark=spots:2a2a30",
      "Sir Waggington | dog | body=6a4a3a ear=3a2a1a muzzle=c8a078 hat=tophat:2a2a30 neck=bowtie:3a3a44 r=2",
      "Nibbles | mouse |",
      "Hamish Hamster | mouse | body=e8a860 inner=f4c8a0 tail=f4c8a0",
      "Goldie | fish | body=f6a52a fin=f67a2a",
      "Bubbles McFin | fish | body=6ab0e8 fin=3a7ad9 belly=e8f4ff fx=bubbles",
      "Polly Perch | parrot | body=5ac04a wing=f6d43a tuft=f6d43a tail=3a8a3a",
      "Budgie Blue | parrot | body=6ab0f0 wing=2a6ad0 tuft=f0f0f0 tail=2a5ab0",
      "Burrow Benji | bunny | body=8a6a4a",
      "Cotton | bunny | body=f8f8f8 inner=ffb6c8 fx=hearts",
    ] },
];

Roster.build(COLLECTIONS, PLANS);
