/* =====================================================================
   Section 6: UI  — HUD, the port screen, the fleet/route dock, input, sound.
   Screens are rebuilt from state as HTML strings; every control carries
   data-act / data-arg and is handled by one delegated click handler.
   ===================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const UI = { screen: 'map', sheet: null, stab: 'jobs', selCraftId: null, selCraft: null, selPort: null, stops: [], filter: null, flash: null, mode: null, hoverPort: null, hoverGround: null, reach: null, fishGrounds: null,
  sig: '', lastRender: 0, pointerDown: false, started: false, paused: false, shownMoney: 0, coins: [], coinPops: [], coinNext: 6, fleetKey: '', bevKey: null };
const portName = id => PORT_BY[id].name;
const reachAny = c => PORTS.some(p => p.id !== c.at && G.ports[p.id].open && legInfo(c, c.at, p.id).ok);
const landVerb = c => isBoat(c) ? 'tie up' : 'land';
function stuckNote(c, pid) { const T = CRAFT_BY[c.type], canFish = T.fish && PORT_BY[pid].dock; return canFish ? 'take it out on the FISHING tab, or open another harbor along the coast' : 'open a port within its reach, or bring in a craft that can make the trip'; }
const isBoat = c => !!c && CRAFT_BY[c.type].cls === 'boat';
const goWord = c => !c ? 'FLY (CAST OFF for a boat)' : isBoat(c) ? 'CAST OFF' : 'FLY';
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
const pips = p => '<span class="pips">' + (p.strip === 2 ? '<i class="pip s2" data-tip="Paved runway"></i>' : '') + (p.strip === 1 ? '<i class="pip s1" data-tip="Grass or gravel strip: bush planes only"></i>' : '') + (p.water === 'sea' ? '<i class="pip sea" data-tip="Harbor: boats and floatplanes"></i>' : '') + (p.water === 'lake' ? '<i class="pip lake" data-tip="Lake: floatplanes (skis in winter)"></i>' : '') + '</span>';
const secs = t => { t = Math.max(0, Math.ceil(t)); return t >= 3600 ? Math.floor(t / 3600) + 'h ' + String(Math.floor(t % 3600 / 60)).padStart(2, '0') + 'm' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const SND = { ctx: null };
function tone(f, d, type, vol, at, f2) { if (!G || !G.sound) return; try { if (!SND.ctx) SND.ctx = new (window.AudioContext || window.webkitAudioContext)(); const a = SND.ctx, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (at || 0);
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.linearRampToValueAtTime(f2, t0 + d); g.gain.setValueAtTime(vol || 0.04, t0); g.gain.linearRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02); } catch (e) { } }
const sfx = {
  click: () => tone(660, 0.04, 'square', 0.025), load: () => tone(520, 0.05, 'square', 0.03, 0, 700), unload: () => tone(600, 0.05, 'square', 0.03, 0, 420),
  go: () => { tone(330, 0.09, 'square', 0.035); tone(440, 0.09, 'square', 0.035, 0.09); tone(660, 0.14, 'square', 0.035, 0.18); },
  pay: () => { tone(988, 0.07, 'square', 0.035); tone(1319, 0.16, 'square', 0.035, 0.07); }, land: () => { tone(523, 0.08, 'triangle', 0.05); tone(784, 0.16, 'triangle', 0.05, 0.09); }, err: () => tone(150, 0.14, 'sawtooth', 0.035, 0, 110),
  big: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.13, 'square', 0.035, i * 0.1)), horn: () => tone(98, 0.7, 'sawtooth', 0.03, 0, 92), splash: () => tone(900, 0.12, 'triangle', 0.04, 0, 300)
};
function toast(msg, kind) { const box = $('toasts'); while (box.children.length >= 3) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg; $('toasts').appendChild(d); setTimeout(() => d.remove(), 2600); if (kind === 'bad') sfx.err(); }
function banner(big, small) { const b = $('banner'); b.innerHTML = '<b>' + esc(big) + '</b><span>' + esc(small) + '</span>'; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }
function refreshSel() { UI.selCraft = UI.selCraftId ? (G.crafts.find(c => c.id === UI.selCraftId) || null) : null; if (!UI.selCraft) UI.selCraftId = null; }
function craftStatus(c) { const T = CRAFT_BY[c.type];
  if (c.state === 'dock') return (c.jobs.length ? 'Boarding at ' : 'Idle at ') + portName(c.at); if (c.state === 'landed') return 'Arrived at ' + portName(c.at); if (c.state === 'fish') return 'Fishing ' + GROUND_BY[c.plan.fish.g].name;
  if (c.state === 'hold') return c.holdWhy === 'turnaround' ? 'Turning around at ' + portName(c.at) : 'Holding at ' + portName(c.at) + ' (' + c.holdWhy + ')';
  if (c.route.kind === 'fishOut') return 'Steaming for ' + GROUND_BY[c.plan.fish.g].name; if (c.route.kind === 'fishBack') return 'Heading in to ' + portName(c.plan.fish.land);
  return (T.cls === 'plane' ? 'Flying to ' : 'Under way to ') + portName(c.route.to); }
function craftLine(T) { const bits = []; if (T.tour) bits.push(T.tour + ' sightseers'); if (T.pax) bits.push(T.pax + (T.pax === 1 ? ' seat' : ' seats')); if (T.cargo) bits.push(T.cargo + ' cargo'); if (T.hold) bits.push('hold ' + T.hold); bits.push(T.range + ' km');
  bits.push(T.cls === 'boat' ? (T.fish === 'off' ? 'offshore fishing' : T.fish ? 'inshore fishing' : 'harbors') : (T.floats && T.wheels ? 'pavement or water' : T.floats ? 'water only' : T.wheels === 1 ? 'any strip' : 'pavement only')); return bits.join(' · '); }
function htmlContracts() {
  let h = '<div class="pad"><div class="sub">Big seasonal hauls. Freight waits at the pickup port; move it all before the deadline for the bonus. Two at a time.</div><h3>SIGNED <em>' + G.active.length + '/2</em></h3>';
  if (!G.active.length) h += '<div class="sub">None yet.</div>';
  G.active.forEach(k => { h += '<div class="card"><div class="row between"><b class="sk" style="font-size:15px">' + esc(k.title) + '</b><span class="tag ' + (k.deadline - G.t < 60 ? 'red' : 'blue') + '" id="kdl' + k.id + '">' + secs(k.deadline - G.t) + ' left</span></div><div class="row" style="margin:6px 0"><img src="' + (k.k === 'p' ? portraitURL(k.id, k.ic) : ICON_URL[k.ic]) + '" style="width:40px;height:40px" alt=""><span>' + k.delivered + ' of ' + k.total + ' ' + esc(k.what) + ' delivered' + (k.loaded ? ' (' + k.loaded + ' under way)' : '') + '</span></div>' +
    '<div class="bar"><i style="width:' + Math.round(k.delivered / k.total * 100) + '%"></i></div><div class="row between" style="margin-top:7px"><span class="sub"><button class="dest" data-act="selPort" data-arg="' + k.from + '">' + esc(portName(k.from)) + '</button> ▸ <button class="dest" data-act="selPort" data-arg="' + k.to + '">' + esc(portName(k.to)) + '</button></span><span class="sub">$' + k.rate + ' each + ' + money(k.bonus) + '</span></div><div style="margin-top:6px"><button class="btn plain sm" data-act="dropK" data-arg="' + k.id + '">DROP</button></div></div>'; });
  h += '<h3>ON OFFER <em>' + SEASON_NAMES[season()].toUpperCase() + '</em></h3>';
  if (!G.offers.length) h += '<div class="sub">Nothing on offer right now. Offers depend on which ports you serve; more arrive each morning and with each season.</div>';
  G.offers.forEach(k => { h += '<div class="card"><div class="row between"><b class="sk" style="font-size:15px">' + esc(k.title) + '</b><span class="tag">' + secs(k.dur) + '</span></div><div class="sub" style="margin:5px 0">' + esc(k.text) + '</div><div class="row" style="margin:6px 0"><img src="' + (k.k === 'p' ? portraitURL(k.id, k.ic) : ICON_URL[k.ic]) + '" style="width:40px;height:40px" alt=""><span><b>' + k.total + ' ' + esc(k.what) + '</b>, ' + esc(portName(k.from)) + ' ▸ ' + esc(portName(k.to)) + '</span></div>' +
    '<div class="row between"><span class="sub">$' + k.rate + ' each + <b>' + money(k.bonus) + '</b> bonus</span><button class="btn" data-act="acceptK" data-arg="' + k.id + '"' + (G.active.length >= 2 ? ' disabled' : '') + '>SIGN</button></div>' + (k.canDo ? '' : '<div class="sub" style="color:var(--redd);margin-top:4px">Nothing in your fleet can run this route yet.</div>') + '</div>'; });
  return h + '</div>';
}
function htmlMarket() {
  const s = season(), sps = Object.keys(FISH), ports = PORTS.filter(p => p.water === 'sea' && G.ports[p.id].open);
  let h = '<div class="pad"><div class="sub">What the buyers are paying per unit today. Land a lot in one place and the price there sags for a while.</div><table class="mk" style="margin-top:8px"><tr><th>PORT</th>' + sps.map(sp => '<th data-tip="' + esc(FISH[sp].name) + '"><img src="' + ICON_URL['fish_' + sp] + '" alt=""><span>' + FISH[sp].name.toUpperCase() + '</span></th>').join('') + '</tr>';
  const best = {}; sps.forEach(sp => { best[sp] = 0; ports.forEach(p => best[sp] = Math.max(best[sp], fishPrice(p.id, sp))); });
  ports.forEach(p => { h += '<tr><td>' + esc(p.name) + '</td>' + sps.map(sp => { const pr = fishPrice(p.id, sp), inS = FISH[sp].abund[s] > 0; return '<td class="' + (!inS ? 'na' : pr === best[sp] ? 'best' : '') + '">$' + pr + '</td>'; }).join('') + '</tr>'; });
  h += '</table><h3>IN SEASON</h3><div class="lst">';
  sps.forEach(sp => { const f = FISH[sp], ab = f.abund[s]; h += '<div class="item' + (ab > 0 ? '' : ' dim') + '"><img class="ic" src="' + ICON_URL['fish_' + sp] + '" alt=""><div class="tx"><b>' + esc(f.name) + '</b><small>' + (ab <= 0 ? 'Closed this season' : (ab >= 0.9 ? 'Plentiful' : ab >= 0.5 ? 'Fair fishing' : 'Scarce') + (f.off ? ' · offshore boats only' : sp === 'lobster' ? ' · lobster boats' : ' · any fishing boat') + ' · ' + GROUNDS.filter(g => g.sp[sp]).map(g => g.name).join(', ')) + '</small></div></div>'; });
  return h + '</div></div>';
}
function htmlAlmanac() {
  const s = season(), d = dayOf(G.t) % SEASON_DAYS, nr = nextRank();
  let h = '<div class="pad"><div class="card"><div class="row"><img src="' + ICON_URL[['ui_sprout', 'ui_sun', 'ui_leaf', 'ui_flake'][s]] + '" style="width:32px;height:32px" alt=""><div><b class="sk" style="font-size:15px">' + SEASON_NAMES[s] + ', YEAR ' + yearOf(G.t) + ' · DAY ' + (d + 1) + ' OF ' + SEASON_DAYS + '</b><div class="sub">' + esc(SEASON_BLURB[s]) + '</div></div></div></div>';
  h += '<h3>WEATHER NOW</h3>' + (G.wx.length ? '<div class="lst">' + G.wx.map(c => '<div class="item"><div class="tx"><b>' + (c.type === 'fog' ? 'FOG BANK' : c.type === 'snow' ? 'SNOW SQUALLS' : s === WINTER ? 'NOR\'EASTER' : 'STORM') + ' near ' + esc(nearestPortName(c.x, c.y)) + '</b><small>' + (c.type === 'fog' ? 'Planes need instruments; boats without radar crawl.' : c.type === 'snow' ? 'Light planes are grounded in it.' : 'Light planes and small boats stay in.') + '</small></div></div>').join('') + '</div>' : '<div class="sub">Fair and clear, statewide.</div>');
  h += '<h3>THE BOOKS</h3><div class="kv"><b>Level</b><span>' + G.level + ' (' + G.xp + ' of ' + xpNeed(G.level) + ' XP)</span><b>Fleet</b><span>' + G.crafts.length + ' of ' + G.slots + ' slots</span><b>Outfit</b><span>' + esc(rankName()) + (nr ? ' (next: ' + esc(nr[1]) + ' at ' + money(nr[0]) + ')' : '') + '</span><b>Net worth</b><span>' + money(netWorth()) + '</span><b>Earned</b><span>' + money(G.stats.earned) + '</span><b>Delivered</b><span>' + G.stats.delivered + ' passengers and parcels</span><b>Trips</b><span>' + G.stats.trips + '</span><b>Fish landed</b><span>' + G.stats.fishUnits + ' units, ' + money(G.stats.fishMoney) + '</span><b>VIPs</b><span>' + (G.stats.vips || 0) + ' carried</span><b>Trading</b><span>' + money(G.stats.trade || 0) + ' on ' + (G.stats.goods || 0) + ' units, ' + (G.stats.reqs || 0) + ' requests filled</span><b>Contracts</b><span>' + G.stats.contracts + ' completed</span><b>Fuel bill</b><span>' + money(G.stats.fuel) + '</span><b>Ports</b><span>' + PORTS.filter(p => G.ports[p.id].open).length + ' of ' + PORTS.length + '</span></div>';
  { const ev = evActive(), hd = holidayNow(); if (ev || hd) h += '<h3>ON NOW</h3>';
    if (hd) h += '<div class="card" style="margin-top:0"><b class="sk" style="font-size:13px">' + esc(hd.name.toUpperCase()) + '</b><div class="sub">' + esc(hd.greet) + ' Jobs marked HOLIDAY pay 25% more, and VIPs come by more often.</div></div>';
    if (ev) h += '<div class="card"' + (hd ? '' : ' style="margin-top:0"') + '><b class="sk" style="font-size:13px">' + esc(ev.name.toUpperCase()) + (ev.port ? ' \u00b7 ' + esc(PORT_BY[ev.port].name.toUpperCase()) : '') + '</b><div class="sub">' + esc(evText(ev)) + ' Ends in ' + secs(ev.until - G.t) + '.</div></div>'; }
  if ((G.reqs || []).length) h += '<h3>PORTS ARE ASKING</h3><div class="lst">' + G.reqs.map(r => '<div class="item"><img class="ic" src="' + ICON_URL[GOOD_BY[r.g].ic] + '" alt=""><div class="tx"><b>' + esc(PORT_BY[r.pid].name) + ' \u00b7 ' + (r.n - r.got) + ' ' + esc(GOOD_BY[r.g].name) + '</b><small>Pays 60% over the going price. ' + secs(Math.max(0, r.until - G.t)) + ' left. Sold by: ' + esc(PORTS.filter(p => G.ports[p.id].open && goodMakes(p, GOOD_BY[r.g])).map(p => p.name).slice(0, 3).join(', ')) + '.</small></div></div>').join('') + '</div>';
  if (feat('events') && G.cal && G.cal.some(q => !q.done)) h += '<h3>COMING UP THIS ' + SEASON_NAMES[s].toUpperCase() + '</h3><div class="lst">' + G.cal.filter(q => !q.done).map(q => '<div class="item"><div class="tx"><b>' + esc(q.name) + (q.port ? ' \u00b7 ' + esc(PORT_BY[q.port].name) : '') + '</b><small>' + (q.day <= d ? 'Starts when what is on now is over.' : 'Starts on day ' + (q.day + 1) + ' of ' + SEASON_DAYS + '.') + '</small></div></div>').join('') + '</div>';
  h += '<h3 id="lvtop">LEVELS <em>LEVEL ' + G.level + ' \u00b7 ' + Math.floor(G.xp) + '/' + xpNeed(G.level) + ' XP</em></h3><div class="sub">XP comes from fares, catches, contracts, new ports, new craft types and first landings. Each level pays a bonus and a parts crate.</div><div class="lst" style="margin-top:8px">';
  FEATURES.forEach(f => { const on = G.level >= f.lvl; h += '<div class="item' + (on ? '' : ' dim') + '"><div class="tx"><b>' + esc(f.name) + '</b><small>' + esc(on ? f.desc : 'Unlocks at level ' + f.lvl + '.') + '</small></div><span class="tag' + (on ? ' green' : '') + '">' + (on ? 'OPEN' : 'LEVEL ' + f.lvl) + '</span></div>'; });
  h += '</div><h3>LOGBOOK</h3><div class="card" style="margin-top:0"><div class="sub">Ports served <b>' + portsOwned() + '</b> of ' + PORTS.length + ' \u00b7 craft types flown <b>' + logCount('types') + '</b> of ' + CRAFT.length + ' \u00b7 species landed <b>' + logCount('sp') + '</b> of ' + Object.keys(FISH).length + ' \u00b7 VIPs met <b>' + logCount('vip') + '</b> of ' + vipTotal() + '</div></div>';
  if (feat('vip')) h += '<div class="lst" style="margin-top:8px">' + CHAINS.map(ch => { const st = (G.chains || {})[ch.id] || { n: 0 }; return '<div class="item' + (st.n ? '' : ' dim') + '"><div class="tx"><b>' + esc(ch.label) + '</b><small>Wants to be taken to ' + esc(ch.goal) + '. Finishing the list earns the ' + esc(ch.paint[0]) + ' paint.</small></div><span class="tag' + (st.done ? ' green' : '') + '">' + (st.done ? 'DONE' : st.n + ' OF ' + ch.need) + '</span></div>'; }).join('') + '</div>';
  h += '<h3>SAVE CODE</h3><div class="sub">Copy this code to carry your game to another phone or computer, then paste it there and hit LOAD.</div><div class="row wrap" style="margin-top:8px"><button class="btn" data-act="showCode">MAKE A CODE</button><button class="btn plain" data-act="loadCode">LOAD A CODE</button><button class="btn plain" data-act="saveFile">SAVE TO A FILE</button><button class="btn plain" data-act="loadFile">LOAD A FILE</button></div><textarea id="codebox" class="code" spellcheck="false" placeholder="Paste a save code here"></textarea>';
  h += '<h3>HOW IT WORKS</h3><button class="btn" data-act="tutRestart" style="margin-bottom:8px">REPLAY THE TUTORIAL</button><div class="sub"><p style="margin:4px 0"><b>The loop.</b> Open a craft to see its port. Every passenger and parcel is one slot: hit LOAD, then FLY (CAST OFF for a boat), pick the stops on the map, and hit it again. Fuel is paid when it leaves. When it shows ARRIVED, open it to collect the fare and the XP.</p><p style="margin:4px 0"><b>Time.</b> Real time, no pause. Hops take minutes; job boards refresh every four. The game keeps running while it is closed (up to twelve hours), so send everything out and check back.</p><p style="margin:4px 0"><b>Growing.</b> XP raises your level, which unlocks bigger craft. Fleet slots and ports cost coins, and each costs more than the last. Improve a port for a bigger job board.</p><p style="margin:4px 0"><b>Hangars and boatyards.</b> Some towns have one (the map marks them H and B). Each keeps a few parts on the shelf and restocks daily. Collect an airframe, engine and controls (hull, engine and wheelhouse for a boat) and build the craft there for about two thirds of the new price. Contracts and new levels pay out a free crate. A craft tied up empty at a yard can go into storage, which gives its fleet slot back; take it out again at any yard that suits it.</p><p style="margin:4px 0"><b>Full-load bonus.</b> Fill every slot with jobs for a single destination and that delivery pays 25% more.</p><p style="margin:4px 0"><b>Layovers.</b> Put a job ashore at an in-between port and it waits there for another craft.</p><p style="margin:4px 0"><b>Who lands where.</b> Wheels need a strip (bush planes take grass and gravel; bigger ones want pavement). Floats need water. Boats need a harbor and go around the land, not over it.</p><p style="margin:4px 0"><b>Seasons.</b> Seven days each. Winter freezes the lakes (fit skis). Spring mud closes rough strips (fit tundra tires). Demand, fish and prices move with the calendar.</p><p style="margin:4px 0"><b>Riding along.</b> Watch a craft under way and coins drift past in the picture; click them.</p><p style="margin:4px 0"><b>Keys.</b> Tab next craft that needs you \u00b7 Enter GO \u00b7 Esc back \u00b7 wheel or +/- zooms.</p></div>';
  h += '<h3>THE DOORYARD DISPATCH</h3>' + G.news.slice(0, 14).map(n => '<div class="news ' + n.kind + '"><small>' + SEASON_NAMES[seasonOf(n.t)].slice(0, 3).toUpperCase() + ' ' + (dayOf(n.t) % SEASON_DAYS + 1) + '</small>' + esc(n.msg) + '</div>').join('');
  h += '<h3>GAME</h3><div class="row wrap"><button class="btn sm" data-act="save">SAVE NOW</button><button class="btn sm plain" data-act="sound">SOUND: ' + (G.sound ? 'ON' : 'OFF') + '</button>' + (feat('rival') ? '<button class="btn sm plain" data-act="rival">RIVAL: ' + (G.rivalOff ? 'OFF' : 'ON') + '</button>' : '') + '<button class="btn sm plain" data-act="holiday">HOLIDAYS: ' + (holidayPref() === 'auto' ? 'AUTO' : holidayPref() === 'off' ? 'OFF' : esc(HOLIDAY_BY[holidayPref()].name.toUpperCase()) + ' (PREVIEW)') + '</button><button class="btn sm plain" data-act="help">ABOUT</button><button class="btn sm red" data-act="askNew">NEW GAME</button></div><div class="sub" style="margin-top:6px">Holidays follow the real calendar: decorations, holiday jobs and VIPs. Tap HOLIDAYS to switch them off or preview one.</div><div class="sub" style="margin-top:6px">Saves to this browser automatically.</div></div>';
  return h;
}
function craftProgress(c) { if (c.state === 'move') return c.route.pos / c.route.len; if (c.state === 'fish') return c.fishT / c.fishDur; return 0; }
function craftRemaining(c) { if (c.state === 'move') return (c.route.len - c.route.pos) / cstat(c).speed + Math.max(0, c.route.cust || 0); if (c.state === 'fish') return c.fishDur - c.fishT; return 0; }
function showNews(n) { const t = $('tmsg'), inner = $('tmi'); inner.textContent = n.msg; inner.className = ''; t.className = 'in ' + (n.kind || ''); void t.offsetWidth;
  const over = inner.scrollWidth - t.clientWidth; if (over > 4) { inner.style.setProperty('--ov', -(over + 12) + 'px'); inner.style.setProperty('--d', Math.max(5, over / 28).toFixed(1) + 's'); inner.className = 'scroll'; }
  let h = 0; for (let i = 0; i < n.msg.length; i++) h = (h * 31 + n.msg.charCodeAt(i)) | 0;
  $('tface').src = n.kind === 'wx' ? ICON_URL.ui_fog : n.kind === 'season' ? ICON_URL[['ui_sprout', 'ui_sun', 'ui_leaf', 'ui_flake'][season()]] : portraitURL(Math.abs(h) % 9973, ['any', 'elder', 'cap', 'fisher', 'guide'][Math.abs(h) % 5]); }
function homePort() { const S = STARTS.find(x => x.id === G.start) || STARTS[0]; return S.ports[0]; }
// the scene canvas is shown with object-fit:cover, so on narrow screens only part of it is visible: work out which part
function sceneView() { const cv = $('scene'), r = cv.getBoundingClientRect(), sc = Math.max(r.width / SCENE_W, r.height / SCENE_H) || 1, vw = r.width / sc, vh = r.height / sc;
  return { r, sc, vw, vh, ox: (SCENE_W - vw) / 2, oy: cv.classList.contains('air') ? 0 : SCENE_H - vh }; }
function sceneClick(e) { const v = sceneView(), x = v.ox + (e.clientX - v.r.left) / v.sc, y = v.oy + (e.clientY - v.r.top) / v.sc;
  for (let i = UI.coins.length - 1; i >= 0; i--) { const q = UI.coins[i]; if (Math.hypot(q.x - x, q.y - y) < 9) { UI.coins.splice(i, 1); G.money += q.v; G.stats.tips = (G.stats.tips || 0) + q.v; UI.coinPops.push({ x: q.x, y: q.y, txt: '+$' + q.v, t: 0 }); sfx.pay(); return; } } }
function awayNote(el, landed) { toast('Away ' + secs(el) + '. ' + (landed > 0 ? landed + ' craft arrived and ' + (landed === 1 ? 'is' : 'are') + ' waiting to be collected.' : 'Job boards have turned over.'), 'good'); }
function closeModal() { $('modal').classList.remove('show'); }
function showTitle(about) {
  const hasSave = UI.hasSave, fleet = ['skiff', 'cub', 'down', 'loon', 'mail', 'beav', 'dragger'].map(k => '<img src="' + SPR[k].url + '" style="width:' + SPR[k].w * 3 + 'px" alt="">').join('');
  $('mbox').innerHTML = '<h1>POCKET MAINE<small>AIR AND SEA \u00b7 A MAINE TRANSPORT COMPANY</small></h1><div class="titlefleet">' + fleet + '</div>' +
    '<p>You run a small, scrappy outfit moving people and freight around Maine by bush plane, floatplane, ferry and lobster boat. Islands that need their groceries. Sports headed upta camp. Potatoes, wreaths, and more lobster than you can lift.</p>' +
    '<ul><li>Open a craft, hit <b>LOAD</b> on the jobs you want, then <b>FLY</b> (or <b>CAST OFF</b> for a boat) and pick where on the map.</li><li>Trips take a few minutes of real time. When a craft shows <b>ARRIVED</b>, open it to <b>collect</b> the fare and earn XP.</li><li>Fill a craft with jobs for <b>one destination</b> for a 25% bonus. Job boards refresh every four minutes.</li><li><b>Level up</b> to unlock bigger craft. Buy <b>fleet slots</b> and <b>new ports</b> as you earn.</li><li>Towns with a <b>hangar</b> or <b>boatyard</b> sell parts: three parts build a craft for less than a new one. Spare craft wait in <b>storage</b>.</li><li>Boats can skip the jobs and <b>go fishing</b>. Fog, gales, frozen lakes and mud season change what can go where.</li></ul>' +
    '<div class="acts">' + (about ? '<button class="btn go" data-act="closeModal">BACK TO WORK</button><button class="btn plain" data-act="tutRestart">REPLAY TUTORIAL</button>' : (hasSave ? '<button class="btn go" data-act="continue">CONTINUE</button><button class="btn plain" data-act="askNew">NEW GAME</button>' : '<button class="btn go" data-act="chooseStart">START \u25b8</button>')) + '</div>' +
    '<p class="sub" style="margin-top:14px">It keeps running while it is closed, so check back in. Nothing to buy. Saves in this browser.</p>';
  $('modal').classList.add('show');
}
function showStart() {
  $('mbox').innerHTML = '<h2>Where do you set up shop?</h2><p class="sub">You get three ports and four small craft. Everything else you earn.</p><div class="starts">' + STARTS.map(S =>
    '<button class="startc" data-act="newGame" data-arg="' + S.id + '"><span class="sf">' + S.craft.map(c => '<img src="' + SPR[CRAFT_BY[c[0]].spr].url + '" style="width:' + SPR[CRAFT_BY[c[0]].spr].w * 2 + 'px" alt="">').join('') + '</span><span><b>' + esc(S.name) + '</b><small>' + S.sub + '</small>' + esc(S.blurb) + '</span></button>').join('') + '</div>';
  $('modal').classList.add('show');
}
function showUnlock(e) { const fs = e.feats.map(id => FEATURE_BY[id]);
  $('mbox').innerHTML = '<h2>Level ' + e.level + '</h2><p>' + money(e.bonus) + ' bonus and a free parts crate.' + (e.unlocked.length ? ' Now for sale: ' + esc(e.unlocked.join(', ')) + '.' : '') + '</p>' +
    fs.map(f => '<div class="card unl"><b class="sk">NEW: ' + esc(f.name.toUpperCase()) + '</b><div class="sub">' + esc(f.desc) + '</div><div class="sub fnd">Find it: ' + esc(f.where) + '.</div></div>').join('') +
    '<div class="acts"><button class="btn go" data-act="closeModal">FINEST KIND</button></div>'; $('modal').classList.add('show'); }
function showConfirmNew() { $('mbox').innerHTML = '<h2>Start over?</h2><p>This scuttles the current company and its save. There is no getting it back.</p><div class="acts"><button class="btn red" data-act="chooseStart">YES, NEW GAME</button><button class="btn plain" data-act="' + (UI.started ? 'closeModal' : 'help') + '">NEVER MIND</button></div>'; $('modal').classList.add('show'); }
function pickAt(bx, by) {
  let craft = null, cd = 11, port = null, pd = 10, ground = null, gd = 9;
  G.crafts.forEach(c => { if (c.hx === undefined) return; const d = Math.hypot(c.hx - bx, (c.hy - by) * 1.3); if (d < cd) { cd = d; craft = c; } });
  PORTS.forEach(p => { const d = Math.hypot(p.sx - bx, p.sy - by); if (d < pd) { pd = d; port = p; } });
  // a tap on a port's name counts as a tap on the port
  if (!port) PORTS.forEach(p => { const l = p.labR; if (l && bx >= l[0] - 3 && bx <= l[0] + l[2] + 3 && by >= l[1] - 3 && by <= l[1] + 9) { port = p; pd = 9; } });
  GROUNDS.forEach(g => { const d = Math.hypot(wx2s(g.x) - bx, wy2s(g.y) - by); if (d < gd) { gd = d; ground = g; } });
  return { craft, cd, port, pd, ground };
}
function placeTip(x, y) { const tip = $('tip'), w = tip.offsetWidth, hh = tip.offsetHeight; tip.style.left = Math.min(window.innerWidth - w - 6, x + 14) + 'px'; tip.style.top = Math.min(window.innerHeight - hh - 6, y + 16) + 'px'; }
function fitZoom() { for (let i = 0; i < ZOOMS.length; i++) if (WORLD_H * ZOOMS[i] >= VIEW.bh * 0.92) return i; return ZOOMS.length - 1; }
// Zoom and centre so that these ports, their names and the craft parked on them are all on screen.
function fitTo(ids, maxZi, padBot) { const padTop = -(padBot || 0); let zi = Math.min(maxZi === undefined ? ZOOMS.length - 1 : maxZi, ZOOMS.length - 1), box = null;
  for (; zi >= 0; zi--) { const z = ZOOMS[zi]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    ids.forEach(id => { const p = PORT_BY[id], px = p.x * z, py = p.y * z; x0 = Math.min(x0, px - 16); x1 = Math.max(x1, px + 16); y0 = Math.min(y0, py - 20); y1 = Math.max(y1, py + 14); });
    box = [x0, x1, y0, y1]; if (x1 - x0 <= VIEW.bw - 4 && y1 - y0 <= VIEW.bh - 4 + padTop) break; }
  zi = Math.max(0, zi); VIEW.zi = zi; const z = ZOOMS[zi]; centerOn((box[0] + box[1]) / 2 / z, ((box[2] + box[3]) / 2 - padTop / 2) / z); }
const SMALL = () => VIEW.bw * VIEW.S <= 700;
const bevPad = () => (!G.tutDone && SMALL()) ? Math.ceil(120 / VIEW.S) : 0;   // room for Aunt Bev's box across the top of a phone map
function startView() { const ids = PORTS.filter(p => G.ports[p.id].open).map(p => p.id); fitTo(ids, SMALL() ? 2 : 3, bevPad()); }
function layout() { const w = $('mapwrap'); resizeView(w.clientWidth, w.clientHeight); }
/* ---------- screens ----------
   map   : the full map, fleet bar along the bottom
   sheet : a large port screen over the map (pixel scene + job list), or a menu
   route : back on the map, picking stops for the selected craft, with a route bar and a big FLY button */
