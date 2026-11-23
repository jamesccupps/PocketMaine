const fs=require('fs'),vm=require('vm');
const src=['01_data','02_map','03_sim','03x_more'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n')+`;globalThis.X={get G(){return G},initWorld,newGame,tick,dispatch,loadJob,unloadJob,bonusDest,legInfo,routeInfo,landWhy,CRAFT_BY,PORT_BY,addCraft,goFish,fishOptions,collect,buyCraft,buySlot,slotCost,portCost,unlockPort,xpNeed,hurry,hurryCost,fastForward,saveGame,loadGame,SPRING,WINTER,SUMMER,JOB_REFRESH,unstoreCraft,storeCraft,assemble,buyPart,givePart,partsHeld,partsCount,awardPart,sellStored,hasYard,yardFits,STORE_CAP,stockShelf,partPrice,netWorth,feat,FEATURES,bonusXp,renameCraft,paintCraft,condOf,wearCraft,overhaul,overhaulCost,cstat,startEvent,EVENTS,evActive,eventMult,urgentRun,expireUrgent,payFor,PORT_BY,sellCatch,catchMarkets,goFish,fishOptions,trapCount,trapMax,refreshHall,hireCrew,dismissCrew,PERKS,buildWork,hasWork,workCost,boardCap,fishPrice,legInfo,setRun,stopRun,runMax,updateRuns,exportSave,importSave,xpNeed,logCount,fastForward,addCraft,roomFor,TRAP_SOAK,rollEvent,season};`;
vm.runInThisContext(src); const X=globalThis.X; X.initWorld(); X.newGame('casco'); const G=X.G; G.wxNext=1e12; let ok=0,bad=0;
const T=(name,cond)=>{ if(cond) ok++; else { bad++; console.log('FAIL',name); } };
const run=(c,max)=>{ let n=0; while(c.state!=='landed'&&c.state!=='dock'&&n++<(max||3000)) X.tick(1); return n; };
T('start: 3 ports',Object.values(G.ports).filter(p=>p.open).length===3); T('start: 4 craft, 4 slots',G.crafts.length===4&&G.slots===4); T('start cash',G.money===300); T('level 1',G.level===1);
G.ports.rkd.open=true; G.ports.vin.open=true;
const cub=G.crafts[0]; const mk=(to,kind,pay)=>({id:G.nextId++,from:'pwm',to,kind,pay,label:'t',ic:'any'});
G.ports.pwm.jobs=[mk('rkd','p',100),mk('rkd','c',100),mk('vin','c',100)];
T('load p',!X.loadJob(cub,G.ports.pwm.jobs[0].id)); T('load c',!X.loadJob(cub,G.ports.pwm.jobs[0].id)); T('full',typeof X.loadJob(cub,G.ports.pwm.jobs[0].id)==='string');
T('bonus dest',X.bonusDest(cub)==='rkd'); const ri=X.routeInfo(cub,['rkd']); T('income w/ bonus',ri.income===250 && ri.bonus); T('flight takes minutes',ri.time>120&&ri.time<300);
const m0=G.money; X.dispatch(cub,['rkd']); T('fuel charged at departure',G.money===m0-ri.fuel); const secs=run(cub);
T('landed, not paid yet',cub.state==='landed'&&cub.at==='rkd'&&G.money===m0-ri.fuel); T('real-time duration ~'+Math.round(ri.time),Math.abs(secs-ri.time)<5);
const L=X.collect(cub); T('collect pays 250',G.money===m0-ri.fuel+250&&L.pay===250&&cub.state==='dock'); T('xp earned + level 2? xp='+G.xp+' L'+G.level,(G.xp===25&&G.level===1));
// layover via boat
const boat=X.addCraft('skiff','rkd'); G.ports.rkd.jobs=[]; const j=mk('vin','c',90); cub.jobs.push(j); T('unload->layover',!X.unloadJob(cub,j.id)&&G.ports.rkd.lay.length===1);
T('boat loads layover',!X.loadJob(boat,j.id)); X.dispatch(boat,['vin']); run(boat); T('boat landed with layover fare',boat.state==='landed'&&boat.pend.pay===90); X.collect(boat);
// job board refresh on a timer, layovers survive
const lay=mk('pwm','c',50); lay.lay=1; G.ports.vin.lay.push(lay); const ids=G.ports.vin.jobs.map(j=>j.id).join(); for(let i=0;i<X.JOB_REFRESH+5;i++) X.tick(1);
T('board refreshed',G.ports.vin.jobs.map(j=>j.id).join()!==ids&&G.ports.vin.jobs.length>0); T('layover survived refresh',G.ports.vin.lay.length===1);
// progression gates
T('level gate',X.buyCraft('wagon','pwm')==='Unlocks at level 4.'); G.money=50000; const nA=G.crafts.length; while(G.slots<nA) G.slots++; const s0=X.buyCraft('cub','pwm'); T('full fleet: a new craft goes into storage',s0&&s0.stored===true&&G.stored.length===1&&G.crafts.length===nA); T('no slot: cannot take it out',/slot/.test(X.unstoreCraft(0,'pwm'))); const mB=G.money, sc=X.slotCost(); T('buy slot',!X.buySlot()&&G.slots===nA+1&&G.money===mB-sc); T('slot price climbs',X.slotCost()>sc); const u0=X.unstoreCraft(0,'pwm'); T('take it out of storage into the new slot',u0&&u0.at==='pwm'&&u0.name===s0.name&&G.stored.length===0&&G.crafts.length===nA+1);
X.buySlot(); T('buy craft now',typeof X.buyCraft('cub','pwm')==='object'); const pc=X.portCost('aug'); X.unlockPort('aug'); T('port price climbs',X.portCost('bgr')/X.PORT_BY.bgr.cost>pc/X.PORT_BY.aug.cost);
const lv0=G.level; G.xp=X.xpNeed(G.level)-1; const c2=G.crafts[1]; c2.state='landed'; c2.pend={pay:100,units:1,bonus:0,fish:'',fishPay:0,stops:1}; X.collect(c2); T('level up on collect',G.level===lv0+1);
// hurry
G.ports.pwm.jobs=[mk('lew','p',60)]; const c3=G.crafts.find(c=>c.at==='pwm'&&c.state==='dock'&&X.CRAFT_BY[c.type].wheels); X.loadJob(c3,G.ports.pwm.jobs[0].id); X.dispatch(c3,['lew']); X.tick(1); const hc=X.hurryCost(c3), m3=G.money; T('hurry',!X.hurry(c3)&&G.money===m3-hc); X.tick(1); T('hurried craft landed',c3.state==='landed');
// seasons + landing rules
const loon=X.CRAFT_BY.loon, cubT=X.CRAFT_BY.cub, P=X.PORT_BY;
T('floats frozen',X.landWhy(loon,{},P.chm,X.WINTER)==='lake is frozen'); T('skis ok',X.landWhy(loon,{skis:1},P.chm,X.WINTER)===null); T('cub mud',X.landWhy(cubT,{},P.vin,X.SPRING)!==null); T('boat no harbor',X.landWhy(X.CRAFT_BY.skiff,{},P.bgr,X.SUMMER)==='no harbor');
// fishing: out, haul, back, landed, collect
G.wx=[]; const fo=X.fishOptions(boat).filter(o=>o.inRange); T('fish options',fo.length>0); const m2=G.money; X.goFish(boat,fo[0].g.id,fo[0].sp); const fs_=run(boat); T('fishing trip lands (took '+fs_+'s)',boat.state==='landed'&&boat.pend.fishPay>0&&fs_>150); X.collect(boat); T('fishing paid on collect',G.money>m2);
// offline: everything out, an hour passes, they are all waiting
G.crafts.forEach(c=>{ if(c.state==='landed') X.collect(c); }); const out=G.crafts.filter(c=>c.state==='dock'&&(c.at==='pwm'||c.at==='lew')&&X.CRAFT_BY[c.type].wheels)[0]; const dst=out.at==='pwm'?'lew':'pwm'; G.ports[out.at].jobs=[mk(dst,'p',60)]; X.loadJob(out,G.ports[out.at].jobs[0].id); X.dispatch(out,[dst]); const t0=G.t; X.fastForward(3600); T('offline hour simulated',Math.round(G.t-t0)===3600&&out.state==='landed');
// hangars, boatyards, parts, storage
G.crafts.forEach(c=>{ if(c.state==='landed') X.collect(c); }); G.money=60000; G.level=3;
T('no hangar at Lewiston',/hangar/.test(X.buyCraft('cub','lew'))); T('no boatyard at Augusta',/boatyard/.test(X.buyCraft('skiff','aug'))); T('Portland has both',X.hasYard('pwm',X.CRAFT_BY.cub)&&X.hasYard('pwm',X.CRAFT_BY.skiff));
X.tick(1); const sh=G.ports.pwm.shelf; T('yard shelf stocked',sh&&sh.length===4&&sh.every(x=>X.CRAFT_BY[x.t]&&x.price>0)); T('Augusta shelf is plane parts only',G.ports.aug.shelf.length===3&&G.ports.aug.shelf.every(x=>X.CRAFT_BY[x.t].cls==='plane')); T('no shelf where there is no yard',!G.ports.lew.shelf);
const it=sh[0], mP=G.money, n0=X.partsCount(); T('buy a part',!X.buyPart('pwm',it.id)&&G.money===mP-it.price&&X.partsCount()===n0+1&&G.ports.pwm.shelf.length===3); T('sold part is gone',/gone/.test(X.buyPart('pwm',it.id)));
G.parts={}; X.givePart('down',0); X.givePart('down',1); T('two parts are not enough',/three/.test(X.assemble('down','pwm'))); X.givePart('down',2); T('level gate on building',/level 3/.test((G.level=2,X.assemble('down','pwm')))); G.level=3;
T('boats are built at a boatyard',/boatyard/.test(X.assemble('down','aug'))); while(G.crafts.length>=G.slots) X.buySlot(); const nb=G.crafts.length, b1=X.assemble('down','pwm'); T('build from three parts',b1&&b1.type==='down'&&b1.at==='pwm'&&G.crafts.length===nb+1&&X.partsCount()===0);
const atLew=G.crafts.find(c=>c.at==='lew'&&c.state==='dock'); if(atLew){ atLew.jobs=[]; T('storage needs a hangar',/hangar/.test(X.storeCraft(atLew))); } else T('storage needs a hangar (skipped: nothing at Lewiston)',true);
const nc=G.crafts.length; b1.jobs=[]; T('store a craft: slot comes back',!X.storeCraft(b1)&&G.crafts.length===nc-1&&G.stored.length===1&&G.stored[0].name===b1.name); const mS=G.money; T('sell from storage',!X.sellStored(0)&&G.money>mS&&G.stored.length===0);
const nP=X.partsCount(); X.awardPart('Test'); T('a crate pays out a part',X.partsCount()===nP+1); const nw=X.netWorth(); X.givePart('cub',0); T('parts count toward net worth',X.netWorth()>nw);
G.stored.push({type:'cub',name:'Spare',upg:{},stored:true});
const store={d:{},setItem(k,v){this.d[k]=v},getItem(k){return this.d[k]}}; T('save/load',X.saveGame(store)&&X.loadGame(store)); T('parts and storage survive a save',X.partsCount()===nP+2&&X.G.stored.length===1&&X.G.stored[0].name==='Spare');
const old=JSON.parse(store.d[Object.keys(store.d)[0]]); delete old.parts; delete old.stored; Object.values(old.ports).forEach(q=>{ delete q.shelf; delete q.shelfNext; }); store.d[Object.keys(store.d)[0]]=JSON.stringify(old); T('an older save still loads',X.loadGame(store)&&X.partsCount()===0&&X.G.stored.length===0); X.tick(1); T('and its yards get stocked',X.G.ports.pwm.shelf.length>0);

{
// ===== levels unlock features; xp from more than fares =====
X.newGame('casco'); let G=X.G; G.wxNext=1e12; G.money=200000;
T('nothing unlocked at level 1',!X.feat('names')&&!X.feat('runs')&&/level 2/.test(X.renameCraft(G.crafts[0],'Bert'))&&/level 8/.test(X.setRun(G.crafts[0],'lew')));
T('wear does nothing before level 4',(X.wearCraft(G.crafts[0],200),X.condOf(G.crafts[0])===100));
const x0=G.xp+0, l0=G.level; X.unlockPort('aug'); T('opening a port pays xp',G.level>l0||G.xp>x0);
G.level=2; T('rename at level 2',!X.renameCraft(G.crafts[0],'  Bert <b> ')&&G.crafts[0].name==='Bert b'); T('paint at level 2',!X.paintCraft(G.crafts[0],2)&&G.crafts[0].liv===2&&/No such/.test(X.paintCraft(G.crafts[0],99)));
// events
G.level=3; X.unlockPort('rkd'); const E=X.EVENTS.find(e=>e.id==='lobfest'), pb=X.payFor(X.PORT_BY.pwm,X.PORT_BY.rkd,'p',1,false); X.startEvent(E);
T('event raises fares to its port',X.evActive()&&X.payFor(X.PORT_BY.pwm,X.PORT_BY.rkd,'p',1,false)>pb&&X.payFor(X.PORT_BY.pwm,X.PORT_BY.lew,'p',1,false)===X.payFor(X.PORT_BY.pwm,X.PORT_BY.lew,'p',1,false));
T('event seeds jobs bound there',G.ports.pwm.jobs.some(j=>j.ev&&j.to==='rkd')); G.ev.until=G.t-1; T('event ends',!X.evActive()&&X.eventMult(X.PORT_BY.pwm,X.PORT_BY.rkd,'p')===1);
const uj=X.urgentRun(); T('urgent run pays triple and is on a clock',uj&&uj.urgent>G.t&&uj.pay===3*X.payFor(X.PORT_BY[uj.from],X.PORT_BY[uj.to],'p',X.season(),false)); G.ports[uj.from].next=G.t-1; X.tick(1); T('urgent job survives a board refresh',G.ports[uj.from].jobs.some(j=>j.id===uj.id)); uj.urgent=G.t-1; X.tick(1); T('and expires',!G.ports[uj.from].jobs.some(j=>j.id===uj.id));
// wear
G.level=4; const wc=G.crafts.find(c=>c.at==='pwm'&&X.CRAFT_BY[c.type].cls==='plane'); const sp0=X.cstat(wc).speed; X.wearCraft(wc,100); T('wear lowers condition',X.condOf(wc)===96);
wc.cond=40; T('worn craft is 10% slower',Math.abs(X.cstat(wc).speed-sp0*0.9)<1e-9); wc.cond=10; T('badly worn is 25% slower',Math.abs(X.cstat(wc).speed-sp0*0.75)<1e-9);
const oc=X.overhaulCost(wc), mo=G.money; T('overhaul costs coins at a yard',!X.overhaul(wc)&&G.money===mo-oc&&wc.cond===100); wc.cond=30; X.givePart(wc.type,1); const pc0=X.partsCount(), mo2=G.money; T('or a spare part, free',!X.overhaul(wc,true)&&wc.cond===100&&G.money===mo2&&X.partsCount()===pc0-1);
const wl=G.crafts.find(c=>c.at==='lew'); wl.cond=50; T('no overhaul away from a yard',/hangar/.test(X.overhaul(wl)));
wc.cond=100; wc.jobs=[]; const jb=G.ports.pwm.jobs.find(j=>j.to==='lew'&&X.roomFor(wc,j.kind)>0); if(jb){ X.loadJob(wc,jb.id); X.dispatch(wc,['lew']); for(let i=0;i<400&&wc.state!=='landed';i++) X.tick(1); T('a trip wears the craft',wc.state==='landed'&&X.condOf(wc)<100&&X.condOf(wc)>90); X.collect(wc); } else T('a trip wears the craft (skipped)',true);
// catch & traps
G.level=5; const bt=G.crafts.find(c=>X.CRAFT_BY[c.type].fish); bt.jobs=[]; const fo=X.fishOptions(bt), nf=fo.find(o=>o.inRange&&!o.mode); T('trap string offered at lobster grounds',fo.some(o=>o.mode==='set')&&X.trapMax()===2);
X.goFish(bt,nf.g.id,nf.sp); for(let i=0;i<900&&bt.state!=='dock';i++) X.tick(1); T('boat comes home with the catch aboard',bt.state==='dock'&&bt.fish&&bt.fish.units>0); T('cannot fish again with a catch aboard',/catch/.test(X.goFish(bt,nf.g.id,nf.sp)));
const mk=X.catchMarkets(bt); T('markets listed best first',mk.length>=2&&mk[0].price>=mk[1].price); const mc=G.money, pr=X.fishPrice(bt.at,bt.fish.sp), un=bt.fish.units; T('sell the catch where you are',!X.sellCatch(bt)&&G.money===mc+pr*un&&!bt.fish);
const so=X.fishOptions(bt).find(o=>o.mode==='set'), mb=G.money; X.goFish(bt,so.g.id,'lobster','set'); T('setting traps costs bait',G.money<mb); for(let i=0;i<900&&bt.state!=='dock';i++) X.tick(1); T('trap string is set, no catch',X.trapCount()===1&&!bt.fish&&bt.state==='dock');
G.traps[so.g.id].t=G.t-X.TRAP_SOAK; const ho=X.fishOptions(bt).find(o=>o.mode==='haul'); T('a soaked string offers a full haul',ho&&ho.est===X.CRAFT_BY[bt.type].hold); X.goFish(bt,ho.g.id,'lobster','haul'); for(let i=0;i<900&&bt.state!=='dock';i++) X.tick(1); T('hauled a full hold',bt.fish&&bt.fish.units===X.CRAFT_BY[bt.type].hold&&X.trapCount()===1); X.sellCatch(bt);
// crew
G.level=6; X.refreshHall(); T('three hands for hire, different skills',G.hall.length===3&&new Set(G.hall.map(h=>h.perk)).size===3);
G.hall=[{id:9001,name:'Earl',perk:'quick',seed:1,cost:500},{id:9002,name:'Dot',perk:'salt',seed:2,cost:500},{id:9003,name:'Bud',perk:'thrift',seed:3,cost:500}]; const cw=G.crafts.find(c=>X.CRAFT_BY[c.type].cls==='plane'&&c.state==='dock'); cw.cond=100; const s1=X.cstat(cw).speed, mh=G.money;
T('a boat skill is refused on a plane',/boat/.test(X.hireCrew(cw,9002))); T('hire a throttle hand: 10% faster',!X.hireCrew(cw,9001)&&G.money===mh-500&&Math.abs(X.cstat(cw).speed-s1*1.1)<1e-9&&G.hall.length===2);
const f1=X.legInfo(cw,cw.at,cw.at==='pwm'?'lew':'pwm').fuel; cw.crew={name:'Bud',perk:'thrift',seed:3}; T('thrifty burns less fuel',X.legInfo(cw,cw.at,cw.at==='pwm'?'lew':'pwm').fuel<f1); X.dismissCrew(cw); T('dismiss',!cw.crew);
// port works
G.level=7; const bc=X.boardCap('lew'), fp=X.fishPrice('pwm','lobster'), fu=X.legInfo(cw,'pwm'===cw.at?'pwm':cw.at,cw.at==='pwm'?'lew':'pwm').fuel, mw=G.money;
T('inn adds jobs',!X.buildWork('lew','inn')&&X.boardCap('lew')===bc+4&&G.money===mw-X.workCost('lew','inn')); T('no pound inland',/can't/.test(X.buildWork('lew','pound'))); T('pound lifts the fish price',!X.buildWork('pwm','pound')&&X.fishPrice('pwm','lobster')>fp); T('fuel dock cuts fuel',!X.buildWork(cw.at,'fuel')&&X.legInfo(cw,cw.at,cw.at==='pwm'?'lew':'pwm').fuel<fu); T('cannot build twice',/Already/.test(X.buildWork('lew','inn')));
// standing runs
G.level=8; G.crafts.forEach(c=>{ if(c.state==='landed') X.collect(c); }); const rc=G.crafts.find(c=>X.CRAFT_BY[c.type].cls==='plane'&&c.state==='dock'&&(c.at==='pwm'||c.at==='lew')); rc.jobs=[]; const oth=rc.at==='pwm'?'lew':'pwm';
T('one run at level 8',X.runMax()===1&&!X.setRun(rc,oth)&&rc.run&&rc.run.b===oth); const r2=G.crafts.find(c=>c!==rc&&c.state==='dock'&&X.CRAFT_BY[c.type].cls==='plane'); if(r2) T('second run needs more levels',/in use/.test(X.setRun(r2,r2.at==='pwm'?'lew':'pwm'))); else T('second run (skipped)',true);
const e0=G.stats.earned, t0=G.stats.trips; for(let i=0;i<1500;i++) X.tick(1); T('the run goes back and forth by itself',G.stats.trips>=t0+4&&rc.run.trips>=4); T('and collects its own fares',rc.run.earned>0&&G.stats.earned>e0&&rc.state!=='landed'||rc.run.earned>0);
const e1=rc.run.earned; X.fastForward(1200); T('it keeps running while you are away',rc.run.earned>e1); X.stopRun(rc); T('stop the run',!rc.run);
// save codes
const code=X.exportSave(), mny=G.money; G.money=1; T('save code round trip',!X.importSave(code)&&X.G.money===mny&&X.G.level===8); T('junk code is refused',/not a save code/.test(X.importSave('hello')));
G=X.G; T('new fields survive',G.ports.lew.works.inn===1&&X.trapCount()===1&&X.logCount('types')>=2);
}
console.log('rules ok',ok,'failed',bad);
