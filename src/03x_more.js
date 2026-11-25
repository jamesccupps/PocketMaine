/* ===== Things that unlock as you level: names & paint, events, wear, catch & traps, crew, port works, standing runs =====
   Levels come from XP, and XP now comes from more than fares: new ports, new craft, first landings, contracts, events.
   Each feature stays out of sight until its level, so the early game is just load, send, collect. */
const FEATURES = [
  { id: 'names',  lvl: 2, name: 'Names & paint',   where: 'CRAFT tab',              desc: 'Rename any craft and repaint it.' },
  { id: 'vip',    lvl: 2, name: 'VIPs & special freight', where: 'gold jobs on the board, a gold star on the map', desc: 'Now and then somebody important, or something precious, needs a ride. A VIP pays about triple and brings a reward: a big tip, XP, a parts crate or a good word at both ports. They wait eight minutes. Some are particular, and want no stops, a daylight landing or a craft in good repair.' },
  { id: 'events', lvl: 3, name: 'Events',          where: 'the news and the map',   desc: 'Festivals, harvests, cruise ships and freighters in port, fuel price wars and urgent medical runs: something is on for two days at a time.' },
  { id: 'reg1',   lvl: 4, name: 'New Hampshire & Vermont', where: 'the map, west of Maine', desc: 'Ports across the state line can be opened now: Portsmouth, Manchester, the White Mountains, Burlington on Lake Champlain and the rest.' },
  { id: 'trade',  lvl: 3, name: 'Goods & requests', where: 'the bottom of a port\'s job board', desc: 'Buy goods where they are made and sell them where they are wanted: they fill whatever cargo room the jobs leave. The farther you carry a good the more it fetches. Ports ask for goods now and then, and remember who brought them.' },
  { id: 'wear',   lvl: 4, name: 'Wear & overhaul', where: 'CRAFT tab, at a yard',   desc: 'Craft wear with use. A worn one runs 15% slower, then 40%, until a hangar or boatyard overhauls it, for a spare part or 4% of its price.' },
  { id: 'catch',  lvl: 5, name: 'Catch & traps',   where: 'FISHING tab',            desc: 'Boats keep the catch aboard, so you can sell it where the price is best. Lobster boats can set trap strings and haul them.' },
  { id: 'fits',   lvl: 5, name: 'Fits', where: 'CRAFT tab, GEAR, at a yard', desc: 'Set a craft up for one thing: long range, speed, thrift or freight. Each gives something up, and a craft takes one at a time.' },
  { id: 'reg2',   lvl: 6, name: 'Southern New England', where: 'the map, south of Portsmouth', desc: 'Boston, the Cape and the islands, Providence, Newport and the Connecticut shore can be opened now. A boat can follow the coast the whole way.' },
  { id: 'crew',   lvl: 6, name: 'Crew',            where: 'CRAFT tab',              desc: 'Hire a hand for a craft. Each brings one skill: fog flying, bigger catches, less wear, speed, fares or fuel.' },
  { id: 'works',  lvl: 7, name: 'Port works',      where: 'a port\'s TOWN section', desc: 'Build a fuel dock, a lobster pound or an inn at any port you serve.' },
  { id: 'rival',  lvl: 7, name: 'A rival', where: 'RIVAL tags on the job board', desc: 'Another outfit has noticed you. Now and then it claims the best load at one of your ports: load it within eighty seconds or it goes with them. They leave ports alone where your standing is high. The Almanac can switch them off.' },
  { id: 'reg3',   lvl: 8, name: 'Canada', where: 'the edges of the map', desc: 'Saint John, Yarmouth, Quebec City and Montreal can be opened now. Long hauls and big fares. Customs holds a craft for a minute each time it crosses the border.' },
  { id: 'runs',   lvl: 8, name: 'Standing runs',   where: 'CRAFT tab',              desc: 'Put a craft on a repeating run between two ports. It waits for half a load, goes and collects by itself, even while you are away.' }
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
function hasPaint(i) { const L = LIVERIES[i]; return !!L && (!L[3] || !!(G.liv || {})[L[3]]); }
function earnPaint(key, why) { const i = LIVERIES.findIndex(L => L[3] === key); if (i < 0) return; const m = G.liv || (G.liv = {}); if (m[key]) return; m[key] = 1; news('New paint earned: ' + LIVERIES[i][0] + '. ' + why, 'good'); emit('paintWon', { name: LIVERIES[i][0] }); }
function paintCraft(c, i) { if (!feat('names')) return 'Paint unlocks at level ' + FEATURE_BY.names.lvl + '.'; if (!LIVERIES[i]) return 'No such paint.'; if (!hasPaint(i)) return 'That paint has to be earned.'; c.liv = i; emit('yard', {}); return null; }

/* ---------- wear & overhaul ---------- */
const condOf = c => c.cond === undefined ? 100 : c.cond;
// A worn craft is slow enough that an overhaul is worth buying: it used to lose a quarter of its speed at worst, against
// an overhaul that cost an eighth of the craft, so the right answer for anything expensive was never to fix it.
function condSpeed(c) { const k = condOf(c); return k < 25 ? 0.6 : k < 50 ? 0.85 : 1; }
function wearCraft(c, dist) { if (!feat('wear')) return; let w = 2 + dist / 50; if (crewHas(c, 'mech')) w *= 0.5; c.cond = Math.max(0, condOf(c) - w);
  if (c.cond < 25 && !c.warned) { c.warned = 1; news('"' + c.name + '" is running rough. A ' + yardWord(CRAFT_BY[c.type]) + ' can overhaul it.', 'bad'); emit('worn', { c }); } }
const OVERHAUL_RATE = 0.0004;      // of the craft's price, for each point of condition put back: a full overhaul is 4%
function overhaulCost(c) { return Math.max(10, Math.round((100 - condOf(c)) * CRAFT_BY[c.type].price * OVERHAUL_RATE / 5) * 5); }
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
  { id: 'races',     ss: [SUMMER], circuit: 'lobster', kind: 'p', mult: 1.5, name: 'Lobster boat races', blurb: 'The fleet races at a different harbor every day.' },
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
    for (let k = 0; k < (e.from ? (e.ship ? 5 : 3) : 1); k++) { const d = pick(dests), n = 2 + ((rand() * 3) | 0), fl = jobFlavor(e.kind, o, d, s), pay = payFor(o, d, e.kind, s, false);
      for (let i = 0; i < n; i++) st.jobs.unshift({ id: G.nextId++, from: o.id, to: d.id, kind: e.kind, pay, label: fl[0], ic: fl[1], ev: 1 }); } }); SIM.dirty = true; }
