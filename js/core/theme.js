/* Thunder Elite pitch charting – theme.js: the one reading of this phone's palette.
   Pure logic (no DOM). VIEW-4. Nothing saved, and anything that is not field, night, or auto, is Night. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const THEME_KEY='te_ui_theme';
const THEME_DEFAULT='night';
const THEME_CHOICES=['field','night','auto'];
function themeRead(storage){
  try{return storage&&storage.getItem(THEME_KEY);}catch(e){return null;}
}
function themeChoice(storage){
  const v=themeRead(storage);
  return THEME_CHOICES.indexOf(v)>=0?v:THEME_DEFAULT;
}
function themeOf(saved,hour){
  const t=saved==null||saved===''?THEME_DEFAULT:String(saved);
  if(t==='field'||t==='night')return t;
  if(t!=='auto')return THEME_DEFAULT;
  const h=+hour;
  if(!Number.isFinite(h))return THEME_DEFAULT;
  return h>=19||h<7?'night':'field';
}
function themeFromStorage(storage,hour){return themeOf(themeRead(storage),hour);}
function themeColor(t){return t==='field'?'#fff':'#000';}
function themeSave(storage,value){
  try{if(storage)storage.setItem(THEME_KEY,value);}catch(e){}
}
Object.assign(PC,{THEME_KEY,THEME_DEFAULT,THEME_CHOICES,themeOf,themeChoice,themeFromStorage,themeColor,themeSave});
})(typeof window!=='undefined'?window:globalThis);
