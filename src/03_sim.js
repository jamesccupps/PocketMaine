/* =====================================================================
   Section 3: SIM  — all game rules. No DOM. State lives in G (plain JSON).
   The UI calls the action functions and drains SIM.events.
   ===================================================================== */
let G = null;
const SIM = { events: [], dirty: true };
function emit(type, data) { const e = data || {}; e.type = type; SIM.events.push(e); SIM.dirty = true; }
const PORT_BY = {}, GROUND_BY = {};
// Every roll in the rules comes from one generator whose state is saved with the game (G.seed). A game can be replayed from
// a save, a bug report can name its seed, and a test can pin its luck. Nothing outside the rules draws from it.
function rand() { if (!G) return Math.random(); const a = (G.seed = ((G.seed | 0) + 0x6D2B79F5) | 0); let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const newSeed = () => (Date.now() ^ (Math.random() * 4294967296)) | 0;
const rnd = (a, b) => a + rand() * (b - a);
const pick = arr => arr[(rand() * arr.length) | 0];
const has = (p, t) => p.tags.indexOf(t) >= 0;
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

function initWorld() {
  buildNav();
  PORTS.forEach(p => { PORT_BY[p.id] = p; const q = proj(p.lat, p.lon); p.x = q[0]; p.y = q[1]; if (p.water === 'sea') p.dock = snapSea(p.x, p.y, true); });
  GROUNDS.forEach(g => { const q = proj(g.lat, g.lon), s = snapSea(q[0], q[1], true); g.x = s[0]; g.y = s[1]; GROUND_BY[g.id] = g; });
}

/* ---------- calendar ---------- */
const dayOf = t => Math.floor(t / DAY_LEN);
const seasonOf = t => (Math.floor(dayOf(t) / SEASON_DAYS) + 1) % 4;      // game opens in summer
const yearOf = t => Math.floor(dayOf(t) / (SEASON_DAYS * 4)) + 1;
const hourOf = t => (t % DAY_LEN) / DAY_LEN * 24;
const season = () => seasonOf(G.t);

/* ---------- new game / save ---------- */
function newGame(startId, seed) {
  const S = STARTS.find(x => x.id === startId) || STARTS[0];
  G = { v: 2, geo: 2, seed: seed === undefined ? newSeed() : seed | 0, t: DAY_LEN * 0.3, wall: Date.now(), start: S.id, money: 300, xp: 0, level: 1, slots: S.craft.length, ports: {}, crafts: [], nextId: 1, wx: [], wxNext: 200, offers: [], active: [], glut: {}, news: [],
        stats: { earned: 0, delivered: 0, trips: 0, fishUnits: 0, fishMoney: 0, fuel: 0, contracts: 0, tips: 0 }, tut: {}, tutDone: false, newsNext: 90, lastDay: 0, sound: true, pace: 1, usedNames: [], parts: {}, stored: [], ev: null, hall: [], traps: {}, log: {} };
  G.lastDay = dayOf(G.t);
  PORTS.forEach(p => { G.ports[p.id] = { open: S.ports.indexOf(p.id) >= 0, xp: 0, lvl: 1, jobs: [], lay: [], next: 0 }; });
  S.craft.forEach(c => addCraft(c[0], c[1])); G.log.types = {}; S.craft.forEach(c => { G.log.types[c[0]] = 1; });
  PORTS.forEach((p, i) => { if (G.ports[p.id].open) { refreshBoard(p); G.ports[p.id].next = G.t + JOB_REFRESH * (0.55 + 0.15 * (i % 3)); } });
  news('Welcome to Pocket Maine Air and Sea, ' + S.name + ' division. Four small craft and a line of credit at the fuel dock.', 'good');
  refreshOffers();
  return G;
}
// A save this version cannot read is never thrown away. Starting a new game used to write straight over it; now the raw text is
// copied to a backup key first (the two newest are kept) and the title screen says so. MIGRATE takes a save from an older format
// version up one step at a time; there are none yet, because the format has only ever been version 2.
const SAVE_BAK = SAVE_KEY.replace(/\.v\d+$/, '') + '.bak.', MIGRATE = {};
function keepUnreadable(store) { try { const raw = store.getItem(SAVE_KEY); if (!raw) return null; const key = SAVE_BAK + Date.now(); store.setItem(key, raw);
    if (store.length !== undefined && store.key) { const old = []; for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.indexOf(SAVE_BAK) === 0) old.push(k); } old.sort().slice(0, -2).forEach(k => store.removeItem(k)); }
    return key; } catch (e) { return null; } }
function saveGame(store) { try { G.wall = Date.now(); store.setItem(SAVE_KEY, JSON.stringify(G)); return true; } catch (e) { return false; } }
function loadGame(store) {
  try { const s = store.getItem(SAVE_KEY); if (!s) return false; let g = JSON.parse(s); for (let n = 0; g && MIGRATE[g.v] && n < 20; n++) g = MIGRATE[g.v](g); if (!g || g.v !== 2 || !g.ports || !g.crafts) return false;
    PORTS.forEach(p => { if (!g.ports[p.id]) g.ports[p.id] = { open: p.cost === 0, xp: 0, lvl: 1, jobs: [], lay: [], next: 2 }; });
    g.crafts = g.crafts.filter(c => CRAFT_BY[c.type]); g.wx = g.wx || []; g.parts = g.parts || {}; g.stored = (g.stored || []).filter(c => CRAFT_BY[c.type]); g.hall = g.hall || []; g.traps = g.traps || {}; g.log = g.log || {}; if (g.ev === undefined) g.ev = null;
    // a save from the Maine-only map: everything with a position moves over by the width the map grew to the west
    if (!g.geo) { const dx = (GEO_OLD_LONMIN - GEO.lonMin) * KM_LON; g.crafts.forEach(c => { if (typeof c.x === 'number') c.x += dx; if (c.route && c.route.pts) c.route.pts = c.route.pts.map(q => [q[0] + dx, q[1]]); }); g.wx.forEach(w => { if (typeof w.x === 'number') w.x += dx; }); g.geo = 2; }
    sanitizeSave(g); G = g; SIM.dirty = true; return true; } catch (e) { return false; }
}
// A save is data from outside: a code somebody pasted, or storage that something else wrote to. Its numbers, ids and kinds end up
// in the page (a price, a button's argument, a class name), so each is forced to the type it should be, and anything that points
// at a port, craft or good that does not exist is dropped. Text is cut to length here and escaped where it is shown.
function sanitizeSave(g) { g.pace = g.pace === BRISK ? BRISK : 1;
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d, int = (v, d) => Math.round(num(v, d)), str = (v, n) => String(v == null ? '' : v).slice(0, n), word = (v, n) => str(v, n).replace(/[^A-Za-z0-9_]/g, ''), obj = v => v && typeof v === 'object' && !Array.isArray(v), arr = v => Array.isArray(v) ? v : [];
  g.seed = typeof g.seed === 'number' && isFinite(g.seed) ? g.seed | 0 : newSeed(); g.money = num(g.money, 0); g.xp = Math.max(0, num(g.xp, 0)); g.level = clamp(int(g.level, 1), 1, 99); g.t = Math.max(0, num(g.t, 0)); g.slots = clamp(int(g.slots, 4), 1, 80); g.nextId = Math.max(1, int(g.nextId, 1)); g.wall = num(g.wall, Date.now()); g.start = word(g.start, 16);
  const job = j => { if (!obj(j) || !PORT_BY[j.to] || (j.kind !== 'p' && j.kind !== 'c')) return false; j.pay = Math.max(0, int(j.pay, 0)); j.label = str(j.label, 80); j.ic = word(j.ic, 24); j.id = int(j.id, g.nextId++); if (j.from && !PORT_BY[j.from]) j.from = j.to;
    if (j.n !== undefined) j.n = clamp(int(j.n, 1), 1, 80); ['exp', 'rv', 'hops', 'kid'].forEach(k => { if (j[k] !== undefined) j[k] = num(j[k], 0); }); ['vip', 'pref', 'via'].forEach(k => { if (j[k] !== undefined && typeof j[k] !== 'number' && typeof j[k] !== 'boolean') j[k] = word(j[k], 16); }); return true; };
  const jobs = a => arr(a).filter(job);
  if (!obj(g.ports)) g.ports = {};
  Object.keys(g.ports).forEach(k => { const st = g.ports[k]; if (!PORT_BY[k] || !obj(st)) { delete g.ports[k]; return; } st.open = !!st.open; st.xp = Math.max(0, num(st.xp, 0)); st.lvl = clamp(int(st.lvl, 1), 1, PORT_MAX_LVL); st.jobs = jobs(st.jobs); st.lay = jobs(st.lay); st.next = num(st.next, 0); if (st.favor !== undefined) st.favor = clamp(int(st.favor, 0), 0, 99); });
  PORTS.forEach(p => { if (!g.ports[p.id]) g.ports[p.id] = { open: p.cost === 0, xp: 0, lvl: 1, jobs: [], lay: [], next: 2 }; });
  const home = (PORTS.find(p => g.ports[p.id].open) || PORTS[0]).id;
  const craft = c => { c.name = str(c.name, 24) || 'Craft'; c.upg = obj(c.upg) ? c.upg : {}; if (c.cond !== undefined) c.cond = clamp(num(c.cond, 100), 0, 100); if (c.liv !== undefined) c.liv = clamp(int(c.liv, 0), 0, 99); if (c.fit !== undefined) c.fit = word(c.fit, 12);
    if (obj(c.crew)) { c.crew.name = str(c.crew.name, 24); c.crew.perk = word(c.crew.perk, 12); c.crew.trips = Math.max(0, int(c.crew.trips, 0)); } else c.crew = null; };
  g.crafts = arr(g.crafts).filter(c => obj(c) && CRAFT_BY[c.type]); g.crafts.forEach(c => { craft(c); c.id = int(c.id, g.nextId++); c.jobs = jobs(c.jobs); c.state = word(c.state, 8) || 'dock';
    c.goods = arr(c.goods).filter(q => obj(q) && GOOD_BY[q.g]); c.goods.forEach(q => { q.n = clamp(int(q.n, 1), 1, 200); q.cost = Math.max(0, num(q.cost, 0)); if (!PORT_BY[q.from]) delete q.from; }); if (!c.goods.length) delete c.goods;
    if (c.at != null && !PORT_BY[c.at]) c.at = null; if ((c.state === 'dock' || c.state === 'landed' || c.state === 'hold') && !c.at) { c.at = home; c.state = 'dock'; c.plan = null; c.route = null; }
    if (c.state === 'move' && !(obj(c.route) && Array.isArray(c.route.pts) && c.route.pts.length > 1)) { c.at = PORT_BY[c.from] ? c.from : home; c.state = 'dock'; c.plan = null; c.route = null; } });
  g.stored = arr(g.stored).filter(c => obj(c) && CRAFT_BY[c.type]); g.stored.forEach(craft);
  g.news = arr(g.news).slice(0, 40).filter(obj).map(n => ({ t: num(n.t, 0), msg: str(n.msg, 300), kind: str(n.kind, 8).replace(/[^a-z]/g, '') }));
  if (!obj(g.parts)) g.parts = {}; Object.keys(g.parts).forEach(k => { const m = /^([a-z0-9]+):([0-2])$/.exec(k); if (!m || !CRAFT_BY[m[1]]) delete g.parts[k]; else g.parts[k] = clamp(int(g.parts[k], 0), 0, 99); });
  ['offers', 'active'].forEach(key => { g[key] = arr(g[key]).filter(k => obj(k) && PORT_BY[k.from] && PORT_BY[k.to]); g[key].forEach(k => { k.id = int(k.id, g.nextId++); ['rate', 'total', 'bonus', 'loaded', 'delivered'].forEach(f => { if (k[f] !== undefined) k[f] = Math.max(0, int(k[f], 0)); }); k.title = str(k.title, 60); k.what = str(k.what, 60); k.ic = word(k.ic, 24); if (k.k !== 'p') k.k = 'c'; }); });
  g.reqs = arr(g.reqs).filter(r => obj(r) && PORT_BY[r.pid] && GOOD_BY[r.g]); g.reqs.forEach(r => { r.id = int(r.id, g.nextId++); r.n = clamp(int(r.n, 1), 1, 99); r.got = clamp(int(r.got, 0), 0, 99); r.until = num(r.until, g.t); });
  g.hall = arr(g.hall).filter(obj); g.hall.forEach(h => { h.id = int(h.id, g.nextId++); h.name = str(h.name, 24); h.perk = word(h.perk, 12); h.cost = Math.max(0, int(h.cost, 0)); });
  if (!obj(g.stats)) g.stats = {}; Object.keys(g.stats).forEach(k => { g.stats[k] = num(g.stats[k], 0); });
  ['earned', 'delivered', 'trips', 'fishUnits', 'fishMoney', 'fuel', 'contracts', 'tips'].forEach(k => { if (g.stats[k] === undefined) g.stats[k] = 0; });
  if (!obj(g.tut)) g.tut = {}; if (g.les !== undefined && !obj(g.les)) g.les = {}; if (!obj(g.glut)) g.glut = {}; if (g.gg !== undefined && !obj(g.gg)) g.gg = {};
  return g;
}

