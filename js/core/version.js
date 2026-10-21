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
  if(seen==null||seen==='')return {show:false,text:'',store:cur};
  if(String(seen)===cur)return {show:false,text:'',store:cur};
  return {show:true,text:'Updated to '+cur,store:cur};
}
function workerUpdated(hadController,alreadyReloaded){return !!hadController&&!alreadyReloaded;}
Object.assign(PC,{APP_VERSION:APP_VERSION,VERSION_SEEN_KEY:VERSION_SEEN_KEY,VERSION_NOTE_MS:VERSION_NOTE_MS,cacheNameOf:cacheNameOf,versionNotice:versionNotice,workerUpdated:workerUpdated});
})(typeof window!=='undefined'?window:globalThis);
