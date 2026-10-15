/* Thunder Elite pitch charting – modes.js: game and bullpen are mutually exclusive on a device.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {gameStatus}=PC;
const NEED_OPP='Enter the opponent';
const NEED_PITCHER='Pick a pitcher';
const END_MSG='End this game? It stays in Stats.';
function discardMsg(g){return 'Discard draft vs '+((g&&g.opponent)||'')+'?';}
function blankText(v){return String(v==null?'':v).trim();}
function createGameMsg(o){o=o||{};if(!blankText(o.opponent))return NEED_OPP;if(!blankText(o.pitcherId))return NEED_PITCHER;return '';}
// one has-pitches check: a deleted pitch does not count. A draft is in progress and has none.
const hasPitches=box=>!!(box&&(box.pitches||[]).some(p=>!p.deleted));
// a game is in progress once started and until ended (final). Drafts count. A deleted game does not.
const gameInProgress=g=>!!(g&&g.started&&!g.ended&&!g.deleted&&gameStatus(g)!=='final');
const gameDraft=g=>!!(gameInProgress(g)&&!hasPitches(g));
const statsGame=g=>!!(g&&!g.deleted&&!gameDraft(g));
// a bullpen session is open while it is the active session and has at least one pitch (an empty session blocks nothing)
const sessionOpen=s=>hasPitches(s);
// cur.pitcherId is stored once on the game. curPitcher is only the header. The label reads the latest pitch, else that id.
function gamePitcherId(g){if(!g)return null;const pitches=(g.pitches||[]).filter(p=>p&&!p.deleted);
  if(!pitches.length){const id=g.cur&&g.cur.pitcherId;return id?String(id):null;}
  const last=pitches.reduce((a,p)=>(p.ts||0)>=(a.ts||0)?p:a);return last.pitcherId||null;}
function createGame(st,o){if(!st||createGameMsg(o))return null;
  const opponent=blankText(o.opponent),pitcherId=blankText(o.pitcherId),now=Date.now();
  const cur={inning:1,outs:0,slot:0,b:0,s:0,abn:0,hand:null,pitcherId};
  if(o.scheduledId){const g=(st.games||[]).find(x=>x.id===o.scheduledId);if(!g||gameStatus(g)!=='scheduled'||g.deleted)return null;
    g.opponent=opponent;if(o.date)g.date=o.date;if(o.event!=null)g.event=o.event;if(o.homeAway)g.homeAway=o.homeAway;if(o.lineup)g.lineup=o.lineup;
    g.cur=cur;if(o.scorer)g.scorer=o.scorer;g.started=now;g.status='active';g.pitches=g.pitches||[];st.activeGame=g.id;return g;}
  const g={id:o.id||('g_'+PC.uid()),date:o.date||null,opponent,event:o.event||'',homeAway:o.homeAway||'tbd',lineup:o.lineup||[],pitches:[],cur,scorer:o.scorer||null,started:now,status:'active'};
  (st.games=st.games||[]).push(g);st.activeGame=g.id;return g;}
function endGame(st,id,confirmed){if(!st||!confirmed)return false;const g=(st.games||[]).find(x=>x.id===id);if(!g||g.deleted)return false;
  g.ended=Date.now();g.status='final';if(st.activeGame===id)st.activeGame=null;return true;}
function discardGame(st,id,confirmed,device){if(!st||!confirmed)return false;const g=(st.games||[]).find(x=>x.id===id);
  if(!g||!canScore(g,device)||!gameDraft(g))return false;g.deleted=true;if(st.activeGame===id)st.activeGame=null;
  if(st.sync){st.sync.queue=st.sync.queue||{};st.sync.queue.games=st.sync.queue.games||{};st.sync.queue.games[id]=(st.sync.queue.games[id]||0)+1;}return true;}
function pauseGame(st){if(!st)return null;const id=st.activeGame;const g=(st.games||[]).find(x=>x.id===id)||null;st.activeGame=null;return g;}
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
// Edit a past pitch: the phone that owns scoring, including after the game ends. View-only codes cannot.
function canEditBox(box,dev,role){if(role==='viewer'||role==='unknown')return false;return canScore(box,dev);}
function claimScoring(box,dev){if(!box||!dev)return false;const was=box.scorer||null;box.scorer=dev;return was!==dev;}
const SCORING_ELSEWHERE='👁 View only – another phone is scoring';
const LOCK_MSG={game:'Game in progress — end or pause the game to start a bullpen',bullpen:'Bullpen in progress — end or pause the bullpen to start a game'};
// started, not ended games that are not on screen (paused here or started on another phone) – resumable
const pausedGames=st=>(st.games||[]).filter(g=>gameInProgress(g)&&g.id!==st.activeGame).sort((a,b)=>(b.started||0)-(a.started||0));
// paused bullpen sessions with pitches – resumable
const pausedSessions=st=>(st.sessions||[]).filter(s=>s.paused&&s.id!==st.activeSession&&sessionOpen(s)).sort((a,b)=>(b.paused||0)-(a.paused||0));
Object.assign(PC,{canScore,lockedBox,canEditBox,claimScoring,SCORING_ELSEWHERE,gameInProgress,sessionOpen,activeGameOf,activeSessionOf,modeLock,LOCK_MSG,pausedGames,pausedSessions,NEED_OPP,NEED_PITCHER,END_MSG,discardMsg,createGameMsg,hasPitches,gameDraft,statsGame,gamePitcherId,createGame,endGame,discardGame,pauseGame});
})(typeof window!=='undefined'?window:globalThis);
