/* ===== Depth: goods with supply and demand, port requests, a rival, craft fits and crew that improve =====
   The point of all of it is choices that cost something: what to carry where and when to stop, which ports to
   look after, what to grab before somebody else does, and what one craft should be good at. */

/* ---------- goods ---------- */
// A port either makes a good, wants it, or neither. It is cheap where it is made and dearer the farther you carry it,
// dearer still where it is wanted. Every unit you buy pushes the price up there; every unit you sell pushes it down.
const GOODS = [
  { id: 'wares',   name: 'City wares',     base: 55, ic: 'crate',   from: p => has(p, 'city') && !has(p, 'customs'),          want: p => has(p, 'island') || has(p, 'remote') || has(p, 'camp') || has(p, 'woods') },
  { id: 'seafood', name: 'Packed seafood', base: 90, ic: 'cooler',  from: p => has(p, 'lobster') || has(p, 'scallop') || p.id === 'rkd',         want: p => has(p, 'city') || !p.water },
  { id: 'lumber',  name: 'Lumber',         base: 42, ic: 'lumber',  from: p => has(p, 'woods') && !has(p, 'ski'),              want: p => has(p, 'island') || has(p, 'city') },
  { id: 'potato',  name: 'Potatoes',       base: 30, ic: 'potato',  from: p => has(p, 'potato'),                               want: p => has(p, 'city') || has(p, 'island') },
  { id: 'berry',   name: 'Blueberries',    base: 48, ic: 'berries', from: p => has(p, 'downeast'),                             want: p => has(p, 'city') || has(p, 'tourist') },
  { id: 'syrup',   name: 'Maple syrup',    base: 70, ic: 'syrup',   from: p => has(p, 'leaf') && !has(p, 'city'),              want: p => has(p, 'city') || has(p, 'tourist') || has(p, 'island') },
  { id: 'cheese',  name: 'Cheese',         base: 80, ic: 'box',     from: p => p.reg === 'Vermont',                            want: p => has(p, 'city') || has(p, 'tourist') || has(p, 'island') },
  { id: 'cran',    name: 'Cranberries',    base: 44, ic: 'berries', from: p => p.reg === 'Cape & Islands' || p.id === 'ewb',   want: p => has(p, 'city') }
];
const GOOD_BY = {}; GOODS.forEach(g => { GOOD_BY[g.id] = g; });
const goodMakes = (p, g) => !!g.from(p), goodWants = (p, g) => !g.from(p) && !!g.want(p);
const makerDist = {};
function nearestMaker(pid, g) { const k = g.id + pid; if (makerDist[k] === undefined) { const p = PORT_BY[pid]; let d = 1e9; PORTS.forEach(q => { if (goodMakes(q, g)) d = Math.min(d, Math.hypot(q.x - p.x, q.y - p.y)); }); makerDist[k] = d; } return makerDist[k]; }
function goodGlut(pid, gid) { return (G.gg || {})[pid + ':' + gid] || 0; }
function bumpGlut(pid, gid, d) { const m = G.gg || (G.gg = {}), k = pid + ':' + gid; m[k] = clamp((m[k] || 0) + d, -0.3, 0.5); }
// what a unit sells for at a port right now
function goodPrice(pid, gid) { const g = GOOD_BY[gid], p = PORT_BY[pid], f = goodMakes(p, g) ? 1 : Math.min(3, 1 + nearestMaker(pid, g) / 220) * (goodWants(p, g) ? 1.35 : 1); return Math.max(5, Math.round(g.base * f * (1 - goodGlut(pid, gid)))); }
function goodBuyPrice(pid, gid) { return Math.round(goodPrice(pid, gid) * 1.08); }
function goodsFor(pid) { const p = PORT_BY[pid]; return GOODS.filter(g => goodMakes(p, g)); }
function goodsCount(c) { let n = 0; (c.goods || []).forEach(q => { n += q.n; }); return n; }
// the best price among your ports this craft could plausibly carry it to
function bestMarket(c, gid) { const T = CRAFT_BY[c.type], here = PORT_BY[c.at], rng = cstat(c).range; let best = null; if (!here) return null;
  PORTS.forEach(p => { if (p.id === c.at || !G.ports[p.id].open || landWhy(T, c.upg, p, season()) || Math.hypot(p.x - here.x, p.y - here.y) > rng) return; const pr = goodPrice(p.id, gid); if (!best || pr > best.price) best = { pid: p.id, name: p.name, price: pr }; }); return best; }
function buyGood(c, gid, n) { if (!feat('trade')) return 'Trading unlocks at level ' + FEATURE_BY.trade.lvl + '.'; if (c.state !== 'dock') return 'Tie it up first.'; const g = GOOD_BY[gid]; if (!g || !goodMakes(PORT_BY[c.at], g)) return 'Nobody sells that here.';
  n = Math.min(n || 1, roomFor(c, 'c')); if (n <= 0) return 'No cargo room left.'; let spent = 0, got = 0;
  for (let i = 0; i < n; i++) { const pr = goodBuyPrice(c.at, gid); if (G.money < pr) break; G.money -= pr; spent += pr; got++; bumpGlut(c.at, gid, -0.03); }
  if (!got) return 'Can\'t afford it yet.'; const L = c.goods || (c.goods = []); let q = L.find(x => x.g === gid); if (!q) { q = { g: gid, n: 0, cost: 0 }; L.push(q); } q.n += got; q.cost += spent;
  emit('trade', { c, buy: true, g: gid, n: got, spent }); return null; }
