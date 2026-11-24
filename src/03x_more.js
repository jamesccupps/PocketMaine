/* ===== Things that unlock as you level: names & paint, events, wear, catch & traps, crew, port works, standing runs =====
   Levels come from XP, and XP now comes from more than fares: new ports, new craft, first landings, contracts, events.
   Each feature stays out of sight until its level, so the early game is just load, send, collect. */
const FEATURES = [
  { id: 'names',  lvl: 2, name: 'Names & paint',   where: 'CRAFT tab',              desc: 'Rename any craft and repaint it.' },
  { id: 'vip',    lvl: 2, name: 'VIPs & special freight', where: 'gold jobs on the board, a gold star on the map', desc: 'Now and then somebody important, or something precious, needs a ride. A VIP pays about triple and brings a reward: a big tip, XP, a parts crate or a good word at both ports. They wait eight minutes.' },
  { id: 'events', lvl: 3, name: 'Events',          where: 'the news and the map',   desc: 'Festivals, harvests, cruise ships and freighters in port, fuel price wars and urgent medical runs: something is on for two days at a time.' },
  { id: 'reg1',   lvl: 4, name: 'New Hampshire & Vermont', where: 'the map, west of Maine', desc: 'Ports across the state line can be opened now: Portsmouth, Manchester, the White Mountains, Burlington on Lake Champlain and the rest.' },
  { id: 'wear',   lvl: 4, name: 'Wear & overhaul', where: 'CRAFT tab, at a yard',   desc: 'Craft wear with use. A worn one runs slow until a hangar or boatyard overhauls it, for coins or a spare part.' },
  { id: 'catch',  lvl: 5, name: 'Catch & traps',   where: 'FISHING tab',            desc: 'Boats keep the catch aboard, so you can sell it where the price is best. Lobster boats can set trap strings and haul them.' },
  { id: 'reg2',   lvl: 6, name: 'Southern New England', where: 'the map, south of Portsmouth', desc: 'Boston, the Cape and the islands, Providence, Newport and the Connecticut shore can be opened now. A boat can follow the coast the whole way.' },
  { id: 'crew',   lvl: 6, name: 'Crew',            where: 'CRAFT tab',              desc: 'Hire a hand for a craft. Each brings one skill: fog flying, bigger catches, less wear, speed, fares or fuel.' },
  { id: 'works',  lvl: 7, name: 'Port works',      where: 'a port\'s TOWN section', desc: 'Build a fuel dock, a lobster pound or an inn at any port you serve.' },
  { id: 'reg3',   lvl: 8, name: 'Canada', where: 'the edges of the map', desc: 'Saint John, Yarmouth, Quebec City and Montreal can be opened now. Long hauls and big fares. Customs holds a craft for a minute each time it crosses the border.' },
  { id: 'runs',   lvl: 8, name: 'Standing runs',   where: 'CRAFT tab',              desc: 'Put a craft on a repeating run between two ports. It loads, goes and collects by itself, even while you are away.' }
];
const FEATURE_BY = {}; FEATURES.forEach(f => { FEATURE_BY[f.id] = f; });
const feat = id => G.level >= FEATURE_BY[id].lvl;
function bonusXp(n, why) { n = Math.round(n); if (n <= 0) return; emit('xp', { n, why }); gainXp(n); }
// the logbook: the first time you do a thing is worth XP
function logFirst(kind, key, xp, why) { const L = G.log || (G.log = {}), m = L[kind] || (L[kind] = {}); if (m[key]) return false; m[key] = 1; if (xp) bonusXp(xp, why); return true; }
function logCount(kind) { return Object.keys((G.log || {})[kind] || {}).length; }

