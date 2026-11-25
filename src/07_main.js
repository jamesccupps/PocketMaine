/* =====================================================================
   Section 7: MAIN  — boot and the frame loop
   ===================================================================== */
const STORE = (function () { try { const k = '__fk_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
// The sim runs on the wall clock, one second per second. If the tab was hidden or the game was closed,
// the gap is replayed in coarse steps so flights land and job boards turn over while you were away.
// One bad frame must never freeze the game: report the error, back out to the map, and keep going.
function frame(now) { try { frameBody(now); UI.badFrames = 0; } catch (e) { setTimeout(() => { throw e; }); if ((UI.badFrames = (UI.badFrames || 0) + 1) < 4) { try { deselect(); } catch (x) {} } requestAnimationFrame(frame); } }
// The game clock is the wall clock: whatever real time has passed since the sim last moved is played now.
// This runs every frame and before every save. A browser stops drawing frames when the tab is hidden or the window is
// covered, but it still fires the autosave timer and the visibility event, and a save stamps the time. Catching up
// first means that stamp never throws away the time spent hidden.
// A long absence is caught up a slice at a time, behind a note that says so, instead of freezing the page: twelve hours of a
// big game is one to two seconds of work on a desktop and several on a phone. While the page is hidden nobody is watching,
// so it is done in one go. Port requests and the rival stand still for all of it (awayTick).
const CATCH_MIN = 120, CATCH_BUDGET = 20;      // seconds away before the catch-up is spread out; milliseconds of it done per frame
const landedNow = () => G.crafts.filter(c => c.state === 'landed').length;
function catchStep(all) { const cu = UI.catchUp, t0 = performance.now(); if (!cu) return;
  while (cu.left > 0 && (all || performance.now() - t0 < CATCH_BUDGET)) { const dt = Math.min(2, cu.left); awayTick(dt); cu.left -= dt; }
  SIM.events = []; const box = $('catchup');
  if (cu.left > 0) { box.classList.add('on'); $('catchbar').style.width = Math.round(100 * (1 - cu.left / cu.total)) + '%'; $('catchtxt').textContent = 'Playing out the ' + secs(cu.total) + ' you were away'; return; }
  UI.catchUp = null; box.classList.remove('on'); SIM.dirty = true; UI.away = (UI.away || 0) + cu.total; UI.awayLanded = (UI.awayLanded || 0) + Math.max(0, landedNow() - cu.landed); UI.fleetKey = ''; forcePanel(); }
function advance() {
  if (!UI.started || UI.paused) return; const wall = Date.now(), el = (wall - G.wall) / 1000; G.wall = wall;
  if (UI.catchUp) { UI.catchUp.left = Math.min(OFFLINE_CAP, UI.catchUp.left + Math.max(0, el)); catchStep(document.hidden); }
  else if (el > CATCH_MIN && !document.hidden) { const sec = Math.min(el, OFFLINE_CAP); UI.catchUp = { left: sec, total: sec, landed: landedNow() }; catchStep(false); }
  else if (el > 3) { const landed = fastForward(el); UI.away = (UI.away || 0) + el; UI.awayLanded = (UI.awayLanded || 0) + landed; UI.fleetKey = ''; forcePanel(); }
  else if (el > 0) tick(el);
  if (UI.away && !UI.catchUp && !document.hidden) { if (UI.away > 45) awayNote(UI.away, UI.awayLanded); UI.away = 0; UI.awayLanded = 0; }
}
function frameBody(now) {
  advance();
  if (UI.started && !UI.greeted && G.tutDone) { UI.greeted = 1; const hd = holidayGreet(); if (hd) banner(hd.name, 'Holiday jobs pay 25% more this week.'); }
  refreshSel();
  const c = UI.selCraft; if (UI.screen === 'route' && (!c || c.state !== 'dock')) deselect();
  if ((UI.screen === 'route') !== !!UI.reach) computeReach();
  handleEvents(); drawMap(now, UI); renderFleet(); renderPanel(now); updateLive(now); renderCoach();
  requestAnimationFrame(frame);
}
function boot() {
  buildArt(); initWorld();
  VIEW.canvas = $('map'); layout();
  UI.hasSave = loadGame(STORE); if (!UI.hasSave) newGame('casco'); startView();
  UI.shownMoney = G.money; SIM.events = []; $('coinic').src = ICON_URL.coin; $('mi1').src = ICON_URL.paper; $('mi2').src = ICON_URL.fish_lobster; $('mi3').src = ICON_URL.books; $('mi4').src = ICON_URL.ui_wrench;
  initInput(); showTitle(false); if (G.news[0]) showNews(G.news[0]);
  // "save" action and autosave share the same store
  // a save finishes any catch-up first, so the time stamp it writes is true; and says so, once, if the browser will not keep it
  const doSave = () => { if (!UI.started) return; advance(); if (UI.catchUp) catchStep(true); const ok = saveGame(STORE);
    if (!ok && !UI.saveWarned) { UI.saveWarned = 1; toast('This browser is not keeping the save: storage is full or switched off. SAVE TO A FILE in the Almanac still works.', 'bad'); } else if (ok) UI.saveWarned = 0; };
  setInterval(doSave, 15000); document.addEventListener('visibilitychange', doSave); window.addEventListener('pagehide', doSave);
  requestAnimationFrame(frame);
  // installed from the site, the game keeps a copy of itself so it opens with no connection
  try { if ('serviceWorker' in navigator && location.protocol === 'https:' && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
