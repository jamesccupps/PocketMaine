/* =====================================================================
   Section 4: ART  — every sprite is drawn here from text grids. No image files.
   (All original. For a Godot port, export these canvases as a sprite sheet.)
   ===================================================================== */
const INK = { k:'#1b1b24', w:'#ffffff', W:'#d3d8dd', g:'#8a8f98', G:'#4a4f58', r:'#d8402f', R:'#8f2a22', o:'#e08a2c', y:'#f2c230', Y:'#b88a1c',
  n:'#8a5a34', N:'#5e3b22', t:'#d9b98a', T:'#b08a5a', e:'#3f8f3a', E:'#2a5f30', b:'#3f7fc8', B:'#1f3f78', c:'#8fd8ee', p:'#d87aa8', v:'#6a3f9a', s:'#f0c8a0', l:'#b8e0f4' };
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function gridCanvas(rows, pal) {
  const h = rows.length, w = rows.reduce((m, r) => Math.max(m, r.length), 0), c = mkCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < rows[j].length; i++) { const ch = rows[j][i]; if (ch === '.' || ch === ' ') continue; x.fillStyle = (pal && pal[ch]) || INK[ch] || '#f0f'; x.fillRect(i, j, 1, 1); }
  return c;
}
function flipCanvas(src) { const c = mkCanvas(src.width, src.height), x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
function tintCanvas(src, color) { const c = mkCanvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c; }
// 1px outline around a sprite, for selection
function outlineCanvas(src, color) { const c = mkCanvas(src.width + 2, src.height + 2), x = c.getContext('2d'), t = tintCanvas(src, color);
  [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(o => x.drawImage(t, o[0], o[1])); x.drawImage(src, 1, 1); return c; }

/* ---------- craft, side view, nose/bow to the right ---------- */
const CRAFT_ART = {
 cub: [
  '....YYYYYYYYYY..',
  '....yyyyyyyyyy..',
  '.......k...k....',
  'y....yyycccyyk..',
  'yy..yyyycccyyyk.',
  '.yyyyyyyykyyyyG.',
  '...........kk...',
  'k..........GG...'],
 loon: [
  '.....WWWWWWWWWWW..',
  '.....wwwwwwwwwww..',
  '........k....k....',
  'w.....wwwcccwwwk..',
  'ww...wwwwcccwwwwG.',
  '.rrrrrrrrrrrrrrrG.',
  '....k.....k..k....',
  '..ggggggggggggggg.',
  '...GGGGGGGGGGGG...'],
 wagon: [
  '....RRRRRRRRRRRR..',
  '....rrrrrrrrrrrr..',
  'w.......k....k....',
  'ww...wwwccwccwwk..',
  'rrr.rrrrccrccrrrG.',
  '.rrrrrrrrrrrrrrrG.',
  '..wwwwwwwwwwwww...',
  '......k......k....',
  '.....GG.....GG....'],
 beav: [
  '....EEEEEEEEEEEEEE..',
  '....eeeeeeeeeeeeee..',
  'w........k.....k....',
  'ww....wwwccwccwwkk..',
  'www..wwwwccwccwwGGk.',
  '.eeeeeeeeeeeeeeeGGG.',
  '..wwwwwwwwwwwwwwGGk.',
  '.....k......k..k....',
  '..ggggggggggggggggg.',
  '...GGGGGGGGGGGGGG...'],
 twin: [
  '.....BBBBBBBBBBBBBBB..',
  '.....bbbbbbbbbbbbbbb..',
  'w.........GGGGk.......',
  'ww....wwwcwcwcwcwwk...',
  'www..wwwwcwcwcwcwwwk..',
  '.bbbbbbbbbbbbbbbbbbbk.',
  '..wwwwwwwwwwwwwwwww...',
  '.......k........k.....',
  '......GG.......GG.....'],
 amphib: [
  '......WWWWWWWWWWWWWWW...',
  '......wwwwwwwwwwwwwww...',
  'w..........k.....k......',
  'ww.....wwwcwcwcwcwwwk...',
  'www..wwwwwcwcwcwcwwwwk..',
  '.BBBBBBBBBBBBBBBBBBBBBG.',
  '..yyyyyyyyyyyyyyyyyyyk..',
  '......k.......k...k.....',
  '..gggggggggggggggggggg..',
  '...GGGGGGGGGGGGGGGGG....',
  '......k..........k......'],
 otter: [
  '......EEEEEEEEEEEEEEEEE...',
  '......eeeeeeeeeeeeeeeee...',
  '.w..........GGGGGk........',
  '.ww..........GGGk.........',
  'www....wwcwcwcwcwcwcwwk...',
  'wwww.wwwwcwcwcwcwcwcwwwwk.',
  '.oooooooooooooooooooooook.',
  '..wwwwwwwwwwwwwwwwwwwww...',
  '........k..........k......',
  '.......GG.........GG......'],
 commuter: [
  'rr............................',
  'rrr...........................',
  'rrrr..wwwwwwwwwwwwwwwwwwwk....',
  'wrrrwwwcwcwcwcwcwcwcwcwwccwk..',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwk.',
  '.BBBBBBBBBBBBBBBBBBBBBBBBBBk..',
  '..wwwwwwwGGGGGGGGGGwwwwwww....',
  '.........WWWWWWWWWWk..........',
  '..........k......k............',
  '.........GG.....GG............'],
 skiff: [
  '...........k......',
  '.........wwwww....',
  '.........wccwk....',
  '.........wcc......',
  '.yy.ee...w........',
  '.yy.ee...www....ww',
  'wwwwwwwwwwwwwwwwww',
  '.wwwwwwwwwwwwwwww.',
  '..rrrrrrrrrrrrrr..'],
 down: [
  '...........k........',
  '..........wwwwww....',
  '..........wccwcw....',
  '..oo.yy.....wcw.....',
  '..oo.yy.e.wwwwww..w.',
  'wwwwwwwwwwwwwwwwwww.',
  'eeeeeeeeeeeeeeeeeee.',
  '.eeeeeeeeeeeeeeeee..',
  '..RRRRRRRRRRRRRRR...'],
 mail: [
  '.r..................k.',
  '.k.......wwwwwwwww..k.',
  '.k..wwwwwwcwcwcwcw....',
  '....wcwcwcwcwcwcwww...',
  '....wwwwwwwwwwwwwwww.w',
  'wwwwwwwwwwwwwwwwwwwww.',
  'BBBBBBBBBBBBBBBBBBBB..',
  '.BBBBBBBBBBBBBBBBBB...',
  '..RRRRRRRRRRRRRRRR....'],
 dragger: [
  '....k...........k.......',
  '....k..........kkk......',
  '....kk.........wwwww....',
  '....k.k........wcwcw....',
  '....k..k.......wwwww....',
  '....k...k.....wwwwwww...',
  'oo..k....k....wcwcwcw..k',
  'kkkkkkkkkkkkkkkkkkkkkkk.',
  'bbbbbbbbbbbbbbbbbbbbbb..',
  '.bbbbbbbbbbbbbbbbbbbb...',
  '..RRRRRRRRRRRRRRRRRR....'],
 ferry: [
  '.............wwwww............',
  '.............wcccw............',
  '......wwwwwwwwwwwwwwwwwww.....',
  '......wcwcwcwcwcwcwcwcwcw.....',
  '......wwwwwwwwwwwwwwwwwww.....',
  '..rr.bbb...k.........k.eee.yy.',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  '.BBBBBBBBBBBBBBBBBBBBBBBBBBBB.',
  '..BBBBBBBBBBBBBBBBBBBBBBBBBB..',
  '...RRRRRRRRRRRRRRRRRRRRRRRR...'],
 freight: [
  '.....k............................',
  '...wwwww..........................',
  '...wcwcw.................k........',
  '...wwwww.................k........',
  '..wwwwwww..rrrbbbyyyeeerrrk.......',
  '..wcwcwcw..rrrbbbyyyeeerrrk.......',
  '..wwwwwww..ooobbbrrryyyeeek.....k.',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...',
  '..RRRRRRRRRRRRRRRRRRRRRRRRRRRR....']
};
/* ---------- cargo icons, 8x8 ---------- */
const CARGO_ART = {
 crate:   ['.kkkkkk.','ktttttTk','kTnTTnTk','ktttttTk','kTnTTnTk','ktttttTk','kTTTTTTk','.kkkkkk.'],
 lobster: ['r......r','rr.rr.rr','.rrrrrr.','..rRRr..','.rrrrrr.','..rRRr..','.r.rr.r.','...rr...'],
 mail:    ['..kkkk..','.kttttk.','..kTTk..','.kttttk.','kttwwttk','kttwrttk','kttttttk','.kkkkkk.'],
 propane: ['...GG...','..kggk..','.kwwwwk.','.kwWWwk.','.kwWrwk.','.kwWWwk.','.kwwwwk.','..kkkk..'],
 potato:  ['.kk..kk.','.ktkktk.','..kttk..','.kttttk.','kttTtttk','ktTtttTk','kttttTtk','.kkkkkk.'],
 barrel:  ['..kkkk..','.knnnnk.','kGGGGGGk','knnNnnnk','knnNnnnk','kGGGGGGk','.knnnnk.','..kkkk..'],
 box:     ['........','kkkkkkkk','kttrtttk','krrrrrrk','kttrtttk','kttrtttk','kttrtttk','kkkkkkkk'],
 berries: ['........','.b.bb.b.','bBbbBbbb','bbBbbbBb','kkkkkkkk','kwwwwwwk','kwwwwwwk','kkkkkkkk'],
 wreath:  ['..eEEe..','.EeeeeE.','Ee....eE','E......e','e......E','Ee....eE','.Eerree.','..errE..'],
 canoe:   ['........','........','r......r','rr....rr','rrrrrrrr','.RRRRRR.','........','........'],
 grocery: ['...e.r..','..eeyr..','.kkkkkk.','.kttttk.','.kttttk.','.ktTTtk.','.kttttk.','.kkkkkk.'],
 lumber:  ['........','tttttttT','kkkkkkkk','tttttttT','kkkkkkkk','tttttttT','kkkkkkkk','........'],
 parts:   ['..g..g..','.gggggg.','.gGGGGg.','ggG..Ggg','ggG..Ggg','.gGGGGg.','.gggggg.','..g..g..'],
 tote:    ['........','..bccb..','.bcccck.','..bccb..','kkkkkkkk','kggggggk','kgGGGGgk','kkkkkkkk'],
 paper:   ['........','kkkkkkkk','kwwwwwwk','kwGGwGwk','kwwwwwwk','kwGwGGwk','kwwwwwwk','kkkkkkkk'],
 pie:     ['........','..NNNN..','.NNNNNN.','.wwwwww.','.wwwwww.','.NNNNNN.','..NNNN..','........'],
 fridge:  ['.kkkkkk.','.kwwwwk.','.kwwwGk.','.kkkkkk.','.kwwwGk.','.kwwwwk.','.kwwwwk.','.kkkkkk.'],
 syrup:   ['...kk...','...yy...','..kook..','.kooook.','.koyyok.','.kooook.','.kooook.','..kkkk..'],
 tree:    ['...y....','...e....','..eEe...','..eee...','.eEeEe..','.eeeee..','eEeeeEe.','...n....'],
 books:   ['........','.rrrrrr.','.wwwwwk.','.bbbbbb.','.wwwwwk.','.eeeeee.','.wwwwwk.','........'],
 stove:   ['....GG..','....GG..','.kkkkkk.','.kGGGGk.','.kGooGk.','.kGGGGk.','.kkkkkk.','.k....k.'],
 soda:    ['........','.o.o.o..','.o.o.o..','kkkkkkk.','kRRRRRk.','kRwwwRk.','kRRRRRk.','kkkkkkk.'],
 drum:    ['..kkkk..','.kbbbbk.','.kBBBBk.','.kbbbbk.','.kbbbbk.','.kBBBBk.','.kbbbbk.','..kkkk..'],
 eel:     ['........','k......k','.kkkkkk.','.kwwwwk.','.kwccwk.','.kwccwk.','..kwwk..','..kkkk..'],
 scallop: ['..wtwt..','.wtwtwt.','wtwtwtwt','wtwtwtwt','.wtwtwt.','..wttw..','...tt...','........'],
 cooler:  ['........','.kkkkkk.','.wwwwww.','kkkkkkkk','krrrrrrk','krrrrrrk','kkkkkkkk','........'],
 outboard:['.kkkk...','.kGGk...','.kGrk...','.kkkk...','..kg....','..kg....','..kgk...','.kkgkk..'],
 fish_lobster: ['r......r','rr.rr.rr','.rrrrrr.','..rRRr..','.rrrrrr.','..rRRr..','.r.rr.r.','...rr...'],
 fish_scallop: ['..wtwt..','.wtwtwt.','wtwtwtwt','wtwtwtwt','.wtwtwt.','..wttw..','...tt...','........'],
 fish_haddock: ['........','.....gg.','W..ggggg','WWggkggg','WWgggggg','W..gWWW.','........','........'],
 fish_halibut: ['........','...EEE..','e.EeeeeE','eeeekeee','eeEeeeeE','e..EEE..','........','........'],
 fish_tuna:    ['....B...','...BBB..','b.BBBBBB','bbBBBkBB','bbWWWWWW','b..WWy..','....y...','........'],
 ui_pax:  ['..gggg..','..gggg..','..gggg..','...gg...','.gggggg.','gggggggg','gggggggg','........'],
 ui_box:  ['........','.gggggg.','.g....g.','.g.gg.g.','.g.gg.g.','.g....g.','.gggggg.','........'],
 ui_sun:  ['...y....','.y.y.y..','..yyy...','yyyoyyy.','..yyy...','.y.y.y..','...y....','........'],
 ui_leaf: ['.....oo.','...ooro.','..oorro.','.oorroo.','.orroo..','.oooo...','n.......','........'],
 ui_flake:['...l....','.l.l.l..','..lwl...','llwwwll.','..lwl...','.l.l.l..','...l....','........'],
 ui_sprout:['........','.ee..ee.','eeee.eee','.eeeeee.','...ee...','...ee...','..nnnn..','........'],
 ui_fog:  ['........','.WWWWWW.','........','WWWWWWWW','........','.WWWWW..','........','..WWWWWW'],
 part_frame:  ['........','.....kk.','kkkkkkyk','kyyyyyyk','kyYYYYk.','.kkkkk..','..k..k..','........'],
 part_engine: ['..kkkk..','.kGGGGk.','kGgkkgGk','kGkyykGk','kGkyykGk','kGgkkgGk','.kGGGGk.','..kkkk..'],
 part_ctrl:   ['.kkkkkk.','kwwwwwwk','kwwkwwwk','kwwkrwwk','kwwwrwwk','kwwwwwwk','.kkkkkk.','........'],
 part_hull:   ['........','k......k','kk....kk','kwwwwwwk','kwwwwwwk','.krrrrk.','..kkkk..','........'],
 part_house:  ['..kkkkk.','..kwwwk.','..kbbbk.','..kwwwk.','kkkwwwkk','kwwwwwwk','kkkkkkkk','........'],
 ui_wrench:   ['.....kk.','....kgk.','.k..kgkk','kgkkggk.','kgggggk.','.kgggk..','..kkk...','........'],
 coin:    ['..YYYY..','.YyyyyY.','YyywyyyY','YyyyYyyY','YyyyYyyY','YyyyyyyY','.YyyyyY.','..YYYY..']
};
/* ---------- little map things ---------- */
const MISC_ART = {
 light:  ['.y.','.r.','.w.','.w.','.w.','www'],
 lightS: ['.y.','.r.','.w.','.r.','.w.','rwr'],
 buoy:   ['.k.','.r.','rwr','.r.'],
 whale:  ['....l...','...l.l..','........','.GGGGG.G','GGGGGGGG'],
 gull:   ['w...w','.w.w.','..w..'],
 anchor: ['.k.','kkk','.k.','k.k','.k.'],
 lock:   ['.kk.','k..k','kkkk','kyyk','kkkk']
};
const SPR = {}, ICON = {}, ICON_URL = {};
function buildArt() {
  Object.keys(CRAFT_ART).forEach(k => { const c = gridCanvas(CRAFT_ART[k]); SPR[k] = { r: c, l: flipCanvas(c), sh: tintCanvas(c, '#0c1420'), selR: outlineCanvas(c, '#ffffff'), selL: flipCanvas(outlineCanvas(c, '#ffffff')), w: c.width, h: c.height, url: c.toDataURL() }; });
  Object.keys(CARGO_ART).forEach(k => { const c = gridCanvas(CARGO_ART[k]); ICON[k] = c; ICON_URL[k] = c.toDataURL(); });
  Object.keys(MISC_ART).forEach(k => { SPR[k] = gridCanvas(MISC_ART[k]); });
}

// a craft's sprite in its own paint: the accent colors of the factory sprite are swapped for the livery's pair
const SPRL = {};
function sprOf(c) { const T = CRAFT_BY[c.type], liv = c.liv || 0, base = SPR[T.spr]; if (!liv || !LIVERIES[liv]) return base; const k = T.spr + ':' + liv;
  if (!SPRL[k]) { const L = LIVERIES[liv], pal = {}; 'yrbeo'.split('').forEach(ch => { pal[ch] = INK[L[1]]; }); 'YRBE'.split('').forEach(ch => { pal[ch] = INK[L[2]]; });
    const cv = gridCanvas(CRAFT_ART[T.spr], pal); SPRL[k] = { r: cv, l: flipCanvas(cv), sh: base.sh, selR: outlineCanvas(cv, '#ffffff'), selL: flipCanvas(outlineCanvas(cv, '#ffffff')), w: cv.width, h: cv.height, url: cv.toDataURL() }; }
  return SPRL[k]; }

/* ---------- people: procedurally generated 8x8 portraits ("looks" set the outfit) ---------- */
const SKINS = ['#f3d2b0', '#e8b890', '#c98e62', '#8d5a3a', '#f6dcc4', '#d9a577'];
const HAIRS = ['#2a1e16', '#5a3a1e', '#8a5a2a', '#c9a04a', '#b0b0b0', '#e8e8e8', '#7a2a1a', '#161616'];
const SHIRTS = ['#3f7fc8', '#c8402f', '#3f8f3a', '#e08a2c', '#6a3f9a', '#2f6b6b', '#d87aa8', '#8a8f98', '#1f3f78', '#b08a5a'];
const portraitCache = new Map();
function portraitCanvas(seed, look) {
  const R = mulberry32(seed * 7919 + 13), c = mkCanvas(8, 8), x = c.getContext('2d');
  const skin = SKINS[(R() * SKINS.length) | 0]; let hair = HAIRS[(R() * HAIRS.length) | 0], shirt = SHIRTS[(R() * SHIRTS.length) | 0], shirt2 = null, hat = null, hatBrim = null, eyes = '#1b1b24', band = null;
  let beard = R() < 0.22, longHair = R() < 0.4, bald = R() < 0.1, glasses = R() < 0.15, pom = false, cross = false, tie = false;
  switch (look) {
    case 'hunter': hat = '#f07a18'; hatBrim = '#f07a18'; shirt = '#c8402f'; shirt2 = '#1b1b24'; beard = R() < 0.6; break;
    case 'skier': hat = SHIRTS[(R() * 7) | 0]; pom = true; band = '#8fd8ee'; shirt = SHIRTS[(R() * 7) | 0]; break;
    case 'tourist': if (R() < 0.6) { hat = '#f1e3c4'; hatBrim = '#f1e3c4'; } band = '#1b1b24'; shirt = pick(['#e86aa0', '#3fc8c0', '#f2c230', '#ff8a5a']); shirt2 = '#ffffff'; break;
    case 'fisher': hat = R() < 0.5 ? '#f2c230' : '#2a5f30'; hatBrim = hat; shirt = R() < 0.6 ? '#f2c230' : '#e08a2c'; beard = R() < 0.7; break;
    case 'kid': hat = R() < 0.5 ? pick(['#c8402f', '#3f7fc8']) : null; hatBrim = hat; beard = false; bald = false; hair = HAIRS[(R() * 4) | 0]; break;
    case 'suit': shirt = pick(['#3a3f4a', '#1f3f78', '#5a5048']); tie = true; bald = R() < 0.25; break;
    case 'nurse': hat = '#ffffff'; cross = true; shirt = '#bfe0f0'; beard = false; longHair = true; break;
    case 'guide': hat = '#5a6a3a'; hatBrim = '#5a6a3a'; shirt = '#2a5f30'; shirt2 = '#1b1b24'; beard = R() < 0.5; break;
    case 'sled': hat = pick(['#1b1b24', '#c8402f', '#3f7fc8']); band = '#8a8f98'; shirt = pick(['#1b1b24', '#c8402f', '#f2c230']); break;
    case 'elder': hair = pick(['#b0b0b0', '#e8e8e8']); glasses = R() < 0.6; shirt = pick(['#8a8f98', '#6a3f9a', '#2f6b6b', '#b08a5a']); break;
    case 'cap': hat = pick(['#1f3f78', '#2a5f30', '#c8402f', '#5a5048']); hatBrim = hat; break;
  }
  const P = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
  // head
  for (let j = 2; j <= 5; j++) for (let i = 2; i <= 5; i++) P(i, j, skin);
  P(1, 3, skin); P(6, 3, skin);
  // hair or hat
  if (hat) { for (let i = 2; i <= 5; i++) { P(i, 0, hat); P(i, 1, hat); } P(1, 1, hat); P(6, 1, hat); if (hatBrim) { P(1, 2, hatBrim); P(6, 2, hatBrim); P(0, 2, hatBrim); P(7, 2, hatBrim); for (let i = 2; i <= 5; i++) P(i, 2, hatBrim); } if (pom) { P(3, 0, '#ffffff'); P(4, 0, '#ffffff'); }
    if (cross) { P(3, 1, '#d8402f'); P(4, 1, '#d8402f'); } if (longHair && !hatBrim) { P(1, 2, hair); P(6, 2, hair); P(1, 4, hair); P(6, 4, hair); } }
  else if (!bald) { for (let i = 2; i <= 5; i++) P(i, 1, hair); P(1, 2, hair); P(6, 2, hair); P(2, 2, hair); P(5, 2, hair); if (R() < 0.5) { P(3, 2, hair); } if (longHair) { P(1, 3, hair); P(6, 3, hair); P(1, 4, hair); P(6, 4, hair); P(1, 5, hair); P(6, 5, hair); for (let i = 2; i <= 5; i++) P(i, 0, hair); } }
  else { P(1, 3, hair); P(6, 3, hair); }
  // face
  if (band) { for (let i = 2; i <= 5; i++) P(i, 3, band); P(1, 3, band); P(6, 3, band); if (band !== '#1b1b24') { P(2, 3, '#ffffff'); } }
  else { P(2, 3, eyes); P(5, 3, eyes); if (glasses) { P(3, 3, '#8a8f98'); P(4, 3, '#8a8f98'); P(1, 3, '#8a8f98'); P(6, 3, '#8a8f98'); } }
  if (beard) { for (let i = 2; i <= 5; i++) P(i, 5, hair); P(2, 4, hair); P(5, 4, hair); } else { P(3, 5, '#b8604a'); P(4, 5, '#b8604a'); }
  // shoulders
  for (let i = 1; i <= 6; i++) P(i, 6, shirt); for (let i = 0; i <= 7; i++) P(i, 7, shirt);
  if (shirt2) { P(1, 6, shirt2); P(3, 6, shirt2); P(5, 6, shirt2); P(0, 7, shirt2); P(2, 7, shirt2); P(4, 7, shirt2); P(6, 7, shirt2); }
  if (tie) { P(3, 6, '#ffffff'); P(4, 6, '#ffffff'); P(3, 7, '#c8402f'); P(4, 7, '#ffffff'); }
  return c;
}
function portraitURL(seed, look) { const k = seed + ':' + look; let u = portraitCache.get(k); if (!u) { if (portraitCache.size > 900) portraitCache.clear(); u = portraitCanvas(seed, look || 'any').toDataURL(); portraitCache.set(k, u); } return u; }
function jobIconURL(j) { return j.kind === 'p' ? portraitURL(j.id, j.ic) : (ICON_URL[j.ic] || ICON_URL.crate); }
// full-body walker for the port scene: 4x8, two walk frames
function drawWalker(x, px, py, seed, frame, look) {
  const R = mulberry32(seed * 331 + 7), skin = SKINS[(R() * SKINS.length) | 0]; let hair = HAIRS[(R() * HAIRS.length) | 0], shirt = SHIRTS[(R() * SHIRTS.length) | 0]; const pants = pick2(R, ['#2a3550', '#4a4f58', '#5e3b22', '#1b1b24']);
  if (look === 'hunter') { hair = '#f07a18'; shirt = '#c8402f'; } else if (look === 'fisher') { hair = '#f2c230'; shirt = '#f2c230'; } else if (look === 'skier' || look === 'sled') hair = SHIRTS[(R() * 6) | 0]; else if (look === 'tourist') shirt = '#e86aa0';
  x.fillStyle = hair; x.fillRect(px + 1, py, 2, 1); x.fillStyle = skin; x.fillRect(px + 1, py + 1, 2, 2);
  x.fillStyle = shirt; x.fillRect(px, py + 3, 4, 3); x.fillStyle = skin; x.fillRect(px + (frame ? 0 : 3), py + 5, 1, 1);
  x.fillStyle = pants; if (frame) { x.fillRect(px, py + 6, 1, 2); x.fillRect(px + 3, py + 6, 1, 2); } else { x.fillRect(px + 1, py + 6, 1, 2); x.fillRect(px + 2, py + 6, 1, 2); }
}
function pick2(R, arr) { return arr[(R() * arr.length) | 0]; }

/* ---------- 3x5 pixel font for the map ---------- */
const FONT = (function () {
  const g = { A:'010101111101101', B:'110101110101110', C:'011100100100011', D:'110101101101110', E:'111100110100111', F:'111100110100100', G:'011100101101011', H:'101101111101101', I:'111010010010111',
    J:'001001001101010', K:'101101110101101', L:'100100100100111', M:'101111111101101', N:'110101101101101', O:'010101101101010', P:'110101110100100', Q:'010101101111011', R:'110101110101101',
    S:'011100010001110', T:'111010010010010', U:'101101101101111', V:'101101101101010', W:'101101111111101', X:'101101010101101', Y:'101101010010010', Z:'111001010100111',
    '0':'111101101101111', '1':'010110010010111', '2':'110001010100111', '3':'110001010001110', '4':'101101111001001', '5':'111100110001110', '6':'011100111101111', '7':'111001010010010', '8':'111101111101111', '9':'111101111001110',
    '.':'000000000000010', ',':'000000000010100', '-':'000000111000000', "'":'010010000000000', '$':'011110010011110', '!':'010010010000010', '?':'110001010000010', ':':'000010000010000', '/':'001001010100100', '+':'000010111010000', '&':'010101010101011', '%':'101001010100101', '>':'100010001010100', '(':'010100100100010', ')':'010001001001010', '#':'101111101111101' };
  return g;
})();
function textWidth(s) { return s.length * 4 - 1; }
function drawText(x, s, px, py, color, shadow) {
  s = s.toUpperCase();
  if (shadow) { x.fillStyle = shadow; for (let n = 0; n < s.length; n++) { const g = FONT[s[n]]; if (!g) continue; for (let i = 0; i < 15; i++) if (g[i] === '1') { const gx = px + n * 4 + i % 3, gy = py + ((i / 3) | 0); x.fillRect(gx + 1, gy, 1, 1); x.fillRect(gx - 1, gy, 1, 1); x.fillRect(gx, gy + 1, 1, 1); x.fillRect(gx, gy - 1, 1, 1); x.fillRect(gx + 1, gy + 1, 1, 1); } } }
  x.fillStyle = color; for (let n = 0; n < s.length; n++) { const g = FONT[s[n]]; if (!g) continue; for (let i = 0; i < 15; i++) if (g[i] === '1') x.fillRect(px + n * 4 + i % 3, py + ((i / 3) | 0), 1, 1); }
}