function sellGood(c, gid, n) { if (c.state !== 'dock') return 'Tie it up first.'; const L = c.goods || [], q = L.find(x => x.g === gid); if (!q) return 'None aboard.'; n = Math.min(n || q.n, q.n); const unit = q.cost / q.n, g = GOOD_BY[gid], port = PORT_BY[c.at], rq = reqFor(c.at, gid); let rev = 0, asked = 0;
  for (let i = 0; i < n; i++) { let pr = goodPrice(c.at, gid); if (rq && rq.got < rq.n) { pr = Math.round(pr * 1.6); rq.got++; asked++; } rev += pr; bumpGlut(c.at, gid, 0.025); }
  q.n -= n; q.cost -= unit * n; if (q.n <= 0) L.splice(L.indexOf(q), 1);
  const profit = Math.round(rev - unit * n), xp = Math.max(0, Math.round(profit / 10)); G.money += rev; G.stats.earned += Math.max(0, profit); G.stats.trade = (G.stats.trade || 0) + profit; G.stats.goods = (G.stats.goods || 0) + n; addXp(c.at, n * 0.3);
  emit('trade', { c, g: gid, n, rev, profit, xp, asked, x: port.x, y: port.y }); logFirst('good', gid, 10, 'first ' + g.name.toLowerCase() + ' sold'); if (xp) gainXp(xp); if (rq && rq.got >= rq.n) fillRequest(rq); return null; }

/* ---------- requests: a port asks for something ---------- */
// Two at a time at most. Fill one and the port remembers: fares out of there pay 3% more, up to 15%. Let it lapse and you lose standing there.
function reqFor(pid, gid) { return (G.reqs || []).find(r => r.pid === pid && r.g === gid && G.t < r.until); }
function portFavor(pid) { return Math.min(5, (G.ports[pid] && G.ports[pid].favor) || 0); }
function spawnRequest() { const open = PORTS.filter(p => G.ports[p.id].open), opts = []; let tot = 0;
  open.forEach(p => { if ((G.reqs || []).some(r => r.pid === p.id)) return; GOODS.forEach(g => { if (goodMakes(p, g) || !open.some(q => goodMakes(q, g))) return; const w = goodWants(p, g) ? 3 : 1; opts.push([p, g, w]); tot += w; }); });
  if (!opts.length) return null; let r = Math.random() * tot, o = opts[0]; for (let i = 0; i < opts.length; i++) { r -= opts[i][2]; if (r <= 0) { o = opts[i]; break; } }
  let cap = 1; G.crafts.forEach(c => { cap = Math.max(cap, cstat(c).cargo); }); const rq = { id: G.nextId++, pid: o[0].id, g: o[1].id, n: clamp(Math.round(cap * rnd(0.8, 1.6)), 2, 12), got: 0, until: G.t + DAY_LEN * 3 };
  (G.reqs || (G.reqs = [])).push(rq); news(o[0].name + ' is asking for ' + rq.n + ' ' + o[1].name.toLowerCase() + '. It pays 60% over the going price, for three days.', 'good'); emit('request', { pid: rq.pid, g: rq.g, n: rq.n }); return rq; }
function fillRequest(rq) { const i = G.reqs.indexOf(rq); if (i >= 0) G.reqs.splice(i, 1); const st = G.ports[rq.pid], P = PORT_BY[rq.pid]; st.favor = (st.favor || 0) + 1; addXp(rq.pid, 25); G.stats.reqs = (G.stats.reqs || 0) + 1; bonusXp(30, 'request filled');
  news(P.name + ' got what it asked for. ' + (st.favor <= 5 ? 'Fares out of there now pay ' + st.favor * 3 + '% more.' : 'They think the world of you there.'), 'good'); emit('requestDone', { pid: rq.pid, g: rq.g, favor: st.favor }); }
function updateRequests() { const L = G.reqs || (G.reqs = []); for (let i = L.length - 1; i >= 0; i--) if (G.t >= L[i].until) { const rq = L[i]; L.splice(i, 1); addXp(rq.pid, -8); news(PORT_BY[rq.pid].name + ' went without its ' + GOOD_BY[rq.g].name.toLowerCase() + '.', 'bad'); emit('request', { pid: rq.pid, gone: true }); }
  if (!feat('trade')) return; if (G.reqNext === undefined) G.reqNext = G.t + 100; if (G.t >= G.reqNext) { G.reqNext = G.t + rnd(280, 460); if (L.length < 2) spawnRequest(); } }

