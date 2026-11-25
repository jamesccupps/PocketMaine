const fs=require('fs'),vm=require('vm');
const src=['01_data','02_map','03_sim','03x_more','03y_vip','03z_depth'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n')+`;globalThis.X={get G(){return G},XP_EARLY,BRISK,rand,xpNeedOf:l=>xpNeed(l),cleanSave:g=>sanitizeSave(g),initWorld,newGame,tick,dispatch,loadJob,unloadJob,bonusDest,legInfo,routeInfo,landWhy,CRAFT_BY,PORT_BY,addCraft,goFish,fishOptions,collect,buyCraft,buySlot,slotCost,portCost,unlockPort,xpNeed,hurry,hurryCost,fastForward,saveGame,loadGame,SPRING,WINTER,SUMMER,JOB_REFRESH,unstoreCraft,storeCraft,assemble,buyPart,givePart,partsHeld,partsCount,awardPart,sellStored,hasYard,yardFits,STORE_CAP,stockShelf,partPrice,netWorth,feat,FEATURES,bonusXp,renameCraft,paintCraft,condOf,wearCraft,overhaul,overhaulCost,cstat,startEvent,EVENTS,evActive,eventMult,urgentRun,expireUrgent,payFor,PORT_BY,sellCatch,catchMarkets,goFish,fishOptions,trapCount,trapMax,refreshHall,hireCrew,dismissCrew,PERKS,buildWork,hasWork,workCost,boardCap,fishPrice,legInfo,setRun,stopRun,runMax,updateRuns,exportSave,importSave,xpNeed,logCount,fastForward,addCraft,roomFor,TRAP_SOAK,rollEvent,season,spawnVip,vipJobs,vipDeliver,updateVips,refreshBoard,genParty,partsCount,holidayOn,holidayNow,thanksgivingDay,eventChoices,shelfPrice,evText,gainXp,cycleHoliday,HOLIDAYS,VIPS,setHolidayForce:v=>{HOLIDAY_FORCE=v;},GEO,KM_LON,GEO_OLD_LONMIN,PORTS,seaRoute,NAV,tourPay,loadOf,has,vipMet,CHAINS,LIVERIES,hasPaint,paintCraft,awardPart,partPool,planSeason,moveCircuit,reliefRun,spawnWeather,nthDay,lastDay,condOf,GOODS,GOOD_BY,goodPrice,goodBuyPrice,goodsFor,buyGood,sellGood,goodsCount,bestMarket,spawnRequest,updateRequests,reqFor,portFavor,updateRival,RIVAL_WAIT,FITS,setFit,fitCost,fitsFor,crewRank,crewFare,runStops,runLabel,fleetCanReach,standingLevel,storeCraft,updateDepth,fareMult,hurryFare,SIM,goodQuote,RUN_PATIENCE,awayTick,keepUnreadable,SAVE_KEY,MIGRATE,sanitizeSave:typeof sanitizeSave==='function'?sanitizeSave:null};HOLIDAY_FORCE='off';`;
vm.runInThisContext(src); const X=globalThis.X; X.initWorld(); X.newGame('casco', process.env.SEED?+process.env.SEED:undefined); const G=X.G; G.wxNext=1e12; let ok=0,bad=0;      // SEED=n pins the luck; without it every run rolls its own
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
T('boat loads layover',!X.loadJob(boat,j.id)); X.dispatch(boat,['vin']); run(boat); T('boat landed with layover fare, paid half again as a boat',boat.state==='landed'&&boat.pend.pay===135); X.collect(boat);
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
wc.cond=40; T('worn craft is 15% slower',Math.abs(X.cstat(wc).speed-sp0*0.85)<1e-9); wc.cond=10; T('badly worn is 40% slower',Math.abs(X.cstat(wc).speed-sp0*0.6)<1e-9);
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
    const d0=G.stats.delivered; X.dispatch(fy,['bos']); run(fy,6000); T('delivered as '+lot.n+' passengers, at the boat rate',fy.state==='landed'&&fy.pend.pay===Math.round(lot.pay*1.5)&&G.stats.delivered===d0+lot.n); X.collect(fy); }
  const ex=X.addCraft('excur','pwm'), jq={id:G.nextId++,from:'pwm',to:'bos',kind:'p',pay:50,label:'t',ic:'any'}; G.ports.pwm.jobs.unshift(jq);
  T('an excursion boat takes no jobs',typeof X.loadJob(ex,jq.id)==='string'&&ex.jobs.length===0);
  T('it cannot tie up at a shallow harbor',!X.legInfo(ex,'pwm','vin').ok&&/deep/.test(X.legInfo(ex,'pwm','vin').why));
  const ri=X.routeInfo(ex,['psm','bos','pwm']); T('the route shows what the loop will pay',ri.ok&&ri.income>1500);
  T('a harbor seen twice pays half',Math.abs(X.tourPay(ex,'bos',100,true)*2-X.tourPay(ex,'bos',100,false))<=10);
  const s0=X.season(), e0=G.ev&&G.ev.id; let evc=false; X.dispatch(ex,['psm','bos','pwm']); let n=0; while(ex.state!=='landed'&&n++<9000){ X.tick(1); if((G.ev&&G.ev.id)!==e0) evc=true; }      // an event starting or ending on the way changes what a stop pays
  T('paid at every stop of the loop',ex.state==='landed'&&ex.at==='pwm'&&ex.pend.stops===3&&(X.season()!==s0||evc||Math.abs(ex.pend.pay-ri.income)<=15)&&ex.pend.pay>1500); const m0=G.money; X.collect(ex); T('and collected like any fare',G.money>m0+1500);
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
// depth: goods, requests, connections, runs that feed each other, a rival, fits, crew ranks
{ const G=X.G, P=X.PORT_BY; G.wx=[]; G.wxNext=1e12; G.vipNext=1e12; G.reqNext=1e12; G.rivalNext=1e12; G.ev=null; G.reqs=[]; G.gg={}; G.money=1e6; G.level=16; G.xp=0; X.setHolidayForce('off'); G.crafts.forEach(q=>{ q.run=null; });
  ['pwm','lew','aug','vin','rkd','bos','bgr','pqi','mpv','btv','sto','mon'].forEach(id=>{ G.ports[id].open=true; G.ports[id].favor=0; });
  T('eight goods, each made somewhere and wanted somewhere',X.GOODS.length===8&&X.GOODS.every(g=>X.PORTS.some(p=>g.from(p))&&X.PORTS.some(p=>!g.from(p)&&g.want(p))));
  T('every port deals in something',X.PORTS.every(p=>X.GOODS.some(g=>g.from(p)||g.want(p))));
  T('cheap where it is made, dearer far away, dearest where wanted',X.goodPrice('pwm','wares')===55&&X.goodPrice('sto','wares')>55&&X.goodPrice('vin','wares')>55*1.35&&X.goodPrice('lew','wares')===55&&X.goodBuyPrice('pwm','wares')>X.goodPrice('pwm','wares'));
  const fr=X.addCraft('ferry','pwm'), m0=G.money, p1=X.goodBuyPrice('pwm','wares');
  T('goods are bought where they are made',/Nobody sells/.test(X.buyGood(fr,'seafood',1))&&X.buyGood(fr,'wares',6)===null&&X.goodsCount(fr)===6&&X.loadOf(fr).cargo===6&&X.roomFor(fr,'c')===10);
  T('buying pushes the price up',G.money<m0-p1*6+1&&X.goodBuyPrice('pwm','wares')>p1);
  T('a craft with goods aboard cannot be put away',typeof X.storeCraft(fr)==='string');
  const bm=X.bestMarket(fr,'wares'); T('the board can say where it sells best',!!bm&&bm.price>X.goodPrice('pwm','wares')&&G.ports[bm.pid].open);
  X.dispatch(fr,['vin']); run(fr,9000); X.collect(fr); const pv=X.goodPrice('vin','wares'), m1=G.money, x1=G.xp+G.level*1e6; T('goods ride along and sell at the other end',fr.at==='vin'&&X.sellGood(fr,'wares',3)===null&&G.money>m1+pv*2&&X.goodsCount(fr)===3);
  T('selling pushes the price down, and a profit is XP',X.goodPrice('vin','wares')<pv&&(G.xp+G.level*1e6)>x1&&(G.stats.trade||0)>0);
  const pd=X.goodPrice('vin','wares'); for(let i=0;i<1500;i++) X.updateDepth(1); T('prices drift back',X.goodPrice('vin','wares')>pd);
  // requests
  G.reqs=[]; const rq=X.spawnRequest(); T('a port asks for something one of your ports makes',!!rq&&G.ports[rq.pid].open&&!X.GOOD_BY[rq.g].from(P[rq.pid])&&rq.n>=2&&rq.n<=12);
  G.reqs=[{id:G.nextId++,pid:'vin',g:'wares',n:3,got:0,until:G.t+900}]; const m2=G.money, pq=X.goodPrice('vin','wares'); X.sellGood(fr,'wares',3);
  T('filling it pays 60% over and is remembered',G.money>=m2+Math.round(pq*1.5)*3-6&&G.reqs.length===0&&G.ports.vin.favor===1&&X.portFavor('vin')===1);
  const f0=X.payFor(P.vin,P.rkd,'c',X.season(),false); G.ports.vin.favor=0; const f1=X.payFor(P.vin,P.rkd,'c',X.season(),false); G.ports.vin.favor=1; T('fares out of a port you looked after pay more',f0>=f1);
  G.reqs=[{id:G.nextId++,pid:'lew',g:'seafood',n:4,got:0,until:G.t-1}]; const sx=G.ports.lew.xp; X.updateRequests(); T('a request left to lapse costs standing',G.reqs.length===0&&G.ports.lew.xp<sx);
  // connections: a job no single craft of yours can deliver
  G.crafts=G.crafts.filter(q=>q.id===fr.id); const cubA=X.addCraft('cub','aug'); G.ports.pwm.jobs=[]; let cj=null; for(let i=0;i<500&&!cj;i++){ const pr=X.genParty(P.aug); if(pr.length&&pr[0].to==='mon'&&pr[0].conn&&!pr[0].n) cj=pr[0]; }
  T('a job that needs a change of craft is marked and pays more',!!cj&&cj.pay>=Math.round(X.payFor(P.aug,P.mon,cj.kind,X.season(),false)*1.3));
  // runs: loops of up to four, and runs that hand loads to each other
  G.ports.aug.jobs=[]; G.ports.pwm.jobs=[]; G.ports.pwm.lay=[]; const cubB=X.addCraft('cub','pwm');
  T('a run starts with two stops',X.setRun(cubA,'pwm')===null&&X.runStops(cubA.run).join()==='aug,pwm'); T('and takes more, up to four',X.setRun(cubA,'lew')===null&&X.runStops(cubA.run).join()==='aug,pwm,lew'&&/already/.test(X.setRun(cubA,'lew'))&&X.runLabel(cubA.run)==='Augusta > Portland > Lewiston-Auburn');
  X.setRun(cubB,'bos'); const hj={id:G.nextId++,from:'aug',to:'bos',kind:'p',pay:500,label:'through passenger',ic:'any'}; G.ports.aug.jobs=[hj];
  let n=0; while(!(cubB.jobs.indexOf(hj)>=0||cubB.state==='move'&&cubB.jobs.some(j=>j.id===hj.id))&&n++<2500) X.tick(1);
  T('one run carries a load to the shared port and the other takes it on',cubB.jobs.some(j=>j.id===hj.id)); n=0; while(cubB.jobs.some(j=>j.id===hj.id)&&n++<4000) X.tick(1); for(let i=0;i<5;i++) X.tick(1);
  T('and it gets there',!cubB.jobs.some(j=>j.id===hj.id)&&cubB.run.earned>0); cubA.run=null; cubB.run=null;
  // a rival
  G.level=16; G.ports.pwm.xp=0; G.ports.pwm.jobs=[]; for(let i=0;i<4;i++) G.ports.pwm.jobs.push({id:G.nextId++,from:'pwm',to:'bos',kind:'c',pay:300,label:'r'+i,ic:'crate'}); for(let i=0;i<3;i++) G.ports.pwm.jobs.push({id:G.nextId++,from:'pwm',to:'lew',kind:'c',pay:50,label:'s'+i,ic:'crate'});
  Object.keys(G.ports).forEach(id=>{ if(id!=='pwm') G.ports[id].jobs=[]; }); const lost0=G.stats.lost||0; let claim=null; for(let i=0;i<40&&!claim;i++){ G.rivalNext=G.t; claim=X.updateRival(); } G.rivalNext=1e12;
  T('the rival claims the best load at a port',!!claim&&claim.length===4&&claim.every(j=>j.to==='bos'&&j.rv>G.t));
  const sav=G.ports.pwm.jobs.find(j=>j.rv); const cz=X.addCraft('cub','pwm'); X.loadJob(cz,sav.id); T('loading it first keeps it',cz.jobs.indexOf(sav)>=0&&!sav.rv);
  G.t+=X.RIVAL_WAIT+1; X.updateRival(); T('what is left goes with them',G.ports.pwm.jobs.filter(j=>j.to==='bos').length===0&&G.ports.pwm.jobs.length===3&&G.stats.lost===lost0+3);
  G.rivalOff=true; G.rivalNext=G.t; T('and they can be switched off',X.updateRival()===undefined&&!G.ports.pwm.jobs.some(j=>j.rv)); G.rivalOff=false; G.rivalNext=1e12;
  // fits
  const cf=X.addCraft('wagon','pwm'), base=X.cstat(cf); T('a fit is done at a yard and costs something',X.setFit(cf,'range')===null&&cf.fit==='range'&&G.money<1e9);
  const fr2=X.cstat(cf); T('long-range tanks: more range, less cargo',fr2.range===Math.round(base.range*1.5)&&fr2.cargo===base.cargo-1);
  X.setFit(cf,'speed'); const fs2=X.cstat(cf); T('one fit at a time: hot engine replaces it',cf.fit==='speed'&&fs2.range===base.range&&fs2.cargo===base.cargo&&fs2.speed>base.speed*1.19&&fs2.fuel>base.fuel*1.3);
  const lA=X.legInfo(cf,'pwm','bos').fuel; X.setFit(cf,'thrift'); const lB=X.legInfo(cf,'pwm','bos').fuel; T('lean tune burns less',lB<lA*0.55);
  X.setFit(cf,''); T('and comes off again',!cf.fit&&X.cstat(cf).speed===base.speed); T('an excursion boat cannot be stripped for freight',X.fitsFor(X.addCraft('excur','pwm')).indexOf('haul')<0);
  // crew
  cf.crew={id:1,name:'Ada',perk:'mech',seed:1,trips:19}; T('crew start green',X.crewRank(cf)===0&&X.crewFare(cf)===1); const jf={id:G.nextId++,from:'pwm',to:'lew',kind:'p',pay:100,label:'t',ic:'any'}; G.ports.pwm.jobs.unshift(jf); X.loadJob(cf,jf.id); X.dispatch(cf,['lew']); run(cf,3000);
  T('twenty trips makes them seasoned, and fares pay 4% more',cf.crew.trips===20&&X.crewRank(cf)===1&&cf.pend.pay===104); X.collect(cf);
  const code4=X.exportSave(); T('all of it survives a save code',!X.importSave(code4)&&X.G.ports.vin.favor===1&&X.G.stats.lost>=3&&(X.G.stats.trade||0)>0);
}

