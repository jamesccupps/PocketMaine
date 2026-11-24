/* ===== VIPs & special freight, and holiday themes that follow the real calendar =====
   A VIP is one gold job on a port's board: somebody important or something precious. It pays about triple
   and brings a reward on delivery. They turn up on a timer, wait eight minutes, and never more than three at once. */
const VIP_STAY = 480, VIP_MAX = 3;
const VIP_REWARD = { tip: 'BIG TIP', xp: 'XP', part: 'CRATE', word: 'GOOD WORD' };
// some VIPs are particular. Meet the condition or there is no reward (and half the tip).
const VIP_PREF = { direct: 'DIRECT', day: 'BY DAY', fit: 'FIT' };      // no stops on the way; land in daylight; a craft in good repair
const VIP_PREF_WHY = { direct: 'there was a stop on the way', day: 'it was dark when they got there', fit: 'the craft was running rough' };
function vipMet(j, c) { if (j.pref === 'direct') return !j.hops; if (j.pref === 'day') { const h = hourOf(G.t); return h >= 6 && h < 20; } if (j.pref === 'fit') return condOf(c) >= 60; return true; }
// a few VIPs keep coming back until they have been everywhere on their list. Finishing a list earns a paint no yard sells.
const CHAINS = [
  { id: 'lights', vip: 'The lighthouse inspector|suit', need: 5, want: p => has(p, 'coast') || has(p, 'island'), goal: 'five different harbors', paint: ['Lighthouse', 'w', 'r'] },
  { id: 'critic', vip: 'A food critic from away|tourist', need: 4, want: p => has(p, 'city') || has(p, 'tourist'), goal: 'four towns worth eating in', paint: ['Blue plate', 'b', 'w'] },
  { id: 'judge',  vip: 'A circuit judge|suit', need: 6, want: () => true, goal: 'six different courthouses', paint: ['Judge\'s black', 'k', 'y'] }
];
CHAINS.forEach(ch => { ch.label = ch.vip.split('|')[0]; LIVERIES.push([ch.paint[0], ch.paint[1], ch.paint[2], 'chain:' + ch.id]); });
function chainState(id) { const m = G.chains || (G.chains = {}); return m[id] || (m[id] = { n: 0, seen: {} }); }
function chainStep(j, pid) { const ch = CHAINS.find(q => q.label === j.label); if (!ch) return; const st = chainState(ch.id), p = PORT_BY[pid]; if (st.done || st.seen[pid] || !ch.want(p)) return;
  st.seen[pid] = 1; st.n++; if (st.n >= ch.need) { st.done = 1; earnPaint('chain:' + ch.id, ch.label + ' has been to ' + ch.goal + '.'); awardPart('List finished', true); awardPart('List finished', true); bonusXp(100, 'a VIP\'s list finished'); emit('chain', { label: ch.label, done: true, n: st.n, need: ch.need }); }
  else { news(ch.label + ': ' + st.n + ' of ' + ch.need + '.', 'good'); emit('chain', { label: ch.label, n: st.n, need: ch.need }); } }