/* ---------- helpers ---------- */
function news(msg, kind) { G.news.unshift({ t: G.t, msg, kind: kind || '' }); if (G.news.length > 40) G.news.pop(); emit('news', { msg, kind }); }
function standingLevel(pid) { const xp = G.ports[pid].xp; let l = 0; for (let i = 0; i < STANDING.length; i++) if (xp >= STANDING[i].xp) l = i; return l; }
function addXp(pid, n) { const before = standingLevel(pid); G.ports[pid].xp = Math.max(0, G.ports[pid].xp + n); const after = standingLevel(pid);
  if (after > before) news(PORT_BY[pid].name + ' now considers you "' + STANDING[after].name + '." More work, better pay.', 'good'); }
function cstat(c) { const T = CRAFT_BY[c.type], u = c.upg, f = FITS[c.fit] || {}; let cargo = Math.round(T.cargo * ((u.pod || u.deck) ? 1.5 : 1)); if (f.cargoX) cargo = Math.max(cargo + 1, Math.round(cargo * f.cargoX)); if (f.cargo) cargo = Math.max(0, cargo + f.cargo);
  return { T, pax: T.pax, cargo, speed: T.speed * SPEED_SCALE * ((u.engine || u.diesel) ? 1.2 : 1) * condSpeed(c) * (crewHas(c, 'quick') ? 1.1 : 1) * (f.speed || 1), hold: T.hold || 0, range: Math.round(T.range * (f.range || 1)), fuel: T.fuel * (f.fuel || 1) }; }
// A boat is paid half again for every load. Pay goes by distance and a boat covers it at a quarter of a plane's speed,
// so without this a ferry earned what a bush plane a tenth its price did. Excursion boats are paid their own way.
const SEA_FARE = 1.5;
function fareMult(c) { const T = CRAFT_BY[c.type]; return T.cls === 'boat' && !T.tour ? SEA_FARE : 1; }
const slotsOf = j => j.n || 1;      // a lot or a group is one job that takes several slots
function loadOf(c) { let p = 0, k = 0; c.jobs.forEach(j => { if (j.kind === 'p') p += slotsOf(j); else k += slotsOf(j); }); (c.goods || []).forEach(q => { k += q.n; }); return { pax: p, cargo: k }; }
function craftsAt(pid) { return G.crafts.filter(c => c.at === pid); }
function netWorth() { let v = G.money; G.crafts.concat(G.stored).forEach(c => v += CRAFT_BY[c.type].price * 0.5); Object.keys(G.parts).forEach(k => { const T = CRAFT_BY[k.split(':')[0]]; if (T) v += G.parts[k] * partPrice(T) * 0.5; }); PORTS.forEach(p => { const st = G.ports[p.id]; if (st.open) { v += p.cost; for (let l = 1; l < st.lvl; l++) v += Math.round((400 * p.size + p.cost * 0.25) * Math.pow(l, 1.7) / 50) * 50 * 0.5; } }); return v; }
function rankName() { const v = netWorth(); let r = RANKS[0][1]; RANKS.forEach(x => { if (v >= x[0]) r = x[1]; }); return r; }
function nextRank() { const v = netWorth(); for (let i = 0; i < RANKS.length; i++) if (v < RANKS[i][0]) return RANKS[i]; return null; }
// the sim reports the three things the tutorial waits for: a craft sent, a boat gone fishing, a fare collected
function tutMark(k) { if (G.tutDone) return; const m = { send: 'sent', fish: 'fish', collect: 'collect' }[k]; if (m && !G.tut[m]) { G.tut[m] = 1; SIM.dirty = true; } }

/* ---------- levels, fleet slots, prices (the Pocket Planes progression spine) ---------- */
// The first seven levels are spaced by hand, from what a simulated player earns (test/pace.js): level 2 at about nine minutes,
// 3 at about twenty, 4 at about half an hour, 8 at about an hour and three quarters. On the curve alone the first port bought
// was enough for level 2, and names, VIPs, events and goods all arrived inside five minutes. From level 8 the curve takes over.
const XP_EARLY = [0, 300, 450, 650, 800, 950, 1150, 1500];
function xpNeed(l) { return XP_EARLY[l] || Math.round(60 * Math.pow(l, 1.7)); }
function gainXp(n) { G.xp += n; while (G.xp >= xpNeed(G.level)) { G.xp -= xpNeed(G.level); G.level++; const bonus = 100 * G.level; G.money += bonus;
    const un = CRAFT.filter(T => T.lvl === G.level && !T.rare).map(T => T.name); news('Level ' + G.level + '! ' + money(bonus) + ' bonus.' + (un.length ? ' Now for sale: ' + un.join(', ') + '.' : ''), 'good'); const fs = FEATURES.filter(f => f.lvl === G.level); fs.forEach(f => news('New at level ' + G.level + ': ' + f.name + '. ' + f.desc, 'good')); if (G.level === FEATURE_BY.crew.lvl) refreshHall();
    emit('level', { level: G.level, bonus, unlocked: un, feats: fs.map(f => f.id) }); awardPart('Level ' + G.level); fs.forEach(f => onUnlock(f.id)); } }
