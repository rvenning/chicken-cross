// Sound effects, all synthesised by gamekit -- no audio files ship with the game.
"use strict";

// gamekit synth core (tone/noise/click/coin/win/lose/wrong) + game jingles.
const Sfx = GK.Sfx;
Object.assign(Sfx, {
  hop()    { this.tone({ freq: 520, type:"triangle", dur:0.09, vol:0.16, slide:180 }); },
  squash() { this.noise({ dur:0.18, vol:0.35 }); this.tone({ freq:150, type:"sawtooth", dur:0.25, vol:0.2, slide:-90 }); },
  splash() { this.noise({ dur:0.35, vol:0.28 }); this.tone({ freq:400, type:"sine", dur:0.3, vol:0.15, slide:-260 }); },
  bell()   { this.tone({ freq: 1100, type:"square", dur:0.12, vol:0.13 });
             this.tone({ freq: 1100, type:"square", dur:0.12, vol:0.13, when:0.18 }); },
  thud()   { this.tone({ freq: 130, type:"sine", dur:0.11, vol:0.13, slide:-45 });
             this.noise({ dur:0.06, vol:0.07 }); },
  horn()   { this.tone({ freq: 240, type:"sawtooth", dur:0.5, vol:0.22 });
             this.tone({ freq: 180, type:"sawtooth", dur:0.5, vol:0.18 });
             this.noise({ dur:0.6, vol:0.12, when:0.05 }); },
});