const VIPS = {
  p: ['A film location scout|tourist', 'The lighthouse inspector|suit', 'A famous author, incognito|any', 'A food critic from away|tourist', 'A bride, running late|any', 'A hockey scout|cap',
      'A fiddle champion on tour|any', 'A summer-colony matriarch and her dog|elder', 'A country doctor on her rounds|nurse', 'A puffin researcher|guide', 'A lobster dealer with a deadline|fisher', 'A circuit judge|suit'],
  c: ['A lighthouse lens, crated|crate', 'A three-tier wedding cake|pie', 'The fair\'s prize pumpkin|pumpkin', 'A grand piano, mind the legs|crate', 'A painting for the museum|box', 'A racing engine, freshly rebuilt|outboard',
      'The championship trophy|star', 'A blue lobster for the aquarium|lobster', 'Rare books for the college|books', 'A cedar canoe, hand built|canoe', 'The first maple syrup of the year|syrup', 'A bell for the new steeple|parts']
};
function vipJobs() { const out = []; PORTS.forEach(p => { const st = G.ports[p.id]; if (st.open) st.jobs.forEach(j => { if (j.vip) out.push(j); }); }); return out; }
function vipAt(pid) { const st = G.ports[pid]; return !!st && st.open && st.jobs.some(j => j.vip); }
function vipTotal() { return VIPS.p.length + VIPS.c.length + HOLIDAYS.reduce((a, h) => a + h.vip.p.length + h.vip.c.length, 0); }
function spawnVip(o) {
  const open = PORTS.filter(p => G.ports[p.id].open && !vipAt(p.id)); if (open.length < 1 || portsOwned() < 2) return null;
  if (!o || vipAt(o.id)) { const busy = open.filter(p => G.crafts.some(c => c.at === p.id)); o = pick(Math.random() < 0.7 && busy.length ? busy : open); }
  const s = season(); let kind = Math.random() < 0.5 ? 'p' : 'c';
  const dests = k => PORTS.filter(d => d.id !== o.id && G.ports[d.id].open && bestCapFor(o, d, k) > 0);
  let ds = dests(kind); if (!ds.length) { kind = kind === 'p' ? 'c' : 'p'; ds = dests(kind); } if (!ds.length) return null;
  let tot = 0; const ws = ds.map(d => { const w = 40 + Math.hypot(d.x - o.x, d.y - o.y); tot += w; return w; }); let r = Math.random() * tot, d = ds[0]; for (let i = 0; i < ds.length; i++) { r -= ws[i]; if (r <= 0) { d = ds[i]; break; } }
  const h = holidayNow(), list = h && Math.random() < 0.6 ? h.vip[kind] : VIPS[kind]; let fl = pick(list).split('|');
  // three times in ten, somebody with a list: sent somewhere they have not been yet
  if (Math.random() < 0.3) { const ch = pick(CHAINS), st = chainState(ch.id), go = st.done ? [] : PORTS.filter(q => q.id !== o.id && G.ports[q.id].open && ch.want(q) && !st.seen[q.id] && bestCapFor(o, q, 'p') > 0); if (go.length) { kind = 'p'; d = pick(go); fl = ch.vip.split('|'); } }
  const roll = Math.random(), reward = roll < 0.3 ? 'tip' : roll < 0.6 ? 'xp' : roll < 0.85 ? 'part' : 'word';
  const j = { id: G.nextId++, from: o.id, to: d.id, kind, pay: Math.round(payFor(o, d, kind, s, false) * (reward === 'tip' ? 4 : 3) / 5) * 5, label: fl[0], ic: fl[1], vip: reward, exp: G.t + VIP_STAY };
  if (Math.random() < 0.4) j.pref = pick(feat('wear') ? ['direct', 'day', 'fit'] : ['direct', 'day']);
  G.ports[o.id].jobs.unshift(j); SIM.dirty = true; emit('vip', { from: o.id, to: d.id, label: j.label, pay: j.pay }); return j;
}
function updateVips() {
  PORTS.forEach(p => { const st = G.ports[p.id]; if (!st.open) return; for (let i = st.jobs.length - 1; i >= 0; i--) if (st.jobs[i].vip && G.t > st.jobs[i].exp) { st.jobs.splice(i, 1); SIM.dirty = true; } });
  if (!feat('vip')) return; if (G.vipNext === undefined) G.vipNext = G.t + 45;
  if (G.t >= G.vipNext) { G.vipNext = G.t + rnd(200, 340) * (holidayNow() ? 0.7 : 1); if (vipJobs().length < VIP_MAX) spawnVip(); }
}
function vipDeliver(j, c, pid) {
  G.stats.vips = (G.stats.vips || 0) + 1; let txt = ''; const met = vipMet(j, c);
  const first = logFirst('vip', j.label, 10, 'new in the logbook: ' + j.label);
  if (!met) txt = 'But ' + VIP_PREF_WHY[j.pref] + ', so ' + (j.vip === 'tip' ? 'the tip was half what it might have been.' : 'that was all there was to it.');
  else if (j.vip === 'xp') { const n = 20 + 6 * G.level; bonusXp(n, 'VIP delivered'); txt = '+' + n + ' XP.'; }
  else if (j.vip === 'part') { awardPart('VIP delivered', true); txt = 'A parts crate came with it.'; }
  else if (j.vip === 'word') { addXp(pid, 15); if (G.ports[j.from]) addXp(j.from, 15); txt = 'Your name is good at both ends of that run.'; }
  else txt = 'The tip is in the fare.';
  if (!first && (j.vip !== 'xp' || !met)) bonusXp(5, 'VIP delivered');
  if (met) { chainStep(j, pid); HOLIDAYS.forEach(h => { if (h.paint && (h.vip.p.concat(h.vip.c)).some(q => q.split('|')[0] === j.label)) earnPaint(h.id, 'For carrying ' + j.label.charAt(0).toLowerCase() + j.label.slice(1) + '.'); }); }
  news('Delivered: ' + j.label + ', to ' + PORT_BY[pid].name + '. ' + txt, met ? 'good' : 'idle'); emit('vipDone', { label: j.label, reward: j.vip, txt, met, x: PORT_BY[pid].x, y: PORT_BY[pid].y }); return met;
}
// what a level brings is on the board the moment it is reached
function onUnlock(id) { if (id === 'vip') { spawnVip(); G.vipNext = G.t + 200; } if (id === 'events') { if (!G.ev && portsOwned() > 1) startRandomEvent(); planSeason(); } }