function slotCost() { return Math.round(400 * Math.pow(1.55, G.slots - 4) / 50) * 50; }
function buySlot() { const c = slotCost(); if (G.money < c) return 'Can\'t afford it yet.'; G.money -= c; G.slots++; emit('buy', {}); return null; }
function portsOwned() { let n = 0; PORTS.forEach(p => { if (G.ports[p.id].open) n++; }); return n; }
const PORT_STEP = 0.04;      // each port you own makes the next one this much dearer
function portCost(pid) { return Math.round(PORT_BY[pid].cost * (1 + PORT_STEP * Math.max(0, portsOwned() - 3)) / 50) * 50; }
// can this craft type put down at this port?  null = yes, else the reason
function landWhy(T, upg, port, s) {
  if (T.cls === 'boat') return port.water !== 'sea' ? 'no harbor' : (T.deep && !has(port, 'deep')) ? 'needs a deep-water berth' : null;
  let why = '';
  if (T.wheels) { if (port.strip >= T.wheels) { if (port.strip === 1 && s === SPRING && !upg.tundra) why = 'mud season: strip closed'; else return null; } else why = port.strip ? 'needs a paved runway' : 'no airstrip'; }
  if (port.water && (T.floats || upg.skis)) {
    if (port.water === 'lake' && s === WINTER) { if (upg.skis) return null; why = 'lake is frozen'; }
    else if (T.floats) return null;
  }
  return why || (T.floats ? 'no water to land on' : 'no airstrip');
}
/* ---------- weather ---------- */
const WX_WARN = 45;
function wxActive(c) { const age = G.t - c.t0; return age > WX_WARN && age < c.life; }
function wxAt(x, y) { const o = { fog: false, storm: false, snow: false }; for (let i = 0; i < G.wx.length; i++) { const c = G.wx[i]; if (!wxActive(c)) continue; if (Math.hypot(x - c.x, y - c.y) < c.r) o[c.type] = true; } return o; }
function wxBlock(c, x, y) { const T = CRAFT_BY[c.type], w = wxAt(x, y);
  if (T.cls === 'plane') { if ((w.storm || w.snow) && T.light) return w.snow ? 'snow squall' : 'storm'; if (w.fog && !c.upg.ifr && !crewHas(c, 'fog')) return 'fog'; }
  else if (w.storm && T.small) return 'gale';
  return null; }
function nearestPortName(x, y) { let b = null, bd = 1e9; PORTS.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; b = p; } }); return b.name; }
function spawnWeather() {
  const s = season(); if (G.wx.length >= 2) return;
  const mine = PORTS.filter(p => G.ports[p.id].open), wxPorts = f => { const a = mine.filter(f); return a.length ? a : PORTS.filter(f); }, A = pick(wxPorts(() => true));
  const r = rand();
  if (r < [0.4, 0.55, 0.3, 0.12][s]) { const sp = pick(wxPorts(p => p.water === 'sea'));
    const c = { type: 'fog', x: sp.x + rnd(-25, 10), y: sp.y + rnd(0, 25), r: rnd(38, 62), vx: rnd(0.02, 0.06), vy: rnd(-0.035, 0.006), t0: G.t, life: rnd(330, 600) }; G.wx.push(c);
    news(pick(['Fog bank making up off ', 'Thick o\' fog rolling in at ', 'Pea soup expected around ']) + nearestPortName(c.x, c.y) + '.', 'wx'); return; }
  if (r < [0.4, 0.55, 0.3, 0.12][s] + [0.2, 0.28, 0.34, 0.3][s]) {
    if (s === SUMMER) { const c = { type: 'storm', x: A.x - rnd(60, 150), y: A.y + rnd(-70, 70), r: rnd(30, 44), vx: rnd(0.11, 0.18), vy: rnd(-0.02, 0.05), t0: G.t, life: rnd(300, 450) }; G.wx.push(c); news('Thunderheads building near ' + nearestPortName(c.x, c.y) + '. Light planes will sit this one out.', 'wx'); }
    else { const c = { type: 'storm', x: A.x - rnd(10, 70), y: A.y + rnd(90, 150), r: rnd(60, 88), vx: rnd(0.11, 0.16), vy: rnd(-0.1, -0.06), t0: G.t, life: rnd(380, 560) }; G.wx.push(c); news(s === WINTER ? 'Nor\'easter working up the coast toward ' + nearestPortName(c.x, c.y - 60) + '. Small boats and light planes stay put.' : 'Gale warning off ' + nearestPortName(c.x, c.y - 60) + '. Small craft stay put.', 'wx'); }
    return; }
  if (s === WINTER && r < 0.75) { const c = { type: 'snow', x: A.x - rnd(90, 190), y: A.y + rnd(-90, 60), r: rnd(55, 85), vx: rnd(0.07, 0.13), vy: rnd(-0.012, 0.035), t0: G.t, life: rnd(330, 520) }; G.wx.push(c); news('Snow squalls moving across ' + nearestPortName(c.x + 60, c.y) + ' way. Light planes are grounded in it.', 'wx'); }
}
function updateWeather(dt) {
  for (let i = G.wx.length - 1; i >= 0; i--) { const c = G.wx[i]; c.x += c.vx * dt; c.y += c.vy * dt; if (G.t - c.t0 > c.life + 30) { G.wx.splice(i, 1); if (c.type === 'storm') reliefRun(c); } }
  G.wxNext -= dt; if (G.wxNext <= 0) { G.wxNext = rnd(300, 600); spawnWeather(); }
}

/* ---------- jobs: every passenger and every piece of cargo is one slot ---------- */
function pull(p, kind, s) { let m = 1;
  if (kind === 'p') { if (has(p, 'tourist')) m *= [1, 3, 1.6, 0.4][s]; if (has(p, 'ski') && s === WINTER) m *= 3.5; if (has(p, 'leaf') && s === FALL) m *= 2.6; if (has(p, 'hunt') && s === FALL) m *= 2.4;
    if (has(p, 'camp')) m *= [1.8, 2, 1, 0.5][s]; if (has(p, 'sled') && s === WINTER) m *= 2.2; if (has(p, 'city')) m *= 1.4; if (has(p, 'island')) m *= [1, 1.6, 1, 0.7][s]; }
  else { if (has(p, 'island') || has(p, 'remote')) m *= 1.8; if (has(p, 'city') || has(p, 'market')) m *= 1.5; if (has(p, 'camp')) m *= [1.2, 1.4, 1.2, 0.8][s]; }
  return m; }
function bestCapFor(o, d, kind) { let best = 0; G.crafts.forEach(c => { const T = CRAFT_BY[c.type]; if (landWhy(T, { skis: 1, tundra: 1 }, o, SUMMER) || landWhy(T, { skis: 1, tundra: 1 }, d, SUMMER)) return; const st = cstat(c); best = Math.max(best, kind === 'p' ? st.pax : st.cargo); }); return best; }
function jobFlavor(kind, o, d, s) { const pools = [];
  if (kind === 'p') { const F = FLAVOR.pax; ['tourist', 'ski', 'leaf', 'hunt', 'camp', 'sled'].forEach(t => { if (has(d, t) && F[t][s]) pools.push(F[t][s], F[t][s]); }); if (has(d, 'city')) pools.push(F.city); if (has(d, 'island') || has(o, 'island')) pools.push(F.island); pools.push(F.any); }
  else { const F = FLAVOR.cargo; if (has(d, 'island')) pools.push(F.toIsland, F.toIsland); if (has(o, 'lobster')) pools.push(F.fromLobster, F.fromLobster); if (has(d, 'camp')) pools.push(F.toCamp); if (has(o, 'woods')) pools.push(F.fromWoods);
    if (has(o, 'potato') && F.potato[s]) pools.push(F.potato[s], F.potato[s]); if (has(o, 'downeast') && F.downeast[s]) pools.push(F.downeast[s]); if (has(o, 'scallop') && F.scallop[s]) pools.push(F.scallop[s]); if (has(d, 'city')) pools.push(F.toCity); pools.push(F.any); }
  return pick(pick(pools)).split('|'); }
function payFor(o, d, kind, s, rush) { const dist = Math.hypot(d.x - o.x, d.y - o.y); let m = clamp(0.85 + 0.1 * pull(d, kind, s), 0.9, 1.5);
  if (has(o, 'island') || has(d, 'island') || has(d, 'remote') || has(o, 'remote')) m *= 1.25;
  m *= 1 + 0.04 * standingLevel(d.id); m *= 1 + 0.03 * portFavor(o.id); m *= eventMult(o, d, kind); if (rush) m *= 1.5; if (kind === 'c' && has(o, 'potato') && s === FALL) m *= 1.2;
  return Math.max(10, Math.round((14 + 0.9 * dist) * m / 5) * 5); }