function startEvent(e, port) { if (port === undefined) port = e.port || null;
  G.ev = { id: e.id, name: e.name, port: port || null, kind: e.kind || null, mult: e.mult || 1, from: !!e.from, ship: e.ship || null, glob: e.glob || null, until: G.t + DAY_LEN * 2 };
  // a circuit visits up to four harbors, a day at each
  if (e.circuit) { const ps = PORTS.filter(p => G.ports[p.id].open && has(p, e.circuit)).map(p => p.id).sort(() => rand() - 0.5).slice(0, 4); G.ev.circuit = ps; G.ev.ci = 0; G.ev.port = port = ps[0]; G.ev.until = G.t + DAY_LEN * ps.length; }
  G.ev.text = evText(e.text ? e : G.ev); seedEvent(); const len = G.ev.circuit ? 'A day at each of ' + G.ev.circuit.length + ' harbors.' : 'Two days.';
  news(e.name + (port ? ' at ' + PORT_BY[port].name : '') + '. ' + e.blurb + ' ' + G.ev.text + ' ' + len, 'good'); emit('event', { start: true, port: port || null, name: e.name, text: G.ev.text, len }); }
function moveCircuit() { const e = G.ev; if (!e || !e.circuit || e.ci + 1 >= e.circuit.length) return; e.ci++; e.port = e.circuit[e.ci]; e.text = evText(Object.assign({}, e, { text: '' })); seedEvent();
  news(e.name + ' move on to ' + PORT_BY[e.port].name + '. ' + e.text, 'good'); emit('event', { start: true, port: e.port, name: e.name, text: e.text, len: 'Today only.' }); }
