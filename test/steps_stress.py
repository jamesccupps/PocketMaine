pg.click('#mbox .btn.go'); pg.wait_for_timeout(300); pg.click('.startc >> nth=0'); pg.wait_for_timeout(400)
pg.evaluate("()=>{ G.tutDone=true; }"); pg.wait_for_timeout(200)
res = pg.evaluate("""() => {
  const errs = []; let n = 0;
  function bot(){
    for(const c of G.crafts){ if(c.state==='landed'){ if(Math.random()<0.5) collect(c); else selectCraft(c.id,false); } if((c.state==='move'||c.state==='fish')&&Math.random()<0.02) hurry(c); if(c.state!=='dock') continue; const st=G.ports[c.at];
      const dests={}; st.jobs.concat(st.lay).forEach(j=>{ const li=legInfo(c,c.at,j.to); if(!li.ok) return; dests[j.to]=(dests[j.to]||0)+j.pay; });
      G.active.forEach(k=>{ if(k.from===c.at && legInfo(c,c.at,k.to).ok) dests[k.to]=(dests[k.to]||0)+k.rate*4; });
      let best=null,bv=0; for(const d in dests){ if(dests[d]>bv){bv=dests[d];best=d;} }
      const T=CRAFT_BY[c.type];
      if(best){ G.active.forEach(k=>{ if(k.from===c.at&&k.to===best) loadContract(c,k.id); }); loadAllFor(c,best);
        const second = Object.keys(dests).filter(d=>d!==best && legInfo(c,best,d).ok)[0]; if(second && Math.random()<0.4){ st.jobs.filter(j=>j.to===second).forEach(j=>loadJob(c,j.id)); dispatch(c,[best,second]); } else dispatch(c,[best]); continue; }
      if(c.jobs.length){ const j=c.jobs[0]; if(legInfo(c,c.at,j.to).ok) dispatch(c,[j.to]); else unloadJob(c,j.id); continue; }
      if(T.fish){ const o=fishOptions(c).filter(o=>o.inRange); if(o.length){ goFish(c,o[0].g.id,o[0].sp); continue; } }
      const opts=PORTS.filter(p=>G.ports[p.id].open&&p.id!==c.at&&legInfo(c,c.at,p.id).ok); if(opts.length && Math.random()<0.3) dispatch(c,[opts[(Math.random()*opts.length)|0].id]);
    }
    G.offers.slice().forEach(o=>{ if(o.canDo&&G.active.length<2) acceptContract(o.id); });
    const locked=PORTS.filter(p=>!G.ports[p.id].open).sort((a,b)=>a.cost-b.cost); if(Math.random()<0.01) G.money+=20000;
    if(locked.length && G.money>portCost(locked[0].id)*1.2) unlockPort(locked[0].id); if(G.crafts.length>=G.slots && G.money>slotCost()*2) buySlot();
    const T=CRAFT[(Math.random()*CRAFT.length)|0]; if(G.money>T.price*1.5 && G.crafts.length<16){ const base=PORTS.filter(p=>G.ports[p.id].open&&yardFits(T,p.id)); if(base.length) buyCraft(T.id, base[(Math.random()*base.length)|0].id); }
    // yards: buy parts, build, store, take out, sell from storage, and poke the screens
    { const yp=PORTS.filter(p=>p.yard&&G.ports[p.id].open); if(yp.length){ const y=yp[(Math.random()*yp.length)|0]; const sh=G.ports[y.id].shelf||[]; if(sh.length&&Math.random()<0.3) buyPart(y.id, sh[0].id);
        CRAFT.forEach(T=>{ if(canAssemble(T.id)&&Math.random()<0.5) assemble(T.id,y.id); });
        if(Math.random()<0.05){ const q=G.crafts.find(c=>c.state==='dock'&&!c.jobs.length&&hasYard(c.at,CRAFT_BY[c.type])); if(q) storeCraft(q); }
        if(G.stored.length&&Math.random()<0.08) unstoreCraft(0,y.id); if(G.stored.length>4&&Math.random()<0.1) sellStored(0);
        if(Math.random()<0.03){ selectPort(y.id,true); } if(Math.random()<0.02) openMenu('yard'); } }
    // level features: poke every one of them at random
    { const cs=G.crafts, c=cs[(Math.random()*cs.length)|0], open=PORTS.filter(p=>G.ports[p.id].open);
      if(c){ if(Math.random()<0.02) renameCraft(c,'Test '+((Math.random()*99)|0)); if(Math.random()<0.02) paintCraft(c,(Math.random()*LIVERIES.length)|0);
        if(condOf(c)<60&&Math.random()<0.3) overhaul(c,Math.random()<0.5); if(c.fish&&c.state==='dock'&&Math.random()<0.7) sellCatch(c);
        if((G.hall||[]).length&&Math.random()<0.03) hireCrew(c,G.hall[0].id); if(c.crew&&Math.random()<0.005) dismissCrew(c);
        if(!c.run&&c.state==='dock'&&Math.random()<0.02&&open.length>1) setRun(c,open[(Math.random()*open.length)|0].id); if(c.run&&Math.random()<0.004) stopRun(c);
        if(c.state==='dock'&&CRAFT_BY[c.type].fish&&!c.jobs.length&&Math.random()<0.2){ const o=fishOptions(c).filter(o=>o.inRange); if(o.length){ const q=o[(Math.random()*o.length)|0]; goFish(c,q.g.id,q.sp,q.mode); } }
        if(Math.random()<0.02){ selectCraft(c.id,false); UI.stab='craft'; UI.cseg=['gear','looks','crew','run','keep'][(Math.random()*5)|0]; } }
      if(open.length&&Math.random()<0.02) buildWork(open[(Math.random()*open.length)|0].id, ['fuel','pound','inn'][(Math.random()*3)|0]);
      if(Math.random()<0.004){ const code=exportSave(); const e=importSave(code); if(e) throw new Error('save code round trip failed: '+e); } }
    const c=G.crafts[(Math.random()*G.crafts.length)|0]; const ups=upgradesFor(c); const u=ups[(Math.random()*ups.length)|0]; if(G.money>upgradeCost(c,u.id)*4) buyUpgrade(c,u.id);
    const pp=PORTS.filter(p=>G.ports[p.id].open)[(Math.random()*5)|0]; if(pp && G.money>portUpgradeCost(pp.id)*5) upgradePort(pp.id);
  }
  const tabs=['dispatch','contracts','market','almanac'];
  UI.paused = true; for(let step=0; step<3000; step++){   // 3000 x 12 s = 10 game-hours
    try { for(let i=0;i<12;i++) tick(1); bot();
      if(step%5===0){ const r=Math.random(); const c=G.crafts[(Math.random()*G.crafts.length)|0];
        if(r<0.4){ selectCraft(c.id, Math.random()<0.5); UI.stab=['jobs','port','craft','fish'][(Math.random()*4)|0]; if(Math.random()<0.3){ const st=G.ports[UI.selPort||'pwm']; if(st&&st.jobs.length) UI.filter=st.jobs[0].to; } if(c.state==='dock'&&Math.random()<0.3){ startRouting(); const o=PORTS.filter(p=>G.ports[p.id].open); addStop(o[(Math.random()*o.length)|0].id); if(Math.random()<0.5) act('undo'); if(Math.random()<0.3) act('cancelRoute'); } }
        else if(r<0.7) selectPort(PORTS[(Math.random()*PORTS.length)|0].id, Math.random()<0.3); else if(r<0.9) openMenu(tabs[1+((Math.random()*3)|0)]); else deselect();
        VIEW.zi=(Math.random()*5)|0; document.getElementById('toasts').innerHTML=''; }
      refreshSel(); { const c=UI.selCraft; if(UI.screen==='route'&&(!c||c.state!=='dock')) deselect(); if((UI.screen==='route')!==!!UI.reach) computeReach(); }
      handleEvents(); UI.sig=''; UI.lastRender=0; UI.pointerDown=false; if(step%3===0){ drawMap(step*1000, UI); renderFleet(); renderPanel(1e9+step*1000); updateLive(step*1000); }
      n++;
    } catch(e){ if(errs.length<8) errs.push(String(e.stack).split('\\n').slice(0,3).join(' | ')); }
  }
  return {errs, n, level:G.level, slots:G.slots, money:G.money, earned:G.stats.earned, crafts:G.crafts.length, ports:PORTS.filter(p=>G.ports[p.id].open).length, year:yearOf(G.t), contracts:G.stats.contracts, fish:G.stats.fishMoney, lay:PORTS.reduce((a,p)=>a+G.ports[p.id].lay.length,0), saved: saveGame(STORE), size: JSON.stringify(G).length};
}""")
print(res)
pg.evaluate("() => { document.getElementById('toasts').innerHTML=''; VIEW.popups.length=0; G.wall = Date.now(); UI.paused = false; VIEW.zi = 2; centerOn(230,380); deselect(); forcePanel(); }")
pg.wait_for_timeout(1200); pg.screenshot(path='test/st_end.png')