/* ---------- names & paint ---------- */
const LIVERIES = [['Factory', null, null], ['Barn red', 'r', 'R'], ['Harbor blue', 'b', 'B'], ['Spruce', 'e', 'E'], ['School bus', 'y', 'Y'], ['Lupine', 'v', 'B'], ['Buoy orange', 'o', 'R']];
function renameCraft(c, name) { if (!feat('names')) return 'Names unlock at level ' + FEATURE_BY.names.lvl + '.'; name = String(name || '').replace(/[<>"&]/g, '').trim().slice(0, 16); if (!name) return 'Give it a name.'; c.name = name; emit('yard', {}); return null; }
function paintCraft(c, i) { if (!feat('names')) return 'Paint unlocks at level ' + FEATURE_BY.names.lvl + '.'; if (!LIVERIES[i]) return 'No such paint.'; c.liv = i; emit('yard', {}); return null; }

/* ---------- wear & overhaul ---------- */
const condOf = c => c.cond === undefined ? 100 : c.cond;
function condSpeed(c) { const k = condOf(c); return k < 25 ? 0.75 : k < 50 ? 0.9 : 1; }
function wearCraft(c, dist) { if (!feat('wear')) return; let w = 2 + dist / 50; if (crewHas(c, 'mech')) w *= 0.5; c.cond = Math.max(0, condOf(c) - w);
  if (c.cond < 25 && !c.warned) { c.warned = 1; news('"' + c.name + '" is running rough. A ' + yardWord(CRAFT_BY[c.type]) + ' can overhaul it.', 'bad'); emit('worn', { c }); } }
function overhaulCost(c) { return Math.max(10, Math.round((100 - condOf(c)) * CRAFT_BY[c.type].price * 0.0012 / 5) * 5); }
function sparePart(t) { let best = -1, n = 0; [0, 1, 2].forEach(s => { const k = G.parts[partKey(t, s)] || 0; if (k > n) { n = k; best = s; } }); return best; }
function overhaul(c, usePart) { const T = CRAFT_BY[c.type]; if (c.state !== 'dock') return 'It has to be tied up.'; if (!hasYard(c.at, T)) return 'Overhauls are done at a ' + yardWord(T) + '.'; if (condOf(c) >= 100) return 'Nothing to fix.';
  if (usePart) { const s = sparePart(c.type); if (s < 0) return 'No spare part for it.'; const k = partKey(c.type, s); if (--G.parts[k] <= 0) delete G.parts[k]; }
  else { const cost = overhaulCost(c); if (G.money < cost) return 'Can\'t afford it yet.'; G.money -= cost; }
  c.cond = 100; c.warned = 0; bonusXp(5, 'overhaul'); emit('yard', {}); return null; }

/* ---------- events ---------- */
const EVENTS = [
  { id: 'lobfest', s: SUMMER, port: 'rkd', kind: 'p', mult: 1.6, name: 'Lobster Festival',  blurb: 'Half the state is headed for Rockland.' },
  { id: 'windjam', s: SUMMER, port: 'bbh', kind: 'p', mult: 1.5, name: 'Windjammer Days',   blurb: 'Tall ships in Boothbay Harbor.' },
  { id: 'fourth',  s: SUMMER, port: 'bhb', kind: 'p', mult: 1.5, name: 'Fourth of July',    blurb: 'Bar Harbor is full to the gunwales.' },
  { id: 'blue',    s: SUMMER, port: 'jon', kind: 'c', mult: 1.6, name: 'Blueberry harvest', blurb: 'Flats of berries stacked on the Jonesport wharf.', from: 1 },
  { id: 'oldport', s: SUMMER, port: 'pwm', kind: 'p', mult: 1.4, name: 'Old Port weekend',  blurb: 'Everybody wants to be in Portland.' },
  { id: 'leaf',    s: FALL,   port: 'gnr', kind: 'p', mult: 1.6, name: 'Leaf-peeper weekend', blurb: 'Moosehead is all color.' },
  { id: 'spud',    s: FALL,   port: 'pqi', kind: 'c', mult: 1.6, name: 'Potato harvest',    blurb: 'Barrels of potatoes leaving Presque Isle.', from: 1 },
  { id: 'fair',    s: FALL,   port: 'aug', kind: 'p', mult: 1.5, name: 'Harvest fair',      blurb: 'Oxen, fried dough and a crowd in Augusta.' },
  { id: 'hunt',    s: FALL,   port: 'jkm', kind: 'p', mult: 1.6, name: 'Deer season',       blurb: 'Orange hats bound for Jackman.' },
  { id: 'ski',     s: WINTER, port: 'sug', kind: 'p', mult: 1.6, name: 'Ski weekend',       blurb: 'Fresh snow at Carrabassett.' },
  { id: 'derby',   s: WINTER, port: 'gnr', kind: 'p', mult: 1.5, name: 'Ice fishing derby', blurb: 'Shacks all over Moosehead.' },
  { id: 'sled',    s: WINTER, port: 'fkt', kind: 'p', mult: 1.6, name: 'Sled dog races',    blurb: 'Fort Kent turns out for the mushers.' },
  { id: 'legis',   s: WINTER, port: 'aug', kind: 'p', mult: 1.4, name: 'Legislature in session', blurb: 'Everyone has business in Augusta.' },
  { id: 'maple',   s: SPRING, port: 'lew', kind: 'c', mult: 1.5, name: 'Maple Sunday',      blurb: 'Syrup going out by the case.', from: 1 },
  { id: 'fiddle',  s: SPRING, port: 'bgr', kind: 'c', mult: 1.5, name: 'Fiddlehead season', blurb: 'Bangor wants them by the crate.' },
  { id: 'smelt',   s: SPRING, port: 'epm', kind: 'c', mult: 1.5, name: 'Smelt run',         blurb: 'Eastport is shipping fish.', from: 1 },
  { id: 'boats',   s: SPRING, port: 'sto', kind: 'c', mult: 1.5, name: 'Launching week',    blurb: 'Stonington yards want gear and paint.' },
  { id: 'marathon', s: SPRING, port: 'bos', kind: 'p', mult: 1.6, name: 'Marathon Monday',   blurb: 'Half of New England is lining the road into Boston.' },
  { id: 'daffodil', s: SPRING, port: 'ack', kind: 'p', mult: 1.5, name: 'Daffodil weekend',  blurb: 'Nantucket is yellow from end to end.' },
  { id: 'sugaring', s: SPRING, port: 'mpv', kind: 'c', mult: 1.5, name: 'Sugaring season',   blurb: 'Vermont syrup by the drum.', from: 1 },
  { id: 'bikeweek', s: SUMMER, port: 'lci', kind: 'p', mult: 1.5, name: 'Motorcycle week',   blurb: 'Laconia can be heard from the next county.' },
  { id: 'jazz',     s: SUMMER, port: 'npt', kind: 'p', mult: 1.6, name: 'Festival weekend',  blurb: 'Music at the fort and every room in Newport taken.' },
  { id: 'carnival', s: SUMMER, port: 'pvc', kind: 'p', mult: 1.5, name: 'Carnival week',     blurb: 'Provincetown has a parade and no parking.' },
  { id: 'scalfest', s: SUMMER, port: 'ewb', kind: 'c', mult: 1.5, name: 'Scallop landings',  blurb: 'New Bedford is shipping shellfish everywhere.', from: 1 },
  { id: 'regatta',  s: FALL,   port: 'bos', kind: 'p', mult: 1.5, name: 'Regatta weekend',   blurb: 'Rowers from all over are on the river.' },
  { id: 'foliage',  s: FALL,   port: 'mvl', kind: 'p', mult: 1.6, name: 'Peak foliage',      blurb: 'Stowe is one long line of cars and cameras.' },
  { id: 'bigE',     s: FALL,   port: 'spf', kind: 'p', mult: 1.5, name: 'The big fair',      blurb: 'Six states, one fairground, cream puffs.' },
  { id: 'powder',   s: WINTER, port: 'rut', kind: 'p', mult: 1.6, name: 'Powder day',        blurb: 'Two feet overnight at Killington.' },
  { id: 'carnaval', s: WINTER, port: 'yqb', kind: 'p', mult: 1.6, name: 'Winter carnival',   blurb: 'Ice palace, snow sculptures, and Quebec City full to the walls.' },
  { id: 'cruise',    ss: [SUMMER, FALL], ports: ['pwm', 'bhb', 'rkd', 'bbh', 'epm', 'bos', 'npt', 'ysj', 'gon', 'pvc'], kind: 'p', mult: 1.5, from: 1, ship: 'cruise', name: 'Cruise ship in port', blurb: 'Two thousand people came down the gangway and every one of them wants to see something.' },
  { id: 'freighter', ports: ['pwm', 'epm', 'rkd', 'bos', 'pvd', 'ewb', 'hvn', 'ysj', 'psm'], kind: 'c', mult: 1.5, from: 1, ship: 'cargo', name: 'Freighter unloading', blurb: 'A ship is alongside and the wharf is stacked with freight for everywhere.' },
  { id: 'supper',    any: 1, kind: 'p', mult: 1.4, name: 'Bean supper', blurb: 'Baked beans, brown bread and half the county.' },
  { id: 'wedding',   any: 1, ss: [SPRING, SUMMER, FALL], kind: 'p', mult: 1.5, name: 'Wedding weekend', blurb: 'Two families and a band, all headed the same way.' },
  { id: 'yardsale',  any: 1, ss: [SPRING, SUMMER, FALL], kind: 'c', mult: 1.4, from: 1, name: 'Town-wide yard sale', blurb: 'Somebody bought it and now it has to get home.' },
  { id: 'fuelwar',   glob: 'fuel', name: 'Fuel price war', blurb: 'Two dealers are undercutting each other.', text: 'Fuel is 30% off everywhere.' },
  { id: 'swapmeet',  glob: 'swap', name: 'Parts swap meet', blurb: 'Every yard has its spares out on tables.', text: 'Parts on every hangar and boatyard shelf are 40% off.' },
  { id: 'fishrun',   glob: 'fish', ss: [SPRING, SUMMER, FALL], name: 'The fish are running', blurb: 'Everybody with a boat is out.', text: 'Catches are half again as big.' }
];
function evActive() { return G.ev && G.t < G.ev.until ? G.ev : null; }
function eventMult(o, d, kind) { const e = evActive(); return e && e.kind === kind && (e.from ? o.id : d.id) === e.port ? e.mult : 1; }
function eventPull(o, p, kind) { const e = evActive(); return e && e.kind === kind && !e.from && p.id === e.port ? 3 : 1; }
const evGlob = k => { const e = evActive(); return !!e && e.glob === k; };
function evText(e) { return e.text || ((e.kind === 'p' ? 'Passengers' : 'Freight') + (e.from ? ' out of ' : ' bound for ') + PORT_BY[e.port].name + ' pay ' + Math.round((e.mult - 1) * 100) + '% more.'); }
function shelfPrice(it) { return evGlob('swap') ? Math.max(25, Math.round(it.price * 0.6 / 25) * 25) : it.price; }
function seedEvent() { const e = G.ev; if (!e.port) return; const P = PORT_BY[e.port], s = season();
  PORTS.forEach(o => { const st = G.ports[o.id]; if (!st.open || (e.from ? o.id !== e.port : o.id === e.port)) return;
    const dests = e.from ? PORTS.filter(d => d.id !== o.id && G.ports[d.id].open) : [P]; if (!dests.length) return;
    for (let k = 0; k < (e.from ? (e.ship ? 5 : 3) : 1); k++) { const d = pick(dests), n = 2 + ((Math.random() * 3) | 0), fl = jobFlavor(e.kind, o, d, s), pay = payFor(o, d, e.kind, s, false);
      for (let i = 0; i < n; i++) st.jobs.unshift({ id: G.nextId++, from: o.id, to: d.id, kind: e.kind, pay, label: fl[0], ic: fl[1], ev: 1 }); } }); SIM.dirty = true; }
function startEvent(e, port) { if (port === undefined) port = e.port || null;
  G.ev = { id: e.id, name: e.name, port: port || null, kind: e.kind || null, mult: e.mult || 1, from: !!e.from, ship: e.ship || null, glob: e.glob || null, until: G.t + DAY_LEN * 2 }; G.ev.text = evText(e.text ? e : G.ev); seedEvent();
  news(e.name + (port ? ' at ' + PORT_BY[port].name : '') + '. ' + e.blurb + ' ' + G.ev.text + ' Two days.', 'good'); emit('event', { start: true, port: port || null, name: e.name, text: G.ev.text }); }
// what could happen today: the season's events at ports you serve, ship calls at harbors you serve, and the statewide ones
function eventChoices() { const s = season(), out = []; EVENTS.forEach(e => { const ss = e.ss || (e.s !== undefined ? [e.s] : null); if (ss && ss.indexOf(s) < 0) return;
  if (e.glob) { out.push([e, null]); return; } const ports = (e.any ? PORTS.map(p => p.id) : e.ports || [e.port]).filter(id => G.ports[id].open); if (ports.length) out.push([e, pick(ports)]); }); return out; }
function startRandomEvent() { const c = eventChoices(); if (!c.length) return false; const x = pick(c); startEvent(x[0], x[1]); return true; }
function urgentRun() { const open = PORTS.filter(p => G.ports[p.id].open); if (open.length < 2) return null; const far = open.filter(p => has(p, 'island') || has(p, 'remote')), from = pick(far.length ? far : open);
  const to = open.filter(p => p.id !== from.id).sort((a, b) => b.size - a.size)[0], s = season(), fl = jobFlavor('p', from, to, s);
  const j = { id: G.nextId++, from: from.id, to: to.id, kind: 'p', pay: payFor(from, to, 'p', s, false) * 3, label: 'Medical run: a patient for ' + to.name, ic: fl[1], urgent: G.t + 300 };
  G.ports[from.id].jobs.unshift(j); news('Urgent: a patient at ' + from.name + ' needs a ride to ' + to.name + '. Triple fare if someone takes it within five minutes.', 'bad'); emit('urgent', { from: from.id, to: to.id }); return j; }
function expireUrgent() { PORTS.forEach(p => { const st = G.ports[p.id]; if (!st.open) return; for (let i = st.jobs.length - 1; i >= 0; i--) if (st.jobs[i].urgent && G.t > st.jobs[i].urgent) { st.jobs.splice(i, 1); SIM.dirty = true; } }); }
function rollEvent() { if (!feat('events')) return;
  if (G.ev && G.t >= G.ev.until) { news(G.ev.name + ' is over.', 'idle'); G.ev = null; emit('event', {}); }
  if (!G.ev && portsOwned() > 1 && Math.random() < 0.6) startRandomEvent();
  if (Math.random() < 0.4) urgentRun(); }

/* ---------- catch & traps ---------- */
const TRAP_SOAK = 480, TRAP_BAIT = 30;     // a string is at its best after eight minutes in the water; bait each time it is set or hauled
function trapMax() { return feat('catch') ? 2 + (G.level >= 10 ? 1 : 0) : 0; }
function trapCount() { return Object.keys(G.traps || {}).length; }
function trapFill(gid) { const tr = (G.traps || {})[gid]; return tr ? clamp((G.t - tr.t) / TRAP_SOAK, 0.25, 1) : 0; }
function catchMarkets(c) { return PORTS.filter(p => p.dock && G.ports[p.id].open).map(p => ({ pid: p.id, price: fishPrice(p.id, c.fish.sp) })).sort((a, b) => b.price - a.price); }
function sellCatch(c) { if (c.state !== 'dock' || !c.fish) return 'No catch aboard.'; const port = PORT_BY[c.at]; if (!port.dock) return 'Nobody buys fish here.';
  const f = c.fish, price = fishPrice(c.at, f.sp), pay = price * f.units, key = c.at + f.sp; G.glut[key] = Math.min(0.45, (G.glut[key] || 0) + f.units * 0.012);
  G.stats.fishUnits += f.units; G.stats.fishMoney += pay; G.stats.earned += pay; G.money += pay; addXp(c.at, f.units * 0.25); c.fish = null;
  const xp = Math.round(pay / 10); emit('sold', { c, pay, xp, units: f.units, sp: f.sp, price, x: port.x, y: port.y }); gainXp(xp); logFirst('sp', f.sp, 15, 'first ' + FISH[f.sp].name.toLowerCase() + ' landed'); return null; }

/* ---------- crew ---------- */
const PERKS = { fog: { n: 'Fog-rated', d: 'Flies through fog', cls: 'plane' }, salt: { n: 'Old salt', d: 'A quarter more catch', cls: 'boat' }, mech: { n: 'Mechanic', d: 'Half the wear' },
  quick: { n: 'Throttle hand', d: 'Ten percent faster' }, charm: { n: 'Charmer', d: 'Ten percent better passenger fares' }, thrift: { n: 'Thrifty', d: 'A quarter less fuel' } };
const CREW_NAMES = ['Earl', 'Dot', 'Merle', 'Linwood', 'Avis', 'Cappy', 'Junior', 'Thelma', 'Bud', 'Opal', 'Wendell', 'Marge', 'Sonny', 'Hazel', 'Elwood', 'Bea', 'Roscoe', 'Fern', 'Vaughn', 'Pearl', 'Lyle', 'Etta', 'Clint', 'Mavis'];
const crewHas = (c, p) => !!c.crew && c.crew.perk === p;
function crewCost() { return Math.round((250 + 120 * G.level) / 50) * 50; }
function refreshHall() { if (!feat('crew')) return; const keys = Object.keys(PERKS); G.hall = []; let guard = 0;
  while (G.hall.length < 3 && guard++ < 40) { const perk = pick(keys); if (G.hall.some(h => h.perk === perk)) continue; G.hall.push({ id: G.nextId++, name: pick(CREW_NAMES), perk, seed: (Math.random() * 1e6) | 0, cost: Math.round(crewCost() * rnd(0.85, 1.2) / 10) * 10 }); }
  emit('yard', {}); }
function hireCrew(c, id) { if (!feat('crew')) return 'Crew unlock at level ' + FEATURE_BY.crew.lvl + '.'; const i = (G.hall || []).findIndex(h => h.id === id); if (i < 0) return 'They took another job.';
  const h = G.hall[i], P = PERKS[h.perk], T = CRAFT_BY[c.type]; if (P.cls && P.cls !== T.cls) return 'That skill is for a ' + P.cls + '.'; if (G.money < h.cost) return 'Can\'t afford it yet.';
  G.money -= h.cost; c.crew = { name: h.name, perk: h.perk, seed: h.seed }; G.hall.splice(i, 1); bonusXp(8, 'new hand'); emit('yard', {}); return null; }
function dismissCrew(c) { c.crew = null; emit('yard', {}); return null; }

/* ---------- port works ---------- */
const WORKS = { fuel: { n: 'Fuel dock', d: 'Fuel costs 30% less leaving here', base: 700 }, pound: { n: 'Lobster pound', d: 'Catch sells for 20% more here', base: 1200, sea: 1 }, inn: { n: 'Inn', d: 'Four more jobs on the board', base: 900 } };
function hasWork(pid, id) { const w = G.ports[pid].works; return !!(w && w[id]); }
function workCost(pid, id) { return Math.round(WORKS[id].base * (0.6 + PORT_BY[pid].size * 0.4) / 50) * 50; }
function workFits(pid, id) { return !WORKS[id].sea || !!PORT_BY[pid].dock; }
function buildWork(pid, id) { if (!feat('works')) return 'Port works unlock at level ' + FEATURE_BY.works.lvl + '.'; const st = G.ports[pid]; if (!st.open) return 'Open the port first.'; if (!WORKS[id] || !workFits(pid, id)) return 'That can\'t be built here.';
  if (hasWork(pid, id)) return 'Already built.'; const cost = workCost(pid, id); if (G.money < cost) return 'Can\'t afford it yet.'; G.money -= cost; (st.works || (st.works = {}))[id] = 1;
  news(WORKS[id].n + ' built at ' + PORT_BY[pid].name + '.', 'good'); bonusXp(15, 'port works'); emit('yard', {}); return null; }

/* ---------- standing runs ---------- */
const RUN_CUT = 0.15;      // the regular crew keeps a share, so sending a craft yourself always pays a bit better
function runMax() { return feat('runs') ? 1 + Math.floor((G.level - FEATURE_BY.runs.lvl) / 2) : 0; }
function runCount() { return G.crafts.filter(c => c.run).length; }
function setRun(c, to) { if (!feat('runs')) return 'Standing runs unlock at level ' + FEATURE_BY.runs.lvl + '.'; if (c.state !== 'dock') return 'Tie it up first.';
  if (!c.run && runCount() >= runMax()) return 'All ' + runMax() + ' of your standing runs are in use. Levels add more.'; const li = legInfo(c, c.at, to); if (!li.ok) return 'It can\'t run there: ' + li.why + '.';
  c.run = { a: c.at, b: to, earned: 0, trips: 0, wait: 0 }; emit('yard', {}); return null; }
function stopRun(c) { c.run = null; emit('yard', {}); return null; }
function updateRuns(dt) { for (let n = 0; n < G.crafts.length; n++) { const c = G.crafts[n], r = c.run; if (!r) continue;
    if (c.state === 'landed') { collect(c, true); continue; } if (c.state !== 'dock') continue;
    if (c.at !== r.a && c.at !== r.b) { news('"' + c.name + '" has left its standing run.', 'idle'); c.run = null; emit('yard', {}); continue; }
    const other = c.at === r.a ? r.b : r.a, li = legInfo(c, c.at, other);
    if (!li.ok) { news('"' + c.name + '" stopped its standing run: ' + li.why + '.', 'bad'); c.run = null; emit('yard', {}); continue; }
    // the regular crew has a tired craft overhauled when the run brings it to a yard
    if (condOf(c) < 30 && hasYard(c.at, CRAFT_BY[c.type]) && G.money >= overhaulCost(c)) { const cost = overhaulCost(c); if (!overhaul(c, false)) news('"' + c.name + '" was overhauled between runs for ' + money(cost) + '.', 'idle'); }
    r.wait = (r.wait || 0) + dt; if (r.wait < 4) continue;
    const st = G.ports[c.at]; st.lay.concat(st.jobs).filter(j => j.to === other).sort((a, b) => b.pay - a.pay).forEach(j => { if (roomFor(c, j.kind) > 0) loadJob(c, j.id); });
    if (!c.jobs.some(j => j.to === other)) { const back = G.ports[other]; if (!(r.wait > 45 && back.lay.concat(back.jobs).some(j => j.to === c.at))) continue; }
    if (G.money < li.fuel) continue; r.wait = 0; r.trips++; dispatch(c, [other]); } }

/* ---------- save codes: carry a game between a phone and a desktop ---------- */
function exportSave() { G.wall = Date.now(); return btoa(unescape(encodeURIComponent(JSON.stringify(G)))); }
function importSave(code) { let json; try { json = decodeURIComponent(escape(atob(String(code).replace(/\s+/g, '')))); const g = JSON.parse(json); if (!g || !g.crafts || !g.ports || g.v !== G.v) return 'That is not a save code from this game.'; } catch (e) { return 'That is not a save code from this game.'; }
  return loadGame({ getItem: () => json }) ? null : 'That save code could not be loaded.'; }

/* ---------- excursion boats ---------- */
// what one stop of a sightseeing loop pays: a head count, how far they were carried, and how much there is to see where they land
function tourPay(c, pid, dist, again) { const T = CRAFT_BY[c.type], p = PORT_BY[pid], pl = clamp(Math.sqrt(pull(p, 'p', season())), 0.7, 1.6);
  return Math.round(T.tour * (6 + 0.15 * dist) * pl * eventMult(p, p, 'p') * (again ? 0.5 : 1) / 5) * 5; }