// what could happen today: the season's events at ports you serve, ship calls at harbors you serve, and the statewide ones
function eventChoices() { const s = season(), out = []; EVENTS.forEach(e => { const ss = e.ss || (e.s !== undefined ? [e.s] : null); if (ss && ss.indexOf(s) < 0) return;
  if (e.glob) { out.push([e, null]); return; }
  if (e.circuit) { const ps = PORTS.filter(p => G.ports[p.id].open && has(p, e.circuit)); if (ps.length >= 2) out.push([e, ps[0].id]); return; } const ports = (e.any ? PORTS.map(p => p.id) : e.ports || [e.port]).filter(id => G.ports[id].open); if (ports.length) out.push([e, pick(ports)]); }); return out; }
function startRandomEvent() { const c = eventChoices(); if (!c.length) return false; const x = pick(c); startEvent(x[0], x[1]); return true; }
function urgentRun() { const open = PORTS.filter(p => G.ports[p.id].open); if (open.length < 2) return null; const far = open.filter(p => has(p, 'island') || has(p, 'remote')), from = pick(far.length ? far : open);
  const to = open.filter(p => p.id !== from.id).sort((a, b) => b.size - a.size)[0], s = season(), fl = jobFlavor('p', from, to, s);
  const j = { id: G.nextId++, from: from.id, to: to.id, kind: 'p', pay: payFor(from, to, 'p', s, false) * 3, label: 'Medical run: a patient for ' + to.name, ic: fl[1], urgent: G.t + 300 };
  G.ports[from.id].jobs.unshift(j); news('Urgent: a patient at ' + from.name + ' needs a ride to ' + to.name + '. Triple fare if someone takes it within five minutes.', 'bad'); emit('urgent', { from: from.id, to: to.id }); return j; }
function expireUrgent() { PORTS.forEach(p => { const st = G.ports[p.id]; if (!st.open) return; for (let i = st.jobs.length - 1; i >= 0; i--) if (st.jobs[i].urgent && G.t > st.jobs[i].urgent) { st.jobs.splice(i, 1); SIM.dirty = true; } }); }
// The season's events are drawn up ahead of time, so the Almanac can say what is coming: three of them, on the second, fourth and sixth days.
const seasonDay = () => dayOf(G.t) % SEASON_DAYS;
function planSeason() { G.calS = season(); if (!feat('events')) { G.cal = []; return; } const c = eventChoices(), d0 = seasonDay(), days = (d0 ? [d0 + 1, d0 + 3, d0 + 5] : [1, 3, 5]).filter(d => d < SEASON_DAYS), picks = [];
  while (picks.length < days.length && c.length) { const x = c.splice((rand() * c.length) | 0, 1)[0]; picks.push({ id: x[0].id, name: x[0].name, port: x[0].circuit ? null : x[1], day: days[picks.length] }); } G.cal = picks; }
function rollEvent() { if (!feat('events')) return;
  if (G.ev && G.t >= G.ev.until) { news(G.ev.name + ' is over.', 'idle'); G.ev = null; emit('event', {}); }
  else if (G.ev && G.ev.circuit) moveCircuit();
  if (!G.cal || G.calS !== season()) planSeason();
  if (!G.ev && portsOwned() > 1) { const d = seasonDay(), k = G.cal.find(q => !q.done && q.day <= d); if (k) { k.done = 1; const e = EVENTS.find(q => q.id === k.id); if (e && (!k.port || G.ports[k.port].open)) startEvent(e, e.circuit ? undefined : k.port); } }
  if (rand() < 0.4) urgentRun(); }