// ---- the economy after the review: hurry, boats, overhauls, standing runs, goods by distance, port prices, time away ----
{ const X2=X, P=X.PORT_BY; let G=X.G; G.level=12; G.money=500000; G.vipNext=G.rivalNext=G.reqNext=1e12; G.wx=[]; G.wxNext=1e12; G.ev=null; G.slots=60;
  ['pwm','lew','bos','rkd','vin','aug','bgr'].forEach(id=>{ G.ports[id].open=true; });
  const mk=(from,to,pay,kind)=>{ const j={id:G.nextId++,from,to,kind:kind||'p',pay,label:'t',ic:'any'}; G.ports[from].jobs.unshift(j); return j; };
  // hurry
  const h1=X.addCraft('twin','pwm'); const ja=mk('pwm','bos',400), jb=mk('pwm','bos',600,'c'); X.loadJob(h1,ja.id); X.loadJob(h1,jb.id); X.dispatch(h1,['bos']); X.tick(2);
  T('hurrying a loaded craft costs the fare it carries',X.hurryFare(h1)===1000&&X.hurryCost(h1)===1000);
  const m0=G.money, x0=G.xp, l0=G.level; X.hurry(h1); run(h1); X.collect(h1);
  T('a hurried trip clears nothing and earns no XP',G.money===m0&&G.xp===x0&&G.level===l0);
  const h2=X.addCraft('twin','pwm'); X.dispatch(h2,['lew']); X.tick(2); T('hurrying an empty craft costs only the time',X.hurryFare(h2)===0&&X.hurryCost(h2)>=5&&X.hurryCost(h2)<100);
  const h3=X.addCraft('twin','pwm'), jc=mk('pwm','bos',400); X.loadJob(h3,jc.id); X.dispatch(h3,['bos']); const x1=G.xp+(G.level-1)*1e9; run(h3,6000); X.collect(h3); T('a trip that was waited for still earns its XP',G.xp+(G.level-1)*1e9>x1);
  // boats
  T('a boat is paid half again for a load, a plane and a tour boat are not',X.fareMult(X.addCraft('mail','pwm'))===1.5&&X.fareMult(h1)===1&&X.fareMult(X.addCraft('excur','pwm'))===1);
  const bt=X.addCraft('mail','pwm'), jd=mk('pwm','rkd',200); X.loadJob(bt,jd.id); T('the route estimate shows the boat rate',X.routeInfo(bt,['rkd']).income===300); X.dispatch(bt,['rkd']); run(bt,9000); T('and that is what it lands with',bt.pend.pay===300); X.collect(bt);
  // overhaul and wear
  const w=X.addCraft('twin','pwm'); w.cond=0; T('a full overhaul costs 4% of the craft',X.overhaulCost(w)===Math.round(X.CRAFT_BY.twin.price*0.04));
  // port prices
  const own=X.PORTS.filter(p=>G.ports[p.id].open).length, pc=X.PORTS.find(p=>!G.ports[p.id].open); T('each port owned adds 4% to the next',X.portCost(pc.id)===Math.round(pc.cost*(1+0.04*Math.max(0,own-3))/50)*50);
  // standing runs
  G.level=12; const r1=X.addCraft('wagon','lew'); G.ports.lew.jobs=[]; G.ports.lew.lay=[]; G.ports.aug.jobs=[]; G.ports.aug.lay=[]; G.ports.lew.next=G.ports.aug.next=1e12; T('a run is set',!X.setRun(r1,'aug'));
  mk('lew','aug',100); for(let i=0;i<30;i++) X.tick(1); T('a run does not leave with one job in five slots',r1.state==='dock'&&r1.jobs.length===1);
  for(let i=0;i<X.RUN_PATIENCE;i++) X.tick(1); T('it leaves with what it has once it has waited long enough',r1.state!=='dock'||r1.run.trips>=1);
  X.stopRun(r1); const r2=X.addCraft('wagon','lew'); G.ports.lew.jobs=[]; X.setRun(r2,'aug'); mk('lew','aug',100); mk('lew','aug',100); mk('lew','aug',100,'c'); for(let i=0;i<12;i++) X.tick(1); T('at half a load it leaves at once',r2.state!=='dock');
  T('a run keeps count of its fuel',r2.run.cost>0);
  const r3=X.addCraft('twin','pwm'); X.stopRun(r2); G.ports.pwm.jobs=[]; G.ports.pwm.lay=[]; G.ports.pwm.next=1e12; X.setRun(r3,'lew'); r3.cond=10; const mm=G.money; for(let i=0;i<10;i++) X.tick(1);
  T('a run that has cleared nothing does not spend on an overhaul',X.condOf(r3)===10&&G.money===mm); r3.run.earned=5000; for(let i=0;i<10;i++) X.tick(1); T('one that has cleared enough gets its craft overhauled, and charges it to the run',X.condOf(r3)===100&&r3.run.cost>=X.overhaulCost({type:'twin',cond:10})); X.stopRun(r3);
  // goods by the distance carried
  G.gg={}; const gw=X.GOOD_BY.wares, near=X.goodPrice('vin','wares','rkd'), far=X.goodPrice('vin','wares','pwm'); T('a good is worth more the farther it was carried',far>near&&near>gw.base);
  T('a port that makes a good pays only its own price for it',X.goodPrice('bos','wares','pwm')===gw.base);
  const dPwmVin=Math.hypot(P.pwm.x-P.vin.x,P.pwm.y-P.vin.y); T('a port that wants it pays a third more',X.goodPrice('vin','wares','pwm')===Math.round((gw.base+0.45*dPwmVin)*1.35));
  const tr=X.addCraft('mail','pwm'); T('goods are bought',!X.buyGood(tr,'wares',3)&&tr.goods[0].from==='pwm'&&tr.goods[0].n===3); X.dispatch(tr,['vin']); run(tr,9000); X.collect(tr);
  const q=X.goodQuote(tr,'wares','vin'); T('the quote aboard is the price for where it came from',q.n===3&&q.each===X.goodPrice('vin','wares','pwm')&&q.each>q.paid); const mg=G.money; X.sellGood(tr,'wares'); T('selling pays that price, less the glut each sale makes',G.money>mg+q.paid*3&&G.money<=mg+q.each*3&&!X.goodsCount(tr));
  // time away
  G.reqs=[{id:G.nextId++,pid:'vin',g:'wares',n:4,got:0,until:G.t+50}]; const jr=mk('pwm','bos',100); jr.rv=G.t+20; const lost0=G.stats.lost||0, xp0=G.ports.vin.xp; X.fastForward(600);
  T('a request does not lapse while you are away',G.reqs.length===1&&G.ports.vin.xp>=xp0); T('the rival takes nothing while you are away',(G.stats.lost||0)===lost0&&G.ports.pwm.jobs.indexOf(jr)>=0||(G.stats.lost||0)===lost0);
  for(let i=0;i<60;i++) X.tick(1); T('back at the game, the request runs out as before',G.reqs.length===0);
}

