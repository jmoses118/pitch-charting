/* Thunder Elite pitch charting – theme.js: the one reading of this phone's palette.
   Pure logic (no DOM). VIEW-4. Nothing saved is Night. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const THEME_DEFAULT='night';
function themeOf(saved,hour){
  const missing=saved==null||saved==='';
  const t=missing?THEME_DEFAULT:String(saved);
  if(t!=='auto')return t;
  const h=+hour;
  return h>=19||h<7?'night':'field';
}
Object.assign(PC,{THEME_DEFAULT,themeOf});
})(typeof window!=='undefined'?window:globalThis);