function forcePanel() { UI.sig = ''; UI.fleetKey = ''; }
function computeReach() {
  const c = UI.selCraft; UI.reach = null; if (UI.screen !== 'route' || !c || c.state !== 'dock') return;
  const from = UI.stops.length ? UI.stops[UI.stops.length - 1] : c.at; UI.reach = {};
  PORTS.forEach(p => { if (p.id === from) return; const li = legInfo(c, from, p.id); UI.reach[p.id] = li.ok ? true : li.why; });
}
function selectCraft(id, center) {
  UI.selCraftId = id; refreshSel(); const c = UI.selCraft; if (!c) return; tutMark('pick');
  if (c.state === 'landed') collect(c);            // opening a LANDED craft collects its fare
  UI.stops = []; UI.filter = null; UI.fexp = false; UI.showFar = false; UI.flash = null; UI.selPort = c.at || null; UI.sheet = 'craft'; UI.screen = 'sheet'; VIEW.follow = null;
  if (UI.stab !== 'jobs') UI.stab = 'jobs';
  if (center) { if (c.state === 'move' || c.state === 'fish') centerOn(c.x, c.y); else centerOn(PORT_BY[c.at].x, PORT_BY[c.at].y); }
  computeReach(); forcePanel(); sfx.click();
}
function selectPort(pid, noAuto) {
  const st = G.ports[pid], here = craftsAt(pid).filter(c => c.state === 'dock' || c.state === 'landed');
  if (!noAuto && st.open && here.length) { const best = here.find(c => c.state === 'landed') || here.find(c => !c.jobs.length) || here[0]; selectCraft(best.id, false); return; }
  UI.selCraftId = null; UI.selCraft = null; UI.selPort = pid; UI.stops = []; UI.filter = null; UI.sheet = 'port'; UI.screen = 'sheet'; UI.stab = st.open ? (noAuto ? 'port' : 'jobs') : 'port'; VIEW.follow = null;
  computeReach(); forcePanel(); sfx.click();
}
function openMenu(kind) { UI.selCraftId = null; UI.selCraft = null; UI.selPort = null; UI.stops = []; UI.sheet = kind; UI.screen = 'sheet'; computeReach(); forcePanel(); sfx.click(); }
function deselect() { UI.screen = 'map'; UI.sheet = null; UI.selCraftId = null; UI.selCraft = null; UI.selPort = null; UI.stops = []; UI.flash = null; UI.filter = null; computeReach(); forcePanel(); }
// FLY pressed on the port screen: go to the map and pick where
function startRouting(pick) {
  const c = UI.selCraft; if (!c || c.state !== 'dock') return;
  const dests = []; c.jobs.forEach(j => { if (dests.indexOf(j.to) < 0) dests.push(j.to); });
  UI.screen = 'route'; UI.sheet = null; UI.stops = []; UI.pickRun = !!pick; UI.flash = {}; dests.forEach(d => { UI.flash[d] = 1; });
  // nothing is chosen for you: the ports your load is bound for flash, and you tap where to go
  // make sure the origin and every destination aboard are on screen
  let x0 = PORT_BY[c.at].x, x1 = x0, y0 = PORT_BY[c.at].y, y1 = y0; dests.forEach(d => { const p = PORT_BY[d]; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  // show the ports that matter: where the load is bound, or (with nothing aboard, or when choosing a standing run) the nearest ports this craft can reach
  let show = dests; if (pick || !dests.length) { const o = PORT_BY[c.at]; show = PORTS.filter(p => p.id !== c.at && G.ports[p.id].open && legInfo(c, c.at, p.id).ok).sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y)).slice(0, 5).map(p => p.id); }
  fitTo([c.at].concat(show), Math.max(VIEW.zi, SMALL() ? 2 : 3), 0);
  computeReach(); forcePanel(); sfx.click();
}
function addStop(pid) { const c = UI.selCraft; if (!c || c.state !== 'dock') return; const from = UI.stops.length ? UI.stops[UI.stops.length - 1] : c.at; if (pid === from) return;
  const li = legInfo(c, from, pid); if (!li.ok) { toast(c.name + ' can\'t go to ' + portName(pid) + ': ' + li.why + '.', 'bad'); return; }
  UI.stops.push(pid); tutMark('dest'); computeReach(); forcePanel(); sfx.click(); }
function cancelRoute() { const c = UI.selCraft; UI.stops = []; UI.flash = null; UI.pickRun = false; if (c) { UI.screen = 'sheet'; UI.sheet = 'craft'; UI.stab = 'jobs'; } else UI.screen = 'map'; computeReach(); forcePanel(); }

/* ---------- pieces ---------- */
/* ---------- the tutorial ----------
   Aunt Bev walks a new player through the first run. Each step is worked out from what is on screen right now,
   so it cannot get stuck: wander off and it waits, come back and it picks up. The thing to tap is ringed and
   everything else is dimmed; the bubble sits beside it and never takes a tap itself (only its buttons do). */
function bevHTML() { return ''; }
function tutFirstCraft() { const dock = G.crafts.filter(c => c.state === 'dock'), can = c => G.ports[c.at].lay.concat(G.ports[c.at].jobs).some(j => legInfo(c, c.at, j.to).ok && roomFor(c, j.kind) > 0);
  return dock.find(c => !isBoat(c) && can(c)) || dock.find(can) || dock[0] || null; }
