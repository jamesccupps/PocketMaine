/* =====================================================================
   Section 2: MAP  — vector geography -> pixel raster, and sea navigation
   DOM-free: produces typed arrays; the renderer turns them into canvases.
   ===================================================================== */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; }
function fbm(x, y) { return vnoise(x, y) * 0.6 + vnoise(x * 2.1 + 17, y * 2.1 + 5) * 0.28 + vnoise(x * 4.3 + 3, y * 4.3 + 31) * 0.12; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function proj(lat, lon) { return [(lon - GEO.lonMin) * KM_LON, (GEO.latMax - lat) * KM_LAT]; }
function latOf(y) { return GEO.latMax - y / KM_LAT; }
function pairs(arr, from) { const out = []; for (let i = from || 0; i < arr.length; i += 2) out.push(proj(arr[i], arr[i + 1])); return out; }

// midpoint displacement: turns straight hand-drawn segments into craggy coast
function roughen(pts, seed, rough, minLen, closed) {
  const rnd = mulberry32(seed), out = [pts[0]];
  function sub(a, b, depth) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (len < minLen || depth > 6) { out.push(b); return; }
    const off = (rnd() - 0.5) * 2 * rough * len;
    const m = [(a[0] + b[0]) / 2 - dy / len * off, (a[1] + b[1]) / 2 + dx / len * off];
    sub(a, m, depth + 1); sub(m, b, depth + 1);
  }
  for (let i = 1; i < pts.length; i++) sub(pts[i - 1], pts[i], 0);
  if (closed) { sub(pts[pts.length - 1], pts[0], 0); out.pop(); }
  return out;
}
function blob(cx, cy, a, b, rotDeg, seed, n) {
  const rnd = mulberry32(seed), out = [], rot = rotDeg * Math.PI / 180, cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, r = 0.72 + rnd() * 0.5; const ex = Math.cos(t) * a * r, ey = Math.sin(t) * b * r; out.push([cx + ex * cr + ey * sr, cy - ex * sr + ey * cr]); }
  return out;
}

const GEOM = (function () {
  const coast = roughen(pairs(COAST_ME), 11, 0.17, 1.2, false);
  const nb = roughen(pairs(COAST_NB), 12, 0.15, 1.5, false);
  const nh = roughen(pairs(COAST_NH), 13, 0.10, 1.5, false);
  // Maine's own border runs from the St. Croix round to Kittery. Where it meets New Hampshire and Quebec the outline of New England carries on:
  // the Quebec line, Lake Champlain, the New York line, down to Long Island Sound. The last stretch of Maine's border is now just a state line.
  let cut = BORDER_ME.length; for (let i = 0; i < BORDER_ME.length; i += 2) if (BORDER_ME[i] === 45.31 && BORDER_ME[i + 1] === -71.08) cut = i + 2;
  const border = pairs(BORDER_ME.slice(0, cut).concat(BORDER_NE));
  const lines = [border, pairs(BORDER_ME.slice(cut - 2))].concat(STATE_LINES.map(l => pairs(l)));
  const sea = [[nh[0][0], WORLD_H + 9]].concat(nh, coast, nb, [[WORLD_W + 9, nb[nb.length - 1][1]], [WORLD_W + 9, WORLD_H + 9]]);
  const maine = nh.concat(coast, border);
  const islands = ISLANDS.map((a, i) => ({ me: a[0], pts: roughen(pairs(a, 1), 100 + i, 0.17, 1.1, true) }));
  for (let i = 0; i < ISLETS.length; i += 3) { const p = proj(ISLETS[i], ISLETS[i + 1]), r = ISLETS[i + 2]; islands.push({ me: 1, pts: blob(p[0], p[1], r, r * 0.8, i * 37, 300 + i, 7) }); }
  const lakes = [roughen(pairs(MOOSEHEAD), 50, 0.14, 1.2, true), roughen(pairs(CHAMPLAIN), 51, 0.10, 1.5, true), roughen(pairs(ST_LAWRENCE), 52, 0.07, 2, true)];
  for (let i = 0; i < LAKES.length; i += 5) { const p = proj(LAKES[i], LAKES[i + 1]); lakes.push(roughen(blob(p[0], p[1], LAKES[i + 2], LAKES[i + 3], LAKES[i + 4], 500 + i, 9), 600 + i, 0.2, 1.2, true)); }
  const rivers = RIVERS.map((r, i) => roughen(pairs(r), 700 + i, 0.12, 2.5, false));
  const mts = []; for (let i = 0; i < MOUNTAINS.length; i += 3) { const p = proj(MOUNTAINS[i], MOUNTAINS[i + 1]); mts.push([p[0], p[1], MOUNTAINS[i + 2]]); }
  const lights = []; for (let i = 0; i < LIGHTS.length; i += 3) { const p = proj(LIGHTS[i], LIGHTS[i + 1]); lights.push([p[0], p[1], LIGHTS[i + 2]]); }
  return { coast, border, lines, sea, maine, islands, lakes, rivers, mts, lights };
})();