/* ---------- a rival ---------- */
// Now and then the other outfit puts a claim on the best load at one of your ports. Load it within eighty seconds or it goes with them.
// They leave ports alone where your standing is high, and the Almanac can switch them off.
const RIVAL = 'Quoddy Air & Freight', RIVAL_WAIT = 80;
function updateRival() {
  PORTS.forEach(p => { const st = G.ports[p.id]; if (!st.open) return; let n = 0, to = null; for (let i = st.jobs.length - 1; i >= 0; i--) { const j = st.jobs[i]; if (j.rv && G.t >= j.rv) { to = j.to; st.jobs.splice(i, 1); n++; } }
    if (n) { G.stats.lost = (G.stats.lost || 0) + n; news(RIVAL + ' took ' + n + (n === 1 ? ' job' : ' jobs') + ' out of ' + p.name + ' for ' + PORT_BY[to].name + '.', 'bad'); emit('rival', { pid: p.id, to, n, took: true }); SIM.dirty = true; } });
  if (!feat('rival') || G.rivalOff) return; if (G.rivalNext === undefined) G.rivalNext = G.t + 90; if (G.t < G.rivalNext) return; G.rivalNext = G.t + rnd(110, 190);
  const free = j => !j.vip && !j.urgent && !j.rv, ports = PORTS.filter(p => G.ports[p.id].open && G.ports[p.id].jobs.filter(free).length >= 5); if (!ports.length) return null;
  const p = pick(ports); if (Math.random() < 0.12 * standingLevel(p.id)) return null;
  const by = {}; G.ports[p.id].jobs.forEach(j => { if (free(j)) (by[j.to] || (by[j.to] = [])).push(j); }); let best = null, bv = 0; for (const k in by) { const v = by[k].reduce((a, j) => a + j.pay, 0); if (v > bv) { bv = v; best = k; } } if (!best) return null;
  by[best].forEach(j => { j.rv = G.t + RIVAL_WAIT; }); emit('rival', { pid: p.id, to: best, n: by[best].length }); SIM.dirty = true; return by[best]; }

/* ---------- fits: one at a time, each gives something up ---------- */
const FITS = {
  range:  { n: 'Long-range tanks',     d: 'Half again the range. One cargo slot less.',     range: 1.5, cargo: -1 },
  speed:  { n: 'Hot engine',           d: 'A fifth faster. Burns a third more fuel.',        speed: 1.2, fuel: 1.33 },
  thrift: { n: 'Lean tune',            d: 'A third less fuel. A tenth slower.',              fuel: 0.67, speed: 0.9 },
  haul:   { n: 'Stripped for freight', d: 'A third more cargo. A tenth slower.',             cargoX: 1.34, speed: 0.9, need: T => T.cargo > 0 }
};
function fitsFor(c) { const T = CRAFT_BY[c.type]; return Object.keys(FITS).filter(k => !FITS[k].need || FITS[k].need(T)); }
function fitCost(c) { return Math.max(100, Math.round(CRAFT_BY[c.type].price * 0.06 / 50) * 50); }
function setFit(c, id) { const T = CRAFT_BY[c.type]; if (!feat('fits')) return 'Fits unlock at level ' + FEATURE_BY.fits.lvl + '.'; if (c.state !== 'dock' || !hasYard(c.at, T)) return 'Fits are done at a ' + yardWord(T) + '.';
  if (c.jobs.length || goodsCount(c) || c.fish) return 'Empty it first.'; id = id || ''; if ((c.fit || '') === id) return 'Already set up that way.'; if (id && fitsFor(c).indexOf(id) < 0) return 'That does not suit it.';
  const cost = id ? fitCost(c) : 0; if (G.money < cost) return 'Can\'t afford it yet.'; G.money -= cost; if (id) c.fit = id; else delete c.fit; if (id) bonusXp(5, 'refit'); emit('yard', {}); return null; }

/* ---------- crew that improve ---------- */
// A hand who has made twenty trips with a craft is seasoned, sixty an old hand. Each step is 4% on every fare. Let them go and it goes with them.
const CREW_RANKS = ['New hand', 'Seasoned', 'Old hand'];
function crewRank(c) { const t = c.crew ? (c.crew.trips || 0) : 0; return t >= 60 ? 2 : t >= 20 ? 1 : 0; }
function crewFare(c) { return 1 + 0.04 * crewRank(c); }
function crewTrip(c) { if (!c.crew) return; const r0 = crewRank(c); c.crew.trips = (c.crew.trips || 0) + 1; const r1 = crewRank(c); if (r1 > r0) { news(c.crew.name + ' on "' + c.name + '" is ' + (r1 === 2 ? 'an old hand' : 'seasoned') + ' now. Fares pay ' + r1 * 4 + '% more.', 'good'); emit('crewRank', { c, rank: r1 }); } }

function updateDepth(dt) { const m = G.gg; if (m) { const k = Math.exp(-dt / 700); for (const id in m) { m[id] *= k; if (Math.abs(m[id]) < 0.004) delete m[id]; } } updateRequests(); updateRival(); }