function tutBoat() { return G.crafts.find(b => CRAFT_BY[b.type].fish && b.state === 'dock' && !b.jobs.length && PORT_BY[b.at].dock && fishOptions(b).some(o => o.inRange)) || null; }
function coachStep() {
  if (!UI.started || G.tutDone || $('modal').classList.contains('show')) return null;
  const T = G.tut, c = UI.selCraft, onMap = UI.screen === 'map', q = sel => { const e = document.querySelector(sel); return e && e.offsetParent !== null ? e : null; }, card = cr => q('#fleet .fc[data-arg="' + cr.id + '"]'), back = () => q('#shead [data-act=toMap]');
  if (!T.intro) return onMap ? { id: 'intro', text: 'Welcome aboard. I\'m Aunt Bev and I run dispatch. Let me walk you through your first run.', next: 'SHOW ME', center: true } : null;
  if (!T.sent) {
    if (UI.screen === 'route' && c) { if (UI.stops.length) return { id: 'go', text: 'That is the route: how long it takes and what it pays. Hit ' + goWord(c) + ' to send it.', target: q('#routebar .btn.go'), avoid: q('#routebar'), soft: true };
      const ids = Object.keys(UI.reach || {}).filter(id => UI.reach[id] === true), want = c.jobs.map(q => q.to).find(t => ids.indexOf(t) >= 0) || ids[0]; return want ? { id: 'dest', text: (c.jobs.some(q => q.to === want) ? 'Now choose where it goes. Your load is for ' + PORT_BY[want].name + ': tap it on the map.' : 'Now choose where it goes. Tap a ringed port on the map.'), port: want, soft: true } : { id: 'noreach', text: 'Nowhere in reach for this one. Hit BACK.', target: q('#routebar [data-act=cancelRoute]') }; }
    if (UI.screen === 'sheet' && UI.sheet === 'craft' && c && c.state === 'dock') {
      if (c.jobs.length) return { id: 'fly', text: 'Aboard. Each job takes one seat or one cargo slot. Now hit ' + goWord(c) + ' to pick where it goes.', target: q('#sfoot .btn.go') };
      if (UI.stab !== 'jobs') return { id: 'tabjobs', text: 'Back to the JOBS tab.', target: q('.stab[data-arg=jobs]') };
      const b = q('#sbody .dg:not(.no):not(.ab) .btn.load:not([disabled])'); if (b) return { id: 'load', text: 'This is the job board, grouped by where each job is going. Hit LOAD to put one aboard.', target: b };
      return { id: 'nojobs', text: 'Nothing here for ' + c.name + ' just now. Go back and pick another.', target: back() }; }
    if (!onMap) return back() ? { id: 'back', text: 'Close this and I will show you the first run.', target: back() } : null;
    const f = tutFirstCraft(); return f ? { id: 'pick', text: 'These are your craft. Tap ' + f.name + ' to open it.', target: card(f) } : { id: 'allout', text: 'Everything is out. When one comes back, tap it.' }; }
  if (!T.fish) { const boat = tutBoat(); if (!boat) { T.fish = 1; return coachStep(); }
    if (UI.screen === 'sheet' && c === boat) return UI.stab !== 'fish' ? { id: 'fishtab', text: 'Boats can carry jobs like a plane, or go fishing. Tap FISHING.', target: q('.stab[data-arg=fish]') } : { id: 'fishgo', text: 'Pick a ground and hit GO. The boat sells its catch when it gets back.', target: q('#sbody [data-act=fishGo]') };
    if (!onMap) return null;
    return { id: 'boat', text: 'Off it goes. The bar on its card counts down the trip. Now tap your lobster boat, ' + boat.name + '.', target: card(boat) }; }
  if (!T.collect) { const landed = G.crafts.find(x => x.state === 'landed'); if (!onMap) return null;
    if (landed) return { id: 'collect', text: landed.name + ' has arrived. Tap it to collect the fare.', target: card(landed) };
    const idle = G.crafts.find(x => x.state === 'dock'), out = G.crafts.filter(x => x.state === 'move' || x.state === 'fish'), soon = out.length ? Math.min.apply(null, out.map(craftRemaining)) : 0;
    return { id: 'wait', text: (out.length ? 'Next one is back in ' + secs(soon) + '. ' : '') + (idle ? 'While you wait, send ' + idle.name + ' out the same way.' : 'Everything is out working. Nothing to do but wait.'), target: idle ? card(idle) : null, soft: true }; }
  if (!T.loop) return onMap || UI.screen === 'sheet' ? { id: 'loop', text: 'That is the whole loop: load, send, collect. Fares pay coins and XP, and each new level unlocks bigger craft.', next: 'NEXT', low: !onMap } : null;
  if (!T.yard) { if (UI.screen === 'sheet' && UI.sheet === 'yard') return { id: 'yard2', text: 'Some towns have a hangar or a boatyard. They sell parts: three parts build a craft for less than a new one. Spare craft can wait in storage.', next: 'NEXT', low: true };
    if (!onMap) return back() ? { id: 'back2', text: 'Back to the map for one more thing.', target: back() } : null;
    return { id: 'yard', text: 'One more place to know. Tap HANGAR.', target: q('#menu .mbtn[data-arg=yard]') }; }
  if (!T.ports) return onMap ? { id: 'ports', text: 'Last thing: the grey dots are towns you do not serve yet. Tap one to see what it costs to open. More ports, more jobs. That\'s the whole trick, dear.', next: 'GOT IT' } : null;
  return null;
}
function tutNext() { const id = UI.coachId, T = G.tut; if (id === 'intro') T.intro = 1; else if (id === 'loop') T.loop = 1; else if (id === 'yard2') { T.yard = 1; deselect(); } else if (id === 'ports') { T.ports = 1; G.tutDone = true; news('Aunt Bev: "Now go make us some money."', 'good'); toast('Tutorial done. You can replay it from the Almanac.', 'good'); }
  UI.coachKey = ''; SIM.dirty = true; sfx.click(); }
function tutSkip() { G.tutDone = true; UI.coachKey = ''; SIM.dirty = true; toast('Tutorial off. You can replay it from the Almanac.', ''); }
function tutRestart() { G.tut = {}; G.tutDone = false; UI.coachKey = ''; closeModal(); deselect(); SIM.dirty = true; }
function renderCoach() {
  const box = $('coach'), st = coachStep(); if (!st) { if (UI.coachOn) { UI.coachOn = false; UI.coachKey = ''; UI.coachId = ''; box.classList.remove('on'); } return; }
  const vw = window.innerWidth, vh = window.innerHeight, ring = $('coachring'), bub = $('coachbub'); let R = null;
  if (st.target) { const f = st.target.closest('#fleet'); if (f) { const a = st.target.offsetLeft, b = a + st.target.offsetWidth; if (a < f.scrollLeft || b > f.scrollLeft + f.clientWidth - 24) f.scrollLeft = Math.max(0, a - 8); }
    const r = st.target.getBoundingClientRect(); if (r.width > 0 && r.bottom > 50 && r.top < vh - 10) R = { l: r.left, t: r.top, r: r.right, b: r.bottom }; }
  else if (st.port) { const r = $('map').getBoundingClientRect(), p = PORT_BY[st.port], x = r.left + p.sx * VIEW.S, y = r.top + p.sy * VIEW.S; if (x > r.left + 4 && x < r.right - 4 && y > r.top + 4 && y < r.bottom - 4) R = { l: x - 22, t: y - 22, r: x + 22, b: y + 22 }; }
  const key = st.id + '|' + st.text + '|' + (R ? [R.l, R.t, R.r, R.b].map(Math.round).join(',') : '-') + '|' + vw + 'x' + vh; if (key === UI.coachKey) return; UI.coachKey = key; UI.coachId = st.id; UI.coachOn = true; box.classList.add('on');
  // the bubble: rebuilt only when its words change, so a button is never swapped out from under a finger
  const hk = st.id + '|' + st.text; if (hk !== UI.coachHtml) { UI.coachHtml = hk; const done = TUT_PHASES.filter(k => G.tut[k]).length;
    bub.innerHTML = '<img src="' + portraitURL(4242, 'elder') + '" alt=""><div class="cb"><div class="cbh"><b>AUNT BEV · ' + Math.min(TUT_PHASES.length, done + 1) + ' OF ' + TUT_PHASES.length + '</b><button class="cskip" data-act="tutSkip">SKIP</button></div><p>' + esc(st.text) + '</p>' + (st.next ? '<div class="cbrow"><button class="btn go" data-act="tutNext">' + st.next + '</button></div>' : '') + '</div><i class="tip"></i>'; }
  ring.className = R ? 'on' + (st.soft ? '' : ' spot') : ''; if (R) { ring.style.left = (R.l - 5) + 'px'; ring.style.top = (R.t - 5) + 'px'; ring.style.width = (R.r - R.l + 10) + 'px'; ring.style.height = (R.b - R.t + 10) + 'px'; }
  const w = bub.offsetWidth, h = bub.offsetHeight, tip = bub.querySelector('.tip'); let left = (vw - w) / 2, top = 58;
  let A = R; if (R && st.avoid) { const a = st.avoid.getBoundingClientRect(); A = { l: Math.min(R.l, a.left), t: Math.min(R.t, a.top), r: Math.max(R.r, a.right), b: Math.max(R.b, a.bottom) }; }
  if (R) { const cx = (R.l + R.r) / 2, above = A.t - h - 20, below = A.b + 20; left = clamp(cx - w / 2, 8, vw - w - 8);
    const useAbove = above >= 52 && ((A.t + A.b) / 2 > vh / 2 || below + h > vh - 8); top = useAbove ? above : (below + h <= vh - 8 ? below : 58);
    tip.className = 'tip ' + (st.avoid ? 'off' : useAbove ? 'dn' : top === below ? 'up' : 'off'); tip.style.left = clamp(cx - left - 12, 14, w - 38) + 'px'; }
  else { tip.className = 'tip off'; if (st.center) top = Math.max(58, (vh - h) / 2 - 20); else if (st.low) top = vh - h - 14; }
  bub.style.left = Math.round(left) + 'px'; bub.style.top = Math.round(top) + 'px';
}
function sprImgC(c, max, scale) { const sp = sprOf(c); return '<img src="' + sp.url + '" style="width:' + Math.min(max, sp.w * (scale || 3)) + 'px" alt="">'; }
function sprImg(T, max, scale) { const sp = SPR[T.spr]; return '<img src="' + sp.url + '" style="width:' + Math.min(max, sp.w * (scale || 3)) + 'px" alt="">'; }
function slotsHTML(c, live) {
  const cs = cstat(c), pj = c.jobs.filter(j => j.kind === 'p'), cj = c.jobs.filter(j => j.kind === 'c'), bd = bonusDest(c); let h = '<div class="slots' + (cs.pax + cs.cargo >= 10 ? ' mini' : '') + '">';
  const grp = list => { const m = new Map(); list.forEach(j => { const k = j.to + '|' + (j.vip ? j.id : ''), g = m.get(k) || { j, n: 0 }; g.n += slotsOf(j); m.set(k, g); }); return Array.from(m.values()); };
  const one = (j, kind, cnt) => { if (j && j.good) return '<div class="slot c full" data-tip="' + esc(GOOD_BY[j.good].name) + '"><img src="' + ICON_URL[GOOD_BY[j.good].ic] + '" alt=""><span>' + (j.n ? '\u00d7' + j.n : 'GOODS') + '</span></div>'; if (!j) return '<div class="slot ' + kind + ' empty" data-tip="Empty ' + (kind === 'p' ? 'seat' : 'cargo space') + '"><img src="' + ICON_URL[kind === 'p' ? 'ui_pax' : 'ui_box'] + '" alt=""></div>';
    const tip = '<b>' + esc(j.label) + '</b>\nTo ' + esc(portName(j.to)) + ' · pays ' + money(j.pay) + ((j.bonus || bd === j.to) ? ' +25%' : '') + (live ? '\nClick to put ashore' : '');
    return '<' + (live ? 'button' : 'div') + ' class="slot ' + kind + ' full' + ((j.bonus || bd === j.to) ? ' bonus' : '') + '"' + (live ? ' data-act="unload" data-arg="' + j.id + '"' : '') + ' data-tip="' + esc(tip) + '"><img src="' + jobIconURL(j) + '" alt=""><span>' + j.to.toUpperCase() + (cnt > 1 ? ' \u00d7' + cnt : !cnt && j.n ? ' \u00d7' + j.n : '') + '</span></' + (live ? 'button' : 'div') + '>'; };
  const mini = cs.pax + cs.cargo >= 10, ld = loadOf(c), gj = []; (c.goods || []).forEach(q => { for (let i = 0; i < (mini ? 1 : q.n); i++) gj.push({ good: q.g, n: mini ? q.n : 0 }); });
  const rest = (n, kind) => n > 0 ? '<div class="slot ' + kind + ' empty cnt" data-tip="' + n + ' empty ' + (kind === 'p' ? 'seat' : 'cargo space') + (n === 1 ? '' : 's') + '"><img src="' + ICON_URL[kind === 'p' ? 'ui_pax' : 'ui_box'] + '" alt=""><span>\u00d7' + n + '</span></div>' : '';
  // A big craft shows its load by where it is going, biggest first: one chip a destination, seats and cargo counted together.
  // The counters above the chips already say how much room is left, and the ABOARD list below has every job.
  if (mini) { const m = new Map(); c.jobs.forEach(j => { const g = m.get(j.to) || { to: j.to, p: 0, c: 0, pay: 0, vip: 0 }; g[j.kind === 'p' ? 'p' : 'c'] += slotsOf(j); g.pay += j.pay; if (j.vip) g.vip = 1; m.set(j.to, g); });
    const list = Array.from(m.values()).sort((x, y) => (y.p + y.c) - (x.p + x.c)), max = Math.max(2, (window.innerWidth < 800 ? 7 : 12) - gj.length), show = list.length > max ? list.slice(0, max - 1) : list, more = list.slice(show.length);
    const say = g => (g.p ? g.p + ' passenger' + (g.p === 1 ? '' : 's') : '') + (g.p && g.c ? ', ' : '') + (g.c ? g.c + ' cargo' : '');
    show.forEach(g => { const tip = '<b>To ' + esc(portName(g.to)) + '</b>\n' + say(g) + ' \u00b7 pays ' + money(g.pay) + (bd === g.to ? ' +25%' : '') + (live ? '\nClick to put them ashore' : '');
      h += '<' + (live ? 'button' : 'div') + ' class="slot full dest' + (g.vip ? ' vip' : '') + (bd === g.to ? ' bonus' : '') + '"' + (live ? ' data-act="unloadTo" data-arg="' + g.to + '"' : '') + ' data-tip="' + esc(tip) + '"><span>' + g.to.toUpperCase() + ' \u00d7' + (g.p + g.c) + '</span></' + (live ? 'button' : 'div') + '>'; });
    if (more.length) h += '<div class="slot empty dest more" data-tip="' + esc(more.map(g => portName(g.to) + ' \u00d7' + (g.p + g.c)).join('\n')) + '"><span>+' + more.length + ' MORE</span></div>';
    gj.forEach(j => { h += one(j, 'c'); }); }
  else { for (let i = 0; i < cs.pax; i++) h += one(pj[i], 'p'); for (let i = 0; i < cs.cargo; i++) h += one(cj.concat(gj)[i], 'c'); }
  return h + '</div>';
}
// identical jobs (same thing, same place, same fare) share one row with a count
function groupJobs(list) { const map = new Map(), out = [];
  list.forEach(j => { const key = j.to + '|' + j.kind + '|' + j.label + '|' + j.pay + '|' + (j.lay ? 1 : 0) + '|' + (j.kid || ''); let g = map.get(key); if (!g) { g = { j, n: 0, ids: [], to: j.to, pay: j.pay, kind: j.kind, lay: j.lay }; map.set(key, g); out.push(g); } g.n++; g.ids.push(j.id); });
  return out; }