// low-resolution terrain fields (2 km cells): mountains, farmland, blueberry barrens
const FIELD = (function () {
  const cs = 2, w = Math.ceil(WORLD_W / cs) + 1, h = Math.ceil(WORLD_H / cs) + 1;
  const mt = new Float32Array(w * h), farm = new Float32Array(w * h), barren = new Float32Array(w * h);
  function gauss(arr, lat, lon, sig, amp) { const p = proj(lat, lon), r = Math.ceil(sig * 3 / cs), cx = Math.round(p[0] / cs), cy = Math.round(p[1] / cs);
    for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) { const d2 = ((x - cx) * (x - cx) + (y - cy) * (y - cy)) * cs * cs; arr[y * w + x] += amp * Math.exp(-d2 / (2 * sig * sig)); } }
  for (let i = 0; i < MOUNTAINS.length; i += 3) gauss(mt, MOUNTAINS[i], MOUNTAINS[i + 1], 5 + MOUNTAINS[i + 2] * 3, 0.5 + MOUNTAINS[i + 2] * 0.25);
  [[46.69, -68.0, 16, 1], [46.87, -67.98, 14, 1], [46.15, -67.85, 13, .9], [47.2, -68.3, 12, .8], [46.45, -67.9, 14, 1], [47.1, -67.95, 9, .8], [44.6, -69.6, 14, .5], [44.2, -70.1, 14, .45], [44.85, -69.2, 14, .45], [43.75, -70.5, 12, .4], [45.0, -68.9, 10, .35]]
    .forEach(g => gauss(farm, g[0], g[1], g[2], g[3]));
  [[44.72, -67.9, 9, 1], [44.8, -67.6, 8, .8], [44.65, -68.05, 6, .7]].forEach(g => gauss(barren, g[0], g[1], g[2], g[3]));
  function at(arr, x, y) { const cx = clamp(Math.round(x / cs), 0, w - 1), cy = clamp(Math.round(y / cs), 0, h - 1); return arr[cy * w + cx]; }
  return { mt: (x, y) => at(mt, x, y), farm: (x, y) => at(farm, x, y), barren: (x, y) => at(barren, x, y) };
})();

