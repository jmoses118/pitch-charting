/* INFRA-4. The one release label. The cache name and the changelog heading match it. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const APP_VERSION='v82';
const VERSION_SEEN_KEY='pc_version_seen';
const VERSION_NOTE_MS=2800;
function cacheNameOf(version){return 'te-pitch-'+version;}
function versionNotice(seen,current){
  const cur=current==null?'':String(current);
  const prev=seen==null?'':String(seen);
  if(!/^v\d+$/.test(prev)||prev===cur)return {show:false,text:'',store:cur};
  return {show:true,text:'Updated to '+cur,store:cur};
}
function workerUpdated(hadController,alreadyReloaded){return !!hadController&&!alreadyReloaded;}
// A pitch in progress, a running sync, or an open sheet is not safe to wipe.
function safeToReload(s){
  s=s||{};
  if(s.syncing||s.sheetOpen)return false;
  const d=s.draft;
  if(!d)return true;
  if(d.type)return false;
  if(d.called&&d.called.length)return false;
  if(d.actual!=null)return false;
  if(d.result)return false;
  if(d.ip)return false;
  if(d.shook)return false;
  if(d.aimEdit)return false;
  if(d.velo!=null&&String(d.velo).trim()!=='')return false;
  return true;
}
function reloadDue(s){s=s||{};return safeToReload(s)&&!!(s.hidden||s.idle);}
Object.assign(PC,{APP_VERSION:APP_VERSION,VERSION_SEEN_KEY:VERSION_SEEN_KEY,VERSION_NOTE_MS:VERSION_NOTE_MS,cacheNameOf:cacheNameOf,versionNotice:versionNotice,workerUpdated:workerUpdated,safeToReload:safeToReload,reloadDue:reloadDue});
})(typeof window!=='undefined'?window:globalThis);