// a "party": one or more single-slot jobs that turn up together, all bound for the same place.
// Party size grows with the port's level and with what your fleet can actually carry there,
// so big craft always have something worth filling up with.
function genParty(o) {
  const s = season(), cands = PORTS.filter(p => p.id !== o.id && G.ports[p.id].open); if (!cands.length) return [];
  let cargoShare = 0.5; if (has(o, 'potato') && s === FALL) cargoShare = 0.75; if (has(o, 'lobster')) cargoShare = 0.6;
  const kind = rand() < cargoShare ? 'c' : 'p';
  let tot = 0; const ws = cands.map(p => { const d = Math.hypot(p.x - o.x, p.y - o.y), w = p.size * pull(p, kind, s) * eventPull(o, p, kind) / (1 + d / 260); tot += w; return w; });
  let r = rand() * tot, d = cands[0]; for (let i = 0; i < cands.length; i++) { r -= ws[i]; if (r <= 0) { d = cands[i]; break; } }
  // a craft with ten or more slots that can work this pair brings out the big loads
  { const cap = bestCapFor(o, d, kind); if (cap >= 10 && rand() < 0.3) { const n = cap >= 30 && rand() < 0.4 ? 20 : 10, fl = pick(LOTS[kind]).split('|');
    return [{ id: G.nextId++, from: o.id, to: d.id, kind, n, pay: Math.round(payFor(o, d, kind, s, false) * n * 0.85 / 5) * 5, label: fl[0], ic: fl[1], ev: eventMult(o, d, kind) > 1 ? 1 : 0 }]; } }
  const lvl = G.ports[o.id].lvl, maxN = Math.max(1, Math.min(bestCapFor(o, d, kind), 1 + lvl * 2 + o.size)), n = 1 + Math.floor(Math.pow(rand(), 1.6) * maxN);
  let fl = jobFlavor(kind, o, d, s), pay = payFor(o, d, kind, s, false); const out = [], hf = holidayFlavor(kind); if (hf) { fl = hf; pay = Math.round(pay * 1.25 / 5) * 5; }
  const conn = bestCapFor(o, d, kind) === 0 && fleetCanReach(o.id) && fleetCanReach(d.id); if (conn) pay = Math.round(pay * 1.35 / 5) * 5;
  for (let i = 0; i < n; i++) out.push({ id: G.nextId++, from: o.id, to: d.id, kind, pay, label: fl[0], ic: fl[1], ev: eventMult(o, d, kind) > 1 ? 1 : 0, hol: hf ? 1 : undefined, conn: conn ? 1 : undefined });
  return out;
}
function boardCap(pid) { const p = PORT_BY[pid]; return 5 + p.size * 3 + (G.ports[pid].lvl - 1) * 6 + (hasWork(pid, 'inn') ? 4 : 0); }
function layCap(pid) { return 4 + G.ports[pid].lvl * 2; }
function portUpgradeCost(pid) { const p = PORT_BY[pid], l = G.ports[pid].lvl; return Math.round((400 * p.size + p.cost * 0.25) * Math.pow(l, 1.7) / 50) * 50; }
const PORT_MAX_LVL = 5;
function upgradePort(pid) { const st = G.ports[pid]; if (st.lvl >= PORT_MAX_LVL) return 'Already as big as it gets.'; const cost = portUpgradeCost(pid); if (G.money < cost) return 'Can\'t afford it yet.';
  G.money -= cost; st.lvl++; news(PORT_BY[pid].name + ' terminal improved to level ' + st.lvl + ': more jobs, more layover room.', 'good'); emit('buy', {}); return null; }
// Like Pocket Planes: each port's board is replaced wholesale on a timer. Layovers stay; whatever you have aboard stays.
function refreshBoard(p) { const st = G.ports[p.id], target = Math.round(boardCap(p.id) * rnd(0.7, 1)), keep = (st.jobs || []).filter(j => j.urgent || (j.vip && G.t < j.exp)); st.jobs = keep; let guard = 0;
  while (st.jobs.length < target && guard++ < 40) { const party = genParty(p); if (!party.length) break; for (let i = 0; i < party.length && st.jobs.length < target; i++) st.jobs.push(party[i]); } SIM.dirty = true; }
function updateBoards() { PORTS.forEach(p => { const st = G.ports[p.id]; if (st.open && G.t >= st.next) { refreshBoard(p); st.next = G.t + JOB_REFRESH; } }); }
function contractAvail(k) { return k.total - k.delivered - k.loaded; }
function roomFor(c, kind) { const cs = cstat(c), ld = loadOf(c); return kind === 'p' ? cs.pax - ld.pax : cs.cargo - ld.cargo; }
function findWaiting(pid, jobId) { const st = G.ports[pid]; let i = st.jobs.findIndex(j => j.id === jobId); if (i >= 0) return { list: st.jobs, i }; i = st.lay.findIndex(j => j.id === jobId); return i >= 0 ? { list: st.lay, i } : null; }
function loadJob(c, jobId) {
  if (c.state !== 'dock') return 'Not at the dock.'; const f = findWaiting(c.at, jobId); if (!f) return 'That one is gone.'; const j = f.list[f.i];
  if (roomFor(c, j.kind) < slotsOf(j)) return j.n && roomFor(c, j.kind) > 0 ? 'That takes ' + j.n + (j.kind === 'p' ? ' seats.' : ' cargo slots.') : 'No ' + (j.kind === 'p' ? 'seats' : 'cargo room') + ' left.';
  f.list.splice(f.i, 1); delete j.rv; c.jobs.push(j); tutMark('load'); emit('load', { c }); return null;
}
// everything waiting here for one destination that fits, best paying first
function loadAllFor(c, toId) {
  if (c.state !== 'dock') return 'Not at the dock.'; const st = G.ports[c.at]; let n = 0;
  st.lay.concat(st.jobs).filter(j => j.to === toId).sort((a, b) => b.pay - a.pay).forEach(j => { if (roomFor(c, j.kind) > 0 && !loadJob(c, j.id)) n++; });
  return n ? null : 'Nothing more fits.';
}
function loadContract(c, kid) {
  if (c.state !== 'dock') return 'Not at the dock.'; const k = G.active.find(x => x.id === kid); if (!k || k.from !== c.at) return 'Not here.';
  const room = roomFor(c, k.k), n = Math.min(room, contractAvail(k)); if (n <= 0) return room <= 0 ? 'No room left.' : 'Nothing left to load.';
  k.loaded += n; for (let i = 0; i < n; i++) c.jobs.push({ id: G.nextId++, from: k.from, to: k.to, kind: k.k, pay: k.rate, label: k.title + ': ' + k.what, ic: k.ic, kid: k.id });
  tutMark('load'); emit('load', { c }); return null;
}
// taking something off: back to the board where it came from, otherwise it waits here as a layover
function unloadJob(c, jobId) {
  if (c.state !== 'dock') return 'Not at the dock.'; const i = c.jobs.findIndex(j => j.id === jobId); if (i < 0) return null; const j = c.jobs[i], st = G.ports[c.at];
  if (j.kid && j.from === c.at) { const k = G.active.find(x => x.id === j.kid); if (k) k.loaded--; c.jobs.splice(i, 1); }
  else if (j.from === c.at && !j.lay) { c.jobs.splice(i, 1); st.jobs.push(j); }
  else { if (st.lay.length >= layCap(c.at)) return 'No layover room left at ' + PORT_BY[c.at].name + '.'; c.jobs.splice(i, 1); j.lay = 1; st.lay.push(j); }
  emit('load', { c }); return null;
}
function unloadAll(c) { c.jobs.slice().forEach(j => unloadJob(c, j.id)); }
// full craft, everything for one place: the Pocket-Planes-style 25% bonus
function bonusDest(c) { const cs = cstat(c), ld = loadOf(c); if (!c.jobs.length || ld.pax < cs.pax || ld.cargo < cs.cargo) return null; const to = c.jobs[0].to; return c.jobs.every(j => j.to === to) ? to : null; }