/* ---------- holidays: the real calendar dresses the game up ---------- */
let HOLIDAY_FORCE = null;      // tests set this: 'off', or a holiday id
function nthDay(y, m, wd, n) { const w = new Date(y, m - 1, 1).getDay(); return 1 + ((wd - w + 7) % 7) + (n - 1) * 7; }     // the nth Monday, say, of a month
function lastDay(y, m, wd) { const e = new Date(y, m, 0); return e.getDate() - ((e.getDay() - wd + 7) % 7); }
function thanksgivingDay(y) { return nthDay(y, 11, 4, 4); }
const HOLIDAYS = [
  { id: 'newyear', paint: ['Midnight', 'B', 'y'], name: 'New Year', on: (m, d) => (m === 12 && d >= 30) || (m === 1 && d <= 2), fx: 'fireworks', deco: 'gold', greet: 'Happy New Year. Fireworks over every harbor tonight.',
    jobs: { p: ['Somebody who stayed up too late|any', 'A polar-dip swimmer, still shivering|cap', 'First-day hiker|guide'], c: ['Party hats and noisemakers|box', 'Leftover fireworks|crate', 'Black-eyed peas for luck|grocery'] },
    vip: { p: ['Last night\'s band, heading home|any'], c: ['The big lighted ball for the drop|crate'] } },
  { id: 'valentine', paint: ['Valentine', 'p', 'r'], name: 'Valentine\'s Day', on: (m, d) => m === 2 && d >= 8 && d <= 14, fx: 'hearts', deco: 'pink', greet: 'Valentine\'s week. Flowers and chocolates are moving by the crate.',
    jobs: { p: ['A fella with flowers and a plan|suit', 'Long-distance sweetheart|any', 'Two people not speaking|any'], c: ['Roses, two dozen|heart', 'Needhams by the tin|heart', 'A very large stuffed bear|gift'] },
    vip: { p: ['A nervous fella with a ring|suit'], c: ['A hundred dozen roses|heart'] } },
  { id: 'stpat', paint: ['Shamrock', 'e', 'w'], name: 'St. Patrick\'s Day', on: (m, d) => m === 3 && d >= 13 && d <= 17, fx: '', deco: 'green', greet: 'St. Patrick\'s week. Pipes, parades and green everything.',
    jobs: { p: ['A piper, warming up|any', 'Somebody\'s Irish uncle|elder', 'Parade marcher in green|kid'], c: ['Corned beef and cabbage|grocery', 'Soda bread|pie', 'Green carnations|box'] },
    vip: { p: ['The parade\'s head piper|any'], c: ['A harp, crated carefully|crate'] } },
  { id: 'maple', paint: ['Sugarhouse', 'n', 'y'], name: 'Maple Sunday', on: (m, d, y) => { const t = nthDay(y, 3, 0, 4); return m === 3 && d >= t - 2 && d <= t; }, fx: 'snow', deco: 'maple', greet: 'Maple Sunday weekend. Every sugarhouse has its doors open.',
    jobs: { p: ['A family bound for a pancake breakfast|kid', 'A sugarmaker\'s helper|cap', 'A fella who only wants the candy|any'], c: ['Maple syrup by the case|syrup', 'Sap buckets|barrel', 'Maple candy|box', 'Pancake mix|grocery'] },
    vip: { p: ['The syrup contest judge|elder'], c: ['The first boil of the year|syrup'] } },
  { id: 'patriots', paint: ['Minuteman', 'b', 'w'], name: 'Patriots\' Day', on: (m, d, y) => { const t = nthDay(y, 4, 1, 3); return m === 4 && d >= t - 2 && d <= t; }, fx: '', deco: 'flags', greet: 'Patriots\' Day weekend. Reenactors at dawn and a marathon after.',
    jobs: { p: ['A minuteman, with musket|any', 'A marathon runner|kid', 'A fife player|kid'], c: ['Tricorn hats|box', 'Running shoes by the case|box', 'Lanterns, two|crate'] },
    vip: { p: ['A rider with urgent news|any'], c: ['A cannon for the reenactment|crate'] } },
  { id: 'memorial', paint: ['Bunting', 'r', 'b'], name: 'Memorial Day', on: (m, d, y) => { const t = lastDay(y, 5, 1); return m === 5 && d >= t - 3 && d <= t; }, fx: '', deco: 'flags', greet: 'Memorial Day weekend. Parades, flags, and camps opening for the summer.',
    jobs: { p: ['A veteran in his old uniform|elder', 'Summer person opening camp|tourist', 'The band\'s tuba player|kid'], c: ['Flags for the cemetery|box', 'Geraniums|box', 'The dock, in sections|lumber', 'Charcoal|grocery'] },
    vip: { p: ['The parade\'s oldest veteran|elder'], c: ['A wreath for the monument|wreath'] } },
  { id: 'fourth', paint: ['Fireworks', 'b', 'r'], name: 'Independence Day', on: (m, d) => m === 7 && d >= 1 && d <= 5, fx: 'fireworks', deco: 'flags', greet: 'Fourth of July week. Parades by day, fireworks after dark.',
    jobs: { p: ['Fife and drum corps member|any', 'Kid with a sparkler|kid', 'Somebody\'s uncle in a flag shirt|cap'], c: ['Fireworks (keep dry)|crate', 'Strawberry shortcake fixings|grocery', 'Lobsters for the bake|lobster', 'Bunting by the yard|box'] },
    vip: { p: ['The parade\'s grand marshal|elder'], c: ['The whole fireworks show, crated|crate'] } },
  { id: 'labor', paint: ['Lunch pail', 'g', 'y'], name: 'Labor Day', on: (m, d, y) => { const t = nthDay(y, 9, 1, 1); return (m === 9 && d <= t && d >= t - 3) || (m === 8 && t - 3 < 1 && d >= 31 + t - 3); }, fx: '', deco: 'flags', greet: 'Labor Day weekend. Last swim, last lobster roll, camps closing up.',
    jobs: { p: ['Summer person closing camp|tourist', 'A kid dreading school|kid', 'A fair-goer|any'], c: ['The dock, coming out|lumber', 'School supplies|books', 'Blueberry pie for the fair|pie'] },
    vip: { p: ['The fair\'s pie judge|elder'], c: ['The prize ox, somehow|crate'] } },
  { id: 'halloween', paint: ['Jack-o\'-lantern', 'o', 'N'], name: 'Halloween', on: (m, d) => m === 10 && d >= 24, fx: 'bats', deco: 'pumpkins', greet: 'Halloween week. Pumpkins on every wharf, and things flying about after dark.',
    jobs: { p: ['A ghost (sheet, two holes)|kid', 'Trick-or-treater|kid', 'A witch running late|any', 'A fella in a moose costume|cap'], c: ['Pumpkins|pumpkin', 'Candy by the case|box', 'Cider and doughnuts|grocery'] },
    vip: { p: ['The hayride\'s headless horseman|any'], c: ['The giant pumpkin for the regatta|pumpkin'] } },
  { id: 'thanks', paint: ['Harvest', 'n', 'y'], name: 'Thanksgiving', on: (m, d, y) => { const t = thanksgivingDay(y); return m === 11 && d >= t - 6 && d <= t + 1; }, fx: 'leaves', deco: 'harvest', greet: 'Thanksgiving week. Everybody is going home and bringing a pie.',
    jobs: { p: ['College kid home for the holiday|kid', 'Grandmother bringing the pies herself|elder', 'An uncle with opinions|cap', 'Hunter back from camp for dinner|hunter'], c: ['A twenty-pound turkey|turkey', 'Pies, four kinds|pie', 'Cranberries|berries', 'Squash and potatoes|potato', 'Extra folding chairs|box'] },
    vip: { p: ['Everybody\'s favorite grandmother|elder'], c: ['Every turkey for the church supper|turkey'] } },
  { id: 'christmas', paint: ['Candy cane', 'r', 'w'], name: 'Christmas', on: (m, d) => m === 12 && d >= 10 && d <= 26, fx: 'snow', deco: 'lights', greet: 'Christmas is coming. Lights are up in every port and the mail is all packages.',
    jobs: { p: ['Kid home for Christmas|kid', 'Carolers, off key|any', 'Last-minute shopper|any', 'Somebody\'s grandmother with presents|elder'], c: ['A Christmas tree|tree', 'Wreaths|wreath', 'Presents|gift', 'Mail-order packages|gift', 'A fruitcake, regifted|box'] },
    vip: { p: ['A man in a red suit, in a hurry|elder'], c: ['A sleigh\'s worth of presents|gift'] } }
];
const HOLIDAY_BY = {}; HOLIDAYS.forEach(h => { HOLIDAY_BY[h.id] = h; if (h.paint) LIVERIES.push([h.paint[0], h.paint[1], h.paint[2], h.id]); });
function holidayOn(date) { const m = date.getMonth() + 1, d = date.getDate(), y = date.getFullYear(); for (let i = 0; i < HOLIDAYS.length; i++) if (HOLIDAYS[i].on(m, d, y)) return HOLIDAYS[i]; return null; }
const holCache = { k: -1, h: null };
function holidayNow() { const pref = HOLIDAY_FORCE !== null ? HOLIDAY_FORCE : (G && G.hol) || 'auto'; if (pref === 'off') return null; if (pref !== 'auto') return HOLIDAY_BY[pref] || null;
  const k = Math.floor(Date.now() / 60000); if (holCache.k !== k) { holCache.k = k; holCache.h = holidayOn(new Date()); } return holCache.h; }
function holidayFlavor(kind) { const h = holidayNow(); if (!h || Math.random() > 0.3) return null; return pick(h.jobs[kind]).split('|'); }
// AUTO follows the calendar; OFF never dresses up; anything else is a preview of that holiday
function holidayPref() { return (G && G.hol) || 'auto'; }
function cycleHoliday() { const order = ['auto', 'off'].concat(HOLIDAYS.map(h => h.id)), i = order.indexOf(holidayPref()); G.hol = order[(i + 1) % order.length]; if (G.hol === 'auto') delete G.hol; G.holSeen = ''; SIM.dirty = true; return holidayNow(); }
function holidayGreet() { const h = holidayNow(); if (!h) return null; const key = h.id + new Date().getFullYear(); if (G.holSeen === key) return null; G.holSeen = key; news(h.greet + ' Holiday jobs pay 25% more.', 'good'); return h; }