function destLine(d, info, extra) { return '<span>to <em class="' + (info ? (info.ok ? 'ok' : 'no') : '') + '">' + esc(d.name) + '</em>' + pips(d) + (info ? (info.ok ? Math.round(info.dist) + ' km' : '<span class="why">' + esc(info.why) + '</span>') : '') + (extra || '') + '</span>'; }
// The job board, grouped by where things are going: one heading per destination (with the distance and a LOAD ALL),
// one short line per job under it. Places this craft cannot reach are folded away at the bottom.
function jobRowsHTML(pid, c) {
  const st = G.ports[pid], infos = {}, info = to => c ? (infos[to] || (infos[to] = legInfo(c, pid, to))) : null; let h = '';
  const row = (cls, icon, label, n, tag, pay, each, btn) => '<div class="jrow ' + cls + '"><img class="jic" src="' + icon + '" alt=""><div class="jtx"><b>' + esc(label) + (n > 1 ? ' <span class="jcount">×' + n + '</span>' : '') + '</b>' + (tag || '') + '</div><div class="jr"><div class="jpay">$' + pay + (each ? '<small>each</small>' : '') + '</div>' + (btn || '') + '</div></div>';
  // what is aboard, with UNLOAD
  let ab = ''; if (c && c.jobs.length) { const worth = c.jobs.reduce((a, q) => a + q.pay, 0); ab = '<div class="dg ab"><div class="dh"><b>ABOARD</b><span class="dd">' + c.jobs.length + ' · worth ' + money(worth) + '</span></div>';
    groupJobs(c.jobs).forEach(g => { ab += row('aboard', jobIconURL(g.j), g.j.label, g.n, '<span>to ' + esc(PORT_BY[g.to].name) + '</span>', g.pay, g.n > 1, '<button class="btn red" data-act="unload" data-arg="' + g.ids[0] + '">UNLOAD</button>'); }); ab += '</div>'; }
  if (c && goodsCount(c)) { ab += '<div class="dg ab"><div class="dh"><b>GOODS ABOARD</b><span class="dd">' + goodsCount(c) + ' \u00b7 sell them here or carry them on</span></div>';
    c.goods.forEach(q => { const gd = GOOD_BY[q.g], rq = reqFor(pid, q.g), here = Math.round(goodPrice(pid, q.g) * (rq ? 1.6 : 1)), paid = Math.round(q.cost / q.n), bm = bestMarket(c, q.g);
      ab += row('aboard', ICON_URL[gd.ic], gd.name, q.n, '<span>paid ' + money(paid) + (rq ? ' \u00b7 asked for here' : bm && bm.price > here ? ' \u00b7 ' + money(bm.price) + ' at ' + esc(bm.name) : '') + '</span>', here, true, '<button class="btn buy" data-act="sellGood" data-arg="' + q.g + '">SELL</button>'); }); ab += '</div>'; }
  let reqH = '', tradeH = ''; (G.reqs || []).forEach(r => { if (r.pid === pid && G.t < r.until) reqH += '<div class="note"><b>' + esc(PORT_BY[pid].name) + ' is asking for ' + (r.n - r.got) + ' ' + esc(GOOD_BY[r.g].name.toLowerCase()) + '.</b> It pays 60% over the going price, for ' + secs(r.until - G.t) + ' more.</div>'; });
  if (c && c.state === 'dock' && feat('trade') && !CRAFT_BY[c.type].tour) { const gs = goodsFor(pid); if (gs.length) { tradeH = '<div class="dg trade"><div class="dh"><b>GOODS FOR SALE</b><span class="dd">fills spare cargo</span></div>';
      gs.forEach(gd => { const pr = goodBuyPrice(pid, gd.id), n = Math.max(0, Math.min(roomFor(c, 'c'), 5, Math.floor(G.money / pr))), bm = bestMarket(c, gd.id);
        tradeH += row('c', ICON_URL[gd.ic], gd.name, 0, '<span>' + (bm ? 'sells for ' + money(bm.price) + ' at ' + esc(bm.name) : 'no buyer in reach') + '</span>', pr, true, '<button class="btn buy" data-act="buyGood" data-arg="' + gd.id + '"' + (n ? '' : ' disabled') + '>BUY' + (n > 1 ? ' ' + n : '') + '</button>'); }); tradeH += '</div>'; } }
  const isFull = c && roomFor(c, 'p') <= 0 && roomFor(c, 'c') <= 0;
  // gather by destination
  const by = {}, dest = to => by[to] || (by[to] = { to, groups: [], ks: [], sum: 0, n: 0 });
  groupJobs(st.lay.concat(st.jobs)).forEach(g => { const d = dest(g.to); d.groups.push(g); d.sum += g.pay * g.n; d.n += g.n; });
  G.active.filter(k => k.from === pid && contractAvail(k) > 0).forEach(k => { const d = dest(k.to); d.ks.push(k); d.sum += k.rate * contractAvail(k); d.n += contractAvail(k); });
  const dests = Object.keys(by).map(k => by[k]); dests.forEach(d => { d.info = info(d.to); d.ok = !d.info || d.info.ok; d.vip = d.groups.some(g => g.j.vip) ? 1 : 0; });
  // what can be delivered first, a VIP's destination ahead of the rest, then by what the trip is worth
  dests.sort((a, b) => ((b.ok ? 1 : 0) - (a.ok ? 1 : 0)) || (b.vip - a.vip) || (b.sum - a.sum));
  const any = c ? reachAny(c) : true, deliverable = !c || dests.some(d => d.ok);
  const tourC = c && CRAFT_BY[c.type].tour;
  // a craft on a standing run is only tied up for a moment between trips: say so, with the way to stop it
  if (c && c.run) h += '<div class="card" style="margin:0 0 8px"><b class="sk" style="font-size:13px">STANDING RUN \u00b7 ' + esc(runLabel(c.run).toUpperCase()) + '</b><div class="sub">It loads and leaves by itself in a moment.</div><button class="btn red" data-act="stopRun" style="margin-top:8px">STOP THE RUN</button></div>';
  if (tourC) h += '<div class="note"><b>' + esc(c.name) + ' is an excursion boat.</b> Nothing to load. Hit CAST OFF, pick two to four deep-water harbors, and it is paid at every stop.</div>';
  else if (c && !any) h += '<div class="note bad"><b>' + esc(c.name) + ' can\'t ' + landVerb(c) + ' at any port you serve from here.</b> ' + (CRAFT_BY[c.type].fish && PORT_BY[pid].dock ? 'Take it fishing instead.' : 'Open a port within its reach.') + '</div>';
  else if (c && dests.length && !deliverable) h += '<div class="note"><b>Nothing here goes where ' + esc(c.name) + ' can ' + landVerb(c) + '.</b> ' + (CRAFT_BY[c.type].fish && PORT_BY[pid].dock ? 'Try the FISHING tab.' : 'Wait for the next batch of jobs.') + '</div>';
  if (isFull) h += ab;
  const far = dests.filter(d => !d.ok), farN = far.reduce((a, d) => a + d.n, 0);
  dests.forEach(d => { if (!d.ok && !UI.showFar) return; const P = PORT_BY[d.to], fit = c ? d.groups.reduce((a, g) => a + (roomFor(c, g.kind) > 0 ? g.n : 0), 0) : 0;
    h += '<div class="dg' + (d.ok ? '' : ' no') + '" data-to="' + d.to + '"><div class="dh"><b>' + esc(P.name) + '</b><span class="dd">' + (d.info ? (d.ok ? Math.round(d.info.dist) + ' km' : esc(d.info.why)) : d.n + (d.n === 1 ? ' job' : ' jobs')) + '</span>' +
      (c && d.ok && fit > 1 && d.groups.length > 1 ? '<button class="btn sm go" data-act="loadAll" data-arg="' + d.to + '">LOAD ALL</button>' : '') + '</div>';
    d.ks.forEach(k => { const n = contractAvail(k), room = c ? roomFor(c, k.k) : 0; h += row('k', k.k === 'p' ? portraitURL(k.id, k.ic) : ICON_URL[k.ic], k.title, n, '<span class="tag yel">CONTRACT</span>', k.rate, true, c ? '<button class="btn load" data-act="loadK" data-arg="' + k.id + '"' + (room > 0 && d.ok ? '' : ' disabled') + '>LOAD' + (Math.min(room, n) > 1 ? ' ' + Math.min(room, n) : '') + '</button>' : ''); });
    d.groups.sort((a, b) => ((b.j.vip ? 1 : 0) - (a.j.vip ? 1 : 0)) || ((b.lay || 0) - (a.lay || 0)) || (b.pay - a.pay));
    d.groups.forEach(g => { const room = c ? roomFor(c, g.kind) : 0, need = g.j.n || 1, many = Math.min(g.n, Math.floor(room / need));
      const btn = !c ? '' : (!d.ok && !any) ? '<button class="btn load" disabled>LOAD</button>' : many > 1 ? '<button class="btn load' + (d.ok ? '' : ' far') + '" data-act="loadIds" data-arg="' + g.ids.slice(0, many).join(',') + '">LOAD ' + many + '</button>' : '<button class="btn load' + (!d.ok && room > 0 ? ' far' : '') + '" data-act="load" data-arg="' + g.ids[0] + '"' + (room >= need ? '' : ' disabled data-tip="' + (need > 1 && room > 0 ? 'Takes ' + need + (g.kind === 'p' ? ' seats' : ' cargo slots') : 'No ' + (g.kind === 'p' ? 'seats' : 'cargo room') + ' left') + '"') + '>LOAD</button>';
      h += row((g.kind === 'c' ? 'c' : 'p') + (g.j.vip ? ' vip' : '') + (d.ok ? '' : ' no'), jobIconURL(g.j), g.j.label, g.n, g.j.rv ? '<span class="tag red">RIVAL WANTS IT</span>' : g.j.conn ? '<span class="tag blue">CONNECTION</span>' : g.j.n ? '<span class="tag org">' + (g.kind === 'p' ? 'GROUP' : 'LOT') + ' OF ' + g.j.n + '</span>' : g.j.vip ? '<span class="tags"><span class="tag gold">VIP \u00b7 ' + VIP_REWARD[g.j.vip] + '</span>' + (g.j.pref ? '<span class="tag gold2">' + VIP_PREF[g.j.pref] + '</span>' : '') + '</span>' : g.j.urgent ? '<span class="tag red">URGENT ' + secs(Math.max(0, g.j.urgent - G.t)) + '</span>' : g.lay ? '<span class="tag blue">LAYOVER</span>' : g.j.ev ? '<span class="tag yel">EVENT</span>' : g.j.hol ? '<span class="tag hol">HOLIDAY</span>' : '', g.pay, g.n > 1, btn); });
    h += '</div>'; });
  if (far.length && any) h += '<button class="farbtn" data-act="showFar">' + (UI.showFar ? 'HIDE' : 'SHOW') + ' ' + farN + (farN === 1 ? ' JOB' : ' JOBS') + ' ' + (c ? esc(c.name.toUpperCase()) + ' CAN\'T DELIVER' : '') + '</button>';
  if (!isFull) h += ab;
  if (!dests.length && !ab) h = '<div class="sub" style="padding:10px 2px">The board is empty. New jobs arrive when the timer runs out.</div>';
  return '<div class="rows">' + reqH + h + tradeH + '</div>';
}
function filtersHTML(pid, c) {
  const st = G.ports[pid], by = {}, all = st.lay.concat(st.jobs); all.forEach(j => { (by[j.to] = by[j.to] || { to: j.to, n: 0, sum: 0 }).n++; by[j.to].sum += j.pay; });
  G.active.forEach(k => { if (k.from === pid && contractAvail(k) > 0) { (by[k.to] = by[k.to] || { to: k.to, n: 0, sum: 0 }).n += contractAvail(k); } });
  const list = Object.keys(by).map(k => by[k]); if (list.length < 2 && !UI.filter) return '';
  list.forEach(g => { g.info = c ? legInfo(c, pid, g.to) : null; }); list.sort((a, b) => ((b.info && b.info.ok ? 1 : 0) - (a.info && a.info.ok ? 1 : 0)) || (b.sum - a.sum));
  let h = '<div class="filters"><button class="fchip' + (UI.filter ? '' : ' on') + '" data-act="filter" data-arg="">ALL <i>' + all.length + '</i></button>';
  list.forEach(g => { h += '<button class="fchip' + (g.info ? (g.info.ok ? ' ok' : ' no') : '') + (UI.filter === g.to ? ' on' : '') + '" data-act="filter" data-arg="' + g.to + '"' + (g.info && !g.info.ok ? ' data-tip="' + esc(c.name + ' can\'t get there: ' + g.info.why) + '"' : '') + '>' + esc(PORT_BY[g.to].name) + ' <i>' + g.n + '</i></button>'; });
  h += '<button class="fchip more" data-act="fexp" style="display:none"></button></div>';
  if (UI.filter && c) { const fit = all.filter(j => j.to === UI.filter && roomFor(c, j.kind) > 0).length; h += '<div class="fact"><button class="btn sm go" data-act="loadAll" data-arg="' + UI.filter + '"' + (fit ? '' : ' disabled') + '>LOAD ALL THAT FIT FOR ' + esc(PORT_BY[UI.filter].name.toUpperCase()) + '</button></div>'; }
  return h;
}
// after the chips are in the page: keep them to two rows, folding the overflow behind "+N MORE"
function fitFilters() { const f = document.querySelector('#sbody .filters'); if (!f) return; const chips = [...f.querySelectorAll('.fchip:not(.more)')], more = f.querySelector('.fchip.more'); if (chips.length < 3) return;
  const top0 = chips[0].offsetTop, rowH = chips[0].offsetHeight + 4, limit = top0 + rowH * 1.5; let hidden = chips.filter(ch => ch.offsetTop > limit);
  if (!hidden.length) return;
  if (UI.fexp) { more.style.display = ''; more.textContent = 'LESS \u25b4'; return; }
  if (UI.filter && hidden.some(ch => ch.dataset.arg === UI.filter)) { UI.fexp = true; more.style.display = ''; more.textContent = 'LESS \u25b4'; return; }
  more.style.display = ''; let guard = 0; hidden.forEach(ch => { ch.style.display = 'none'; }); more.textContent = '+' + hidden.length + ' MORE \u25be';
  while (more.offsetTop > limit && guard++ < 8) { const vis = chips.filter(ch => ch.style.display !== 'none'); if (vis.length <= 2) break; vis[vis.length - 1].style.display = 'none'; more.textContent = '+' + chips.filter(ch => ch.style.display === 'none').length + ' MORE \u25be'; }
}
function craftBarHTML(pid, c) { const here = craftsAt(pid); if (!here.length) return '';
  return '<div class="craftbar">' + here.map(q => { const T = CRAFT_BY[q.type]; return '<button class="cchip' + (c && q.id === c.id ? ' on' : '') + '" data-act="selCraft" data-arg="' + q.id + '">' + sprImg(T, 60, 2) + '<span><b>' + esc(q.name) + '</b><span>' + (q.state === 'landed' ? 'Arrived: collect' : q.state === 'hold' ? 'Holding' : q.jobs.length ? q.jobs.length + ' aboard' : 'Idle') + '</span></span></button>'; }).join('') + '</div>'; }
function incomeHTML(c) { const L = c.last; if (!L || L.at !== c.at || L.pay <= 0) return '';
  return '<div class="income"><img src="' + ICON_URL.coin + '" alt=""><div><b>+' + money(L.pay) + ' COLLECTED</b><span class="sub">' + [L.units ? L.units + ' delivered' : '', L.fish, 'fuel ' + money(L.fuel), '+' + L.xp + ' XP', L.bonus ? 'full-load bonus ' + money(L.bonus) : ''].filter(Boolean).join(' · ') + '</span></div></div>'; }
function holdHTML(c) { const T = CRAFT_BY[c.type], cs = cstat(c), ld = loadOf(c), bd = bonusDest(c), full = ld.pax + ld.cargo, cap = cs.pax + cs.cargo, many = craftsAt(c.at).filter(q => q.state === 'dock' || q.state === 'landed').length > 1;
  // A small craft shows its slots beside its picture; a bigger one lists them underneath; a big one shows its load by destination.
  const size = cap >= 10 ? 'lg' : cap >= 4 ? 'md' : 'sm';
  const capBox = (kind, n, of, label) => '<div class="cap ' + kind + (of && n >= of ? ' full' : '') + '"><img src="' + ICON_URL[kind === 'p' ? 'ui_pax' : 'ui_box'] + '" alt=""><b>' + n + (of ? '<small>/' + of + '</small>' : '') + '</b><i>' + label + '</i></div>';
  const caps = '<div class="caps">' + (T.tour ? capBox('p', T.tour, 0, 'SIGHTSEERS') : '') + (cs.pax ? capBox('p', ld.pax, cs.pax, cs.pax === 1 ? 'SEAT' : 'SEATS') : '') + (cs.cargo ? capBox('c', ld.cargo, cs.cargo, 'CARGO') : '') + '</div>';
  const arrow = d => many ? '<button class="btn sm dark cyc" data-act="cycle" data-arg="' + d + '">' + (d < 0 ? '\u25c2' : '\u25b8') + '</button>' : '';
  const clear = c.jobs.length && size !== 'sm' ? '<button class="btn sm plain clr" data-act="unloadAll" data-tip="Put everything aboard back on the dock">CLEAR</button>' : '';
  return '<div class="holdbar v2 ' + size + '"><div class="ctop">' + arrow(-1) + '<div class="cpic">' + sprImgC(c, 120, 4) + '</div><div class="cinfo"><b>' + esc(c.name) + '</b><span class="ct">' + esc(T.name) + '</span>' + caps + (size === 'sm' ? slotsHTML(c, true) : '') + '</div>' + arrow(1) + '</div>' +
    (size === 'sm' ? '' : '<div class="cbot">' + slotsHTML(c, true) + clear + '</div>') +
    '<div class="bn' + (bd ? ' on' : full ? '' : ' hint') + '">' + (bd ? '\u2605 Full load for ' + esc(portName(bd)) + ': pays 25% extra' : full ? 'Fill all ' + cap + ' slots with jobs for one place for a 25% bonus (' + full + '/' + cap + ')' : !reachAny(c) ? (T.fish && PORT_BY[c.at].dock ? 'Nothing to carry from here. Take it out on the FISHING tab.' : 'No port you serve is in reach from here.') : 'Hit LOAD on the jobs you want, then ' + goWord(c) + '.') + '</div></div>'; }
// What the craft in hand needs next, while the tutorial is still running. Shown in the phone footer and in Aunt Bev's box on desktop.
function sheetHint(c, pid) { const st = G.ports[pid], p = PORT_BY[pid]; if (!st.open || !c || G.tutDone || c.state !== 'dock') return '';
  if (UI.stab === 'fish') return 'Pick a ground and hit GO. The boat sells its catch when it gets back.'; if (UI.stab !== 'jobs') return '';
  if (c.jobs.length) return 'Now hit ' + goWord(c) + ', then pick where to go on the map.';
  if (!st.lay.concat(st.jobs).some(j => legInfo(c, pid, j.to).ok)) return CRAFT_BY[c.type].fish && p.dock ? 'Nothing here for this boat. Take it fishing.' : 'No job here goes where this craft can ' + landVerb(c) + '. Try one of your others.';
  return 'This is the job board. Hit LOAD on what you want aboard.'; }