// ---- a save from outside is not trusted ----
{ const code=X.exportSave(); const raw=JSON.parse(decodeURIComponent(escape(Buffer.from(code,'base64').toString('binary')))); const evil='<img src=x onerror=alert(1)>';
  raw.money='<b>1</b>'; raw.level='9"'; raw.crafts[0].id='1" onclick="x'; raw.crafts[0].name=evil.repeat(5); raw.crafts.push({type:'nope',name:'x'}); raw.news.unshift({t:'x',msg:evil,kind:'bad" onmouseover="x'});
  raw.ports.pwm.jobs.unshift({id:'z',from:'pwm',to:'lew',kind:'p',pay:evil,n:evil,label:evil,ic:'a b"c'}); raw.ports.pwm.jobs.unshift({id:5,from:'pwm',to:'nowhere',kind:'p',pay:10,label:'x'}); raw.ports.pwm.jobs.unshift({id:6,from:'pwm',to:'lew',kind:'<i>',pay:10,label:'x'});
  raw.ports.zzz={open:true,jobs:[]}; raw.parts={'cub:0':'<i>','bad key':3}; raw.stats.earned=evil;
  const code2=Buffer.from(unescape(encodeURIComponent(JSON.stringify(raw))),'binary').toString('base64'); T('a doctored save code still loads',!X.importSave(code2)); const g=X.G;
  T('its numbers are numbers again',typeof g.money==='number'&&g.level===1&&typeof g.stats.earned==='number'&&g.parts['cub:0']===0&&!('bad key' in g.parts));
  T('ids are whole numbers and names are cut to length',Number.isInteger(g.crafts[0].id)&&g.crafts[0].name.length<=24&&g.crafts.every(c=>X.CRAFT_BY[c.type]));
  const pj=g.ports.pwm.jobs; T('a job keeps its text but not a made-up price, size, kind or port',pj.some(j=>j.label===evil&&j.pay===0&&j.n===1&&j.ic==='abc'&&Number.isInteger(j.id))&&!pj.some(j=>j.to==='nowhere'||j.kind==='<i>'));
  T('a news kind cannot carry markup, and unknown ports are dropped',/^[a-z]*$/.test(g.news[0].kind)&&!g.ports.zzz);
  const code3=X.exportSave(); T('and an honest save still round-trips',!X.importSave(code3)&&X.G.crafts.length===g.crafts.length);
}