// after a storm blows through, the place that took the worst of it needs things in a hurry
function reliefRun(c) { if (!feat('events') || rand() < 0.5) return null; const open = PORTS.filter(p => G.ports[p.id].open); if (open.length < 2) return null;
  const hit = open.filter(p => Math.hypot(p.x - c.x, p.y - c.y) < c.r + 45).sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0]; if (!hit) return null;
  const from = open.filter(p => p.id !== hit.id).sort((a, b) => b.size - a.size || Math.hypot(a.x - hit.x, a.y - hit.y) - Math.hypot(b.x - hit.x, b.y - hit.y))[0], s = season(), out = [];
  [['c', 'Storm relief: generators for ' + hit.name, 'parts'], ['c', 'Storm relief: fuel and line for ' + hit.name, 'drum'], ['p', 'Storm relief: a line crew for ' + hit.name, 'cap']].forEach(q => { const j = { id: G.nextId++, from: from.id, to: hit.id, kind: q[0], pay: Math.round(payFor(from, hit, q[0], s, false) * 2.5 / 5) * 5, label: q[1], ic: q[2], urgent: G.t + 480, relief: 1 }; G.ports[from.id].jobs.unshift(j); out.push(j); });
  news('Storm relief: ' + hit.name + ' took the worst of it. A crew and supplies are waiting at ' + from.name + ', at two and a half times the rate, for eight minutes.', 'bad'); emit('urgent', { from: from.id, to: hit.id, relief: 1 }); return out; }

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
  while (G.hall.length < 3 && guard++ < 40) { const perk = pick(keys); if (G.hall.some(h => h.perk === perk)) continue; G.hall.push({ id: G.nextId++, name: pick(CREW_NAMES), perk, seed: (rand() * 1e6) | 0, cost: Math.round(crewCost() * rnd(0.85, 1.2) / 10) * 10 }); }
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
// A run leaves when it is half full, or with whatever it has after RUN_PATIENCE seconds at the dock. It used to leave with one job.
const RUN_FILL = 0.5, RUN_PATIENCE = 150;
const RUN_CUT = 0.15;      // the regular crew keeps a share, so sending a craft yourself always pays a bit better
function runMax() { return feat('runs') ? 1 + Math.floor((G.level - FEATURE_BY.runs.lvl) / 2) : 0; }
function runCount() { return G.crafts.filter(c => c.run).length; }
// A run is a loop of two to four ports. The craft loads whatever is bound for any stop on its loop, and also what another run can take on
// from a port the two share: it carries that to the shared port and leaves it there for the other craft. That is how runs feed each other.
const RUN_STOPS = 4;
function runStops(r) { return r.stops || (r.stops = [r.a, r.b]); }
function runLabel(r) { return runStops(r).map(id => PORT_BY[id].name).join(' > '); }
function runServes(c, hub, dest) { return G.crafts.some(o => o !== c && o.run && runStops(o.run).indexOf(hub) >= 0 && runStops(o.run).indexOf(dest) >= 0); }
function setRun(c, to) { if (!feat('runs')) return 'Standing runs unlock at level ' + FEATURE_BY.runs.lvl + '.'; if (c.state !== 'dock') return 'Tie it up first.';
  if (c.run) { const s = runStops(c.run); if (s.indexOf(to) >= 0) return 'That port is already on the run.'; if (s.length >= RUN_STOPS) return 'A run has ' + RUN_STOPS + ' stops at most.';
    const a = legInfo(c, s[s.length - 1], to), b = legInfo(c, to, s[0]); if (!a.ok) return 'It can\'t get there from ' + PORT_BY[s[s.length - 1]].name + ': ' + a.why + '.'; if (!b.ok) return 'It can\'t get back to ' + PORT_BY[s[0]].name + ' from there: ' + b.why + '.'; s.push(to); emit('yard', {}); return null; }
  if (runCount() >= runMax()) return 'All ' + runMax() + ' of your standing runs are in use. Levels add more.'; const li = legInfo(c, c.at, to); if (!li.ok) return 'It can\'t run there: ' + li.why + '.';
  c.run = { a: c.at, b: to, stops: [c.at, to], earned: 0, trips: 0, wait: 0 }; emit('yard', {}); return null; }
