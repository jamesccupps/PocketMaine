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
function advance() {
  if (!UI.started || UI.paused) return; const wall = Date.now(), el = (wall - G.wall) / 1000; G.wall = wall;
  if (el > 3) { const landed = fastForward(el); UI.away = (UI.away || 0) + el; UI.awayLanded = (UI.awayLanded || 0) + landed; UI.fleetKey = ''; forcePanel(); }
  else if (el > 0) tick(el);
  if (UI.away && !document.hidden) { if (UI.away > 45) awayNote(UI.away, UI.awayLanded); UI.away = 0; UI.awayLanded = 0; }
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
  const doSave = () => { if (UI.started) { advance(); saveGame(STORE); } };
  setInterval(doSave, 15000); document.addEventListener('visibilitychange', doSave); window.addEventListener('pagehide', doSave);
  requestAnimationFrame(frame);
  // installed from the site, the game keeps a copy of itself so it opens with no connection
  try { if ('serviceWorker' in navigator && location.protocol === 'https:' && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