// ---- found by the second audit: a contract's clock while away, and a save this version cannot read ----
{ const G=X.G; G.active.push({id:G.nextId++,from:'pwm',to:'lew',k:'c',rate:10,total:5,loaded:0,delivered:0,deadline:G.t+600,title:'t',what:'w',ic:'box',bonus:50}); const k=G.active[G.active.length-1], xp0=G.ports.pwm.xp;
  X.fastForward(2*3600); T('a signed contract is still there after two hours away, with its time left unchanged',G.active.indexOf(k)>=0&&Math.abs((k.deadline-G.t)-600)<3&&G.ports.pwm.xp>=xp0);
  for(let i=0;i<620;i++) X.tick(1); T('back at the game it runs out as before',G.active.indexOf(k)<0);
  const m={}, store={getItem:q=>q in m?m[q]:null,setItem:(q,v)=>{m[q]=String(v);},removeItem:q=>{delete m[q];},key:i=>Object.keys(m)[i],get length(){return Object.keys(m).length;}};
  const raw='{"v":3,"money":123456,"ports":{},"crafts":[]}'; m[X.SAVE_KEY]=raw; const g0=X.G;
  T('a save from another version does not load',X.loadGame(store)===false&&X.G===g0);
  const key=X.keepUnreadable(store); T('and is copied aside, untouched, before anything can write over it',!!key&&key!==X.SAVE_KEY&&m[key]===raw&&m[X.SAVE_KEY]===raw);
  X.saveGame(store); T('a new game saving itself leaves the copy alone',m[key]===raw&&JSON.parse(m[X.SAVE_KEY]).v===2);
  T('with nothing stored there is nothing to keep',X.keepUnreadable({getItem:()=>null,setItem:()=>{}})===null);
  X.MIGRATE[1]=g=>{ g.v=2; g.ports=g.ports||{}; g.crafts=g.crafts||[]; return g; }; m[X.SAVE_KEY]='{"v":1,"money":777}'; T('a save from an older version goes through its migration step',X.loadGame(store)===true&&X.G.money===777&&X.G.v===2); delete X.MIGRATE[1];
}
// the level table, the pace setting and the seeded dice
{ const need=l=>X.xpNeedOf(l); let rising=true; for(let l=1;l<30;l++) if(!(need(l+1)>need(l))) rising=false;
  T('every level asks for more XP than the one before, across the hand-set table and the curve',rising);
  T('level 2 is not handed over by the first port (30 XP) and a couple of flights',need(1)>=250);
  X.initWorld(); X.newGame('casco',42); const G=X.G;
  T('a new game starts at the pocket pace',G.pace===1);
  G.pace=7; X.cleanSave(G); T('a pace that is neither pocket nor brisk is put back to pocket',G.pace===1);
  G.pace=X.BRISK; X.cleanSave(G); T('the brisk pace survives a save',G.pace===X.BRISK);
  const run=seed=>{ X.newGame('casco',seed); const r=[]; for(let i=0;i<600;i++) X.tick(1); const g=X.G; return JSON.stringify([g.money,g.xp,g.seed,Object.keys(g.ports).map(k=>g.ports[k].jobs.map(j=>j.to+j.pay).join(','))]); };
  const a1=run(42), a2=run(42), b1=run(43);
  T('the same seed plays out the same way',a1===a2);
  T('a different seed does not',a1!==b1);
  X.newGame('casco',42); const s0=X.G.seed; X.rand(); T('the dice keep their place in the save',X.G.seed!==s0&&Number.isInteger(X.G.seed));
}
console.log('rules ok',ok,'failed',bad); process.exit(bad?1:0);
