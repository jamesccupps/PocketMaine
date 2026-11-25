const fs=require('fs'),vm=require('vm');
const src=['01_data','02_map','03_sim','03x_more','03y_vip','03z_depth'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n')+`
;HOLIDAY_FORCE='off';globalThis.X={get G(){return G},SIM,initWorld,newGame,tick,PORTS,PORT_BY,CRAFT_BY,CRAFT,routeInfo,dispatch,loadJob,loadAllFor,unloadJob,goFish,fishOptions,cstat,loadOf,unlockPort,buyCraft,yardFits,acceptContract,loadContract,season,money,netWorth,saveGame,loadGame,bonusDest,upgradePort,portUpgradeCost,boardCap,roomFor,legInfo,collect,buySlot,slotCost,portCost,canBase,xpNeed,fastForward,hurry,hurryCost,cancelPlan};`;
vm.runInThisContext(src);
const X=globalThis.X; X.initWorld(); X.newGame(process.argv[3]||'casco', +(process.env.SEED||20261125)); const G=X.G;      // the same simulated player every run; SEED=n tries another
const every=+process.argv[4]||8; // seconds between the "player" looking at the game
function bot(){
  for(const c of G.crafts){ if(c.state==='landed') X.collect(c);
    // Held by weather: a player would not sit and watch it. Call the trip off, put the load back, and look for a way out that is open.
    if(c.state==='hold' && c.plan && c.plan.stops && c.holdWhy!=='turnaround' && c.holdWhy!=='engine trouble'){ X.cancelPlan(c); c.jobs.slice().forEach(j=>X.unloadJob(c,j.id)); }
    if(c.state!=='dock') continue; const st=G.ports[c.at];
    const dests={}; st.jobs.concat(st.lay).forEach(j=>{ const li=X.legInfo(c,c.at,j.to); if(!li.ok||li.wx) return; dests[j.to]=(dests[j.to]||0)+j.pay; });
    G.active.forEach(k=>{ if(k.from===c.at){ const li=X.legInfo(c,c.at,k.to); if(li.ok&&!li.wx) dests[k.to]=(dests[k.to]||0)+k.rate*4; } if(0) dests[k.to]=(dests[k.to]||0)+k.rate*4; });
    let best=null,bv=0; for(const d in dests){ if(dests[d]>bv){bv=dests[d];best=d;} }
    const T=X.CRAFT_BY[c.type];
    if(best){ G.active.forEach(k=>{ if(k.from===c.at&&k.to===best) X.loadContract(c,k.id); }); X.loadAllFor(c,best); if(c.jobs.length){ X.dispatch(c,[best]); continue; } }
    if(c.jobs.length){ const j=c.jobs[0]; if(X.legInfo(c,c.at,j.to).ok) X.dispatch(c,[j.to]); else X.unloadJob(c,j.id); continue; }
    if(T.fish){ const o=X.fishOptions(c).filter(o=>o.inRange); if(o.length){ X.goFish(c,o[0].g.id,o[0].sp); continue; } }
  }
  G.offers.slice().forEach(o=>{ if(o.canDo&&G.active.length<2) X.acceptContract(o.id); });
  const locked=X.PORTS.filter(p=>!G.ports[p.id].open).sort((a,b)=>X.portCost(a.id)-X.portCost(b.id));
  const buyable=X.CRAFT.filter(T=>T.lvl<=G.level).sort((a,b)=>b.price-a.price)[0];
  const optPort = locked.length? X.portCost(locked[0].id) : 1e12;
  const nPorts=X.PORTS.filter(p=>G.ports[p.id].open).length;
  if(G.crafts.length < nPorts*0.9){ const slot=G.crafts.length<G.slots?0:X.slotCost(); const opts=X.CRAFT.filter(T=>T.lvl<=G.level && T.price+slot<=G.money*0.9).sort((a,b)=>b.price-a.price);
    if(opts.length && (opts[0].price>=buyable.price*0.3)){ if(slot) X.buySlot(); const T=opts[0]; const base=X.PORTS.filter(p=>G.ports[p.id].open&&X.yardFits(T,p.id)).sort((a,b)=>G.ports[b.id].jobs.length-G.ports[a.id].jobs.length)[0]; if(base) X.buyCraft(T.id,base.id); } }
  else if(locked.length && G.money>optPort*1.15) X.unlockPort(locked[0].id);
}
let errs=0; const hours=+process.argv[2]||4; let first={};
for(let step=0; step<hours*3600; step++){ try{ X.tick(1); if(step%every===0) bot(); }catch(e){ if(errs++<5) console.log('ERR',e.stack.split('\n').slice(0,4).join('\n')); }
  X.SIM.events.length=0;
  if(!first.port && X.PORTS.filter(p=>G.ports[p.id].open).length>3) first.port=step; if(!first.l2&&G.level>=2) first.l2=step; if(!first.l3&&G.level>=3) first.l3=step; if(!first.l5&&G.level>=5) first.l5=step; if(!first.l4&&G.level>=4) first.l4=step; if(!first.l8&&G.level>=8) first.l8=step; if(!first.craft&&G.crafts.length>4) first.craft=step;
  const marks=[300,600,1200,1800,3600,7200,10800,14400,21600,28800,43200]; if(marks.includes(step)){ console.log((step/60+'min').padStart(7), 'L'+G.level, X.money(G.money).padStart(9), 'earned',X.money(G.stats.earned).padStart(9),'ports',X.PORTS.filter(p=>G.ports[p.id].open).length,'fleet',G.crafts.length+'/'+G.slots, G.crafts.map(c=>c.type).join(',').slice(0,70), 'ctr',G.stats.contracts,'fish$',G.stats.fishMoney); } }
console.log('errors',errs,'firsts (min): port',(first.port/60).toFixed(1),'L2',(first.l2/60).toFixed(1),'L3',(first.l3/60).toFixed(1),'L5',(first.l5/60||0).toFixed(1),'5th craft',(first.craft/60||0).toFixed(1));
// The pacing has bounds, so a rule change that brings the first levels in a rush (or pushes them out of reach) fails here.
{ const m=k=>first[k]?+(first[k]/60).toFixed(1):null, bad=[], chk=(k,lo,hi)=>{ const v=m(k); if(hours*60>=hi&&(v===null||v<lo||v>hi)) bad.push(k.toUpperCase()+' at '+(v===null?'never':v.toFixed(1)+' min')+', wanted '+lo+' to '+hi); else if(v!==null&&v<lo) bad.push(k.toUpperCase()+' at '+v.toFixed(1)+' min, wanted no sooner than '+lo); };
  chk('l2',5,16); chk('l3',12,35); chk('l4',22,55); chk('l8',70,210); console.log('levels (min): L2',m('l2'),'L3',m('l3'),'L4',m('l4'),'L8',m('l8')); if(bad.length){ console.log('PACING OUT OF BOUNDS: '+bad.join('; ')); process.exitCode=1; } }
// offline
const before=G.t; const n=X.fastForward(3600); console.log('fastForward 1h ok, landed +'+n, 'dt', Math.round(G.t-before));