/* ---------- rasterizer ---------- */
const C_SEA = 0, C_LAND = 2, C_FAR = 3, C_LAKE = 4, C_RIVER = 5, C_SHORE = 6, C_FARSHORE = 7;
function fillPoly(cls, w, h, k, pts, value, only) {
  const n = pts.length; let ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < n; i++) { const y = pts[i][1] * k; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  const y0 = Math.max(0, Math.ceil(ymin - 0.5)), y1 = Math.min(h - 1, Math.floor(ymax - 0.5)), xs = [];
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0, j = n - 1; i < n; j = i++) { const ay = pts[i][1] * k, by = pts[j][1] * k; if ((ay > yc) !== (by > yc)) { const ax = pts[i][0] * k, bx = pts[j][0] * k; xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); } }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) { const xa = Math.max(0, Math.ceil(xs[i] - 0.5)), xb = Math.min(w - 1, Math.floor(xs[i + 1] - 0.5)); const row = y * w;
      if (only === undefined) for (let x = xa; x <= xb; x++) cls[row + x] = value; else for (let x = xa; x <= xb; x++) if (cls[row + x] === only) cls[row + x] = value; }
  }
}
function strokeLine(cls, w, h, k, pts, value, only, rad) {
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]) * k, steps = Math.max(1, Math.ceil(len * 2));
    for (let s = 0; s <= steps; s++) { const x = (a[0] + (b[0] - a[0]) * s / steps) * k, y = (a[1] + (b[1] - a[1]) * s / steps) * k;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const px = Math.floor(x) + dx, py = Math.floor(y) + dy; if (px < 0 || py < 0 || px >= w || py >= h) continue; if (cls[py * w + px] === only) cls[py * w + px] = value; } } }
}
// class raster at k pixels per km, plus distance-from-land for sea shading
function rasterize(k) {
  const w = Math.ceil(WORLD_W * k), h = Math.ceil(WORLD_H * k), cls = new Uint8Array(w * h).fill(C_FAR);
  fillPoly(cls, w, h, k, GEOM.sea, C_SEA);
  fillPoly(cls, w, h, k, GEOM.maine, C_LAND);
  GEOM.islands.forEach(isl => fillPoly(cls, w, h, k, isl.pts, isl.me ? C_LAND : C_FAR));
  GEOM.lakes.forEach(l => { fillPoly(cls, w, h, k, l, C_LAKE, C_LAND); fillPoly(cls, w, h, k, l, C_LAKE, C_FAR); });
  const rr = k >= 2.5 ? 1 : 0;
  GEOM.rivers.forEach(r => strokeLine(cls, w, h, k, r, C_RIVER, C_LAND, rr));
  // distance from land into the sea (BFS), capped
  const maxD = Math.round(7 * k) + 2, dist = new Uint8Array(w * h).fill(255);
  let q = new Int32Array(w * h), qh = 0, qt = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (cls[i] !== C_SEA) continue;
    if ((x > 0 && cls[i - 1] !== C_SEA) || (x < w - 1 && cls[i + 1] !== C_SEA) || (y > 0 && cls[i - w] !== C_SEA) || (y < h - 1 && cls[i + w] !== C_SEA)) { dist[i] = 1; q[qt++] = i; } }
  while (qh < qt) { const i = q[qh++], d = dist[i]; if (d >= maxD) continue; const x = i % w, y = (i - x) / w;
    if (x > 0 && cls[i - 1] === C_SEA && dist[i - 1] === 255) { dist[i - 1] = d + 1; q[qt++] = i - 1; }
    if (x < w - 1 && cls[i + 1] === C_SEA && dist[i + 1] === 255) { dist[i + 1] = d + 1; q[qt++] = i + 1; }
    if (y > 0 && cls[i - w] === C_SEA && dist[i - w] === 255) { dist[i - w] = d + 1; q[qt++] = i - w; }
    if (y < h - 1 && cls[i + w] === C_SEA && dist[i + w] === 255) { dist[i + w] = d + 1; q[qt++] = i + w; } }
  q = null;
  // shore pixels
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, c = cls[i]; if (c !== C_LAND && c !== C_FAR) continue;
    if ((x > 0 && cls[i - 1] === C_SEA) || (x < w - 1 && cls[i + 1] === C_SEA) || (y > 0 && cls[i - w] === C_SEA) || (y < h - 1 && cls[i + w] === C_SEA)) cls[i] = c === C_LAND ? C_SHORE : C_FARSHORE; }
  return { k, w, h, cls, dist, maxD };
}

