// Shared helpers. Loaded first: LEVELS is built at load time and uses these.
//
// Most come from gamekit; rr (a canvas round-rect path) is game-specific and
// predates Path2D.roundRect being safe to rely on here.
"use strict";

const CAR_COLORS=["#e94f4f","#f0a53b","#4f7fe9","#8e4fe9","#3bc4b0","#e94f9d","#f2d13b"];
const { esc, clamp, lerp, rand, irand, pick, shade, hash2 } = GK.util;
function rr(ctx,x,y,w,h,r){ r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