/* ---------- trips (a route is one or more legs) ---------- */
function legInfo(c, fromId, toId) {
  const T = CRAFT_BY[c.type], from = PORT_BY[fromId], to = PORT_BY[toId], st = cstat(c);
  if (!from || toId === fromId) return { ok: false, why: 'already here' };
  if (!G.ports[toId].open) return { ok: false, why: 'port not open' };
  const lw = landWhy(T, c.upg, to, season()); if (lw) return { ok: false, why: lw };
  let dist, pts;
  const crow = Math.hypot(to.x - from.x, to.y - from.y);
  if (crow > st.range) return { ok: false, why: 'out of range (' + Math.round(crow) + (T.cls === 'boat' ? '+' : '') + ' of ' + st.range + ' km)', dist: crow };
  if (T.cls === 'boat') { const r = seaRoute(from.dock, to.dock); if (!r) return { ok: false, why: 'no sea route' }; dist = r.len; pts = r.pts; }
  else { dist = Math.hypot(to.x - from.x, to.y - from.y); pts = [[from.x, from.y], [to.x, to.y]]; }
  if (dist > st.range) return { ok: false, why: 'out of range (' + Math.round(dist) + ' of ' + st.range + ' km)', dist };
  return { ok: true, dist, pts, cust: crossesBorder(fromId, toId), time: dist / st.speed + (crossesBorder(fromId, toId) ? CUSTOMS_WAIT : 0), fuel: Math.round(dist * st.fuel * (hasWork(fromId, 'fuel') ? 0.7 : 1) * (crewHas(c, 'thrift') ? 0.75 : 1) * (evGlob('fuel') ? 0.7 : 1)), wx: wxBlock(c, from.x, from.y) || wxBlock(c, to.x, to.y) };
}
function routeInfo(c, stops) {
  let from = c.at, dist = 0, time = 0, fuel = 0, wx = null; const legs = [];
  for (let i = 0; i < stops.length; i++) { const li = legInfo(c, from, stops[i]); if (!li.ok) return { ok: false, why: li.why, at: i }; dist += li.dist; time += li.time; fuel += li.fuel; if (i === 0) wx = li.wx; legs.push(li); from = stops[i]; }
  let income = 0; const bd = bonusDest(c), fm = fareMult(c); c.jobs.forEach(j => { if (stops.indexOf(j.to) >= 0) income += j.pay * fm * (bd === j.to ? 1.25 : 1); });
  if (CRAFT_BY[c.type].tour) { const seen = {}; stops.forEach((sid, i) => { income += tourPay(c, sid, legs[i].dist, seen[sid]); seen[sid] = 1; }); }
  return { ok: stops.length > 0, dist, time, fuel, legs, wx, income: Math.round(income), bonus: bd && stops.indexOf(bd) >= 0 };
}
const CUSTOMS_WAIT = 60;
const crossesBorder = (a, b) => !!a && !!b && has(PORT_BY[a], 'customs') !== has(PORT_BY[b], 'customs');
function startRoute(c, pts, len, kind, to) { c.route = { pts, len, pos: 0, kind, to }; c.state = 'move'; c.from = c.at || c.from; c.at = null; if (to && crossesBorder(c.from, to)) c.route.cust = CUSTOMS_WAIT; c.x = pts[0][0]; c.y = pts[0][1]; posOnRoute(c); }
function beginLeg(c) {
  const to = c.plan.stops[c.plan.i], li = legInfo(c, c.at, to);
  if (!li.ok) { c.state = 'dock'; c.plan = null; news('"' + c.name + '" can\'t continue to ' + PORT_BY[to].name + ': ' + li.why + '.', 'bad'); return; }
  if (li.wx) { c.state = 'hold'; c.holdWhy = li.wx; SIM.dirty = true; return; }
  // a badly worn craft sometimes needs coaxing before it will go
  if (condOf(c) < 25 && !c.limped && rand() < 0.15) { c.limped = 1; c.state = 'hold'; c.holdWhy = 'engine trouble'; c.holdT = -20; SIM.dirty = true; return; }
  G.money -= li.fuel; G.stats.fuel += li.fuel; G.stats.trips++; c.tripFuel = (c.tripFuel || 0) + li.fuel; startRoute(c, li.pts, li.dist, 'trip', to); emit('depart', { c });
}
function dispatch(c, stops) {
  if (c.state !== 'dock') return { ok: false, why: 'not at the dock' };
  const info = routeInfo(c, stops); if (!info.ok) return info;
  const bd = bonusDest(c); c.jobs.forEach(j => { j.bonus = bd === j.to ? 1 : 0; });
  c.plan = { stops: stops.slice(), i: 0 }; c.tripFuel = 0; c.last = null; beginLeg(c); if (c.state === 'hold') emit('hold', { c });
  tutMark('send'); return info;
}
function cancelPlan(c) { if (c.state === 'hold') { c.state = 'dock'; c.plan = null; c.jobs.forEach(j => { j.bonus = 0; }); SIM.dirty = true; } }
function fishSpeciesOk(T, sp) { const f = FISH[sp]; if (!T.fish) return false; if (sp === 'lobster') return T.fish === 'in'; if (f.off) return T.fish === 'off'; return true; }
// every ground this boat could work from where it sits, with estimates
function fishOptions(c) {
  const T = CRAFT_BY[c.type], port = PORT_BY[c.at], s = season(), out = []; if (!T.fish || !port || !port.dock) return out;
  GROUNDS.forEach(g => { const r = seaRoute(port.dock, [g.x, g.y]); if (!r) return; const inRange = r.len * 2 <= cstat(c).range;
    Object.keys(g.sp).forEach(sp => { if (!fishSpeciesOk(T, sp)) return; const ab = FISH[sp].abund[s]; if (ab <= 0) return;
      const est = Math.max(1, Math.round(T.hold * clamp(g.sp[sp] * ab * (c.upg.hauler ? 1.25 : 1), 0, 1)));
      const base = { g, sp, dist: r.len, fuel: Math.round(r.len * 2 * cstat(c).fuel), inRange }, trip = r.len * 2 / cstat(c).speed, pr = fishPrice(c.at, sp);
      if (sp === 'lobster' && feat('catch') && (G.traps || {})[g.id]) { const e2 = Math.min(T.hold, Math.max(1, Math.round(T.hold * trapFill(g.id) * (crewHas(c, 'salt') ? 1.25 : 1)))); out.push(Object.assign({ mode: 'haul', est: e2, time: trip + 40, value: e2 * pr, fill: trapFill(g.id) }, base)); return; }
      out.push(Object.assign({ est, time: trip + FISH_TIME, value: est * pr }, base));
      if (sp === 'lobster' && feat('catch') && T.fish === 'in' && inRange && trapCount() < trapMax()) out.push(Object.assign({ mode: 'set', est: 0, time: trip + 20, value: 0 }, base)); }); });
  out.sort((a, b) => (b.inRange - a.inRange) || ((a.mode === 'set' ? 1 : 0) - (b.mode === 'set' ? 1 : 0)) || (b.value / b.time - a.value / a.time)); return out;
}
function goFish(c, gid, sp, mode) {
  if (c.state !== 'dock') return 'Not at the dock.'; if (c.fish) return 'Sell the catch aboard first.';
  if (mode === 'set') { if (!feat('catch')) return 'Trap strings unlock at level ' + FEATURE_BY.catch.lvl + '.'; if ((G.traps || {})[gid]) return 'You already have a string there.'; if (trapCount() >= trapMax()) return 'All ' + trapMax() + ' of your trap strings are set.'; if (G.money < TRAP_BAIT) return 'Can\'t afford the bait.'; }
  if (mode === 'haul' && !(G.traps || {})[gid]) mode = undefined; const T = CRAFT_BY[c.type], g = GROUND_BY[gid], port = PORT_BY[c.at]; if (!T.fish || !port.dock) return 'This craft can\'t fish.';
  const r = seaRoute(port.dock, [g.x, g.y]); if (!r || r.len * 2 > cstat(c).range) return 'Too far for this boat.';
  c.plan = { fish: { g: gid, sp, land: c.at, mode } };
  const wx = wxBlock(c, port.x, port.y) || wxBlock(c, g.x, g.y);
  if (wx) { c.state = 'hold'; c.holdWhy = wx; emit('hold', { c }); }
  else { const fuel = Math.round(r.len * 2 * cstat(c).fuel * (crewHas(c, 'thrift') ? 0.75 : 1) * (evGlob('fuel') ? 0.7 : 1)) + (mode === 'set' ? TRAP_BAIT : 0); G.money -= fuel; G.stats.fuel += fuel; c.tripFuel = fuel; c.last = null; startRoute(c, r.pts, r.len, 'fishOut', null); emit('depart', { c }); }
  tutMark('fish'); return null;
}
function posOnRoute(c) { const r = c.route, pts = r.pts; let d = r.pos;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= l || i === pts.length - 1) { const f = l > 0 ? Math.min(1, d / l) : 1; c.x = a[0] + (b[0] - a[0]) * f; c.y = a[1] + (b[1] - a[1]) * f; if (Math.abs(b[0] - a[0]) > 0.01) c.face = b[0] > a[0] ? 1 : -1; return; } d -= l; } }
function fishPrice(pid, sp) { const f = FISH[sp], s = season(), glut = G.glut[pid + sp] || 0; let h = 0; const key = pid + sp; for (let i = 0; i < key.length; i++) h += key.charCodeAt(i) * (i + 3);
  return Math.max(5, Math.round(f.price * f.pm[s] * (MARKET_MULT[pid] || 0.9) * (hasWork(pid, 'pound') ? 1.2 : 1) * (1 - glut) * (1 + 0.12 * Math.sin(G.t / 97 + h)))); }