function tabJobs(pid, c) { return jobRowsHTML(pid, c); }
function leftDock(pid, c) {
  let h = craftBarHTML(pid, c);
  if (c) h += incomeHTML(c) + holdHTML(c);
  else { const p = PORT_BY[pid], ct = condTags(p), n = craftsAt(pid).length; h = (n && UI.stab === 'jobs' ? '<div class="pick">' + h + '</div>' : n ? '' : UI.stab === 'jobs' ? '<div class="sub" style="padding:2px 2px 8px">None of your craft are here.</div>' : '') + (ct ? '<div style="margin-bottom:8px">' + ct + '</div>' : ''); }
  return h;
}
/* ---------- hangars, boatyards, parts, storage ---------- */
const partIcon = (T, s) => T.cls === 'boat' ? ['part_hull', 'part_engine', 'part_house'][s] : ['part_frame', 'part_engine', 'part_ctrl'][s];
function partPips(t) { const T = CRAFT_BY[t], h = partsHeld(t); return '<span class="pps">' + h.map((n, s) => '<span class="pp' + (n ? '' : ' miss') + '" data-tip="' + PART_NAMES[T.cls][s] + (n ? '' : ': still needed') + '"><img src="' + ICON_URL[partIcon(T, s)] + '" alt="">' + (n > 1 ? '<b>' + n + '</b>' : '') + '</span>').join('') + '</span>'; }
function partsNeed(t) { const T = CRAFT_BY[t], miss = partsHeld(t).map((n, s) => n ? '' : PART_NAMES[T.cls][s].toLowerCase()).filter(x => x); return miss.length ? 'needs ' + miss.join(' and ') : 'all three parts in hand'; }
function partTypes() { const seen = {}; Object.keys(G.parts).forEach(k => { if (G.parts[k] > 0) seen[k.split(':')[0]] = 1; }); return CRAFT.filter(T => seen[T.id]).sort((a, b) => (canAssemble(b.id) ? 1 : 0) - (canAssemble(a.id) ? 1 : 0)); }
function readyToBuild() { return partTypes().filter(T => canAssemble(T.id) && G.level >= T.lvl).length; }
function nearestYard(kind, fromPid, openOnly) { const f = PORT_BY[fromPid]; let b = null, bd = 1e9; PORTS.forEach(p => { if (p.yard.indexOf(kind) < 0 || (openOnly && !G.ports[p.id].open)) return; const d = Math.hypot(p.x - f.x, p.y - f.y); if (d < bd) { bd = d; b = p; } }); return b; }
function bestYard() { if (UI.selPort && G.ports[UI.selPort].open && PORT_BY[UI.selPort].yard) return UI.selPort; const open = PORTS.filter(p => p.yard && G.ports[p.id].open).sort((a, b) => b.yard.length - a.yard.length); return open.length ? open[0].id : null; }
function storedLine(r) { const T = CRAFT_BY[r.type], u = Object.keys(r.upg || {}).length; return craftLine(T) + (u ? ' · ' + u + ' upgrade' + (u === 1 ? '' : 's') : ''); }
// The yard at one port, one short section at a time: PARTS on the shelf, BUILD from parts, STORAGE, NEW craft, and the TOWN itself.
function yardSeg(pid) { const ok = ['parts', 'build', 'store', 'new', 'town']; if (ok.indexOf(UI.yseg) < 0) UI.yseg = 'parts'; return UI.yseg; }
function partPipsFor(t, s) { const T = CRAFT_BY[t], h = partsHeld(t); return '<span class="pps">' + h.map((n, k) => '<span class="pp' + (n ? '' : ' miss') + (k === s ? ' this' : '') + '" data-tip="' + PART_NAMES[T.cls][k] + (n ? '' : ': still needed') + '"><img src="' + ICON_URL[partIcon(T, k)] + '" alt="">' + (n > 1 ? '<b>' + n + '</b>' : '') + '</span>').join('') + '</span>'; }
function yardHTML(pid, townHTML) { const port = PORT_BY[pid], st = G.ports[pid], y = port.yard, free = G.slots - G.crafts.length, kinds = { h: y.indexOf('h') >= 0, m: y.indexOf('m') >= 0 }, seg = yardSeg(pid);
  const fitsHere = T => kinds[yardKind(T)] && canBase(T, port), types = partTypes(), nb = types.filter(T => canAssemble(T.id) && G.level >= T.lvl && fitsHere(T)).length;
  const sb = (id, label, n) => '<button class="seg' + (seg === id ? ' on' : '') + '" data-act="yseg" data-arg="' + id + '">' + label + (n ? '<i>' + n + '</i>' : '') + '</button>';
  let h = '<div class="segs" id="yardtop">' + sb('parts', 'PARTS') + sb('build', 'BUILD', nb) + sb('store', 'STORAGE', G.stored.length) + sb('new', 'NEW') + sb('town', 'TOWN') + '</div>';
  const fullNote = free <= 0 ? '<div class="row between" style="margin-bottom:8px"><span class="sub">Fleet is full. New craft go into storage.</span><button class="btn" data-act="buySlot"' + (G.money >= slotCost() ? '' : ' disabled') + '>ADD SLOT ' + money(slotCost()) + '</button></div>' : '';
  if (seg === 'parts') {
    h += '<h3>ON THE SHELF <em>RESTOCKS IN <b id="shelft"></b></em></h3><div class="lst">';
    (st.shelf || []).forEach(it => { const T = CRAFT_BY[it.t];
      h += '<div class="item"><img class="ic" src="' + ICON_URL[partIcon(T, it.s)] + '" alt=""><div class="tx"><b>' + esc(T.name) + '</b><small>' + PART_NAMES[T.cls][it.s] + (G.level < T.lvl ? ' · level ' + T.lvl : '') + '</small>' + partPipsFor(it.t, it.s) + '</div><div class="bcol">' + (it.sale || evGlob('swap') ? '<span class="tag red">SALE</span>' : '') + '<button class="btn" data-act="buyPart" data-arg="' + it.id + '"' + (G.money >= shelfPrice(it) ? '' : ' disabled') + '>' + money(shelfPrice(it)) + '</button></div></div>'; });
    if (!st.shelf || !st.shelf.length) h += '<div class="sub">Sold out until the next delivery.</div>';
    h += '</div><div class="sub" style="margin-top:8px">Three parts build a craft for two thirds of the new price.</div>'; }
  else if (seg === 'build') {
    h += fullNote + '<div class="lst">';
    types.forEach(T => { const ok = canAssemble(T.id), lock = G.level < T.lvl, here = fitsHere(T), room = roomForCraft();
      h += '<div class="item"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(T.name) + '</b><small>' + (ok ? 'all three parts' : partsNeed(T.id)) + '</small>' + partPips(T.id) + '</div>' +
        (!ok ? '' : lock ? '<span class="tag">LEVEL ' + T.lvl + '</span>' : !here ? '<span class="tag">' + (kinds[yardKind(T)] ? 'NOT HERE' : 'AT A ' + yardWord(T).toUpperCase()) + '</span>' : '<button class="btn go" data-act="build" data-arg="' + T.id + '"' + (room ? '' : ' disabled') + '>BUILD</button>') + '</div>'; });
    if (!types.length) h += '<div class="sub">No parts in the bin yet. Buy them under PARTS, or earn a crate from a contract or a new level.</div>';
    h += '</div>'; }
  else if (seg === 'store') {
    h += '<h3>IN STORAGE <em>' + G.stored.length + '/' + STORE_CAP + '</em></h3><div class="lst">';
    G.stored.forEach((r, i) => { const T = CRAFT_BY[r.type], here = fitsHere(T);
      h += '<div class="item"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(r.name) + '</b><small>' + esc(T.name) + (here ? '' : ' · ' + (kinds[yardKind(T)] ? 'cannot work from here' : 'comes out at a ' + yardWord(T))) + '</small></div><div class="bcol">' +
        (here ? '<button class="btn" data-act="unstore" data-arg="' + i + '"' + (free > 0 ? '' : ' disabled data-tip="No free fleet slot"') + '>TAKE OUT</button>' : '') + '<button class="btn red" data-act="sellStored" data-arg="' + i + '">SELL ' + money(sellValue(r)) + '</button></div></div>'; });
    if (!G.stored.length) h += '<div class="sub">Empty. A stored craft gives its fleet slot back.</div>';
    const here = craftsAt(pid).filter(c => c.state === 'dock' && !c.jobs.length && !c.fish && kinds[yardKind(CRAFT_BY[c.type])]);
    h += '</div>' + (here.length ? '<h3>TIED UP HERE</h3><div class="lst">' : '');
    here.forEach(c => { const T = CRAFT_BY[c.type]; h += '<div class="item"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(c.name) + '</b><small>' + esc(T.name) + '</small></div><button class="btn" data-act="store" data-arg="' + c.id + '"' + (G.stored.length < STORE_CAP && G.crafts.length > 1 ? '' : ' disabled') + '>STORE</button></div>'; });
    if (here.length) h += '</div>'; }
  else if (seg === 'new') {
    h += fullNote + '<div class="lst">';
    CRAFT.forEach(T => { if (T.rare || !fitsHere(T)) return; const locked = G.level < T.lvl; h += '<div class="item' + (locked ? ' dim' : '') + '" data-tip="' + esc(T.desc) + '"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(T.name) + '</b><small>' + craftLine(T) + '</small></div>' +
      (locked ? '<span class="tag">LEVEL ' + T.lvl + '</span>' : '<button class="btn" data-act="buy" data-arg="' + T.id + '"' + (G.money >= T.price && roomForCraft() ? '' : ' disabled') + '>' + money(T.price) + '</button>') + '</div>'; });
    h += '</div>'; }
  else h += townHTML;
  return h; }
// the HANGAR menu: every yard, the parts bin and storage in one place
function htmlYard() { let h = '<div class="pad"><div class="sub">Buy parts, build, store and buy new craft at a <b>hangar</b> (planes) or <b>boatyard</b> (boats).</div>';
  h += '<h3>YARDS</h3><div class="lst">';
  PORTS.filter(p => p.yard).sort((a, b) => (G.ports[b.id].open ? 1 : 0) - (G.ports[a.id].open ? 1 : 0)).forEach(p => { const st = G.ports[p.id];
    h += '<div class="item' + (st.open ? '' : ' dim') + '"><div class="tx"><b>' + esc(p.name) + '</b><small>' + yardName(p.id) + ' · ' + (st.open ? (st.shelf ? st.shelf.length : 0) + ' part' + (st.shelf && st.shelf.length === 1 ? '' : 's') : 'not served \u00b7 ' + money(portCost(p.id))) + '</small></div><button class="btn' + (st.open ? ' go' : '') + '" data-act="gotoYard" data-arg="' + p.id + '">' + (st.open ? 'GO ▸' : 'VIEW') + '</button></div>'; });
  h += '</div><h3>PARTS BIN <em>' + partsCount() + ' PART' + (partsCount() === 1 ? '' : 'S') + '</em></h3><div class="lst">';
  const types = partTypes(); types.forEach(T => { const ok = canAssemble(T.id), lock = G.level < T.lvl;
    h += '<div class="item"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(T.name) + '</b><small>' + (ok ? (lock ? 'builds at level ' + T.lvl : 'build it at a ' + yardWord(T)) : partsNeed(T.id)) + '</small>' + partPips(T.id) + '</div>' + (ok && !lock ? '<span class="tag green">READY</span>' : '') + '</div>'; });
  if (!types.length) h += '<div class="sub">Empty. Parts are sold at the yards, and contracts and new levels pay out a crate.</div>';
  h += '</div><h3>STORAGE <em>' + G.stored.length + '/' + STORE_CAP + '</em></h3><div class="lst">';
  G.stored.forEach(r => { const T = CRAFT_BY[r.type]; h += '<div class="item"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(r.name) + ' · ' + esc(T.name) + '</b><small>' + storedLine(r) + '</small></div><span class="tag">AT A ' + yardWord(T).toUpperCase() + '</span></div>'; });
  if (!G.stored.length) h += '<div class="sub">Nothing in storage. Tie a craft up empty at a hangar or boatyard and hit STORE.</div>';
  return h + '</div></div>'; }
function shopHTML(pid) { const port = PORT_BY[pid], free = G.slots - G.crafts.length; let h = '<h3>HANGAR &amp; BOATYARD <em>' + free + ' FREE SLOT' + (free === 1 ? '' : 'S') + '</em></h3>';
  if (free <= 0) h += '<div class="row between" style="margin-bottom:8px"><span class="sub">All ' + G.slots + ' fleet slots are in use.</span><button class="btn" data-act="buySlot"' + (G.money >= slotCost() ? '' : ' disabled') + '>ADD SLOT ' + money(slotCost()) + '</button></div>';
  h += '<div class="lst">';
  CRAFT.forEach(T => { if (T.rare || !canBase(T, port)) return; const locked = G.level < T.lvl; h += '<div class="item' + (locked ? ' dim' : '') + '" data-tip="' + esc(T.desc) + '"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(T.name) + '</b><small>' + craftLine(T) + '</small></div>' +
    (locked ? '<span class="tag">LEVEL ' + T.lvl + '</span>' : '<button class="btn" data-act="buy" data-arg="' + T.id + '"' + (G.money >= T.price && free > 0 ? '' : ' disabled') + '>' + money(T.price) + '</button>') + '</div>'; });
  return h + '</div><div class="sub" style="margin-top:8px">' + (port.water === 'sea' ? '' : 'Boats are sold at harbors. ') + (port.strip ? '' : 'Wheeled planes need an airstrip. ') + 'New craft are delivered right here. Bigger craft unlock as you level up.</div>'; }
function condTags(p) { const s = season(), w = wxAt(p.x, p.y), conds = []; if (w.fog) conds.push('FOG'); if (w.storm) conds.push(s === WINTER ? 'NOR\'EASTER' : 'STORM'); if (w.snow) conds.push('SNOW SQUALL'); if (p.water === 'lake' && s === WINTER) conds.push('LAKE FROZEN'); if (p.strip === 1 && s === SPRING) conds.push('MUD: STRIP CLOSED');
  return conds.map(c => '<span class="tag org">' + c + '</span>').join(' '); }
function leftLocked(pid) { const p = PORT_BY[pid], cost = portCost(pid);
  if (p.lvl && G.level < p.lvl) return '<div class="card" style="margin-top:0"><b class="sk" style="font-size:16px">OPENS AT LEVEL ' + p.lvl + '</b><div class="sub" style="margin:5px 0 0">' + esc(p.reg) + ' opens up at level ' + p.lvl + '. You are level ' + G.level + '. It will cost ' + money(cost) + '.</div></div>';
  return '<div class="card" style="margin-top:0"><b class="sk" style="font-size:16px">OPEN THIS PORT</b><div class="sub" style="margin:5px 0 10px">Jobs start flowing to and from here. Each port you own makes the next one dearer.</div><button class="btn big go" style="width:100%" data-act="unlock" data-arg="' + pid + '"' + (G.money >= cost ? '' : ' disabled') + '>OPEN FOR ' + money(cost) + '</button>' + (G.money >= cost ? '' : '<div class="sub" style="margin-top:8px">You need ' + money(cost - G.money) + ' more.</div>') + '</div>'; }
function tabPort(pid) {
  const p = PORT_BY[pid], st = G.ports[pid]; let h = '<div class="sub">' + esc(p.blurb) + '</div>'; const ct = condTags(p); if (ct) h += '<div style="margin-top:8px">' + ct + '</div>';
  if (!st.open) { const can = CRAFT.filter(T => canBase(T, p)), have = G.crafts.filter(c => canBase(CRAFT_BY[c.type], p));
    h += '<h3>WHO CAN GET HERE</h3><div class="sub">' + (have.length ? 'From your fleet: ' + have.map(c => esc(c.name)).join(', ') + '.' : '<b style="color:var(--redd)">Nothing in your fleet can land here yet.</b>') + '</div><div class="lst" style="margin-top:8px">' +
      can.map(T => '<div class="item' + (G.level < T.lvl ? ' dim' : '') + '"><div class="sp">' + sprImg(T, 96, 3) + '</div><div class="tx"><b>' + esc(T.name) + '</b><small>' + craftLine(T) + '</small></div>' + (G.level < T.lvl ? '<span class="tag">LEVEL ' + T.lvl + '</span>' : '') + '</div>').join('') + '</div>';
    return h; }
  const lv = standingLevel(pid), nx = STANDING[lv + 1], cost = portUpgradeCost(pid);
  h += '<div class="card"><div class="row between"><div><b class="sk" style="font-size:14px">TERMINAL LEVEL ' + st.lvl + '</b><div class="sub">Board holds up to ' + boardCap(pid) + ' jobs · ' + st.lay.length + '/' + layCap(pid) + ' layovers</div></div>' + (st.lvl < PORT_MAX_LVL ? '<button class="btn" data-act="upPort" data-arg="' + pid + '"' + (G.money >= cost ? '' : ' disabled') + ' data-tip="More jobs each refresh, bigger parties, more layover room">IMPROVE ' + money(cost) + '</button>' : '<span class="tag green">MAXED</span>') + '</div>' +
    '<div style="margin-top:12px"><b class="sk" style="font-size:14px">STANDING: ' + STANDING[lv].name.toUpperCase() + '</b><div class="sub">' + (lv ? '+' + lv * 4 + '% pay on jobs coming here' : 'Deliver here to earn the town\'s regard, and better pay') + '</div></div><div class="bar" style="margin-top:6px"><i style="width:' + (nx ? Math.round((st.xp - STANDING[lv].xp) / (nx.xp - STANDING[lv].xp) * 100) : 100) + '%"></i></div></div>';
  if (feat('works')) { h += '<h3>PORT WORKS</h3><div class="lst">'; Object.keys(WORKS).forEach(id => { if (!workFits(pid, id)) return; const W = WORKS[id], cost = workCost(pid, id);
      h += '<div class="item"><div class="tx"><b>' + W.n + '</b><small>' + W.d + '</small></div>' + (hasWork(pid, id) ? '<span class="tag green">BUILT</span>' : '<button class="btn" data-act="buildWork" data-arg="' + id + '"' + (G.money >= cost ? '' : ' disabled') + '>' + money(cost) + '</button>') + '</div>'; }); h += '</div>'; }
  if (p.yard) return yardHTML(pid, h);
  const nh = nearestYard('h', pid, false), nm = nearestYard('m', pid, false), yb = q => '<button class="btn sm" data-act="gotoYard" data-arg="' + q.id + '">' + esc(q.name.toUpperCase()) + (G.ports[q.id].open ? '' : ' \u00b7 NOT SERVED') + '</button>';
  return h + '<h3>HANGAR &amp; BOATYARD</h3><div class="sub">None in ' + esc(p.name) + '. Craft are bought, built and stored at a yard.</div><div class="row wrap" style="margin-top:8px"><span class="sub">Nearest hangar</span>' + yb(nh) + '<span class="sub">boatyard</span>' + yb(nm) + '</div>';
}
function tabCraft(c) { const T = CRAFT_BY[c.type], segs = [['gear', 'GEAR']]; if (feat('names')) segs.push(['looks', 'LOOKS']); if (feat('crew')) segs.push(['crew', 'CREW']); if (feat('runs')) segs.push(['run', 'RUN']); segs.push(['keep', 'STORE']);
  if (!segs.some(x => x[0] === UI.cseg)) UI.cseg = 'gear'; const seg = UI.cseg, yk = yardKind(T), atYard = c.state === 'dock' && hasYard(c.at, T), ny = c.at ? (nearestYard(yk, c.at, true) || nearestYard(yk, c.at, false)) : null;
  let h = '<div class="item"><div class="sp">' + sprImgC(c, 96, 3) + '</div><div class="tx"><b>' + esc(c.name) + ' · ' + esc(T.name) + '</b><small>' + craftLine(T) + ' · fuel $' + T.fuel.toFixed(2) + '/km</small></div></div>';
  h += '<div class="segs" style="margin-top:10px">' + segs.map(x => '<button class="seg' + (seg === x[0] ? ' on' : '') + '" data-act="cseg" data-arg="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  if (seg === 'gear') {
    if (feat('fits')) h += fitsHTML(c, atYard);
    if (feat('wear')) { const k = Math.round(condOf(c)), sp = sparePart(c.type), cost = overhaulCost(c);
      h += '<h3>CONDITION <em>' + k + '%</em></h3><div class="bar ' + (k < 25 ? 'red' : k < 50 ? 'amber' : '') + '"><i style="width:' + k + '%"></i></div><div class="sub" style="margin-top:6px">' + (k < 25 ? 'Running rough: a quarter slower, and it may stall before leaving.' : k < 50 ? 'Worn: ten percent slower.' : 'Running fine.') + (atYard || k >= 100 ? '' : ' Overhauls are done at a ' + yardWord(T) + (ny ? '; the nearest is ' + esc(ny.name) : '') + '.') + '</div>' +
        (k < 100 ? '<div class="row wrap" style="margin-top:8px"><button class="btn" data-act="overhaul"' + (atYard && G.money >= cost ? '' : ' disabled') + '>OVERHAUL ' + money(cost) + '</button>' + (sp >= 0 ? '<button class="btn plain" data-act="overhaulPart"' + (atYard ? '' : ' disabled') + '>USE A SPARE ' + PART_NAMES[T.cls][sp].toUpperCase() + '</button>' : '') + '</div>' : ''); }
    h += '<h3>WORKSHOP</h3><div class="lst">';
    upgradesFor(c).forEach(u => { const cost = upgradeCost(c, u.id); h += '<div class="item"><div class="tx"><b>' + esc(u.name) + '</b><small>' + esc(u.desc) + '</small></div>' + (c.upg[u.id] ? '<span class="tag green">FITTED</span>' : '<button class="btn" data-act="upg" data-arg="' + u.id + '"' + (G.money >= cost ? '' : ' disabled') + '>' + money(cost) + '</button>') + '</div>'; });
    h += '</div>'; }
  else if (seg === 'looks') {
    h += '<h3>NAME</h3><div class="row"><input id="nmin" class="nmin" maxlength="16" value="' + esc(c.name) + '" spellcheck="false"><button class="btn" data-act="rename">RENAME</button></div><h3>PAINT</h3><div class="swatches">' +
      LIVERIES.map((L, i) => hasPaint(i) ? '<button class="sw' + ((c.liv || 0) === i ? ' on' : '') + '" data-act="paint" data-arg="' + i + '"><i style="background:' + (L[1] ? INK[L[1]] : '#d3d8dd') + '"></i>' + L[0].toUpperCase() + '</button>' : '').join('') + '</div>' +
      '<div class="sub" style="margin-top:8px">' + LIVERIES.filter((L, i) => !hasPaint(i)).length + ' more paints are earned, not bought: one for each holiday\'s VIP, and one for each VIP whose list you finish.</div>'; }
  else if (seg === 'crew') {
    if (c.crew) { const P = PERKS[c.crew.perk]; h += '<h3>ABOARD</h3><div class="item"><img class="ic" src="' + portraitURL(c.crew.seed, 'worker') + '" alt=""><div class="tx"><b>' + esc(c.crew.name) + ' · ' + P.n + '</b><small>' + P.d + ' \u00b7 ' + CREW_RANKS[crewRank(c)] + ', ' + (c.crew.trips || 0) + ' trips' + (crewRank(c) ? ', fares +' + crewRank(c) * 4 + '%' : '') + '</small></div><button class="btn red" data-act="dismiss">LET GO</button></div>'; }
    h += '<h3>FOR HIRE <em>NEW FACES DAILY</em></h3><div class="lst">';
    (G.hall || []).forEach(x => { const P = PERKS[x.perk], fits = !P.cls || P.cls === T.cls; h += '<div class="item' + (fits ? '' : ' dim') + '"><img class="ic" src="' + portraitURL(x.seed, 'worker') + '" alt=""><div class="tx"><b>' + esc(x.name) + ' · ' + P.n + '</b><small>' + P.d + '</small></div>' +
      (fits ? '<button class="btn" data-act="hire" data-arg="' + x.id + '"' + (G.money >= x.cost ? '' : ' disabled') + '>' + money(x.cost) + '</button>' : '<span class="tag">' + (P.cls === 'boat' ? 'BOATS' : 'PLANES') + '</span>') + '</div>'; });
    if (!(G.hall || []).length) h += '<div class="sub">Nobody is looking for work today.</div>';
    h += '</div><div class="sub" style="margin-top:6px">One hand per craft.' + (c.crew ? ' Hiring replaces ' + esc(c.crew.name) + '.' : '') + '</div>'; }
  else if (seg === 'run') {
    if (c.run) h += '<h3>STANDING RUN</h3><div class="card" style="margin-top:0"><b class="sk" style="font-size:13px">' + esc(runLabel(c.run).toUpperCase()) + '</b><div class="sub">' + c.run.trips + ' trips · earned ' + money(c.run.earned) + '. It loads, goes and collects by itself; the crew keeps ' + Math.round(RUN_CUT * 100) + '%.</div><div class="row wrap" style="margin-top:8px"><button class="btn red" data-act="stopRun">STOP THE RUN</button><button class="btn go" data-act="pickRun"' + (c.state === 'dock' && runStops(c.run).length < RUN_STOPS ? '' : ' disabled') + '>ADD A STOP \u25b8</button></div><div class="sub" style="margin-top:8px">A run can have up to four stops. Two runs that share a port hand loads to each other there.</div></div>';
    else h += '<h3>STANDING RUN <em>' + runCount() + ' OF ' + runMax() + ' IN USE</em></h3><div class="sub">Pick the other end, and ' + esc(c.name) + ' will shuttle between here and there by itself, even while you are away. The crew keeps ' + Math.round(RUN_CUT * 100) + '%.</div><button class="btn go" data-act="pickRun" style="margin-top:8px"' + (c.state === 'dock' && runCount() < runMax() ? '' : ' disabled') + '>PICK THE OTHER END ▸</button>'; }
  else {
    h += '<h3>STORAGE <em>' + G.stored.length + '/' + STORE_CAP + '</em></h3><div class="row between"><span class="sub">' + (atYard ? 'Put it away and get the fleet slot back. Must be empty.' : 'Storage is at a ' + yardWord(T) + (ny ? '. The nearest is ' + esc(ny.name) + '.' : '.')) + '</span><button class="btn" data-act="store" data-arg="' + c.id + '"' + (atYard && !c.jobs.length && G.stored.length < STORE_CAP && G.crafts.length > 1 ? '' : ' disabled') + '>STORE</button></div>';
    h += '<h3>SELL</h3><div class="row between"><span class="sub">Must be at a port and empty. Frees a fleet slot.</span><button class="btn red" data-act="sell">SELL FOR ' + money(sellValue(c)) + '</button></div>'; }
  return h; }
const fishUnit = (sp, n) => sp === 'lobster' ? (n === 1 ? ' crate' : ' crates') : sp === 'tuna' || sp === 'halibut' ? ' fish' : (n === 1 ? ' tote' : ' totes');
function tabFish(c) { let h = '';
  if (c.fish) { const f = c.fish, port = PORT_BY[c.at], here = port && port.dock ? fishPrice(c.at, f.sp) : 0, mk = catchMarkets(c).filter(m => m.pid !== c.at).slice(0, 3);
    h += '<div class="dh" style="margin-bottom:8px"><b>Catch aboard</b><span class="dd">' + f.units + fishUnit(f.sp, f.units) + '</span></div><div class="rows"><div class="jrow"><img class="jic" src="' + ICON_URL['fish_' + f.sp] + '" alt=""><div class="jtx"><b>' + esc(FISH[f.sp].name) + '</b><span>' + (here ? money(here) + ' each in ' + esc(portName(c.at)) : 'nobody buys fish here') + '</span></div><div class="jr"><div class="jpay">' + money(here * f.units) + '</div><button class="btn load" data-act="sellCatch"' + (here ? '' : ' disabled') + '>SELL</button></div></div></div>' +
      (mk.length ? '<div class="sub" style="margin:2px 0 10px">Elsewhere: ' + mk.map(m => esc(portName(m.pid)) + ' <b>' + money(m.price) + '</b>').join(' · ') + '. Carry it there to sell.</div>' : '') + '<div class="sub">Sell the catch before the next trip out.</div>'; return h; }
  const all = fishOptions(c), opts = all.filter(o => o.inRange), farN = all.length - opts.length; h = '<div class="rows">';
  if (!opts.length) h += '<div class="sub">Nothing in season within reach of this boat.</div>';
  else h = '<div class="dh" style="margin-bottom:8px"><b>Fishing grounds</b><span class="dd">' + (feat('catch') ? 'catch stays aboard to sell' : 'sells when it gets back') + '</span></div>' + h;
  opts.forEach(o => { const set = o.mode === 'set', haul = o.mode === 'haul';
    h += '<div class="jrow"><img class="jic" src="' + ICON_URL['fish_' + o.sp] + '" alt=""><div class="jtx"><b>' + esc(o.g.name) + '</b><span>' + (set ? 'Set a trap string · bait ' + money(TRAP_BAIT) : (haul ? 'Haul your traps · ' : esc(FISH[o.sp].name) + ' · ') + o.est + fishUnit(o.sp, o.est)) + ' · ' + secs(o.time) + '</span>' + (haul ? '<span class="tag ' + (o.fill >= 1 ? 'green' : 'yel') + '">' + (o.fill >= 1 ? 'FULL' : Math.round(o.fill * 100) + '% SOAKED') + '</span>' : '') + '</div><div class="jr"><div class="jpay">' + (set ? '' : money(o.value) + '<small>today</small>') + '</div>' +
      '<button class="btn load" data-act="fishGo" data-arg="' + o.g.id + '|' + o.sp + '|' + (o.mode || '') + '">' + (set ? 'SET' : haul ? 'HAUL' : 'GO') + '</button></div></div>'; });
  return h + '</div>' + (feat('catch') ? '<div class="sub" style="margin-top:6px">Trap strings: ' + trapCount() + ' of ' + trapMax() + ' set. A string fills over eight minutes and is rebaited each haul.</div>' : '') + (farN && opts.length ? '<div class="sub" style="margin-top:6px">' + farN + ' more ground' + (farN === 1 ? ' is' : 's are') + ' out of this boat\'s range.</div>' : ''); }
function leftUnderway(c) { let h = '<div class="card" style="margin-top:0"><div class="row between"><div><b class="sk" style="font-size:14px">' + esc(craftStatus(c)) + '</b><div class="sub" style="margin-top:3px">' + (c.state === 'hold' ? (c.holdWhy === 'turnaround' ? 'Dropping off and turning around.' : 'Waiting on the weather. It leaves by itself when it clears.') : (isBoat(c) ? 'Coins bob past out there. ' : 'Coins drift past up there. ') + (TOUCH ? 'Tap' : 'Click') + ' them.') + '</div></div><div class="eta" id="etatxt"></div></div>' +
    ((c.state === 'move' || c.state === 'fish') ? '<div class="bar blue tall" style="margin-top:10px"><i id="etabar"></i></div>' : '');
  if (c.plan && c.plan.stops && c.plan.stops.length > 1) h += '<div class="stops" style="margin-top:10px">' + c.plan.stops.map((s, i) => '<span class="stop' + (i === c.plan.i ? ' new' : '') + '" style="' + (i < c.plan.i ? 'opacity:.4' : '') + '">' + esc(portName(s)) + '</span>').join('<span>\u25b8</span>') + '</div>';
  return h + '</div>'; }
function bodyUnderway(c) { const cs = cstat(c); let h = (c.run ? '<div class="card" style="margin-top:0"><b class="sk" style="font-size:13px">STANDING RUN \u00b7 ' + esc(runLabel(c.run).toUpperCase()) + '</b><div class="sub">' + c.run.trips + ' trips \u00b7 earned ' + money(c.run.earned) + '</div><button class="btn red" data-act="stopRun" style="margin-top:8px">STOP THE RUN</button></div>' : '') + '<h3>ABOARD <em>' + loadOf(c).pax + '/' + cs.pax + ' SEATS \u00b7 ' + loadOf(c).cargo + '/' + cs.cargo + ' CARGO</em></h3><div class="holdbar v2 plain">' + slotsHTML(c, false) + '</div>';
  if (c.jobs.length) { h += '<div class="rows" style="margin-top:10px">'; groupJobs(c.jobs).forEach(g => { h += '<div class="jrow aboard"><img class="jic" src="' + jobIconURL(g.j) + '" alt=""><div class="jtx"><b>' + esc(g.j.label) + (g.n > 1 ? ' <span class="jcount">\u00d7' + g.n + '</span>' : '') + '</b><span>to <em>' + esc(portName(g.to)) + '</em></span></div><div class="jpay">$' + g.pay + (g.n > 1 ? '<small>each</small>' : '') + '</div></div>'; }); h += '</div>'; }
  if (c.fish) h += '<div class="item" style="margin-top:10px"><img class="ic" src="' + ICON_URL['fish_' + c.fish.sp] + '" alt=""><div class="tx"><b>' + c.fish.units + ' ' + esc(FISH[c.fish.sp].name) + ' in the hold</b><small>' + (feat('catch') ? 'Stays aboard until you sell it' : 'Sells back at the dock' + (c.plan && c.plan.fish ? ' at ' + esc(portName(c.plan.fish.land)) + ' for about ' + money(c.fish.units * fishPrice(c.plan.fish.land, c.fish.sp)) : '')) + '</small></div></div>';
  if (!c.jobs.length && !c.fish) h += '<div class="sub" style="margin-top:10px">Running empty.</div>';
  return h; }
/* ---------- the sheet ---------- */
function sheetSig() {
  // a craft that came in while its screen was open is shown at the port it is at now
  const c = UI.selCraft; if (c && c.at && UI.sheet === 'craft' && UI.selPort !== c.at) UI.selPort = c.at;
  let s = UI.screen + '|' + UI.sheet + '|' + UI.stab + '|' + UI.selCraftId + '|' + UI.selPort + '|' + UI.filter + '|' + UI.fexp + '|' + Math.floor(G.money) + '|' + season() + '|' + G.tutDone + Object.keys(G.tut).length + '|' + G.level + '|' + G.slots + '|' + G.crafts.length;
  const pid = UI.selPort; if (pid) { const st = G.ports[pid]; s += '|' + st.open + st.lvl + ':' + st.jobs.length + ':' + (st.jobs.length ? st.jobs[st.jobs.length - 1].id + '.' + st.jobs[0].id : '') + ':' + st.lay.length + ':' + Math.floor(st.xp) + ':' + craftsAt(pid).map(q => q.id + q.state + q.jobs.length).join(','); const w = wxAt(PORT_BY[pid].x, PORT_BY[pid].y); s += w.fog + '' + w.storm + w.snow; }
  if (c) s += '|' + c.state + c.jobs.length + (c.last ? 'L' + c.last.pay : '') + (c.fish ? 'f' : '') + (c.holdWhy || '') + (c.plan && c.plan.stops ? c.plan.i : '') + Object.keys(c.upg).length;
  if (c) s += '|n' + c.name + (c.liv || 0) + Math.round(condOf(c) / 2) + (c.crew ? c.crew.name + c.crew.perk : '') + (c.run ? 'r' + c.run.trips + '.' + c.run.earned : '') + (c.fish ? c.fish.units : '');
  s += '|f' + UI.cseg + (G.hall || []).map(x => x.id).join('.') + trapCount() + (c ? goodsCount(c) + (c.fit || '') + (c.crew ? crewRank(c) : '') + (c.run ? runStops(c.run).length : '') : '') + (pid ? goodsFor(pid).map(gd => goodBuyPrice(pid, gd.id)).join('.') + (c && c.goods ? c.goods.map(q => goodPrice(pid, q.g)).join('.') : '') + G.ports[pid].jobs.filter(j => j.rv).length : '') + (G.reqs || []).map(r => r.id + '.' + r.got).join('') + (G.rivalOff ? 'x' : '') + (G.ev ? G.ev.id + (G.ev.port || '') : '') + (G.cal ? G.cal.filter(q => !q.done).length : '') + Object.keys(G.liv || {}).length + Object.keys(G.chains || {}).map(k2 => G.chains[k2].n).join('') + (pid && G.ports[pid].works ? Object.keys(G.ports[pid].works).join('') : '') + (pid ? G.ports[pid].jobs.filter(j => j.urgent || j.ev || j.vip).length : '') + (holidayNow() ? holidayNow().id : '') + (G.hol || '') + runCount() + logCount('sp') + logCount('types');
  s += '|y' + UI.yseg + UI.showFar + partsCount() + '.' + G.stored.length + (pid && G.ports[pid].shelf ? G.ports[pid].shelf.map(x => x.id).join('.') : '') + (UI.sheet === 'yard' ? PORTS.map(p => p.yard ? (G.ports[p.id].open ? 1 : 0) + '' + (G.ports[p.id].shelf ? G.ports[p.id].shelf.length : 0) : '').join('') : '');
  if (UI.sheet === 'contracts') s += '|' + G.offers.map(o => o.id).join(',') + '|' + G.active.map(k => k.id + ':' + k.delivered + ':' + k.loaded).join(',');
  if (UI.sheet === 'market') s += '|' + Math.floor(G.t / 10);
  if (UI.sheet === 'almanac') s += '|' + G.news.length + (G.news[0] ? G.news[0].t : '') + G.wx.length + dayOf(G.t) + G.sound + G.stats.delivered;
  return s;
}
const BACK = '<button class="btn dark" data-act="toMap">\u25c2<span class="hp"> MAP</span></button>';
// Port screen layout: left = the picture and the craft you are loading; right = tabs (the job board etc.); footer = the big button.
function renderPanel(now) {
  const wrap = $('sheetwrap'), show = UI.screen === 'sheet'; if (wrap.classList.contains('show') !== show) { wrap.classList.toggle('show', show); $('app').classList.toggle('insheet', show); }
  if (!show) { UI.sig = ''; return; }
  const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && !UI.forceOnce) return; UI.forceOnce = false;
  if (UI.pointerDown || now - UI.lastRender < 160) return; const sig = sheetSig(); if (sig === UI.sig) return; UI.sig = sig; UI.lastRender = now;
  const c = UI.selCraft, body = $('sbody'), cols = $('scols'), sc = body.scrollTop, sc2 = cols.scrollTop; let head = '', tabs = '', left = null, h = '', foot = '', tut = '';
  if (UI.sheet === 'contracts' || UI.sheet === 'market' || UI.sheet === 'almanac' || UI.sheet === 'yard') { head = BACK + '<div class="grow"><h2>' + (UI.sheet === 'contracts' ? 'Contracts' : UI.sheet === 'market' ? 'Fish Market' : UI.sheet === 'yard' ? 'Hangar &amp; Boatyard' : 'Almanac') + '</h2></div>';
    h = UI.sheet === 'contracts' ? htmlContracts() : UI.sheet === 'market' ? htmlMarket() : UI.sheet === 'yard' ? htmlYard() : htmlAlmanac(); }
  else if (c && c.state !== 'dock') { const T = CRAFT_BY[c.type];
    head = BACK + '<div class="grow"><h2>' + esc(c.name) + '</h2><div class="sub2">' + esc(T.name) + ' \u00b7 ' + esc(craftStatus(c)) + '</div></div>'; left = leftUnderway(c); h = bodyUnderway(c);
    foot = '<div class="grow"></div>' + ((c.state === 'move' || c.state === 'fish') ? '<button class="btn" data-act="hurry" data-tip="Pay the crew to step on it: it arrives right now">HURRY <span id="hurrycost"></span></button><button class="btn blue" data-act="follow" data-tip="Close this and follow it on the map">WATCH ON MAP</button>' : '') + (c.state === 'hold' ? '<button class="btn red" data-act="cancelPlan">' + (c.holdWhy === 'turnaround' ? 'STOP HERE' : 'CANCEL TRIP') + '</button>' : ''); }
  else { if (!UI.selPort || !PORT_BY[UI.selPort]) { deselect(); return; } const pid = UI.selPort, p = PORT_BY[pid], st = G.ports[pid];
    head = BACK + '<div class="grow"><h2>' + esc(p.name) + '</h2><div class="sub2">' + esc(p.reg) + ' ' + pips(p) + (st.open ? '<span class="hp"> \u00b7 terminal level ' + st.lvl + '</span>' : '<span class="hp"> \u00b7 not served yet</span>') + '</div></div>' + (st.open ? '<div class="reft">NEW JOBS IN<b id="reft"></b></div>' : '<span class="tag">NOT SERVED</span>'); tut = '';
    if (!st.open) { left = leftLocked(pid); h = tabPort(pid); }
    else { const T = c ? CRAFT_BY[c.type] : null, canFish = c && T.fish && p.dock; if (UI.stab === 'craft' && !c) UI.stab = 'jobs'; if (UI.stab === 'fish' && !canFish) UI.stab = 'jobs';
      const tb = (id, label) => '<button class="stab' + (UI.stab === id ? ' on' : '') + '" data-act="stab" data-arg="' + id + '">' + label + '</button>';
      tabs = tb('jobs', 'JOBS <span style="opacity:.6">' + (st.jobs.length + st.lay.length) + '</span>') + (canFish ? tb('fish', 'FISHING') : '') + tb('port', p.yard === 'h' ? 'HANGAR' : p.yard === 'm' ? 'BOATYARD' : p.yard ? 'YARD' : 'PORT') + (c ? tb('craft', 'CRAFT') : '');
      left = leftDock(pid, c);
      h = UI.stab === 'port' ? tabPort(pid) : UI.stab === 'craft' ? tabCraft(c) : UI.stab === 'fish' ? tabFish(c) : tabJobs(pid, c);
      if (c) { const wx = wxBlock(c, p.x, p.y), worth = c.jobs.reduce((a, j) => a + j.pay, 0);
        foot = '<div class="grow">' + (tut ? '<span class="ft-bev">' + esc(tut) + '</span>' : '') + '<span class="ft-def">' + (wx ? '<span class="ftwx"><span class="tag org">' + esc(wx.toUpperCase()) + ' HERE</span><span>It waits for a break.</span></span>' : c.jobs.length ? c.jobs.length + ' aboard \u00b7 <b style="color:var(--greend)">' + money(worth) + '</b>' : UI.stab === 'fish' ? '' : reachAny(c) ? '' : 'No port in reach from here.') + '</span></div>' + (UI.stab === 'fish' ? '' : reachAny(c) ? '<button class="btn big go" data-act="route" data-tip="Choose where to go on the map (Enter)">' + goWord(c) + ' \u25b8</button>' : canFish ? '<button class="btn big go" data-act="stab" data-arg="fish">GO FISHING \u25b8</button>' : '<button class="btn big go" disabled data-tip="No port you serve is within reach">' + goWord(c) + ' \u25b8</button>'); } } }
  $('sheet').classList.toggle('single', left === null); $('sheet').classList.toggle('tut', !!tut);
  $('shead').innerHTML = head; $('stabs').innerHTML = tabs; $('stabs').style.display = tabs ? 'flex' : 'none'; $('lbody').innerHTML = left || ''; body.innerHTML = h; fitFilters(); body.scrollTop = sc; cols.scrollTop = sc2; $('sfoot').innerHTML = foot; if (UI.wantLv) { UI.wantLv = false; const e = $('lvtop'); if (e) e.scrollIntoView(); }
}
function splash(pay, sub) { const el = $('splash'); let h = '<b>+' + money(pay) + '</b><span>' + esc(sub) + '</span>'; for (let i = 0; i < 12; i++) h += '<i style="left:' + (4 + Math.random() * 90) + '%;animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;background-image:url(' + ICON_URL.coin + ')"></i>';
  el.innerHTML = h; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(UI.splashT); UI.splashT = setTimeout(() => el.classList.remove('show'), 2400); }

/* ---------- the dock: fleet bar, or the route bar while choosing stops ---------- */
function routeBarHTML(c) { const T = CRAFT_BY[c.type]; let h = '<div class="rl"><div class="rt">' + sprImg(T, 54, 2) + (UI.pickRun ? 'STANDING RUN FOR ' : 'ROUTE FOR ') + esc(c.name.toUpperCase()) + '</div><div class="stops"><span class="stop">' + esc(portName(c.at)) + '</span>';
  UI.stops.forEach(s => { h += '<span>▸</span><span class="stop new">' + esc(portName(s)) + '</span>'; });
  h += '<span>▸</span><span class="hint">' + (UI.pickRun ? 'tap the port at the other end of the run' : UI.stops.length ? 'add a stop, or ' + goWord(c) : !reachAny(c) ? 'no port in reach: go BACK' : (() => { const ds = []; c.jobs.forEach(q => { if (ds.indexOf(q.to) < 0 && legInfo(c, c.at, q.to).ok) ds.push(q.to); }); return ds.length ? 'tap ' + ds.slice(0, 2).map(d => esc(PORT_BY[d].mapName.toUpperCase())).join(' or ') + (ds.length > 2 ? ' or another' : '') + ' on the map' : 'tap a ringed port on the map'; })()) + '</span></div>';
  if (UI.stops.length) { const r = routeInfo(c, UI.stops), off = c.jobs.filter(j => UI.stops.indexOf(j.to) < 0).length;
    h += '<div class="rstats"><span>takes <b>' + secs(r.time) + '</b></span><span>pays <b>' + money(r.income) + '</b></span><span>fuel <b>' + money(r.fuel) + '</b></span>' + (r.bonus ? '<span class="bn">+25% FULL LOAD</span>' : '') + (off ? '<span class="wn">' + off + ' aboard not on this route</span>' : '') + (r.wx ? '<span class="wn">' + esc(r.wx) + ': holds at the dock until it clears</span>' : '') + '</div>'; }
  return h + '</div><div class="rr"><button class="btn dark" data-act="undo"' + (UI.stops.length ? '' : ' disabled') + '>UNDO</button><button class="btn dark" data-act="cancelRoute">BACK</button><button class="btn big go" data-act="go"' + (UI.stops.length ? '' : ' disabled') + '>' + goWord(c) + ' ▸</button></div>'; }
function renderFleet() {
  const dock = $('dock'), routing = UI.screen === 'route' && UI.selCraft; if (dock.classList.contains('routing') !== !!routing) { dock.classList.toggle('routing', !!routing); $('app').classList.toggle('routing', !!routing); }
  if (routing) { const c = UI.selCraft, key = 'R' + c.id + UI.stops.join(',') + c.jobs.length + (UI.pickRun ? 'p' : ''); if (key !== UI.fleetKey) { UI.fleetKey = key; $('routebar').innerHTML = routeBarHTML(c); } return; }
  const el = $('fleet'), sc = slotCost(), key = G.crafts.map(c => c.id + c.state + (c.at || '') + (c.holdWhy || '') + (UI.selCraftId === c.id) + (c.jobs.length ? 'j' : '') + loadOf(c).pax + '.' + loadOf(c).cargo + (c.fit || '') + c.name + (c.liv || 0) + (c.run ? 'r' : '') + (c.fish ? 'f' : '') + (condOf(c) < 50 ? 'w' : '')).join('|') + '#' + G.slots + (G.money >= sc) + UI.sheet + readyToBuild() + G.offers.length + G.active.length; if (key === UI.fleetKey) return; UI.fleetKey = key;
  const sl = el.scrollLeft; let h = '';
  G.crafts.forEach(c => { const T = CRAFT_BY[c.type], landed = c.state === 'landed', idle = c.state === 'dock' && !c.jobs.length, out = c.state === 'move' || c.state === 'fish'; let st;
    if (landed) st = '<i class="ftag g">ARRIVED</i>' + esc(portName(c.at)); else if (idle && c.fish) st = '<i class="ftag o">CATCH</i>' + esc(portName(c.at)); else if (idle && c.run) st = '<i class="ftag b">RUN</i>' + esc(portName(c.at)); else if (idle) st = '<i class="ftag r">IDLE</i>' + esc(portName(c.at)); else if (c.state === 'dock') st = '<i class="ftag b">' + c.jobs.length + ' ABOARD</i>' + esc(portName(c.at));
    else if (c.state === 'hold') st = '<i class="ftag o">HOLD</i>' + esc(c.holdWhy === 'turnaround' ? portName(c.at) : c.holdWhy);
    else st = '<i class="ftime" id="ft' + c.id + '"></i>\u25b8 ' + esc(c.state === 'fish' ? 'fishing' : c.route.kind === 'trip' ? portName(c.route.to) : c.route.kind === 'fishOut' ? 'the grounds' : portName(c.plan.fish.land));
    h += '<button class="fc' + (UI.selCraftId === c.id ? ' sel' : '') + (landed ? ' landed' : '') + (c.state === 'fish' ? ' fishg' : '') + '" data-act="selCraft" data-arg="' + c.id + '"><span class="spr">' + sprImgC(c, 78, 3) + capPips(c) + '</span><span class="col"><span class="nm">' + esc(c.name) + (c.run ? ' \u21c4' : '') + (condOf(c) < 50 ? ' <img class="wr" src="' + ICON_URL.ui_wrench + '" alt="worn">' : '') + '</span><span class="stt">' + st + '</span>' + (out ? '<span class="pb"><i id="fb' + c.id + '"></i></span>' : '') + '</span></button>'; });
  for (let i = G.crafts.length; i < G.slots; i++) h += '<button class="fc fslot" data-act="shop" data-tip="An empty fleet slot. Buy or build a craft at a hangar or boatyard."><span class="col"><span class="nm">EMPTY SLOT</span><span class="stt">Buy or build</span></span></button>';
  h += '<button class="fc fslot buy" data-act="buySlot"' + (G.money >= sc ? '' : ' disabled') + ' data-tip="Room for one more craft in the fleet. Each slot costs more than the last."><span class="col"><span class="nm">+ FLEET SLOT</span><span class="stt">' + money(sc) + '</span></span></button>';
  el.innerHTML = h; el.scrollLeft = sl;
  const n = G.offers.length; $('mk').innerHTML = 'CONTRACTS' + (n && G.active.length < 2 ? '<span class="n">' + n + '</span>' : '');
  const nr = readyToBuild(); $('my').innerHTML = 'HANGAR' + (nr ? '<span class="n">' + nr + '</span>' : '');
  document.querySelectorAll('.mbtn').forEach(b => b.classList.toggle('on', UI.screen === 'sheet' && UI.sheet === b.dataset.arg));
}
function updateLive(now) {
  UI.shownMoney += (G.money - UI.shownMoney) * 0.2; if (Math.abs(G.money - UI.shownMoney) < 1) UI.shownMoney = G.money;
  const m = $('money'); m.textContent = money(UI.shownMoney); m.classList.toggle('neg', G.money < 0);
  const s = season(), d = dayOf(G.t) % SEASON_DAYS, hr = hourOf(G.t), key = s + ':' + d + ':' + Math.floor(hr) + ':' + yearOf(G.t);
  if (key !== UI.dateKey) { UI.dateKey = key; const h12 = Math.floor(hr) % 12 || 12; $('date').innerHTML = SEASON_NAMES[s] + ' · DAY ' + (d + 1) + '/' + SEASON_DAYS + '<small>YEAR ' + yearOf(G.t) + ' · ' + h12 + (hr < 12 ? ' AM' : ' PM') + '</small>'; $('seasonic').src = ICON_URL[['ui_sprout', 'ui_sun', 'ui_leaf', 'ui_flake'][s]]; }
  $('dayfill').style.width = (hr / 24 * 100) + '%';
  const need = xpNeed(G.level); $('lvl').textContent = 'LV ' + G.level; $('xptxt').textContent = G.xp + ' / ' + need + ' XP'; $('xpfill').style.width = clamp(G.xp / need * 100, 0, 100) + '%';
  let nl = 0, ni = 0; G.crafts.forEach(c => { if (c.run) return; if (c.state === 'landed') nl++; else if (c.state === 'dock' && !c.jobs.length) ni++; });
  const lb = $('landbtn'), lt = nl ? nl + ' ARRIVED' : ni ? ni + ' IDLE' : 'ALL OUT'; if (lb.textContent !== lt) lb.textContent = lt; lb.classList.toggle('hot', nl > 0);
  G.crafts.forEach(c => { if (c.state !== 'move' && c.state !== 'fish') return; const b = $('fb' + c.id), tx = $('ft' + c.id); if (b) b.style.width = Math.round(craftProgress(c) * 100) + '%'; if (tx) { const v = secs(craftRemaining(c)); if (tx.textContent !== v) tx.textContent = v; } });
  const bm = $('bevmap'), bh = UI.screen === 'sheet' ? '' : bevHTML(); if (bh !== UI.bevKey) { UI.bevKey = bh; bm.innerHTML = bh; }
  if (UI.screen !== 'sheet') { UI.lastLive = now; $('sndbtn').classList.toggle('on', !!G.sound); return; }
  const c = UI.selCraft; if (c && c.state !== 'dock') { const b = $('etabar'), tx = $('etatxt'), hc = $('hurrycost'); if (b) b.style.width = Math.round(craftProgress(c) * 100) + '%'; if (tx) tx.textContent = (c.state === 'move' || c.state === 'fish') ? secs(craftRemaining(c)) : ''; if (hc) hc.textContent = money(hurryCost(c)); }
  const rt = $('reft'); if (rt && UI.selPort && G.ports[UI.selPort].open) { const v = secs(G.ports[UI.selPort].next - G.t); if (rt.textContent !== v) rt.textContent = v; }
  const sht = $('shelft'); if (sht && UI.selPort && G.ports[UI.selPort].shelfNext) { const v = secs(Math.max(0, G.ports[UI.selPort].shelfNext - G.t)); if (sht.textContent !== v) sht.textContent = v; }
  if (UI.sheet === 'contracts') G.active.forEach(k => { const e = $('kdl' + k.id); if (e) e.textContent = secs(k.deadline - G.t) + ' left'; });
  // the scene, plus coins drifting past while a craft is under way (click them, as in Pocket Planes)
  if (UI.sheet === 'craft' || UI.sheet === 'port') { const sx = $('scene').getContext('2d'); const port = PORT_BY[(c ? (c.at || (c.plan && c.plan.fish ? c.plan.fish.land : c.route ? c.route.to : null)) : UI.selPort) || homePort()]; drawScene(sx, port, c, now);
    const under = c && (c.state === 'move' || c.state === 'fish'), dt = Math.min(0.1, (now - (UI.lastLive || now)) / 1000);
    $('scene').classList.toggle('air', !!(under && c.state === 'move' && !isBoat(c)));
    if (!under) { UI.coins.length = 0; UI.coinNext = 4; }
    else { UI.coinNext -= dt; if (UI.coinNext <= 0 && UI.coins.length < 3) { UI.coinNext = 6 + Math.random() * 9; const dir = (c.face || 1) > 0 ? -1 : 1; const sv = sceneView(); UI.coins.push({ x: dir < 0 ? SCENE_W + 6 : -6, y: sv.oy + 8 + Math.random() * Math.max(4, sv.vh - 18), vx: dir * (14 + Math.random() * 10), v: 3 + G.level * 2 + ((Math.random() * 6) | 0), ph: Math.random() * 6 }); }
      for (let i = UI.coins.length - 1; i >= 0; i--) { const q = UI.coins[i]; q.x += q.vx * dt; if (q.x < -10 || q.x > SCENE_W + 10) { UI.coins.splice(i, 1); continue; } sx.drawImage(ICON.coin, Math.round(q.x) - 4, Math.round(q.y + Math.sin(now / 250 + q.ph) * 2) - 4); } }
    for (let i = UI.coinPops.length - 1; i >= 0; i--) { const q = UI.coinPops[i]; q.t += dt; if (q.t > 1.1) { UI.coinPops.splice(i, 1); continue; } drawText(sx, q.txt, Math.round(q.x - textWidth(q.txt) / 2), Math.round(q.y - q.t * 12), '#ffe36a', '#14273d'); } }
  UI.lastLive = now; $('sndbtn').classList.toggle('on', !!G.sound);
}

/* ---------- sim events -> feedback ---------- */
function handleEvents() {
  const ev = SIM.events; if (!ev.length) return; SIM.events = [];
  ev.forEach(e => {
    switch (e.type) {
      case 'arrive': if (e.c.run) { forcePanel(); break; } if (e.final) { popup(e.x, e.y, 'ARRIVED', '#7dff8a'); sfx.land(); if (UI.screen === 'sheet' && UI.selCraftId === e.c.id) { collect(e.c); UI.selPort = e.c.at; UI.stab = 'jobs'; } } else if (e.pay > 0) popup(e.x, e.y, '+$' + e.pay + ' ABOARD', '#ffe36a'); forcePanel(); break;
      case 'collect': popup(e.x, e.y, '+$' + e.pay + (e.bonus ? ' BONUS!' : ''), e.bonus ? '#7dff8a' : '#ffe36a'); if (e.pay > 0) { sfx.pay(); if (UI.screen === 'sheet' && UI.selCraftId === e.c.id) splash(e.pay, [e.units ? e.units + ' delivered' : '', e.fish, '+' + e.xp + ' XP', e.bonus ? 'full-load bonus!' : ''].filter(Boolean).join(' · ')); } forcePanel(); break;
      case 'level': if (e.feats && e.feats.length) showUnlock(e); else banner('Level ' + e.level, money(e.bonus) + ' bonus.' + (e.unlocked.length ? ' Now for sale: ' + e.unlocked.join(', ') + '.' : '')); sfx.big(); forcePanel(); break;
      case 'xp': toast('+' + e.n + ' XP \u00b7 ' + e.why, 'good'); break;
      case 'runCollect': forcePanel(); break;
      case 'fishIn': if (e.c.fish) { popup(e.x, e.y, 'CATCH IN', '#8fe0f0'); toast(e.c.name + ' is in with ' + e.c.fish.units + fishUnit(e.c.fish.sp, e.c.fish.units) + ' of ' + FISH[e.c.fish.sp].name.toLowerCase() + '. Sell it on the FISHING tab.', 'good'); } sfx.land(); forcePanel(); break;
      case 'sold': popup(e.x, e.y, '+$' + e.pay, '#ffe36a'); sfx.pay(); toast('Sold ' + e.units + fishUnit(e.sp, e.units) + ' at ' + money(e.price) + ' each: ' + money(e.pay) + ' \u00b7 +' + e.xp + ' XP', 'good'); forcePanel(); break;
      case 'trapset': popup(e.x, e.y, 'TRAPS SET', '#8fe0f0'); sfx.splash(); break;
      case 'event': if (e.start) { banner(e.name + (e.port ? ' \u00b7 ' + portName(e.port) : ''), e.text + ' ' + (e.len || 'Two days.')); sfx.big(); } forcePanel(); break;
      case 'vip': toast('VIP at ' + portName(e.from) + ': ' + e.label + ', for ' + portName(e.to) + '. Pays ' + money(e.pay) + '.', 'good'); sfx.land(); forcePanel(); break;
      case 'trade': if (e.buy) sfx.load(); else { popup(e.x, e.y, (e.profit >= 0 ? '+$' : '-$') + Math.abs(e.profit), e.profit >= 0 ? '#ffe36a' : '#ff9a8a'); sfx.pay(); toast('Sold ' + e.n + ' ' + GOOD_BY[e.g].name.toLowerCase() + ' for ' + money(e.rev) + ': ' + (e.profit >= 0 ? money(e.profit) + ' profit' : money(Math.abs(e.profit)) + ' lost') + (e.xp ? ' \u00b7 +' + e.xp + ' XP' : '') + (e.asked ? ' \u00b7 ' + e.asked + ' at the asking price' : ''), e.profit >= 0 ? 'good' : 'bad'); } forcePanel(); break;
      case 'request': if (!e.gone) toast(portName(e.pid) + ' is asking for ' + e.n + ' ' + GOOD_BY[e.g].name.toLowerCase() + '. It pays 60% over the going price.', 'good'); forcePanel(); break;
      case 'requestDone': banner(portName(e.pid), 'Got what it asked for. Fares out of there pay ' + Math.min(15, e.favor * 3) + '% more now.'); sfx.big(); forcePanel(); break;
      case 'rival': toast(e.took ? RIVAL + ' took ' + e.n + (e.n === 1 ? ' job' : ' jobs') + ' out of ' + portName(e.pid) + '.' : RIVAL + ' wants the ' + portName(e.to) + ' load at ' + portName(e.pid) + '. Load it within eighty seconds or it goes with them.', 'bad'); if (!e.took) sfx.horn(); forcePanel(); break;
      case 'crewRank': toast(e.c.crew.name + ' is ' + (e.rank === 2 ? 'an old hand' : 'seasoned') + ' now: fares on ' + e.c.name + ' pay ' + e.rank * 4 + '% more.', 'good'); forcePanel(); break;
      case 'vipDone': popup(e.x, e.y, 'VIP!', '#ffd23f'); toast('VIP delivered: ' + e.label + '. ' + e.txt, e.met === false ? '' : 'good'); forcePanel(); break;
      case 'urgent': toast(e.relief ? 'Storm relief for ' + portName(e.to) + ' is waiting at ' + portName(e.from) + '. Two and a half times the rate.' : 'Urgent medical run waiting at ' + portName(e.from) + '. Triple fare.', 'bad'); sfx.horn(); forcePanel(); break;
      case 'chain': toast(e.done ? e.label + ' has finished the list.' : e.label + ': ' + e.n + ' of ' + e.need + ' on the list.', 'good'); if (e.done) sfx.big(); forcePanel(); break;
      case 'paintWon': banner('New paint', e.name + ' is yours. Find it under LOOKS on any craft.'); forcePanel(); break;
      case 'worn': toast(e.c.name + ' is running rough and needs an overhaul.', 'bad'); break;
      case 'catch': popup(e.x, e.y, e.units ? '+' + e.units + ' ' + FISH[e.sp].name : 'SKUNKED', e.units ? '#8fe0f0' : '#ff9a8a'); sfx.splash(); break;
      case 'news': showNews(e); if (e.kind === 'wx') sfx.horn(); break;
      case 'depart': if (!e.c.run) sfx.go(); forcePanel(); break;
      case 'hold': toast(e.c.name + ' is holding for ' + e.c.holdWhy + '. It will leave when it clears.', ''); break;
      case 'season': banner(SEASON_NAMES[e.s], SEASON_BLURB[e.s]); sfx.big(); computeReach(); forcePanel(); break;
      case 'contractDone': sfx.big(); toast('Contract complete! Bonus ' + money(e.bonus), 'good'); break;
      case 'crate': toast(e.why + ': a crate! ' + partName(e.t, e.s) + (canAssemble(e.t) ? '. That makes three.' : ''), 'good'); forcePanel(); break;
      case 'yard': forcePanel(); break;
      case 'unlock': sfx.big(); break; case 'buy': sfx.pay(); break;
    }
  });
}

/* ---------- actions ---------- */
function act(a, arg, el) {
  const c = UI.selCraft; let err = null;
  switch (a) {
    case 'toMap': deselect(); sfx.click(); break;
    case 'stab': UI.stab = arg; UI.filter = null; $('sbody').scrollTop = 0; sfx.click(); break;
    case 'filter': UI.filter = arg || null; sfx.click(); break;
    case 'fexp': UI.fexp = !UI.fexp; sfx.click(); break;
    case 'showFar': UI.showFar = !UI.showFar; forcePanel(); sfx.click(); break;
    case 'yseg': UI.yseg = arg; forcePanel(); $('sbody').scrollTop = 0; sfx.click(); break;
    case 'menu': if (UI.screen === 'sheet' && UI.sheet === arg) deselect(); else openMenu(arg); break;
    case 'selCraft': selectCraft(+arg, UI.screen !== 'sheet'); break;
    case 'selPort': selectPort(arg); centerOn(PORT_BY[arg].x, PORT_BY[arg].y); break;
    case 'load': if (c) { err = loadJob(c, +arg); if (!err) sfx.load(); } break;
    case 'loadIds': if (c) { let n = 0; arg.split(',').forEach(id => { if (!loadJob(c, +id)) n++; }); if (n) sfx.load(); else err = 'No room left.'; } break;
    case 'loadAll': if (c) { err = loadAllFor(c, arg); if (!err) sfx.load(); } break;
    case 'loadK': if (c) { err = loadContract(c, +arg); if (!err) sfx.load(); } break;
    case 'unload': if (c) { err = unloadJob(c, +arg); if (!err) sfx.unload(); } break;
    case 'unloadAll': if (c) { unloadAll(c); sfx.unload(); } break;
    case 'unloadTo': if (c) { c.jobs.filter(j => j.to === arg).forEach(j => { err = unloadJob(c, j.id) || err; }); if (!err) sfx.unload(); } break;
    case 'route': startRouting(); break;
    case 'cycle': if (c) { const here = craftsAt(c.at).filter(q => q.state === 'dock' || q.state === 'landed'), i = here.findIndex(q => q.id === c.id); if (here.length > 1) selectCraft(here[(i + (+arg) + here.length) % here.length].id, false); } break;
    case 'undo': UI.stops.pop(); computeReach(); sfx.click(); break;
    case 'cancelRoute': cancelRoute(); sfx.click(); break;
    case 'go': if (c && UI.stops.length) { const stops = UI.stops.slice(), r = dispatch(c, stops); if (!r.ok) err = 'Can\'t go: ' + r.why; else { toast(c.name + (c.state === 'hold' ? ' will leave for ' : ' is off to ') + portName(stops[stops.length - 1]) + ' · ' + secs(r.time), 'good'); deselect(); } } break;
    case 'fishGo': if (c) { const p = arg.split('|'), nm = c.name; err = goFish(c, p[0], p[1], p[2] || undefined); if (!err) { toast(nm + (p[2] === 'set' ? ' is off to set traps at ' : p[2] === 'haul' ? ' is off to haul traps at ' : ' is headed for ') + GROUND_BY[p[0]].name + '.', 'good'); deselect(); } } break;
    case 'sellCatch': if (c) err = sellCatch(c); break;
    case 'levels': openMenu('almanac'); UI.wantLv = true; forcePanel(); break;
    case 'cseg': UI.cseg = arg; forcePanel(); $('sbody').scrollTop = 0; sfx.click(); break;
    case 'rename': if (c) { const inp = $('nmin'); err = renameCraft(c, inp ? inp.value : ''); if (!err) toast('Renamed: ' + c.name, 'good'); } break;
    case 'paint': if (c) err = paintCraft(c, +arg); break;
    case 'overhaul': if (c) { err = overhaul(c, false); if (!err) { toast(c.name + ' is like new.', 'good'); sfx.big(); } } break;
    case 'overhaulPart': if (c) { err = overhaul(c, true); if (!err) { toast(c.name + ' is like new. One spare part used.', 'good'); sfx.big(); } } break;
    case 'hire': if (c) { const x = (G.hall || []).find(q => q.id === +arg); err = hireCrew(c, +arg); if (!err && x) toast(x.name + ' signed on to ' + c.name + '.', 'good'); } break;
    case 'dismiss': if (c) dismissCrew(c); break;
    case 'buildWork': { const W = WORKS[arg]; err = buildWork(UI.selPort, arg); if (!err) { toast(W.n + ' built at ' + portName(UI.selPort) + '.', 'good'); sfx.big(); } } break;
    case 'stopRun': if (c) { stopRun(c); toast(c.name + ' is off its standing run.', ''); } break;
    case 'pickRun': if (c) { startRouting(true); UI.flash = {}; forcePanel(); } break;
    case 'showCode': { const b = $('codebox'); if (b) { b.value = exportSave(); b.focus(); b.select(); try { if (navigator.clipboard) navigator.clipboard.writeText(b.value).then(() => toast('Save code copied.', 'good'), () => toast('Code made. Select it and copy.', '')); else toast('Code made. Select it and copy.', ''); } catch (x) { toast('Code made. Select it and copy.', ''); } } } break;
    case 'loadCode': { const b = $('codebox'); err = importSave(b ? b.value : ''); if (!err) { UI.selCraftId = null; deselect(); startView(); computeReach(); toast('Save code loaded.', 'good'); } } break;
    case 'cancelPlan': if (c) { cancelPlan(c); UI.selPort = c.at; } break;
    case 'follow': if (c) { const id = c.id; UI.screen = 'map'; UI.sheet = null; VIEW.follow = id; centerOn(c.x, c.y); } break;
    case 'hurry': if (c) err = hurry(c); break;
    case 'nextIdle': nextIdle(); break;
    case 'unlock': err = unlockPort(arg); if (!err) { banner(portName(arg), 'Now serving. ' + PORT_BY[arg].blurb); UI.stab = 'jobs'; } break;
    case 'upPort': err = upgradePort(arg); break;
    case 'buy': case 'build': { const r = a === 'buy' ? buyCraft(arg, UI.selPort) : assemble(arg, UI.selPort); if (typeof r === 'string') err = r; else if (r.stored) { toast(CRAFT_BY[arg].name + ' "' + r.name + '" ' + (a === 'buy' ? 'bought' : 'built') + ' and put in storage', 'good'); sfx.big(); } else { toast(CRAFT_BY[arg].name + ' "' + r.name + '" ' + (a === 'buy' ? 'delivered to ' : 'built at ') + portName(UI.selPort), 'good'); if (a === 'build') sfx.big(); selectCraft(r.id, false); } } break;
    case 'buyPart': { const it = (G.ports[UI.selPort].shelf || []).find(x => x.id === +arg); err = buyPart(UI.selPort, +arg); if (!err && it) { if (canAssemble(it.t)) { toast('That makes all three for a ' + CRAFT_BY[it.t].name + '. BUILD it.', 'good'); UI.yseg = 'build'; } else toast('In the bin: ' + partName(it.t, it.s), 'good'); } } break;
    case 'store': { const q = G.crafts.find(x => x.id === +arg), pid = q && q.at; if (q) { err = storeCraft(q); if (!err) { toast(q.name + ' is in storage. Fleet slot freed.', 'good'); selectPort(pid, true); UI.yseg = 'store'; } } } break;
    case 'unstore': { const r = unstoreCraft(+arg, UI.selPort); if (typeof r === 'string') err = r; else { toast(r.name + ' is back in the fleet at ' + portName(UI.selPort), 'good'); forcePanel(); } } break;
    case 'sellStored': err = sellStored(+arg); if (!err) toast('Sold.', ''); break;
    case 'gotoYard': selectPort(arg, true); UI.yseg = readyToBuild() ? 'build' : 'parts'; centerOn(PORT_BY[arg].x, PORT_BY[arg].y); break;
    case 'buySlot': err = buySlot(); if (!err) toast('Fleet slot added. Fill it at a hangar or boatyard.', 'good'); break;
    case 'shop': { const pid = bestYard(); if (!pid) openMenu('yard'); else { selectPort(pid, true); UI.yseg = readyToBuild() ? 'build' : G.stored.length ? 'store' : 'new'; centerOn(PORT_BY[pid].x, PORT_BY[pid].y); } } break;
    case 'upg': if (c) err = buyUpgrade(c, arg); break;
    case 'sell': if (c) { err = sellCraft(c); if (!err) { toast('Sold.', ''); deselect(); } } break;
    case 'acceptK': err = acceptContract(+arg); if (!err) sfx.pay(); break;
    case 'dropK': { const k = G.active.find(x => x.id === +arg); if (k) dropContract(k, false); } break;
    case 'sound': G.sound = !G.sound; sfx.click(); break;
    case 'saveFile': try { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([exportSave()], { type: 'text/plain' })); a2.download = 'pocket-maine-save.txt'; document.body.appendChild(a2); a2.click(); a2.remove(); setTimeout(() => URL.revokeObjectURL(a2.href), 4000); toast('Save file written. Look in your downloads.', 'good'); } catch (x) { toast('This browser would not write a file. Use MAKE A CODE.', 'bad'); } break;
    case 'loadFile': { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,text/plain'; inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const rd = new FileReader();
        rd.onload = () => { const bad = importSave(String(rd.result || '')); if (bad) toast(bad, 'bad'); else { UI.selCraftId = null; deselect(); startView(); computeReach(); toast('Save file loaded.', 'good'); } }; rd.readAsText(f); }; inp.click(); break; }
    case 'buyGood': if (c) err = buyGood(c, arg, Math.max(1, Math.min(5, roomFor(c, 'c')))); break;
    case 'sellGood': if (c) err = sellGood(c, arg); break;
    case 'fit': if (c) { err = setFit(c, arg || ''); if (!err) { sfx.pay(); toast(arg ? c.name + ' is set up: ' + FITS[arg].n.toLowerCase() + '.' : c.name + ' is back to stock.', 'good'); } } break;
    case 'rival': G.rivalOff = !G.rivalOff; toast(G.rivalOff ? RIVAL + ' will leave your loads alone.' : RIVAL + ' is back in business.', ''); sfx.click(); forcePanel(); break;
    case 'holiday': { const hd = cycleHoliday(); holidayGreet(); toast(hd ? 'Holiday theme: ' + hd.name + '.' : 'Holiday themes ' + (holidayPref() === 'off' ? 'off.' : 'follow the calendar: nothing on today.'), ''); sfx.click(); forcePanel(); break; }
    case 'save': toast(saveGame(STORE) ? 'Saved.' : 'This browser would not let me save.', ''); break;
    case 'zin': zoomBy(1); break; case 'zout': zoomBy(-1); break; case 'zhome': VIEW.zi = fitZoom(); centerOn(WORLD_W * 0.42, WORLD_H * 0.5); break;
    case 'help': showTitle(true); break; case 'askNew': showConfirmNew(); break; case 'chooseStart': showStart(); break;
    case 'newGame': { const S = STARTS.find(x => x.id === arg) || STARTS[0]; newGame(S.id); UI.started = true; UI.paused = false; UI.hasSave = true; deselect(); UI.shownMoney = G.money; UI.dateKey = ''; closeModal(); startView(); sfx.big(); } break;
    case 'continue': UI.started = true; UI.paused = false; closeModal(); startView(); sfx.click(); break;
    case 'closeModal': closeModal(); break;
    case 'tutNext': tutNext(); break; case 'tutSkip': tutSkip(); break; case 'tutRestart': tutRestart(); break;
  }
  if (err) toast(err, 'bad');
  computeReach(); forcePanel();
}
function nextIdle() { const need = G.crafts.filter(c => c.state === 'landed' && !c.run).concat(G.crafts.filter(c => c.state === 'dock' && !c.run)); if (!need.length) { toast('Everything is out working. Nothing to do but wait, or open one and watch it go.', ''); return; } const i = need.findIndex(c => c.id === UI.selCraftId); selectCraft(need[(i + 1) % need.length].id, true); }

/* ---------- map input ---------- */
function mapClick(bx, by) {
  const hit = pickAt(bx, by), c = UI.selCraft;
  if (UI.screen === 'route' && c) { if (hit.port && hit.port.id !== c.at) { if (!G.ports[hit.port.id].open) toast(hit.port.name + ' is not one of your ports yet.', 'bad'); else if (UI.pickRun) { const e = setRun(c, hit.port.id); if (e) toast(e, 'bad'); else { toast(c.name + ' now runs ' + runLabel(c.run) + ' by itself.', 'good'); sfx.big(); cancelRoute(); UI.stab = 'craft'; UI.cseg = 'run'; forcePanel(); } } else addStop(hit.port.id); } return; }
  if (hit.craft && (!hit.port || hit.cd <= hit.pd + 2)) { selectCraft(hit.craft.id, false); return; }
  if (hit.port) { selectPort(hit.port.id); return; }
  if (VIEW.follow || UI.selCraftId) deselect();
}
function mapHover(bx, by, e) {
  const hit = pickAt(bx, by), tip = $('tip'), c = UI.selCraft; let h = '';
  UI.hoverPort = hit.port ? hit.port.id : null; UI.hoverGround = hit.ground ? hit.ground.id : null;
  if (UI.screen !== 'route' && hit.craft && (!hit.port || hit.cd <= hit.pd + 2)) { const T = CRAFT_BY[hit.craft.type]; h = '<b>' + esc(hit.craft.name) + '</b>\n' + esc(T.name) + '\n' + esc(craftStatus(hit.craft)) + (hit.craft.jobs.length ? '\n' + hit.craft.jobs.length + ' aboard' : '') + (hit.craft.state === 'landed' ? '\nOpen it to collect' : ''); }
  else if (hit.port) { const p = hit.port, st = G.ports[p.id]; h = '<b>' + esc(p.name) + '</b>\n' + (p.strip === 2 ? 'Paved runway' : p.strip === 1 ? 'Grass/gravel strip' : 'No airstrip') + (p.water === 'sea' ? ' · harbor' : p.water === 'lake' ? ' · lake' : '');
    if (!st.open) h += '\nNot served yet: ' + money(portCost(p.id)) + ' to open'; else h += '\n' + (st.jobs.length + st.lay.length) + ' jobs waiting';
    if (UI.screen === 'route' && c && UI.reach && UI.reach[p.id] !== undefined) h += UI.reach[p.id] === true ? '\nClick to add to the route' : '\n' + esc(c.name) + ' can\'t: ' + esc(UI.reach[p.id]); }
  else if (hit.ground) { const g = hit.ground, s = season(), inS = Object.keys(g.sp).filter(sp => FISH[sp].abund[s] > 0); h = '<b>' + esc(g.name) + '</b>\n' + (inS.length ? inS.map(sp => FISH[sp].name).join(', ') + ' in season' : 'Nothing in season'); }
  $('mapwrap').classList.toggle('pick', !!h);
  if (h && e.pointerType !== 'touch') { tip.innerHTML = h; tip.style.display = 'block'; placeTip(e.clientX, e.clientY); } else tip.style.display = 'none';
}
function initInput() {
  const w = $('mapwrap'), cv = $('map'); let down = null; const ptrs = new Map(); let pinch = 0;
  const b = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / VIEW.S, (e.clientY - r.top) / VIEW.S]; };
  w.addEventListener('pointerdown', e => { if (e.target.closest('#zoom,#bevmap')) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 2) { const p = [...ptrs.values()]; pinch = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); down = null; return; }
    down = { x: e.clientX, y: e.clientY, cx: VIEW.cx, cy: VIEW.cy, moved: false }; try { w.setPointerCapture(e.pointerId); } catch (_) { } });
  w.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 2) { const p = [...ptrs.values()], d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); if (pinch && d / pinch > 1.35) { zoomBy(1); pinch = d; } else if (pinch && d / pinch < 0.74) { zoomBy(-1); pinch = d; } return; }
    if (down) { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!down.moved && Math.hypot(dx, dy) > 6) { down.moved = true; w.classList.add('drag'); VIEW.follow = null; }
      if (down.moved) { VIEW.cx = down.cx - dx / VIEW.S / KZ(); VIEW.cy = down.cy - dy / VIEW.S / KZ(); clampView(); } }
    else if (!e.target.closest('#zoom')) { const p = b(e); mapHover(p[0], p[1], e); } });
  const up = e => { ptrs.delete(e.pointerId); if (down && !down.moved && e.type === 'pointerup') { const p = b(e); UI.eatClick = performance.now() + 450; mapClick(p[0], p[1]); } down = null; w.classList.remove('drag'); };
  w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
  w.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; UI.hoverPort = null; UI.hoverGround = null; });
  w.addEventListener('wheel', e => { e.preventDefault(); const p = b(e); zoomBy(e.deltaY < 0 ? 1 : -1, p[0], p[1]); }, { passive: false });
  // clicking the dimmed map around the port screen closes it
  $('sheetwrap').addEventListener('click', e => { if (e.target === $('sheetwrap')) { deselect(); sfx.click(); } });
  // A tap on the map acts on pointerup and may put a screen under the finger. The browser's follow-up click
  // would then press whatever just appeared there (a phone could buy a port with one tap), so swallow it.
  document.addEventListener('click', e => { if (UI.eatClick && performance.now() < UI.eatClick) { UI.eatClick = 0; e.stopPropagation(); e.preventDefault(); } }, true);
  // one delegated handler for every data-act control
  document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const tp = $('tip'); tp.style.display = 'none'; tp.dataset.for = ''; act(el.dataset.act, el.dataset.arg, el); });
  const sh = $('sheet'); sh.addEventListener('pointerdown', () => { UI.pointerDown = true; }); window.addEventListener('pointerup', () => { UI.pointerDown = false; }); window.addEventListener('pointercancel', () => { UI.pointerDown = false; });
  document.addEventListener('pointermove', e => { if (e.target.closest && e.target.closest('#mapwrap') && !e.target.closest('#zoom')) return; const el = e.target.closest ? e.target.closest('[data-tip]') : null, tip = $('tip'); if (el && e.pointerType !== 'touch') { if (tip.dataset.for !== el.dataset.tip) { tip.innerHTML = el.dataset.tip; tip.dataset.for = el.dataset.tip; } tip.style.display = 'block'; placeTip(e.clientX, e.clientY); } else { tip.style.display = 'none'; tip.dataset.for = ''; } });
  window.addEventListener('keydown', e => { if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) { if (e.key === 'Enter' && e.target.id === 'nmin') act('rename'); return; }
    if (!UI.started || $('modal').classList.contains('show')) { if (e.key === 'Enter') { const g = document.querySelector('#mbox .btn.go'); if (g) g.click(); } return; }
    if (e.key === 'Tab') { e.preventDefault(); nextIdle(); }
    else if (e.key === 'Enter') { if (UI.screen === 'route') act('go'); else if (UI.screen === 'sheet' && UI.selCraft && UI.selCraft.state === 'dock') act('route'); }
    else if (e.key === 'Escape') { if (UI.screen === 'route') act('cancelRoute'); else deselect(); }
    else if (e.key === 'Backspace' && UI.screen === 'route') act('undo');
    else if (e.key === '+' || e.key === '=') zoomBy(1); else if (e.key === '-') zoomBy(-1); });
  $('scene').addEventListener('click', sceneClick);
  window.addEventListener('resize', layout);
}

