const fs=require('fs'),vm=require('vm');
const src=['01_data','02_map','03_sim','03x_more','03y_vip'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n')+`;globalThis.X={get G(){return G},initWorld,newGame,tick,dispatch,loadJob,unloadJob,bonusDest,legInfo,routeInfo,landWhy,CRAFT_BY,PORT_BY,addCraft,goFish,fishOptions,collect,buyCraft,buySlot,slotCost,portCost,unlockPort,xpNeed,hurry,hurryCost,fastForward,saveGame,loadGame,SPRING,WINTER,SUMMER,JOB_REFRESH,unstoreCraft,storeCraft,assemble,buyPart,givePart,partsHeld,partsCount,awardPart,sellStored,hasYard,yardFits,STORE_CAP,stockShelf,partPrice,netWorth,feat,FEATURES,bonusXp,renameCraft,paintCraft,condOf,wearCraft,overhaul,overhaulCost,cstat,startEvent,EVENTS,evActive,eventMult,urgentRun,expireUrgent,payFor,PORT_BY,sellCatch,catchMarkets,goFish,fishOptions,trapCount,trapMax,refreshHall,hireCrew,dismissCrew,PERKS,buildWork,hasWork,workCost,boardCap,fishPrice,legInfo,setRun,stopRun,runMax,updateRuns,exportSave,importSave,xpNeed,logCount,fastForward,addCraft,roomFor,TRAP_SOAK,rollEvent,season,spawnVip,vipJobs,vipDeliver,updateVips,refreshBoard,genParty,partsCount,holidayOn,holidayNow,thanksgivingDay,eventChoices,shelfPrice,evText,gainXp,cycleHoliday,HOLIDAYS,VIPS,setHolidayForce:v=>{HOLIDAY_FORCE=v;},GEO,KM_LON,GEO_OLD_LONMIN,PORTS,seaRoute,NAV,tourPay,loadOf,has,vipMet,CHAINS,LIVERIES,hasPaint,paintCraft,awardPart,partPool,planSeason,moveCircuit,reliefRun,spawnWeather,nthDay,lastDay,condOf};HOLIDAY_FORCE='off';`;
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
G.ev=null; const it=sh[0], mP=G.money, n0=X.partsCount(); T('buy a part',!X.buyPart('pwm',it.id)&&G.money===mP-it.price&&X.partsCount()===n0+1&&G.ports.pwm.shelf.length===3); T('sold part is gone',/gone/.test(X.buyPart('pwm',it.id)));
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
// VIPs, ship calls, statewide events, holidays
{ const G=X.G, P=X.PORT_BY; G.level=8; ['pwm','rkd','vin','lew','aug'].forEach(id=>{G.ports[id].open=true;}); Object.values(G.ports).forEach(st=>{st.jobs=st.jobs.filter(j=>!j.vip);});
  const v=X.spawnVip(P.pwm); T('vip spawns at the top of the board',!!v&&!!v.vip&&G.ports.pwm.jobs[0]===v&&v.from==='pwm'&&G.ports[v.to].open);
  const base=X.payFor(P.pwm,P[v.to],v.kind,X.season(),false); T('vip pays three or four times the fare',v.pay>=base*2.9&&v.pay<=base*4.1);
  X.spawnVip(P.pwm); T('one vip to a port',G.ports.pwm.jobs.filter(j=>j.vip).length===1);
  X.refreshBoard(P.pwm); T('vip survives a board refresh',G.ports.pwm.jobs.some(j=>j.id===v.id));
  G.xp=0; const n0=G.stats.vips||0, parts0=X.partsCount(), lg0=X.logCount('vip'); v.vip='part'; v.label='Test crate'; X.vipDeliver(v,G.crafts[0],v.to); T('vip delivery: counted, logged, parts crate',G.stats.vips===n0+1&&X.partsCount()===parts0+1&&X.logCount('vip')===lg0+1);
  v.exp=G.t-1; X.updateVips(); T('vip leaves when its wait is up',!G.ports.pwm.jobs.some(j=>j.id===v.id));
  for(let i=0;i<6;i++){ G.vipNext=G.t; X.updateVips(); } T('one to three vips waiting, never more',X.vipJobs().length>=1&&X.vipJobs().length<=3);
  const cb=X.addCraft('cub','pwm'), vj={id:G.nextId++,from:'pwm',to:'lew',kind:'p',pay:300,label:'Test VIP',ic:'any',vip:'xp',exp:G.t+480}; G.ports.pwm.jobs.unshift(vj);
  G.vipNext=1e12; G.crafts.forEach(q=>{ q.run=null; }); const n1=G.stats.vips; T('vip loads like any job',!X.loadJob(cb,vj.id)); X.dispatch(cb,['lew']); run(cb); T('vip is delivered on landing, fare rides with the craft',G.stats.vips>=n1+1&&cb.state==='landed'&&cb.pend.pay===300); X.collect(cb);
  // events: statewide ones and ship calls
  G.ev=null; const f0=X.legInfo(cb,'lew','pwm').fuel; X.startEvent(X.EVENTS.find(e=>e.id==='fuelwar')); const f1=X.legInfo(cb,'lew','pwm').fuel; T('fuel price war: 30% off, no port',G.ev.port===null&&Math.abs(f1-f0*0.7)<=1&&/30%/.test(G.ev.text));
  T('swap meet marks parts down',(()=>{ const it={price:200}; const a=X.shelfPrice(it); X.startEvent(X.EVENTS.find(e=>e.id==='swapmeet')); return a===200&&X.shelfPrice(it)===125; })());
  G.ev=null; const nb=G.ports.pwm.jobs.length; X.startEvent(X.EVENTS.find(e=>e.id==='cruise'),'pwm'); T('cruise ship floods its port with passengers',G.ev.ship==='cruise'&&G.ports.pwm.jobs.length>=nb+10&&X.eventMult(P.pwm,P.rkd,'p')===1.5&&X.eventMult(P.rkd,P.pwm,'p')===1);
  T('old saves: an event without text still describes itself',/Rockland/.test(X.evText({id:'lobfest',name:'Lobster Festival',port:'rkd',kind:'p',mult:1.6,from:false})));
  const t0=G.t; G.t=300*0.5; const su=X.eventChoices().map(x=>x[0].id); G.t=300*14.5; const wi=X.eventChoices().map(x=>x[0].id); G.t=t0;
  T('cruise ships in summer, none in winter',su.indexOf('cruise')>=0&&wi.indexOf('cruise')<0&&wi.indexOf('freighter')>=0&&wi.indexOf('fuelwar')>=0&&su.indexOf('supper')>=0);
  // unlocks land on the board at once
  Object.values(G.ports).forEach(st=>{st.jobs=st.jobs.filter(j=>!j.vip);}); G.ev=null; G.level=1; G.xp=X.xpNeed(1)-1; X.gainXp(2); T('level 2 puts a VIP on a board',G.level===2&&X.vipJobs().length===1);
  G.xp=X.xpNeed(2)-1; X.gainXp(2); T('level 3 starts an event',G.level===3&&!!G.ev);
  // holidays follow the real calendar
  T('thanksgiving is the fourth thursday',X.thanksgivingDay(2026)===26&&X.thanksgivingDay(2025)===27&&X.thanksgivingDay(2023)===23&&X.thanksgivingDay(2029)===22);
  const hid=(y,m,d)=>{ const h=X.holidayOn(new Date(y,m-1,d)); return h?h.id:null; };
  T('holiday calendar',hid(2026,11,23)==='thanks'&&hid(2026,11,27)==='thanks'&&hid(2026,11,19)===null&&hid(2026,11,28)===null&&hid(2026,12,25)==='christmas'&&hid(2026,12,27)===null&&hid(2026,10,31)==='halloween'&&hid(2026,7,4)==='fourth'&&hid(2027,1,1)==='newyear'&&hid(2026,12,31)==='newyear'&&hid(2026,2,14)==='valentine'&&hid(2026,6,15)===null);
  X.setHolidayForce('thanks'); let hol=0,tot=0,pays=true; for(let i=0;i<60;i++) X.genParty(P.pwm).forEach(j=>{ tot++; if(j.hol){ hol++; if(j.pay<X.payFor(P.pwm,P[j.to],j.kind,X.season(),false)) pays=false; } }); T('holiday jobs turn up among the usual ones and pay more',hol>0&&hol<tot&&pays);
  X.setHolidayForce('off'); let none=true; for(let i=0;i<30;i++) X.genParty(P.pwm).forEach(j=>{ if(j.hol) none=false; }); T('no holiday, no holiday jobs',none&&X.holidayNow()===null);
  X.setHolidayForce(null); G.hol='christmas'; T('preview a holiday from the almanac',X.holidayNow().id==='christmas'); G.hol='off'; T('holidays can be switched off',X.holidayNow()===null);
  X.cycleHoliday(); T('the setting cycles',G.hol==='newyear'); delete G.hol; X.setHolidayForce('off');
  const icons=new Set([...fs.readFileSync('src/04_art.js','utf8').matchAll(/^ (\w+):\s*\[/gm)].map(m=>m[1])), looks=new Set(['hunter','skier','tourist','fisher','kid','suit','nurse','guide','sled','elder','cap','any']);
  const lists=[[X.VIPS.p,'p'],[X.VIPS.c,'c']]; X.HOLIDAYS.forEach(h=>{ lists.push([h.jobs.p,'p'],[h.jobs.c,'c'],[h.vip.p,'p'],[h.vip.c,'c']); });
  const badArt=[]; lists.forEach(([l,k])=>l.forEach(x=>{ const ic=x.split('|')[1]; if(!(k==='p'?looks:icons).has(ic)) badArt.push(x); })); T('every VIP and holiday job has art: '+badArt.join('; '),badArt.length===0);
  const code2=X.exportSave(); T('save code carries the new things',!X.importSave(code2)&&(X.G.stats.vips||0)>=2&&X.logCount('vip')>=1);
}
// New England: regions open by level, customs at the border, the bigger map
{ const G=X.G, P=X.PORT_BY; G.wx=[]; G.wxNext=1e12; G.vipNext=1e12; G.ev=null; G.money=1e7; G.crafts.forEach(q=>{ q.run=null; });
  T('54 ports, every one inside the map',X.PORTS.length===54&&X.PORTS.every(p=>p.x>2&&p.y>2&&p.x<X.NAV.w-2&&p.y<X.NAV.h-2));
  T('every harbor can be reached by sea from Portland',X.PORTS.filter(p=>p.water==='sea'&&p.id!=='pwm').every(p=>!!X.seaRoute(P.pwm.dock,p.dock)));
  G.level=3; T('New Hampshire waits for level 4',/level 4/.test(X.unlockPort('psm'))&&!G.ports.psm.open); G.level=4; T('and opens at level 4',X.unlockPort('psm')===null&&G.ports.psm.open);
  T('Boston waits for level 6, Canada for level 8',/level 6/.test(X.unlockPort('bos'))&&/level 8/.test(X.unlockPort('ysj'))); G.level=8; ['bos','ysj','bgr','aug'].forEach(id=>X.unlockPort(id)); T('both open at level 8',G.ports.bos.open&&G.ports.ysj.open);
  const cb=X.addCraft('cub','bgr'), li=X.legInfo(cb,'bgr','ysj'), li2=X.legInfo(cb,'bgr','aug');
  T('a border leg shows a minute of customs',li.ok&&li.cust===true&&li2.cust===false&&Math.abs(li.time-li.dist/X.cstat(cb).speed-60)<0.01);
  const jb={id:G.nextId++,from:'bgr',to:'ysj',kind:'p',pay:200,label:'t',ic:'any'}; G.ports.bgr.jobs.unshift(jb); X.loadJob(cb,jb.id); X.dispatch(cb,['ysj']);
  let n=0; while(cb.state==='move'&&cb.route.pos<cb.route.len&&n++<5000) X.tick(1); const tA=G.t; T('at the far end it waits for customs',cb.state==='move'&&cb.route.cust>0&&cb.route.cust<=60);
  n=0; while(cb.state==='move'&&n++<300) X.tick(1); T('then lands a minute later',cb.state==='landed'&&cb.at==='ysj'&&Math.abs((G.t-tA)-60)<=3); X.collect(cb);
  X.unlockPort('hvn'); const sk=X.addCraft('skiff','pwm'), far=X.legInfo(sk,'pwm','hvn'); T('a skiff cannot reach New Haven: out of range',!far.ok&&/out of range/.test(far.why));
  const js=JSON.parse(Buffer.from(X.exportSave(),'base64').toString('utf8')), dx=(X.GEO_OLD_LONMIN-X.GEO.lonMin)*X.KM_LON, x0=G.crafts[0].x; delete js.geo; js.crafts.forEach(c=>{ c.x-=dx; if(c.route&&c.route.pts) c.route.pts=c.route.pts.map(q=>[q[0]-dx,q[1]]); });
  T('the map grew 125 km to the west',Math.abs(dx-125.12)<0.01); T('a save from the Maine-only map is moved over',!X.importSave(Buffer.from(JSON.stringify(js),'utf8').toString('base64'))&&Math.abs(X.G.crafts[0].x-x0)<0.01&&X.G.geo===2);
}
// ships: deep-water harbors, lots and groups, the excursion boat
{ const G=X.G, P=X.PORT_BY; G.wx=[]; G.wxNext=1e12; G.vipNext=1e12; G.ev=null; G.money=1e7; G.level=16; X.setHolidayForce('off'); ['pwm','bos','psm','vin','rkd'].forEach(id=>{ G.ports[id].open=true; });
  T('19 deep-water harbors',X.PORTS.filter(p=>X.has(p,'deep')).length===19);
  T('a freighter needs a deep berth',X.landWhy(X.CRAFT_BY.freight,{},P.vin,X.SUMMER)==='needs a deep-water berth'&&X.landWhy(X.CRAFT_BY.freight,{},P.bos,X.SUMMER)===null&&X.landWhy(X.CRAFT_BY.ferry,{},P.vin,X.SUMMER)===null);
  const fy=X.addCraft('ferry','pwm'); let lot=null; for(let i=0;i<400&&!lot;i++){ const pr=X.genParty(P.pwm); if(pr.length===1&&pr[0].n&&pr[0].kind==='p'&&pr[0].to==='bos') lot=pr[0]; }
  T('with a ferry in the fleet, groups of ten or twenty turn up',!!lot&&(lot.n===10||lot.n===20));
  if(lot){ const one=X.payFor(P.pwm,P.bos,'p',X.season(),false); T('a group pays a bulk rate for every seat',Math.abs(lot.pay-one*lot.n*0.85)<=5);
    G.ports.pwm.jobs.unshift(lot); const sk2=X.addCraft('skiff','pwm'); T('it does not fit a small boat',/takes|No seats/.test(X.loadJob(sk2,lot.id)||''));
    T('one tap puts the whole group aboard',!X.loadJob(fy,lot.id)&&X.loadOf(fy).pax===lot.n&&fy.jobs.length===1&&X.roomFor(fy,'p')===24-lot.n);
    const d0=G.stats.delivered; X.dispatch(fy,['bos']); run(fy,6000); T('delivered as '+lot.n+' passengers',fy.state==='landed'&&fy.pend.pay===lot.pay&&G.stats.delivered===d0+lot.n); X.collect(fy); }
  const ex=X.addCraft('excur','pwm'), jq={id:G.nextId++,from:'pwm',to:'bos',kind:'p',pay:50,label:'t',ic:'any'}; G.ports.pwm.jobs.unshift(jq);
  T('an excursion boat takes no jobs',typeof X.loadJob(ex,jq.id)==='string'&&ex.jobs.length===0);
  T('it cannot tie up at a shallow harbor',!X.legInfo(ex,'pwm','vin').ok&&/deep/.test(X.legInfo(ex,'pwm','vin').why));
  const ri=X.routeInfo(ex,['psm','bos','pwm']); T('the route shows what the loop will pay',ri.ok&&ri.income>1500);
  T('a harbor seen twice pays half',Math.abs(X.tourPay(ex,'bos',100,true)*2-X.tourPay(ex,'bos',100,false))<=10);
  const s0=X.season(); X.dispatch(ex,['psm','bos','pwm']); let n=0; while(ex.state!=='landed'&&n++<9000) X.tick(1);
  T('paid at every stop of the loop',ex.state==='landed'&&ex.at==='pwm'&&ex.pend.stops===3&&(X.season()!==s0||Math.abs(ex.pend.pay-ri.income)<=15)&&ex.pend.pay>1500); const m0=G.money; X.collect(ex); T('and collected like any fare',G.money>m0+1500);
}
// deeper VIPs, events and holidays
{ const G=X.G, P=X.PORT_BY; G.wx=[]; G.wxNext=1e12; G.vipNext=1e12; G.ev=null; G.money=1e7; G.level=16; G.xp=0; X.setHolidayForce('off'); ['pwm','rkd','vin','bbh','bhb','sto','jon','psm','bos','aug','lew'].forEach(id=>{ G.ports[id].open=true; });
  const hid=(y,m,d)=>{ const h=X.holidayOn(new Date(y,m-1,d)); return h?h.id:null; };
  T('eleven holidays',X.HOLIDAYS.length===11);
  T('the moving holidays land on the right days',hid(2026,3,17)==='stpat'&&hid(2026,3,22)==='maple'&&hid(2026,3,20)==='maple'&&hid(2026,3,19)===null&&hid(2026,4,20)==='patriots'&&hid(2026,4,17)===null&&hid(2026,5,25)==='memorial'&&hid(2026,5,22)==='memorial'&&hid(2026,5,26)===null&&hid(2026,9,7)==='labor'&&hid(2026,9,4)==='labor'&&hid(2026,9,8)===null&&hid(2025,8,30)==='labor'&&hid(2025,9,1)==='labor'&&hid(2025,8,28)===null);
  const c0=G.crafts.find(q=>q.state==='dock')||G.crafts[0], vj=(o)=>Object.assign({id:G.nextId++,from:'pwm',to:'rkd',kind:'p',pay:300,label:'Some VIP '+G.nextId,ic:'any',vip:'part',exp:G.t+480},o);
  T('a VIP who wants no stops',X.vipMet(vj({pref:'direct'}),c0)===true&&X.vipMet(vj({pref:'direct',hops:1}),c0)===false);
  const tt=G.t; G.t=Math.floor(G.t/300)*300+300*0.5; const dayOk=X.vipMet(vj({pref:'day'}),c0); G.t=Math.floor(G.t/300)*300+300*0.95; const nightOk=X.vipMet(vj({pref:'day'}),c0); G.t=tt; T('a VIP who wants daylight',dayOk===true&&nightOk===false);
  c0.cond=40; T('a VIP who wants a sound craft',X.vipMet(vj({pref:'fit'}),c0)===false); c0.cond=100; T('and gets one',X.vipMet(vj({pref:'fit'}),c0)===true);
  const pc0=X.partsCount(); const met=X.vipDeliver(vj({pref:'direct',hops:1}),c0,'rkd'); T('condition missed: no crate',met===false&&X.partsCount()===pc0); const met2=X.vipDeliver(vj({pref:'direct'}),c0,'rkd'); T('condition met: crate',met2===true&&X.partsCount()===pc0+1);
  const li=X.LIVERIES.findIndex(L=>L[3]==='chain:lights'); T('lighthouse paint has to be earned',li>0&&!X.hasPaint(li)&&/earned/.test(X.paintCraft(c0,li)));
  ['rkd','bbh','bhb','sto','jon'].forEach((pid,i)=>X.vipDeliver(vj({label:'The lighthouse inspector',vip:'word'}),c0,pid)); X.vipDeliver(vj({label:'The lighthouse inspector',vip:'word'}),c0,'rkd');
  T('five different harbors finish the inspector\'s list',G.chains.lights.done===1&&G.chains.lights.n===5&&X.hasPaint(li)&&X.paintCraft(c0,li)===null&&c0.liv===li);
  T('an inland town does not count for him',(()=>{ const n=(G.chains.critic||{n:0}).n; X.vipDeliver(vj({label:'A food critic from away',vip:'word'}),c0,'vin'); return ((G.chains.critic||{n:0}).n)===n; })());
  T('the gilded plane is never for sale or on a shelf',/Not for sale/.test(X.buyCraft('gilt','pwm'))&&!X.partPool('pwm','h').some(q=>q.rare));
  let gp=false; for(let i=0;i<60&&!gp;i++){ X.awardPart('VIP delivered',true); gp=Object.keys(G.parts).some(k=>k.indexOf('gilt:')===0); } T('its parts come in VIP crates',gp);
  let ord=true; for(let i=0;i<40;i++){ X.awardPart('Level'); } T('and never in ordinary ones',(()=>{ const b=Object.keys(G.parts).filter(k=>k.indexOf('gilt:')===0).reduce((a,k)=>a+G.parts[k],0); for(let i=0;i<60;i++) X.awardPart('Level'); return Object.keys(G.parts).filter(k=>k.indexOf('gilt:')===0).reduce((a,k)=>a+G.parts[k],0)===b; })());
  const hv=X.HOLIDAYS.find(h=>h.id==='thanks'), hi=X.LIVERIES.findIndex(L=>L[3]==='thanks'); X.vipDeliver(vj({label:hv.vip.p[0].split('|')[0],vip:'word'}),c0,'rkd'); T('carrying a holiday VIP earns that holiday\'s paint',hi>0&&X.hasPaint(hi));
  // the season's calendar
  G.ev=null; G.t=300*7*4*3+300*0.2; X.planSeason(); T('three events are planned for the season, in order',G.cal.length===3&&G.cal[0].day===1&&G.cal[1].day===3&&G.cal[2].day===5&&G.cal.every(q=>q.name));
  G.lastDay=X.G.lastDay; for(let i=0;i<310;i++) X.tick(1); T('the first one starts on its day',!!G.ev&&G.cal[0].done===1&&G.ev.id===G.cal[0].id);
  G.ev=null; X.startEvent(X.EVENTS.find(e=>e.id==='races')); const c1=G.ev.port; T('the boat races visit several lobster harbors',G.ev.circuit.length>=2&&G.ev.circuit.every(id=>X.has(P[id],'lobster'))&&X.eventMult(P.pwm,P[c1],'p')===1.5);
  X.moveCircuit(); T('and move on each day',G.ev.port===G.ev.circuit[1]&&G.ev.port!==c1&&X.eventMult(P.pwm,P[c1],'p')===1&&/bound for/.test(G.ev.text));
  G.ev=null; let rr=null; for(let i=0;i<60&&!rr;i++) rr=X.reliefRun({type:'storm',x:P.vin.x,y:P.vin.y,r:30}); T('a storm leaves relief work behind',!!rr&&rr.length===3&&rr.every(j=>j.to==='vin'&&j.urgent&&j.relief)&&G.ports[rr[0].from].jobs.indexOf(rr[0])>=0);
  G.wx=[]; let near=true; for(let i=0;i<30;i++){ G.wx=[]; X.spawnWeather(); G.wx.forEach(w=>{ if(!X.PORTS.some(p=>G.ports[p.id].open&&Math.hypot(p.x-w.x,p.y-w.y)<260)) near=false; }); } T('weather turns up near the ports you serve',near); G.wx=[];
  const code3=X.exportSave(); T('all of it survives a save code',!X.importSave(code3)&&X.G.chains.lights.done===1&&X.G.liv['chain:lights']===1&&Array.isArray(X.G.cal));
}
console.log('rules ok',ok,'failed',bad);