function arrive(c) {
  const r = c.route;
  if (r.kind === 'fishOut') { const fm = c.plan.fish.mode; c.state = 'fish'; c.fishT = 0; c.fishDur = fm === 'set' ? 20 : fm === 'haul' ? 40 : FISH_TIME * (c.upg.hauler ? 0.75 : 1); c.route = null; SIM.dirty = true; return; }
  const pid = r.kind === 'fishBack' ? c.plan.fish.land : r.to, port = PORT_BY[pid];
  c.at = pid; c.route = null; c.x = port.x; c.y = port.y; c.limped = 0; crewTrip(c);
  wearCraft(c, r.kind === 'fishBack' ? r.len * 2 : r.len);
  // once catch & traps are unlocked a boat comes home with its catch still aboard: nothing to collect, you choose where to sell
  if (r.kind === 'fishBack' && feat('catch')) { c.state = 'dock'; c.plan = null; emit('fishIn', { c, pid, x: port.x, y: port.y }); return; }
  let pay = 0, units = 0, bonus = 0; const keep = [];
  c.jobs.forEach(j => { if (j.to !== pid) { if (j.vip) j.hops = (j.hops || 0) + 1; keep.push(j); return; } const base = j.pay * fareMult(c), p = Math.round(base * (j.bonus ? 1.25 : 1) * (j.kind === 'p' && crewHas(c, 'charm') ? 1.1 : 1) * crewFare(c)); pay += p; if (j.urgent) bonusXp(20, j.relief ? 'storm relief' : 'medical run'); if (j.vip && !vipDeliver(j, c, pid) && j.vip === 'tip') pay -= Math.round(p * 0.5); if (j.bonus) bonus += p - Math.round(base); units += slotsOf(j); addXp(pid, j.n ? 3 : 1); if (G.ports[j.from]) addXp(j.from, 0.5);
    if (j.kid) { const k = G.active.find(x => x.id === j.kid); if (k) { k.loaded--; k.delivered++; if (k.delivered >= k.total) completeContract(k); } } });
  c.jobs = keep;
  // an excursion boat is paid at every stop of its loop; a harbor it has already shown them pays half
  if (CRAFT_BY[c.type].tour && r.kind === 'trip' && c.plan) { const seen = c.plan.seen || (c.plan.seen = {}), tp = tourPay(c, pid, r.len, seen[pid]); seen[pid] = 1; pay += tp; units += CRAFT_BY[c.type].tour; G.stats.tours = (G.stats.tours || 0) + 1; }
  let fishPay = 0, fishTxt = '';
  if (c.fish && port.dock && !feat('catch')) { logFirst('sp', c.fish.sp, 15, 'first ' + FISH[c.fish.sp].name.toLowerCase() + ' landed'); const price = fishPrice(pid, c.fish.sp); fishPay = price * c.fish.units; fishTxt = c.fish.units + ' ' + FISH[c.fish.sp].name.toLowerCase() + ' @ ' + money(price);
    const key = pid + c.fish.sp; G.glut[key] = Math.min(0.45, (G.glut[key] || 0) + c.fish.units * 0.012); G.stats.fishUnits += c.fish.units; G.stats.fishMoney += fishPay; addXp(pid, c.fish.units * 0.25); c.fish = null; }
  // nothing is paid yet: the fare rides with the craft until you collect it (click the LANDED craft)
  const pd = c.pend || (c.pend = { pay: 0, units: 0, bonus: 0, fish: '', fishPay: 0, stops: 0 });
  pd.pay += pay + fishPay; pd.units += units; pd.bonus += bonus; pd.fishPay += fishPay; if (fishTxt) pd.fish = fishTxt; pd.stops++;
  G.stats.delivered += units;
  if (r.kind === 'trip' && c.plan && c.plan.stops && c.plan.i < c.plan.stops.length - 1) { c.plan.i++; c.state = 'hold'; c.holdWhy = 'turnaround'; c.holdT = -5; }
  else { c.state = 'landed'; c.plan = null; c.jobs.forEach(j => { j.bonus = 0; }); }
  emit('arrive', { c, pid, pay: pay + fishPay, units, bonus, fishTxt, x: port.x, y: port.y, final: c.state === 'landed' });
}
// LANDED -> collect the fare, earn the XP, and the craft is free for the next job
function collect(c, auto) {
  if (c.state !== 'landed') return null; const pd = c.pend || { pay: 0, units: 0, bonus: 0, fish: '', fishPay: 0, stops: 1 }, port = PORT_BY[c.at];
  if (auto && c.run) { pd.pay = Math.round(pd.pay * (1 - RUN_CUT)); c.run.earned += pd.pay; }
  G.money += pd.pay; G.stats.earned += pd.pay; const xp = Math.round(Math.max(0, pd.pay - (c.hurried || 0)) / 10); c.hurried = 0; c.state = 'dock'; c.pend = null;
  c.last = { pay: pd.pay, units: pd.units, bonus: pd.bonus, fish: pd.fish, fuel: c.tripFuel || 0, xp, at: c.at }; c.tripFuel = 0;
  emit(auto ? 'runCollect' : 'collect', { c, pay: pd.pay, xp, bonus: pd.bonus, units: pd.units, fish: pd.fish, x: port.x, y: port.y }); gainXp(xp); if (!auto) tutMark('collect'); return c.last;
}
// Hurrying a craft in costs what the wait is worth: the fare it is carrying to the stops still ahead (or the catch it is after),
// and never less than a price for the time saved. It used to be priced on time alone, a hundred dollars or so against a load worth
// thousands, so every trip could be skipped at a profit and the whole game played in an hour. XP is earned on what is left of the fare.
const HURRY_SHARE = 1;
function hurryFare(c) { const T = CRAFT_BY[c.type], f = c.plan && c.plan.fish;
  if (f) { if (f.mode === 'set') return 0; const units = c.fish ? c.fish.units : f.mode === 'haul' ? T.hold * trapFill(f.g) : T.hold * 0.6; return units * fishPrice(f.land, f.sp); }
  if (!c.plan || !c.plan.stops) return 0; const ahead = c.plan.stops.slice(c.plan.i), fm = fareMult(c); let v = 0;
  c.jobs.forEach(j => { if (ahead.indexOf(j.to) >= 0) v += j.pay * fm * (j.bonus ? 1.25 : 1); });
  if (T.tour && c.route) v += tourPay(c, ahead[0], c.route.len, (c.plan.seen || {})[ahead[0]]);
  return v; }
function hurryCost(c) { let rem = 0; if (c.state === 'move') rem = (c.route.len - c.route.pos) / cstat(c).speed + (c.route.cust > 0 ? c.route.cust : 0); else if (c.state === 'fish') rem = c.fishDur - c.fishT;
  const time = Math.max(5, Math.ceil(rem * (0.18 + 0.05 * G.level) / 5) * 5); return Math.max(time, Math.ceil(hurryFare(c) * HURRY_SHARE / 5) * 5); }
function hurry(c) { if (c.state !== 'move' && c.state !== 'fish') return 'Nothing to hurry.'; const cost = hurryCost(c); if (G.money < cost) return 'Can\'t afford to hurry it.'; G.money -= cost; c.hurried = (c.hurried || 0) + cost; if (c.state === 'move') { c.route.pos = c.route.len; c.route.cust = 0; } else c.fishT = c.fishDur; return null; }
function updateCraft(c, dt) {
  if (c.state === 'move') {
    const st = cstat(c), T = st.T, w = wxAt(c.x, c.y); let sp = st.speed;
    if (T.cls === 'boat') { if (w.fog && !c.upg.radar) sp *= 0.5; if (w.storm) sp *= 0.7; } else if (w.storm || w.snow) sp *= 0.75;
    c.route.pos += sp * dt;
    // across the border a craft sits at the far end for a minute while customs looks it over
    if (c.route.pos >= c.route.len) { if (c.route.cust > 0) { c.route.pos = c.route.len; c.route.cust -= dt; posOnRoute(c); } else arrive(c); } else posOnRoute(c);
  } else if (c.state === 'fish') {
    c.fishT += dt;
    if (c.fishT >= c.fishDur) { const T = CRAFT_BY[c.type], f = c.plan.fish, g = GROUND_BY[f.g], s = season(), var_ = f.sp === 'tuna' ? rnd(0.15, 1.9) : rnd(0.72, 1.15);
      const salt = (crewHas(c, 'salt') ? 1.25 : 1) * (evGlob('fish') ? 1.5 : 1); let units;
      if (f.mode === 'set') { (G.traps || (G.traps = {}))[f.g] = { t: G.t }; units = 0; emit('trapset', { c, g: f.g, x: c.x, y: c.y }); }
      else if (f.mode === 'haul' && (G.traps || {})[f.g]) { units = Math.min(T.hold, Math.max(1, Math.round(T.hold * trapFill(f.g) * salt))); if (G.money >= TRAP_BAIT) { G.money -= TRAP_BAIT; G.traps[f.g].t = G.t; } else delete G.traps[f.g]; }
      else units = Math.round(T.hold * clamp(g.sp[f.sp] * FISH[f.sp].abund[s] * (c.upg.hauler ? 1.25 : 1) * salt * var_, 0, 1));
      c.fish = units > 0 ? { sp: f.sp, units } : null; if (f.mode !== 'set') emit('catch', { c, units, sp: f.sp, x: c.x, y: c.y });
      const r = seaRoute([g.x, g.y], PORT_BY[f.land].dock); startRoute(c, r.pts, r.len, 'fishBack', f.land); }
  } else if (c.state === 'hold') {
    c.holdT = (c.holdT || 0) + dt; if (c.holdT < 1) return; c.holdT = 0;
    if (c.plan && c.plan.fish) { const g = GROUND_BY[c.plan.fish.g], port = PORT_BY[c.at]; const wx = wxBlock(c, port.x, port.y) || wxBlock(c, g.x, g.y); if (!wx) { c.state = 'dock'; const f = c.plan.fish; goFish(c, f.g, f.sp); } else c.holdWhy = wx; }
    else if (c.plan && c.plan.stops) beginLeg(c);
    else c.state = 'dock';
  }
}