function stopRun(c) { c.run = null; emit('yard', {}); return null; }
function updateRuns(dt) { for (let n = 0; n < G.crafts.length; n++) { const c = G.crafts[n], r = c.run; if (!r) continue;
    if (c.state === 'landed') { collect(c, true); continue; } if (c.state !== 'dock') continue;
    const s = runStops(r), at = s.indexOf(c.at); if (at < 0) { news('"' + c.name + '" has left its standing run.', 'idle'); c.run = null; emit('yard', {}); continue; }
    const next = s[(at + 1) % s.length], li = legInfo(c, c.at, next);
    if (!li.ok) { news('"' + c.name + '" stopped its standing run: ' + li.why + '.', 'bad'); c.run = null; emit('yard', {}); continue; }
    // the regular crew has a tired craft overhauled when the run brings it to a yard
    // ...but only out of what the run itself has cleared, so a run never spends more than it brings in
    if (condOf(c) < 30 && hasYard(c.at, CRAFT_BY[c.type]) && G.money >= overhaulCost(c) && r.earned - (r.cost || 0) >= overhaulCost(c)) { const cost = overhaulCost(c); r.cost = (r.cost || 0) + cost; if (overhaul(c, false)) r.cost -= cost; else news('"' + c.name + '" was overhauled between runs for ' + money(cost) + '.', 'idle'); }
    r.wait = (r.wait || 0) + dt; if (r.wait < 4) continue;
    c.jobs.filter(j => j.via === c.at).forEach(j => { if (!unloadJob(c, j.id)) delete j.via; });       // left here for the other run
    const st = G.ports[c.at]; st.lay.concat(st.jobs).sort((a, b) => b.pay - a.pay).forEach(j => { if (roomFor(c, j.kind) < slotsOf(j)) return;
      if (j.to !== c.at && s.indexOf(j.to) >= 0) { loadJob(c, j.id); return; }
      if (j.lay) return; const hub = s.find(h => h !== c.at && runServes(c, h, j.to)); if (hub && !loadJob(c, j.id)) j.via = hub; });
    const tour = !!CRAFT_BY[c.type].tour, some = c.jobs.some(j => j.via || s.indexOf(j.to) >= 0), cs = cstat(c), ld = loadOf(c), cap = cs.pax + cs.cargo;
    const loaded = tour || (some && (!cap || (ld.pax + ld.cargo) / cap >= RUN_FILL || r.wait >= RUN_PATIENCE));
    if (some && !loaded) continue;
    if (!loaded && !(r.wait > 45 && s.some(o => o !== c.at && G.ports[o].lay.concat(G.ports[o].jobs).some(j => j.to !== o && s.indexOf(j.to) >= 0)))) continue;
    if (G.money < li.fuel) continue; r.wait = 0; r.trips++; r.cost = (r.cost || 0) + li.fuel; dispatch(c, [next]); } }

/* ---------- save codes: carry a game between a phone and a desktop ---------- */
function exportSave() { G.wall = Date.now(); return btoa(unescape(encodeURIComponent(JSON.stringify(G)))); }
function importSave(code) { let json; try { json = decodeURIComponent(escape(atob(String(code).replace(/\s+/g, '')))); const g = JSON.parse(json); if (!g || !g.crafts || !g.ports || g.v !== G.v) return 'That is not a save code from this game.'; } catch (e) { return 'That is not a save code from this game.'; }
  return loadGame({ getItem: () => json }) ? null : 'That save code could not be loaded.'; }

/* ---------- excursion boats ---------- */
// what one stop of a sightseeing loop pays: a head count, how far they were carried, and how much there is to see where they land
function tourPay(c, pid, dist, again) { const T = CRAFT_BY[c.type], p = PORT_BY[pid], pl = clamp(Math.sqrt(pull(p, 'p', season())), 0.7, 1.6);
  return Math.round(T.tour * (6 + 0.15 * dist) * pl * eventMult(p, p, 'p') * (again ? 0.5 : 1) / 5) * 5; }
