/* Thunder Elite pitch charting – modes.js: game and bullpen are mutually exclusive on a device.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {gameStatus}=PC;
// a game is in progress once started and until ended (final)
const gameInProgress=g=>!!(g&&g.started&&!g.ended&&gameStatus(g)!=='final');
// a bullpen session is open while it is the active session and has at least one pitch (an empty session blocks nothing)
const sessionOpen=s=>!!(s&&(s.pitches||[]).some(p=>!p.deleted));
const activeGameOf=st=>(st.games||[]).find(g=>g.id===st.activeGame)||null;
const activeSessionOf=st=>(st.sessions||[]).find(s=>s.id===st.activeSession)||null;
// which mode blocks `tab` on this device, or null. canGame=false (player / pitching coach / viewer) never locks.
function modeLock(st,tab,canGame){if(!canGame)return null;const g=activeGameOf(st),s=activeSessionOf(st);
  if(tab==='bullpen'&&gameInProgress(g))return{by:'game',game:g};
  if(tab==='game'&&!g&&sessionOpen(s))return{by:'bullpen',session:s};
  return null;}
// Scoring lock (Jim, Oct 2026): a live game or bullpen session is scored from ONE phone – the one that started it
// (box.scorer = that phone's device id). Every other phone views it read-only until it explicitly takes over scoring.
const canScore=(box,dev)=>!box||!box.scorer||box.scorer===dev;
const lockedBox=(box,dev)=>!!box&&!canScore(box,dev);
function claimScoring(box,dev){if(!box||!dev)return false;const was=box.scorer||null;box.scorer=dev;return was!==dev;}
const SCORING_ELSEWHERE='Scoring on another phone – view only';
const LOCK_MSG={game:'Game in progress — end or pause the game to start a bullpen',bullpen:'Bullpen in progress — end or pause the bullpen to start a game'};
// started, not ended games that are not on screen (paused here or started on another phone) – resumable
const pausedGames=st=>(st.games||[]).filter(g=>gameInProgress(g)&&g.id!==st.activeGame).sort((a,b)=>(b.started||0)-(a.started||0));
// paused bullpen sessions with pitches – resumable
const pausedSessions=st=>(st.sessions||[]).filter(s=>s.paused&&s.id!==st.activeSession&&sessionOpen(s)).sort((a,b)=>(b.paused||0)-(a.paused||0));
Object.assign(PC,{canScore,lockedBox,claimScoring,SCORING_ELSEWHERE,gameInProgress,sessionOpen,activeGameOf,activeSessionOf,modeLock,LOCK_MSG,pausedGames,pausedSessions});
})(typeof window!=='undefined'?window:globalThis);