/* ---------- fleet / ports / upgrades ---------- */
function canBase(T, port) { return !landWhy(T, { skis: 1, tundra: 1 }, port, SUMMER); }
function newName(T) { const pool = (T.cls === 'boat' ? BOAT_NAMES : PLANE_NAMES).filter(n => G.usedNames.indexOf(n) < 0);
  const name = pool.length ? pick(pool) : (T.cls === 'boat' ? 'Hull No. ' : 'Ship ') + G.nextId; G.usedNames.push(name); return name; }
function addCraft(typeId, pid, name, upg) { const T = CRAFT_BY[typeId], port = PORT_BY[pid];
  const c = { id: G.nextId++, type: typeId, name: name || newName(T), at: pid, state: 'dock', jobs: [], upg: upg || {}, x: port.x, y: port.y, face: 1, fish: null, plan: null, route: null }; G.crafts.push(c); return c; }
/* ---------- hangars, boatyards, parts and storage ----------
   As in Pocket Planes: a craft is three parts. Buy the parts as they turn up and build it for about two thirds of the new price,
   or pay full price for one off the lot. Craft you are not using wait in storage and give their fleet slot back. */
const yardKind = T => T.cls === 'boat' ? 'm' : 'h';
const yardWord = T => T.cls === 'boat' ? 'boatyard' : 'hangar';
function hasYard(pid, T) { const y = PORT_BY[pid].yard; return !!y && (!T || y.indexOf(yardKind(T)) >= 0); }
function yardFits(T, pid) { return hasYard(pid, T) && canBase(T, PORT_BY[pid]); }          // the right kind of yard, somewhere this craft can work from
function yardName(pid) { const y = PORT_BY[pid].yard; return y === 'hm' ? 'Hangar & boatyard' : y === 'h' ? 'Hangar' : y === 'm' ? 'Boatyard' : ''; }
const partKey = (t, s) => t + ':' + s;
function partsHeld(t) { return [0, 1, 2].map(s => G.parts[partKey(t, s)] || 0); }
function partsCount() { let n = 0; for (const k in G.parts) n += G.parts[k]; return n; }
function partPrice(T) { return Math.max(50, Math.round(T.price * PART_FRAC / 50) * 50); }
function partName(t, s) { const T = CRAFT_BY[t]; return T.name + ' ' + PART_NAMES[T.cls][s].toLowerCase(); }
function canAssemble(t) { return partsHeld(t).every(n => n > 0); }
// what a yard might carry: craft it can launch, up to two levels past where you are
function partPool(pid, kind) { const port = PORT_BY[pid]; return CRAFT.filter(T => !T.rare && yardKind(T) === kind && canBase(T, port) && T.lvl <= G.level + 2); }
function rollPart(pool) { if (!pool.length) return null;
  // four times in ten the yard has something you are already collecting
  const want = []; pool.forEach(T => { const h = partsHeld(T.id); if (h.some(n => n > 0)) h.forEach((n, s) => { if (!n) want.push([T, s]); }); });
  if (want.length && rand() < 0.4) return pick(want);
  const T = pick(pool.filter(T => T.lvl <= G.level).length && rand() < 0.7 ? pool.filter(T => T.lvl <= G.level) : pool); return [T, (rand() * 3) | 0]; }
function stockShelf(pid) { const st = G.ports[pid], y = PORT_BY[pid].yard, per = y.length > 1 ? 2 : 3; st.shelf = [];
  y.split('').forEach(kind => { const pool = partPool(pid, kind); for (let i = 0; i < per; i++) { let r = rollPart(pool); for (let n = 0; r && n < 6 && st.shelf.some(x => x.t === r[0].id && x.s === r[1]); n++) r = rollPart(pool); if (!r) continue; const sale = rand() < 0.12;
    st.shelf.push({ id: G.nextId++, t: r[0].id, s: r[1], sale, price: Math.max(40, Math.round(partPrice(r[0]) * (sale ? 0.75 : rnd(0.9, 1.15)) / 10) * 10) }); } });
  st.shelfNext = G.t + SHELF_REFRESH; emit('yard', {}); }
function updateShelves() { PORTS.forEach(p => { if (!p.yard) return; const st = G.ports[p.id]; if (st.open && (!st.shelf || G.t >= st.shelfNext)) stockShelf(p.id); }); }
function givePart(t, s) { const k = partKey(t, s); G.parts[k] = (G.parts[k] || 0) + 1; }
function buyPart(pid, id) { const st = G.ports[pid], i = (st.shelf || []).findIndex(x => x.id === id); if (i < 0) return 'That one is gone.'; const it = st.shelf[i];
  const price = shelfPrice(it); if (G.money < price) return 'Can\'t afford it yet.'; G.money -= price; givePart(it.t, it.s); st.shelf.splice(i, 1); emit('buy', {}); return null; }
// a free part: contracts and new levels pay one out
function awardPart(why, rare) { const fancy = rare ? CRAFT.filter(T => T.rare && T.lvl <= G.level + 2) : [], pool = fancy.length && rand() < 0.5 ? fancy : CRAFT.filter(T => !T.rare && T.lvl <= G.level + 1), r = rollPart(pool); if (!r) return; givePart(r[0].id, r[1]);
  news(why + ': a crate with a ' + partName(r[0].id, r[1]) + ' in it.', 'good'); emit('crate', { t: r[0].id, s: r[1], why }); }
// a finished craft goes into the fleet if there is a slot, into storage if not
function placeCraft(typeId, pid, name, upg) { const T = CRAFT_BY[typeId];
  if (G.crafts.length < G.slots) return addCraft(typeId, pid, name, upg);
  if (G.stored.length < STORE_CAP) { const r = { type: typeId, name: name || newName(T), upg: upg || {}, stored: true }; G.stored.push(r); return r; }
  return null; }
function roomForCraft() { return G.crafts.length < G.slots || G.stored.length < STORE_CAP; }
function buyCraft(typeId, pid) { const T = CRAFT_BY[typeId]; if (T.rare) return 'Not for sale. It is built from parts that come in VIP crates.'; if (G.level < T.lvl) return 'Unlocks at level ' + T.lvl + '.'; if (!G.ports[pid].open) return 'Open the port first.';
  if (!hasYard(pid, T)) return 'No ' + yardWord(T) + ' here.'; if (!canBase(T, PORT_BY[pid])) return 'It can\'t operate from here.';
  if (!roomForCraft()) return 'No free fleet slot, and storage is full.'; if (G.money < T.price) return 'Can\'t afford it yet.';
  G.money -= T.price; const c = placeCraft(typeId, pid); news('New in the fleet: ' + T.name + ' "' + c.name + '," ' + (c.stored ? 'put in storage.' : 'delivered to ' + PORT_BY[pid].name + '.'), 'good'); emit('buy', { c }); logFirst('types', typeId, 15, 'new type: ' + T.name); return c; }
function assemble(typeId, pid) { const T = CRAFT_BY[typeId]; if (!canAssemble(typeId)) return 'You need all three parts.'; if (G.level < T.lvl) return 'You can build this at level ' + T.lvl + '.'; if (!G.ports[pid].open) return 'Open the port first.';
  if (!hasYard(pid, T)) return 'Take the parts to a ' + yardWord(T) + '.'; if (!canBase(T, PORT_BY[pid])) return 'It can\'t operate from here.'; if (!roomForCraft()) return 'No free fleet slot, and storage is full.';
  [0, 1, 2].forEach(s => { const k = partKey(typeId, s); if (--G.parts[k] <= 0) delete G.parts[k]; });
  const c = placeCraft(typeId, pid); news('Built from parts: ' + T.name + ' "' + c.name + '," ' + (c.stored ? 'put in storage.' : 'rolled out at ' + PORT_BY[pid].name + '.'), 'good'); emit('buy', { c }); bonusXp(20, 'built from parts'); logFirst('types', typeId, 15, 'new type: ' + T.name); return c; }
function storeCraft(c) { const T = CRAFT_BY[c.type]; if (c.state !== 'dock' || c.jobs.length || c.fish || goodsCount(c)) return 'Empty it and tie it up first.'; if (!hasYard(c.at, T)) return 'Storage is at a ' + yardWord(T) + '. Take it to one.';
  if (G.stored.length >= STORE_CAP) return 'Storage is full.'; if (G.crafts.length <= 1) return 'Keep at least one craft working.';
  G.crafts.splice(G.crafts.indexOf(c), 1); G.stored.push({ type: c.type, name: c.name, upg: c.upg, stored: true, cond: c.cond, crew: c.crew || null, liv: c.liv || 0 }); emit('yard', {}); return null; }
