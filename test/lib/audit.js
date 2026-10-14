// Shared in-page layout audit for the UI tests: clipped/ellipsized text, truncated select text, off-screen content, overlapping controls.
// in-page audit: returns a list of problems
const AUDIT=()=>{const out=[];const W=innerWidth;const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).join('.'):'')+' "'+(e.textContent||'').trim().slice(0,28)+'"';
  const shown=e=>{const d=e.closest('details:not([open])');if(d&&!e.closest('summary'))return false; // closed <details> content is not rendered
    const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&+cs.opacity!==0;};
  const scroller=e=>{const cs=getComputedStyle(e);return cs.overflowX==='auto'||cs.overflowX==='scroll';};
  const inScroller=e=>{for(let p=e.parentElement;p;p=p.parentElement)if(scroller(p))return true;return false;};
  const cx=document.createElement('canvas').getContext('2d');
  for(const e of document.querySelectorAll('header *,main *,nav *,#coach *')){if(!shown(e)||e.closest('svg')||e.matches('input,textarea,option,br'))continue;const cs=getComputedStyle(e);
    if(e.tagName==='SELECT'){const o=e.options[e.selectedIndex];if(!o)continue;cx.font=cs.font;const room=e.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-(e.id==='pitcher'?0:-4);
      if(cx.measureText(o.text).width>room+1)out.push('select text truncated: '+name(e)+' "'+o.text+'" '+Math.round(cx.measureText(o.text).width)+'>'+Math.round(room));continue;}
    if(cs.display==='inline'||scroller(e))continue;
    if(!e.hasAttribute("data-ellipsis")&&e.scrollWidth>e.clientWidth+1&&(cs.overflowX!=='visible'||cs.textOverflow==='ellipsis'||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())))out.push('clipped: '+name(e)+' '+e.scrollWidth+'>'+e.clientWidth);
    const r=e.getBoundingClientRect();if(!inScroller(e)&&(r.right>W+1||r.left<-1))out.push('off-screen: '+name(e)+' '+Math.round(r.left)+'..'+Math.round(r.right));}
  const Q=[...document.querySelectorAll('header button,header select,header .tag,header .wlmini,header .brand,main button,main select,main input,main .tag,main .lbl,main .title,main label,nav button,#coach button,#coach .cchip,#coach th,#coach .cs-count,#coach .cs-call,#coach .cs-hint')].filter(e=>shown(e)&&!inScroller(e));
  const ctx=e=>e.closest('header,nav,dialog,.bsheet,.bpad,.entrybar,.zonewrap,.cside,#coach')||document.body;
  for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const a=Q[i],b=Q[j];if(a.contains(b)||b.contains(a)||ctx(a)!==ctx(b))continue;const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();
    const ox=Math.min(A.right,B.right)-Math.max(A.left,B.left),oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);if(ox>2&&oy>2)out.push('overlap: '+name(a)+' × '+name(b));}
  return out;};
module.exports={AUDIT};