/* ---------- painting ---------- */
function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
const PAL = (function () {
  const P = s => s.split(' ').map(rgb);
  return {
    //          deep     mid      near     shallow  surf
    sea: [P('#1c4468 #235480 #2c6792 #3a80a6 #62a9bf'), P('#1b4166 #22527f #2b6693 #3b83aa #6ab2c6'), P('#1b3f63 #214e79 #29608a #36789d #5c9fb6'), P('#1a3857 #20466b #28587e #34708f #5a93a8')],
    //          base     light    conifer  highland
    land: [P('#7f9a52 #93ae5e #44703e #56793f'), P('#559640 #68aa4a #2f6d37 #3c7a3a'), P('#74883e #8c9a44 #2f6435 #4a6e38'), P('#e9eff3 #f8fbfd #3d624c #c5d3de')],
    mud: rgb('#8b7b55'),
    fall: P('#c8792e #cf8a30 #b24c30 #d6a93a #a39a3c'),
    far: [P('#8c9a7c #86947a'), P('#7f9678 #789072'), P('#8f8f6e #88886a'), P('#d2d9dd #c8d0d5')],
    lake: [rgb('#4a93c4'), rgb('#3f8cc2'), rgb('#3c84b8'), rgb('#d3e8f1')], lakeEdge: rgb('#a9cfe2'),
    river: [rgb('#4f97c6'), rgb('#4a94c6'), rgb('#4488ba'), rgb('#bcdaea')],
    shoreRock: [rgb('#b5aa96'), rgb('#bdb19b'), rgb('#b3a78f'), rgb('#dad6ce')], shoreSand: [rgb('#dccf9e'), rgb('#e6d7a2'), rgb('#dccb98'), rgb('#e6e2d4')],
    farShore: [rgb('#a3a592'), rgb('#a3a592'), rgb('#a09a84'), rgb('#c9cdcc')],
    farmA: [rgb('#8a6c49'), rgb('#b4c866'), rgb('#c6a862'), rgb('#f6f9fb')], farmB: [rgb('#a18158'), rgb('#d2c871'), rgb('#9d7c4a'), rgb('#dde6ec')],
    barren: [rgb('#869552'), rgb('#6d9a4c'), rgb('#a63a3a'), rgb('#e4e9ee')], barrenB: [rgb('#93a05c'), rgb('#5f86a0'), rgb('#c44e42'), rgb('#f2f5f8')],
    rock: rgb('#8a8f98'), rockD: rgb('#646a74'), snow: rgb('#ffffff'), snowD: rgb('#cfdbe6'), town: [rgb('#c4bbb0'), rgb('#9a6f5c'), rgb('#e4dcd0')]
  };
})();
function paint(L, season) {
  const { w, h, cls, dist, k, maxD } = L, out = new Uint8ClampedArray(w * h * 4);
  const sea = PAL.sea[season], land = PAL.land[season], far = PAL.far[season];
  let c;
  for (let y = 0; y < h; y++) {
    const yk = (y + 0.5) / k, lat = latOf(yk);
    for (let x = 0; x < w; x++) {
      const i = y * w + x, xk = (x + 0.5) / k, cl = cls[i], n2 = hash2(x, y);
      if (cl === C_SEA) {
        const d = dist[i] === 255 ? 99 : dist[i] / k;        // km from land
        const n = fbm(xk / 9, yk / 9) * 2.4 + n2 * 0.9;
        const v = d + n;
        c = v < 1.6 ? sea[3] : v < 3.6 ? sea[2] : v < 7.2 ? sea[1] : sea[0];
        if (d * k <= 1.01 && n2 < 0.22) c = sea[4];
        else if (d > 8 && ((y + Math.floor(fbm(xk / 30, yk / 6) * 6)) % 7 === 0) && hash2(x >> 2, y) < 0.3) c = sea[1];
      } else if (cl === C_LAND) {
        const n1 = fbm(xk / 13, yk / 13), mt = FIELD.mt(xk, yk), farm = FIELD.farm(xk, yk), bar = FIELD.barren(xk, yk);
        const conif = clamp(0.2 + (lat - 43.4) * 0.15 + (n1 - 0.5) * 0.8 + mt * 0.25, 0.06, 0.92);
        if (farm * (0.55 + n1) > 0.62 && fbm(xk / 2.2 + 40, yk / 2.2) > 0.42) {
          const fx = Math.floor(xk / 1.6), fy = Math.floor(yk / 1.6), rows = hash2(fx, fy) < 0.5 ? x : y;
          c = (rows % 3 === 0) ? PAL.farmB[season] : PAL.farmA[season];
          if (hash2(fx + 9, fy) < 0.3) c = land[0];
        } else if (bar * (0.6 + n1) > 0.6 && fbm(xk / 3 + 9, yk / 3) > 0.4) { c = n2 < (season === SUMMER ? 0.07 : 0.3) ? PAL.barrenB[season] : PAL.barren[season]; if (n2 > 0.72) c = land[2]; }
        else if (n2 < conif * (season === WINTER ? 0.36 : 0.62)) c = (mt > 0.55 && season !== WINTER) ? land[3] : land[2];
        else if (season === FALL) { const decid = clamp(1.15 - conif, 0.2, 1); const r = hash2(x + 71, y + 13); c = r < decid * 0.58 ? PAL.fall[Math.min(4, (fbm(xk / 2.5 + 50, yk / 2.5 + 20) * 6.2 - 0.6 + hash2(x, y + 99) * 1.2) | 0)] : land[n1 > 0.55 ? 1 : 0]; }
        else if (season === SPRING) c = n2 > 0.9 ? PAL.mud : land[n1 > 0.52 ? 1 : 0];
        else if (season === WINTER) c = (mt > 0.5 || n1 < 0.42) && n2 > 0.8 ? land[3] : land[n1 > 0.5 ? 1 : 0];
        else c = land[n1 > 0.55 ? 1 : 0];
      } else if (cl === C_FAR) c = far[n2 < 0.3 ? 1 : 0];
      else if (cl === C_LAKE) { c = PAL.lake[season]; if (season === WINTER && n2 < 0.12) c = PAL.lakeEdge; }
      else if (cl === C_RIVER) c = PAL.river[season];
      else if (cl === C_SHORE) c = (lat < 43.57 && xk < 175) ? PAL.shoreSand[season] : (n2 < 0.5 ? PAL.shoreRock[season] : PAL.rockD);
      else c = PAL.farShore[season];
      const o = i * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
  }
  const put = (x, y, col, onlyLand) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = y * w + x; if (onlyLand && cls[i] !== C_LAND && cls[i] !== C_SHORE) return; const o = i * 4; out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]; };
  // state line: dotted
  GEOM.lines.forEach(B => { let acc = 0;
  for (let j = 1; j < B.length; j++) { const a = B[j - 1], b = B[j], len = Math.hypot(b[0] - a[0], b[1] - a[1]) * k;
    for (let s = 0; s < len; s++, acc++) { if (acc % 4 > 1) continue; const x = Math.floor((a[0] + (b[0] - a[0]) * s / len) * k), y = Math.floor((a[1] + (b[1] - a[1]) * s / len) * k); if (x < 0 || y < 0 || x >= w || y >= h) continue; const o = (y * w + x) * 4; out[o] = out[o] * 0.55; out[o + 1] = out[o + 1] * 0.55; out[o + 2] = out[o + 2] * 0.55; } } });
  // mountains: little shaded peaks
  GEOM.mts.forEach(m => { const hh = Math.max(2, Math.round((1.6 + m[2] * 1.5) * Math.sqrt(k) * 1.5)), cx = Math.round(m[0] * k), top = Math.round(m[1] * k) - hh;
    const snowRows = season === WINTER ? hh : season === SUMMER ? (m[2] >= 3 ? 1 : 0) : Math.ceil(hh * (m[2] >= 2 ? 0.45 : 0.2));
    for (let r = 0; r < hh; r++) for (let dx = -r; dx <= r; dx++) { const lit = dx <= 0; let col = r < snowRows ? (lit ? PAL.snow : PAL.snowD) : (lit ? PAL.rock : PAL.rockD); if (r >= hh - 1 && season !== WINTER && (dx + cx) % 2) col = land[2]; put(cx + dx, top + r, col, true); } });
  // towns: a scatter of roofs
  PORTS.forEach((p, pi) => { const pp = proj(p.lat, p.lon), rnd = mulberry32(900 + pi), n = Math.round((p.size * p.size + 1) * k * 1.3), rad = (1 + p.size * 0.8);
    for (let j = 0; j < n; j++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * rad; put(Math.round((pp[0] + Math.cos(a) * r) * k), Math.round((pp[1] + Math.sin(a) * r * 0.8) * k), PAL.town[(rnd() * 3) | 0], true); } });
  return out;
}