function unstoreCraft(i, pid) { const r = G.stored[i]; if (!r) return 'That one is gone.'; const T = CRAFT_BY[r.type]; if (G.crafts.length >= G.slots) return 'No free fleet slot.'; if (!G.ports[pid].open) return 'Open the port first.';
  if (!hasYard(pid, T)) return 'It comes out at a ' + yardWord(T) + '.'; if (!canBase(T, PORT_BY[pid])) return 'It can\'t operate from here.';
  G.stored.splice(i, 1); const c = addCraft(r.type, pid, r.name, r.upg); if (r.cond !== undefined) c.cond = r.cond; c.crew = r.crew || null; c.liv = r.liv || 0; emit('yard', {}); return c; }
function sellStored(i) { const r = G.stored[i]; if (!r) return 'That one is gone.'; G.money += sellValue(r); G.stored.splice(i, 1); emit('sell', {}); return null; }
function sellValue(c) { let v = CRAFT_BY[c.type].price * 0.5; Object.keys(c.upg).forEach(u => v += upgradeCost(c, u) * 0.3); return Math.round(v); }
function sellCraft(c) { if (c.state !== 'dock' || c.jobs.length || goodsCount(c)) return 'Empty it and tie it up first.'; if (G.crafts.length <= 1) return 'You can\'t sell your last craft.'; G.money += sellValue(c); G.crafts.splice(G.crafts.indexOf(c), 1); emit('sell', {}); return null; }
function upgradeCost(c, uid) { const u = UPGRADES.find(x => x.id === uid), T = CRAFT_BY[c.type]; return Math.max(u.min, Math.round(u.pct * T.price / 50) * 50); }
function upgradesFor(c) { const T = CRAFT_BY[c.type]; return UPGRADES.filter(u => u.cls === T.cls && (!u.ok || u.ok(T))); }
function buyUpgrade(c, uid) { if (c.upg[uid]) return 'Already fitted.'; const cost = upgradeCost(c, uid); if (G.money < cost) return 'Can\'t afford it yet.'; G.money -= cost; c.upg[uid] = 1; emit('buy', { c }); return null; }
function unlockPort(pid) { const p = PORT_BY[pid], st = G.ports[pid]; if (st.open) return null; if (p.lvl && G.level < p.lvl) return p.reg + ' opens at level ' + p.lvl + '.'; const cost = portCost(pid); if (G.money < cost) return 'Can\'t afford it yet.';
  G.money -= cost; st.open = true; refreshBoard(p); st.next = G.t + JOB_REFRESH;
  news('Now serving ' + p.name + '. ' + p.blurb, 'good'); tutMark('unlock'); emit('unlock', { pid }); refreshOffers(); bonusXp(30, 'new port'); return null; }
function fleetCanReach(pid) { const p = PORT_BY[pid]; return G.crafts.some(c => canBase(CRAFT_BY[c.type], p)); }

/* ---------- contracts ---------- */
function makeOffer(tp) {
  const o = PORT_BY[tp.from], d = PORT_BY[tp.to], dist = Math.hypot(d.x - o.x, d.y - o.y); let cap = 0, speed = 3;
  G.crafts.forEach(c => { const T = CRAFT_BY[c.type]; if (!canBase(T, o) || !canBase(T, d) || dist > T.range) return; const st = cstat(c), n = tp.k === 'p' ? st.pax : st.cargo; if (n > cap) { cap = n; speed = st.speed; } });
  const total = cap ? clamp(Math.round(cap * 3), 6, 160) : 6, tripT = 2 * dist * (cap ? 1 : 1.3) / speed;
  const dur = Math.round(Math.max(1500, tripT * Math.ceil(total / Math.max(1, cap)) * 1.8 + 600) / 60) * 60;
  const rate = Math.round((14 + 0.9 * dist) * 1.2 * ((has(o, 'island') || has(d, 'island') || has(d, 'remote')) ? 1.25 : 1) / 5) * 5;
  return { id: G.nextId++, title: tp.title, text: tp.text, what: tp.what, ic: tp.ic, from: tp.from, to: tp.to, k: tp.k, total, delivered: 0, loaded: 0, rate, bonus: Math.max(100, Math.round(total * rate * 0.6 / 50) * 50), dur, deadline: 0, born: G.t, s: tp.s, canDo: cap > 0 };
}
function refreshOffers() {
  const s = season(); G.offers = G.offers.filter(o => o.s === s && G.t - o.born < DAY_LEN * 3);
  const taken = {}; G.offers.concat(G.active).forEach(o => taken[o.title] = 1);
  const pool = CONTRACT_TEMPLATES.filter(t => t.s === s && !taken[t.title] && G.ports[t.from].open && G.ports[t.to].open);
  while (G.offers.length < 3 && pool.length) { const i = (rand() * pool.length) | 0; G.offers.push(makeOffer(pool.splice(i, 1)[0])); }
  SIM.dirty = true;
}
function acceptContract(id) { if (G.active.length >= 2) return 'Two contracts at a time is plenty.'; const i = G.offers.findIndex(o => o.id === id); if (i < 0) return 'Offer withdrawn.'; const k = G.offers.splice(i, 1)[0]; k.deadline = G.t + k.dur; G.active.push(k);
  news('Contract signed: ' + k.title + '. ' + k.total + ' ' + k.what + ', ' + PORT_BY[k.from].name + ' to ' + PORT_BY[k.to].name + '.', ''); emit('contract', {}); return null; }
function completeContract(k) { G.money += k.bonus; G.stats.earned += k.bonus; G.stats.contracts++; addXp(k.from, 8); addXp(k.to, 8); G.active.splice(G.active.indexOf(k), 1);
  news('Contract complete: ' + k.title + '. Bonus ' + money(k.bonus) + '. Finest kind.', 'good'); emit('contractDone', { bonus: k.bonus }); awardPart('Contract bonus'); bonusXp(k.bonus / 8, 'contract'); }
function dropContract(k, failed) { G.active.splice(G.active.indexOf(k), 1); addXp(k.from, -5);
  news((failed ? 'Contract lapsed: ' : 'Contract dropped: ') + k.title + '. ' + PORT_BY[k.from].name + ' is not impressed.', 'bad'); emit('contract', {}); }
// A signed contract's clock stands still while you are away, like a port request's: nobody was there to work it.
function updateContracts(dt) { if (SIM.away) { G.active.forEach(k => { k.deadline += dt || 0; }); return; } for (let i = G.active.length - 1; i >= 0; i--) if (G.t > G.active[i].deadline) dropContract(G.active[i], true); }

/* ---------- the tick ---------- */
function tick(dt) {
  const s0 = season(); G.t += dt;
  const d = dayOf(G.t);
  if (d !== G.lastDay) { G.lastDay = d; const s = season(); refreshOffers(); rollEvent(); refreshHall(); emit('day', {});
    if (s !== s0) { news(SEASON_NAMES[s] + ', year ' + yearOf(G.t) + '. ' + SEASON_BLURB[s], 'season'); emit('season', { s }); G.offers = []; refreshOffers(); }
    else if ((d % SEASON_DAYS) === SEASON_DAYS - 1) { const nx = (s + 1) % 4; news('Almanac: ' + SEASON_NAMES[nx].toLowerCase() + ' starts tomorrow. ' + (nx === WINTER ? 'Lakes will freeze; floats are no good on ice.' : nx === SPRING ? 'Mud season closes grass and gravel strips.' : nx === SUMMER ? 'The summer people are coming.' : 'Foliage, hunters and potatoes.'), 'season'); } }
  updateWeather(dt); updateBoards(); updateShelves(); expireUrgent(); updateVips(); updateRuns(dt); updateDepth(dt);
  for (let i = 0; i < G.crafts.length; i++) updateCraft(G.crafts[i], dt);
  updateContracts(dt);
  const decay = Math.exp(-dt / 900); for (const k in G.glut) { G.glut[k] *= decay; if (G.glut[k] < 0.005) delete G.glut[k]; }
  G.newsNext -= dt; if (G.newsNext <= 0) { G.newsNext = rnd(150, 300); news(pick(NEWS_IDLE), 'idle'); }
}

// time away: run the clock forward in coarse steps so flights land and boards refresh while the game was closed
// Catching up on time away. SIM.away is set while it runs: port requests do not run down and the rival stays home,
// because nobody was there to answer either. awayTick is one slice of it, so the page can do a long catch-up a bit at a time.
function awayTick(dt) { SIM.away = true; try { tick(dt); } finally { SIM.away = false; } }
function fastForward(sec) { sec = Math.min(sec, OFFLINE_CAP); const before = G.crafts.filter(c => c.state === 'landed').length; for (let t = 0; t < sec; t += 2) awayTick(Math.min(2, sec - t)); SIM.events = []; SIM.dirty = true; return G.crafts.filter(c => c.state === 'landed').length - before; }