// the fits a craft can take, on its GEAR page
function fitsHTML(c, atYard) { const T = CRAFT_BY[c.type], cost = fitCost(c), empty = !c.jobs.length && !goodsCount(c) && !c.fish; let h = '<h3>FIT <em>ONE AT A TIME</em></h3><div class="lst">';
  fitsFor(c).forEach(k => { const F = FITS[k], on = c.fit === k; h += '<div class="item"><div class="tx"><b>' + esc(F.n) + (on ? ' \u00b7 FITTED' : '') + '</b><small>' + esc(F.d) + '</small></div>' + (on ? '<button class="btn red" data-act="fit" data-arg=""' + (atYard && empty ? '' : ' disabled') + '>TAKE OFF</button>' : '<button class="btn" data-act="fit" data-arg="' + k + '"' + (atYard && empty && G.money >= cost ? '' : ' disabled') + '>' + money(cost) + '</button>') + '</div>'; });
  return h + '</div><div class="sub" style="margin-top:6px">' + (atYard ? (empty ? 'Fitting one takes the other off.' : 'Empty the craft first.') : 'Fits are done at a ' + yardWord(T) + ', with the craft empty.') + '</div>'; }

// a craft's size and load at a glance, under its picture in the fleet strip: one pip per seat (blue) and per cargo slot (brown), filled when taken
function capPips(c) { const T = CRAFT_BY[c.type], cs = cstat(c), ld = loadOf(c); if (T.tour) return '<span class="pips"><i class="pt">' + T.tour + '</i></span>';
  if (cs.pax + cs.cargo > 5) return '<span class="pips"><i class="pt">' + (ld.pax + ld.cargo) + '/' + (cs.pax + cs.cargo) + '</i></span>';
  let h = '<span class="pips">'; for (let i = 0; i < cs.pax; i++) h += '<i class="pp p' + (i < ld.pax ? ' on' : '') + '"></i>'; for (let i = 0; i < cs.cargo; i++) h += '<i class="pp c' + (i < ld.cargo ? ' on' : '') + '"></i>'; return h + '</span>'; }