/* ---------- sea navigation (1 px = 1 km grid) ---------- */
const NAV = { k: 1, w: 0, h: 0, water: null, clear: null, cache: {}, raster: null };
function buildNav() {
  const L = rasterize(1); NAV.raster = L; NAV.w = L.w; NAV.h = L.h;
  const w = L.w, h = L.h, n = w * h, water = new Uint8Array(n), clear = new Uint8Array(n);
  // flood from open Gulf so lakes / enclosed puddles never count as sea
  const seed = Math.floor(WORLD_H * 0.95) * w + Math.floor(WORLD_W * 0.6), stack = [seed]; water[seed] = 1;
  while (stack.length) { const i = stack.pop(), x = i % w, y = (i - x) / w;
    if (x > 0 && !water[i - 1] && L.cls[i - 1] === C_SEA) { water[i - 1] = 1; stack.push(i - 1); }
    if (x < w - 1 && !water[i + 1] && L.cls[i + 1] === C_SEA) { water[i + 1] = 1; stack.push(i + 1); }
    if (y > 0 && !water[i - w] && L.cls[i - w] === C_SEA) { water[i - w] = 1; stack.push(i - w); }
    if (y < h - 1 && !water[i + w] && L.cls[i + w] === C_SEA) { water[i + w] = 1; stack.push(i + w); } }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!water[i]) continue; let ok = 1;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!water[i + dy * w + dx]) { ok = 0; break; } clear[i] = ok; }
  NAV.water = water; NAV.clear = clear;
}
function isSea(x, y) { const cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < NAV.w && cy < NAV.h && NAV.water[cy * NAV.w + cx] === 1; }
function landClassAt(x, y) { const cx = clamp(Math.floor(x), 0, NAV.w - 1), cy = clamp(Math.floor(y), 0, NAV.h - 1); return NAV.raster.cls[cy * NAV.w + cx]; }
// nearest navigable sea cell centre to a point
function snapSea(x, y, preferClear) {
  const cx = Math.floor(x), cy = Math.floor(y); let best = null, bd = 1e9;
  for (let r = 0; r <= 14 && !best; r++) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const px = cx + dx, py = cy + dy; if (px < 1 || py < 1 || px >= NAV.w - 1 || py >= NAV.h - 1) continue; const i = py * NAV.w + px;
      if (!NAV.water[i] || (preferClear && !NAV.clear[i])) continue; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = [px + 0.5, py + 0.5]; } } }
  return best || (preferClear ? snapSea(x, y, false) : [x, y]);
}
function navLOS(ax, ay, bx, by, sx, sy, ex, ey) {
  const d = Math.hypot(bx - ax, by - ay), steps = Math.ceil(d * 2.5) + 1, w = NAV.w;
  for (let s = 0; s <= steps; s++) { const x = ax + (bx - ax) * s / steps, y = ay + (by - ay) * s / steps, i = Math.floor(y) * w + Math.floor(x);
    if (!NAV.water[i]) return false;
    if (!NAV.clear[i] && Math.hypot(x - sx, y - sy) > 3.2 && Math.hypot(x - ex, y - ey) > 3.2) return false; }
  return true;
}
// A* over the sea grid; returns { pts:[[xkm,ykm]...], len } or null
function seaRoute(a, b) {
  const key = a[0].toFixed(1) + ',' + a[1].toFixed(1) + '>' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
  if (NAV.cache[key] !== undefined) return NAV.cache[key];
  const w = NAV.w, h = NAV.h, n = w * h, si = Math.floor(a[1]) * w + Math.floor(a[0]), gi = Math.floor(b[1]) * w + Math.floor(b[0]);
  let res = null;
  if (NAV.water[si] && NAV.water[gi]) {
    const g = new Float32Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const heap = [], hf = []; const gx = gi % w, gy = (gi - gx) / w;
    const push = (i, f) => { let p = heap.length; heap.push(i); hf.push(f); while (p > 0) { const q = (p - 1) >> 1; if (hf[q] <= f) break; heap[p] = heap[q]; hf[p] = hf[q]; p = q; } heap[p] = i; hf[p] = f; };
    const pop = () => { const top = heap[0], li = heap.pop(), lf = hf.pop(); const m = heap.length; if (m) { let p = 0; for (;;) { let c = p * 2 + 1; if (c >= m) break; if (c + 1 < m && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; heap[p] = heap[c]; hf[p] = hf[c]; p = c; } heap[p] = li; hf[p] = lf; } return top; };
    g[si] = 0; push(si, 0); let found = false;
    while (heap.length) { const i = pop(); if (done[i]) continue; done[i] = 1; if (i === gi) { found = true; break; } const x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (!NAV.water[j] || done[j]) continue;
        if (dx && dy && (!NAV.water[i + dx] || !NAV.water[i + dy * w])) continue;
        const ng = g[i] + (dx && dy ? 1.4142 : 1) * (NAV.clear[j] ? 1 : 2.6); if (ng < g[j]) { g[j] = ng; came[j] = i; push(j, ng + Math.hypot(nx - gx, ny - gy)); } } }
    if (found) {
      const cells = []; for (let i = gi; i !== -1; i = came[i]) cells.push([i % w + 0.5, Math.floor(i / w) + 0.5]); cells.reverse();
      cells[0] = [a[0], a[1]]; cells[cells.length - 1] = [b[0], b[1]];
      const pts = [cells[0]]; let i = 0; const last = cells.length - 1;
      while (i < last) { let j = i + 1; while (j < last && navLOS(cells[i][0], cells[i][1], cells[j + 1][0], cells[j + 1][1], a[0], a[1], b[0], b[1])) j++; pts.push(cells[j]); i = j; }
      let len = 0; for (let q = 1; q < pts.length; q++) len += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]);
      res = { pts, len };
    }
  }
  NAV.cache[key] = res;
  if (res) NAV.cache[b[0].toFixed(1) + ',' + b[1].toFixed(1) + '>' + a[0].toFixed(1) + ',' + a[1].toFixed(1)] = { pts: res.pts.slice().reverse(), len: res.len };
  return res;
}
