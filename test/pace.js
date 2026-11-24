const fs=require('fs'),vm=require('vm');
const src=['01_data','02_map','03_sim','03x_more','03y_vip','03z_depth'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n')+`
;HOLIDAY_FORCE='off';globalThis.X={get G(){return G},SIM,initWorld,newGame,tick,PORTS,PORT_BY,CRAFT_BY,CRAFT,routeInfo,dispatch,loadJob,loadAllFor,unloadJob,goFish,fishOptions,cstat,loadOf,unlockPort,buyCraft,yardFits,acceptContract,loadContract,season,money,netWorth,saveGame,loadGame,bonusDest,upgradePort,portUpgradeCost,boardCap,roomFor,legInfo,collect,buySlot,slotCost,portCost,canBase,xpNeed,fastForward,hurry,hurryCost};`;
vm.runInThisContext(src);
const X=globalThis.X; X.initWorld(); X.newGame(process.argv[3]||'casco'); const G=X.G;
const every=+process.argv[4]||8; // seconds between the "player" looking at the game
function bot(){
  for(const c of G.crafts){ if(c.state==='landed') X.collect(c); if(c.state!=='dock') continue; const st=G.ports[c.at];
    const dests={}; st.jobs.concat(st.lay).forEach(j=>{ const li=X.legInfo(c,c.at,j.to); if(!li.ok) return; dests[j.to]=(dests[j.to]||0)+j.pay; });
    G.active.forEach(k=>{ if(k.from===c.at && X.legInfo(c,c.at,k.to).ok) dests[k.to]=(dests[k.to]||0)+k.rate*4; });
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
  if(!first.port && X.PORTS.filter(p=>G.ports[p.id].open).length>3) first.port=step; if(!first.l2&&G.level>=2) first.l2=step; if(!first.l3&&G.level>=3) first.l3=step; if(!first.l5&&G.level>=5) first.l5=step; if(!first.craft&&G.crafts.length>4) first.craft=step;
  const marks=[300,600,1200,1800,3600,7200,10800,14400,21600,28800,43200]; if(marks.includes(step)){ console.log((step/60+'min').padStart(7), 'L'+G.level, X.money(G.money).padStart(9), 'earned',X.money(G.stats.earned).padStart(9),'ports',X.PORTS.filter(p=>G.ports[p.id].open).length,'fleet',G.crafts.length+'/'+G.slots, G.crafts.map(c=>c.type).join(',').slice(0,70), 'ctr',G.stats.contracts,'fish$',G.stats.fishMoney); } }
console.log('errors',errs,'firsts (min): port',(first.port/60).toFixed(1),'L2',(first.l2/60).toFixed(1),'L3',(first.l3/60).toFixed(1),'L5',(first.l5/60||0).toFixed(1),'5th craft',(first.craft/60||0).toFixed(1));
// offline
const before=G.t; const n=X.fastForward(3600); console.log('fastForward 1h ok, landed +'+n, 'dt', Math.round(G.t-before));
