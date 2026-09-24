// Sound effects, all synthesised by gamekit -- no audio files ship with the game.
"use strict";

// gamekit synth core (tone/noise/click/coin/win/lose/wrong) + game jingles.
const Sfx = GK.Sfx;

// Character voices: how each character's hop sounds, and the little call it
// makes when you pick it or win it. Small variations on the stock hop -- a
// different pitch, waveform or slide -- so 420 characters never need 420
// sounds, and none of them is loud or long.
const VOICES = {
  peep:   { f: 520, type: "triangle", slide: 180 },
  cluck:  { f: 420, type: "square",   slide: -60 },
  quack:  { f: 300, type: "sawtooth", slide: -40 },
  honk:   { f: 250, type: "square",   slide: 30 },
  squeak: { f: 900, type: "sine",     slide: 300 },
  oink:   { f: 220, type: "sawtooth", slide: -30 },
  moo:    { f: 150, type: "triangle", slide: -20 },
  baa:    { f: 360, type: "sawtooth", slide: 20, wob: true },
  boing:  { f: 260, type: "sine",     slide: 420 },
  blip:   { f: 700, type: "square",   slide: 0 },
  buzz:   { f: 180, type: "sawtooth", slide: 10, wob: true },
  chime:  { f: 1040, type: "sine",    slide: 0 },
  bloop:  { f: 330, type: "sine",     slide: -160 },
  rumble: { f: 110, type: "triangle", slide: -20 },
  meow:   { f: 600, type: "triangle", slide: -200 },
  woof:   { f: 200, type: "square",   slide: -70 },
  ribbit: { f: 240, type: "square",   slide: 60, wob: true },
  clank:  { f: 480, type: "square",   slide: -300 },
  pop:    { f: 800, type: "sine",     slide: -500 },
  whistle:{ f: 1200, type: "sine",    slide: 200 },
};

Object.assign(Sfx, {
  voice: "peep",
  hop() {
    const v = VOICES[this.voice] || VOICES.peep;
    this.tone({ freq: v.f, type: v.type, dur: 0.09, vol: 0.14, slide: v.slide });
  },
  // A character's call: its hop voice, twice, rising.
  call(name) {
    const v = VOICES[name] || VOICES.peep;
    this.tone({ freq: v.f, type: v.type, dur: 0.12, vol: 0.16, slide: v.slide });
    this.tone({ freq: v.f * 1.26, type: v.type, dur: 0.14, vol: 0.16, slide: v.slide, when: 0.13 });
    if (v.wob) this.tone({ freq: v.f * 1.12, type: v.type, dur: 0.1, vol: 0.12, when: 0.28 });
  },
  squash() { this.noise({ dur:0.18, vol:0.35 }); this.tone({ freq:150, type:"sawtooth", dur:0.25, vol:0.2, slide:-90 }); },
  splash() { this.noise({ dur:0.35, vol:0.28 }); this.tone({ freq:400, type:"sine", dur:0.3, vol:0.15, slide:-260 }); },
  crash()  { this.noise({ dur:0.3, vol:0.3 }); this.tone({ freq:90, type:"square", dur:0.3, vol:0.16, slide:-40 }); },
  bell()   { this.tone({ freq: 1100, type:"square", dur:0.12, vol:0.13 });
             this.tone({ freq: 1100, type:"square", dur:0.12, vol:0.13, when:0.18 }); },
  thud()   { this.tone({ freq: 130, type:"sine", dur:0.11, vol:0.13, slide:-45 });
             this.noise({ dur:0.06, vol:0.07 }); },
  horn()   { this.tone({ freq: 240, type:"sawtooth", dur:0.5, vol:0.22 });
             this.tone({ freq: 180, type:"sawtooth", dur:0.5, vol:0.18 });
             this.noise({ dur:0.6, vol:0.12, when:0.05 }); },
  whoosh() { this.noise({ dur:0.16, vol:0.09 }); this.tone({ freq:900, type:"sine", dur:0.14, vol:0.05, slide:-500 }); },
  gust()   { this.noise({ dur:0.5, vol:0.08 }); },
  milestone() { [660, 880].forEach((f, i) => this.tone({ freq:f, type:"triangle", dur:0.12, vol:0.14, when:i*0.09 })); },
  fanfare()   { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq:f, type:"triangle", dur:0.16, vol:0.16, when:i*0.1 })); },
  prize()     { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone({ freq:f, type:"square", dur:0.1, vol:0.1, when:i*0.07 })); },
  crank()     { for (let i = 0; i < 4; i++) this.tone({ freq:220 + i * 40, type:"square", dur:0.05, vol:0.08, when:i*0.09 }); },
});
