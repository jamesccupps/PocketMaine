/* =====================================================================
   Section 5: RENDER  — the map canvas and the little port "diorama".
   Everything is drawn into a low-resolution buffer and scaled up by CSS
   (image-rendering: pixelated), so one buffer pixel = S screen pixels.
   ===================================================================== */
const ZOOMS = [0.75, 1, 1.5, 2, 3, 4, 6]; // km to buffer pixels. 4 and 6 are the 2 and 3 maps drawn double size.
const VIEW = {
  S: 2,
  bw: 320,
  bh: 200,
  zi: 3,
  cx: 340,
  cy: 400,
  canvas: null,
  x: null,
  follow: null,
  popups: [],
  season: -1
};
const levelCache = {};
function levelCanvas(k, s) {
  let L = levelCache[k];
  if (!L) L = levelCache[k] = { raster: k === 1 ? NAV.raster : rasterize(k), s: -1, canvas: null };
  if (L.s !== s) {
    const R = L.raster,
      c = L.canvas || mkCanvas(R.w, R.h);
    c.getContext('2d').putImageData(new ImageData(paint(R, s), R.w, R.h), 0, 0);
    L.canvas = c;
    L.s = s;
  }
  return L.canvas;
}
const KZ = () => ZOOMS[VIEW.zi];
const wx2s = x => Math.round((x - VIEW.cx) * KZ() + VIEW.bw / 2);
const wy2s = y => Math.round((y - VIEW.cy) * KZ() + VIEW.bh / 2);
const s2wx = sx => (sx - VIEW.bw / 2) / KZ() + VIEW.cx;
const s2wy = sy => (sy - VIEW.bh / 2) / KZ() + VIEW.cy;
function clampView() {
  const hw = VIEW.bw / 2 / KZ(),
    hh = VIEW.bh / 2 / KZ();
  VIEW.cx = WORLD_W > hw * 2 ? clamp(VIEW.cx, hw, WORLD_W - hw) : WORLD_W / 2;
  VIEW.cy = WORLD_H > hh * 2 ? clamp(VIEW.cy, hh, WORLD_H - hh) : WORLD_H / 2;
}
function resizeView(cssW, cssH) {
  // big chunky pixels: the map text is drawn in buffer pixels, so this is what makes it readable
  VIEW.S = cssW >= 1900 ? 4 : 3;
  VIEW.bw = Math.max(120, Math.ceil(cssW / VIEW.S));
  VIEW.bh = Math.max(100, Math.ceil(cssH / VIEW.S));
  const c = VIEW.canvas;
  c.width = VIEW.bw;
  c.height = VIEW.bh;
  c.style.width = VIEW.bw * VIEW.S + 'px';
  c.style.height = VIEW.bh * VIEW.S + 'px';
  VIEW.x = c.getContext('2d');
  VIEW.x.imageSmoothingEnabled = false;
  clampView();
}
function zoomBy(d, sx, sy) {
  const zi = clamp(VIEW.zi + d, 0, ZOOMS.length - 1);
  if (zi === VIEW.zi) return;
  if (sx === undefined) {
    sx = VIEW.bw / 2;
    sy = VIEW.bh / 2;
  }
  const wx = s2wx(sx),
    wy = s2wy(sy);
  VIEW.zi = zi;
  VIEW.cx = wx - (sx - VIEW.bw / 2) / KZ();
  VIEW.cy = wy - (sy - VIEW.bh / 2) / KZ();
  clampView();
}
function centerOn(x, y) {
  VIEW.cx = x;
  VIEW.cy = y;
  clampView();
}
function popup(x, y, text, color) {
  VIEW.popups.push({ x, y, text, color: color || '#ffe36a', t: 0 });
}

/* ---------- weather puffs ---------- */
const puffCache = {};
function puff(type, k, v) {
  const key = type + k + v;
  if (puffCache[key]) return puffCache[key];
  const w = Math.round((26 + v * 6) * k),
    h = Math.round((9 + v * 2) * k),
    c = mkCanvas(w, h),
    x = c.getContext('2d'),
    R = mulberry32(v * 77 + 5);
  const cols =
    type === 'fog' ? ['#eef3f6', '#dfe7ec'] : type === 'snow' ? ['#cfd6de', '#b4bdc8'] : ['#566070', '#3b4352'];
  const lumps = [];
  for (let i = 0; i < 5; i++)
    lumps.push([w * (0.18 + R() * 0.64), h * (0.4 + R() * 0.25), w * (0.14 + R() * 0.12), h * (0.28 + R() * 0.2)]);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let d = 9;
      lumps.forEach(l => {
        const dx = (i - l[0]) / l[2],
          dy = (j - l[1]) / l[3];
        d = Math.min(d, dx * dx + dy * dy);
      });
      if (d < 0.7 || (d < 1.15 && (i + j) & 1)) {
        x.fillStyle = j > h * 0.58 ? cols[1] : cols[0];
        x.fillRect(i, j, 1, 1);
      }
    }
  return (puffCache[key] = c);
}
function drawWeather(x, t) {
  const k = KZ();
  G.wx.forEach((c, ci) => {
    const age = G.t - c.t0,
      a = clamp(Math.min(age / 10, (c.life + 8 - age) / 8), 0, 1),
      sx = wx2s(c.x),
      sy = wy2s(c.y),
      rr = c.r * k;
    if (sx + rr < -40 || sy + rr < -40 || sx - rr > VIEW.bw + 40 || sy - rr > VIEW.bh + 40) return;
    const R = mulberry32(ci * 31 + Math.floor(c.t0)),
      n = Math.round((c.r * c.r) / (c.type === 'fog' ? 190 : 150));
    x.globalAlpha = (c.type === 'fog' ? 0.78 : 0.86) * a;
    for (let i = 0; i < n; i++) {
      const an = R() * 6.283,
        d = Math.sqrt(R()) * c.r * 0.95,
        v = (R() * 3) | 0,
        p = puff(c.type, k, v);
      const px = sx + Math.cos(an) * d * k + Math.sin(t * 0.25 + i) * 2 * k - p.width / 2,
        py = sy + Math.sin(an) * d * k * 0.8 - p.height / 2;
      x.drawImage(p, Math.round(px), Math.round(py));
    }
    x.globalAlpha = a;
    if (c.type === 'storm') {
      x.fillStyle = '#a8c8e8';
      for (let i = 0; i < n * 5; i++) {
        const an = hash2(i, ci) * 6.283,
          d = Math.sqrt(hash2(i + 9, ci)) * rr,
          ph = (t * 40 + hash2(i, 7) * 20) % 12;
        x.fillRect(Math.round(sx + Math.cos(an) * d - ph * 0.5), Math.round(sy + Math.sin(an) * d * 0.8 + ph), 1, 2);
      }
      if (hash2(Math.floor(t * 3), ci) < 0.06) {
        x.fillStyle = '#fff7b0';
        let lx = sx + (hash2(Math.floor(t * 3), 3) - 0.5) * rr,
          ly = sy - 4;
        for (let j = 0; j < 9; j++) {
          x.fillRect(Math.round(lx), Math.round(ly), 1, 2);
          ly += 2;
          lx += (hash2(j, Math.floor(t * 3)) - 0.5) * 4;
        }
      }
    } else if (c.type === 'snow') {
      x.fillStyle = '#ffffff';
      for (let i = 0; i < n * 6; i++) {
        const an = hash2(i, ci + 3) * 6.283,
          d = Math.sqrt(hash2(i + 5, ci)) * rr,
          ph = (t * 9 + hash2(i, 11) * 30) % 14;
        x.fillRect(
          Math.round(sx + Math.cos(an) * d + Math.sin(t + i) * 1.5),
          Math.round(sy + Math.sin(an) * d * 0.8 + ph),
          1,
          1
        );
      }
    }
    x.globalAlpha = 1;
  });
}

/* ---------- where docked craft sit around their port ---------- */
function layoutDocked() {
  const count = {};
  G.crafts.forEach(c => {
    if (c.at && (c.state === 'dock' || c.state === 'hold' || c.state === 'landed')) {
      const p = PORT_BY[c.at],
        T = CRAFT_BY[c.type],
        key = c.at + T.cls,
        i = (count[key] = (count[key] || 0) + 1),
        k = KZ();
      // parked craft keep clear of the port's name: boats sit on the side away from the label, planes above it (below when the name is on top)
      if (T.cls === 'boat' || (T.floats && !T.wheels && p.water === 'sea')) {
        c.dx = p.dock ? p.dock[0] : p.x;
        c.dy = p.dock ? p.dock[1] : p.y;
        const side = p.side || p.lab;
        if (side === 'r') {
          c.ox = -6 - (i - 1) * 3;
          c.oy = 7 + (i - 1) * 5;
        } else if (side === 'b') {
          c.ox = 11 + (i - 1) * 3;
          c.oy = -1 - (i - 1) * 5;
        } else {
          c.ox = 3 + (i - 1) * 3;
          c.oy = 4 + (i - 1) * 5;
        }
      } else {
        c.dx = p.x;
        c.dy = p.y;
        if ((p.side || p.lab) === 't') {
          c.ox = -13 - (i - 1) * 3;
          c.oy = 9 + (i - 1) * 6;
        } else {
          c.ox = -4 - (i - 1) * 3;
          c.oy = -7 - (i - 1) * 6;
        }
      }
      c.dx += 0;
      c.sx = wx2s(c.dx) + c.ox;
      c.sy = wy2s(c.dy) + c.oy;
    } else {
      c.sx = wx2s(c.x);
      c.sy = wy2s(c.y);
    }
  });
}
function nightAmount(h) {
  if (h < 4.5 || h > 21) return 1;
  if (h < 6.5) return (6.5 - h) / 2;
  if (h > 19) return (h - 19) / 2;
  return 0;
}

/* ---------- the map frame ---------- */
function drawMap(now, ui) {
  const x = VIEW.x,
    k = KZ(),
    bw = VIEW.bw,
    bh = VIEW.bh,
    t = now / 1000,
    s = season(),
    sel = ui.selCraft;
  if (VIEW.follow) {
    const c = G.crafts.find(q => q.id === VIEW.follow);
    if (c && c.state !== 'dock') centerOn(c.x, c.y);
    else VIEW.follow = null;
  }
  const kb = k > 3 ? k / 2 : k,
    zs = k / kb,
    base = levelCanvas(kb, s),
    img = { width: base.width * zs, height: base.height * zs },
    ox = Math.round(VIEW.cx * k - bw / 2),
    oy = Math.round(VIEW.cy * k - bh / 2);
  x.fillStyle = '#0e1c2e';
  x.fillRect(0, 0, bw, bh);
  if (img.width < bw || img.height < bh) {
    x.fillStyle = '#f6e9c8';
    x.fillRect(-ox - 3, -oy - 3, img.width + 6, img.height + 6);
    x.fillStyle = '#14273d';
    x.fillRect(-ox - 1, -oy - 1, img.width + 2, img.height + 2);
  }
  if (zs === 1) x.drawImage(base, -ox, -oy);
  else {
    const sx0 = Math.max(0, Math.floor(ox / zs)),
      sy0 = Math.max(0, Math.floor(oy / zs)),
      sw = Math.min(base.width - sx0, Math.ceil(bw / zs) + 2),
      sh = Math.min(base.height - sy0, Math.ceil(bh / zs) + 2);
    if (sw > 0 && sh > 0) x.drawImage(base, sx0, sy0, sw, sh, sx0 * zs - ox, sy0 * zs - oy, sw * zs, sh * zs);
  }
  // sparkle on the water
  x.fillStyle = PALHEX.spark[s];
  const tb = Math.floor(t * 1.5);
  for (let i = 0; i < 70; i++) {
    const px = (hash2(i, tb) * bw) | 0,
      py = (hash2(i + 400, tb) * bh) | 0;
    if (isSea(s2wx(px), s2wy(py)) && isSea(s2wx(px + 3), s2wy(py))) x.fillRect(px, py, 2 + (i % 2), 1);
  }
  // big faint map lettering
  if (bw >= 300)
    MAP_NAMES.forEach(m => {
      if ((m[3] === 'sea2' || m[3] === 'lake' || m[3] === 'mt') && k < 1.5) return;
      const p = proj(m[1], m[2]),
        sx = wx2s(p[0]) - textWidth(m[0]) / 2,
        sy = wy2s(p[1]);
      if (sx < -80 || sx > bw || sy < -8 || sy > bh) return;
      drawText(
        x,
        m[0],
        sx,
        sy,
        m[3][0] === 's'
          ? PALHEX.seaText[s]
          : m[3] === 'far'
            ? PALHEX.farText[s]
            : m[3] === 'lake'
              ? PALHEX.seaText[s]
              : PALHEX.landText[s]
      );
    });
  // lighthouses
  const night = nightAmount(hourOf(G.t));
  GEOM.lights.forEach(l => {
    const sp = l[2] ? SPR.lightS : SPR.light,
      sx = wx2s(l[0]) - 1,
      sy = wy2s(l[1]) - 5;
    if (sx < -5 || sx > bw || sy < -8 || sy > bh) return;
    x.drawImage(sp, sx, sy);
  });
  // night: darken the terrain only, then lights; everything interactive is drawn after, at full brightness
  if (night > 0) {
    x.globalAlpha = 0.36 * night;
    x.fillStyle = '#081430';
    x.fillRect(0, 0, bw, bh);
    x.globalAlpha = 1;
    PORTS.forEach(p => {
      const psx = wx2s(p.x),
        psy = wy2s(p.y);
      if (psx < 0 || psx > bw || psy < 0 || psy > bh) return;
      const n = G.ports[p.id].open ? p.size * 2 + 1 : 1;
      x.fillStyle = '#ffd86a';
      for (let i = 0; i < n; i++)
        x.fillRect(psx + ((hash2(i, p.x | 0) * 11) | 0) - 5, psy + ((hash2(i + 5, p.y | 0) * 9) | 0) - 4, 1, 1);
    });
    GEOM.lights.forEach((l, i) => {
      const sx = wx2s(l[0]),
        sy = wy2s(l[1]) - 5;
      if (sx < -30 || sx > bw + 30 || sy < -30 || sy > bh + 30) return;
      const a = t * 1.3 + i * 1.7,
        len = 6 + k * 3;
      x.fillStyle = '#fff3a8';
      for (let d = 2; d < len; d++) {
        x.globalAlpha = night * (1 - d / len);
        x.fillRect(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d * 0.7), 1, 1);
      }
      x.globalAlpha = night;
      x.fillRect(sx - 1, sy - 1, 3, 2);
      x.globalAlpha = 1;
    });
  }
  // fishing grounds
  const fishMode = ui.mode === 'fish';
  GROUNDS.forEach(g => {
    const sx = wx2s(g.x),
      sy = wy2s(g.y);
    if (sx < -40 || sx > bw + 40 || sy < -10 || sy > bh + 10) return;
    const bob = Math.sin(t * 2 + g.x) > 0 ? 0 : 1;
    x.drawImage(SPR.buoy, sx - 1, sy - 3 + bob);
    if (fishMode && ui.fishGrounds && ui.fishGrounds[g.id]) {
      ring(x, sx, sy, 6 + (((t * 4) % 3) | 0), '#ffe36a');
    }
    if (k >= 3 || fishMode || ui.hoverGround === g.id)
      drawText(
        x,
        g.name,
        sx - textWidth(g.name) / 2,
        sy + 4,
        fishMode ? '#ffe36a' : PALHEX.seaText[s],
        fishMode ? '#14273d' : null
      );
  });
  // routes for the selected craft
  if (sel) {
    if (sel.state === 'move' && sel.route) drawPath(x, [[sel.x, sel.y]].concat(remainingPts(sel)), '#ffffff', t, 0.9);
    if (sel.plan && sel.plan.stops && sel.state !== 'dock') {
      let from = sel.state === 'move' ? sel.plan.stops[sel.plan.i] : sel.at;
      for (let i = sel.plan.i + (sel.state === 'move' ? 1 : 0); i < sel.plan.stops.length; i++) {
        const li = legInfo(sel, from, sel.plan.stops[i]);
        if (li.ok) drawPath(x, li.pts, '#cfe6ff', t, 0.6);
        from = sel.plan.stops[i];
      }
    }
    if (sel.state === 'dock' && ui.stops.length) {
      let from = sel.at;
      ui.stops.forEach(sid => {
        const li = legInfo(sel, from, sid);
        if (li.ok) drawPath(x, li.pts, '#ffe36a', t, 1);
        from = sid;
      });
    }
    if (ui.hoverPort && sel.state === 'dock' && !fishMode) {
      const from = ui.stops.length ? ui.stops[ui.stops.length - 1] : sel.at;
      const li = legInfo(sel, from, ui.hoverPort);
      if (li.ok) drawPath(x, li.pts, '#ffffff', t, 0.5);
    }
  }
  layoutDocked();
  const relabel = []; // the names of your ports (and, while routing, the ones you are choosing between) are drawn again on top of the craft:
  // at a busy port the craft parked there used to sit on the name
  // ports
  PORTS.forEach(p => {
    const st = G.ports[p.id],
      sx = wx2s(p.x),
      sy = wy2s(p.y);
    p.sx = sx;
    p.sy = sy;
    p.labR = null;
    if (sx < -60 || sx > bw + 60 || sy < -20 || sy > bh + 20) return;
    const r = p.size >= 3 ? 3 : 2,
      isSel = ui.selPort === p.id,
      isHover = ui.hoverPort === p.id;
    let reach = null;
    if (ui.reach) reach = ui.reach[p.id];
    x.fillStyle = '#14273d';
    x.fillRect(sx - r - 1, sy - r, r * 2 + 3, r * 2 + 1);
    x.fillRect(sx - r, sy - r - 1, r * 2 + 1, r * 2 + 3);
    x.fillStyle = st.open ? (p.size >= 3 ? '#ffd23f' : '#fff3d6') : '#7d8794';
    x.fillRect(sx - r, sy - r, r * 2 + 1, r * 2 + 1);
    if (st.open) {
      x.fillStyle = '#c8402f';
      x.fillRect(sx - r + 1, sy - r + 1, r * 2 - 1, r * 2 - 1);
      x.fillStyle = '#fff3d6';
      x.fillRect(sx, sy, 1, 1);
    } else {
      x.fillStyle = '#4c5562';
      x.fillRect(sx - r + 1, sy - r + 1, r * 2 - 1, r * 2 - 1);
    }
    {
      const ev = evActive();
      if (ev && ev.port === p.id && st.open) {
        const yy = sy - r - 7 - (Math.floor(t * 3) % 2);
        x.fillStyle = '#14273d';
        x.fillRect(sx - 3, yy - 1, 7, 5);
        x.fillRect(sx - 1, yy - 3, 3, 9);
        x.fillStyle = '#ffd23f';
        x.fillRect(sx - 2, yy, 5, 3);
        x.fillRect(sx, yy - 2, 1, 7);
      }
    }
    {
      const ev = evActive();
      if (ev && ev.ship && ev.port === p.id && st.open) {
        const q = shipSpot(p),
          sp = SPR[ev.ship === 'cruise' ? 'cruise' : 'freighter'];
        if (q) x.drawImage(sp, wx2s(q[0]) - 12, wy2s(q[1]) - 5 + (Math.sin(t * 1.4) > 0 ? 0 : 1));
      }
    }
    {
      const hd = holidayNow();
      if (hd && st.open && k >= 1) drawHolidayPin(x, hd.deco, sx - r - 5, sy + r + 1, t);
    }
    if (st.open && vipAt(p.id)) {
      const xx = sx + r + 2,
        yy = sy - r - 8 + (Math.floor(t * 3) % 2);
      x.fillStyle = '#14273d';
      x.fillRect(xx - 1, yy - 1, 7, 6);
      x.fillStyle = '#ffd23f';
      x.fillRect(xx + 2, yy, 1, 1);
      x.fillRect(xx, yy + 1, 5, 1);
      x.fillRect(xx + 1, yy + 2, 3, 1);
      x.fillRect(xx + 1, yy + 3, 1, 1);
      x.fillRect(xx + 3, yy + 3, 1, 1);
    }
    if (p.yard) {
      x.fillStyle = '#ffd23f';
      x.fillRect(sx - r - 1, sy - r - 1, 2, 2);
      x.fillRect(sx + r, sy - r - 1, 2, 2);
      x.fillRect(sx - r - 1, sy + r, 2, 2);
      x.fillRect(sx + r, sy + r, 2, 2);
    }
    if (reach === true) ring(x, sx, sy, 6 + (((t * 3) | 0) % 2), '#7dff8a');
    else if (reach && ui.stops.indexOf(p.id) < 0 && st.open) {
      x.fillStyle = '#ff6a5a';
      x.fillRect(sx - 4, sy - r - 4, 1, 1);
      x.fillRect(sx - 3, sy - r - 3, 1, 1);
      x.fillRect(sx - 2, sy - r - 4, 1, 1);
      x.fillRect(sx - 4, sy - r - 2, 1, 1);
      x.fillRect(sx - 2, sy - r - 2, 1, 1);
    }
    const flash = ui.flash && ui.flash[p.id] && ui.stops.indexOf(p.id) < 0;
    if (flash && ((t * 3) | 0) % 2) {
      ring(x, sx, sy, 8, '#ffe36a');
      ring(x, sx, sy, 9, '#ffe36a');
    }
    if (isSel && ui.screen !== 'sheet') ring(x, sx, sy, 7, '#ffe36a');
    else if (isHover) ring(x, sx, sy, 6, '#ffffff');
    const stopN = ui.stops.indexOf(p.id);
    p.labR = null;
    // Names: your own ports always; the rest only once you zoom in or point at them. The small print (surfaces, yard, jobs, price) waits for a close zoom.
    const picked = isSel || isHover || stopN >= 0 || reach === true || flash,
      detail = k >= 3 || isSel || isHover;
    if (st.open || picked || k >= 2) {
      const name = p.mapName,
        tw = textWidth(name);
      let lx = sx - tw / 2,
        ly = sy + r + 3,
        side = p.lab;
      // a name that would run off the edge of the screen goes on the other side of its port
      if (side === 'l' && sx - tw - r - 3 < 1 && sx > -r) side = 'r';
      else if (side === 'r' && sx + r + 4 + tw > bw - 1 && sx < bw + r) side = 'l';
      p.side = side;
      if (side === 'l') {
        lx = sx - tw - r - 3;
        ly = sy - 2;
      } else if (side === 'r') {
        lx = sx + r + 4;
        ly = sy - 2;
      } else {
        if (side === 't') ly = sy - r - 8;
        if (sx > 0 && sx < bw) lx = clamp(lx, 1, bw - tw - 1);
      }
      drawText(x, name, Math.round(lx), ly, flash ? '#ffe36a' : st.open ? '#ffffff' : '#aeb9c6', '#14273d');
      p.labR = [Math.round(lx), ly, tw];
      if (st.open || (ui.screen === 'route' && (reach === true || stopN >= 0 || flash)))
        relabel.push([name, Math.round(lx), ly, flash ? '#ffe36a' : '#ffffff']);
      if (detail) {
        let px = Math.round(lx),
          py = ly + 7;
        const pip = col => {
          x.fillStyle = '#14273d';
          x.fillRect(px - 1, py - 1, 4, 4);
          x.fillStyle = col;
          x.fillRect(px, py, 2, 2);
          px += 4;
        };
        if (p.strip === 2) pip('#9aa3ad');
        if (p.strip === 1) pip(s === SPRING ? '#6b4a2a' : '#c89a5a');
        if (p.water === 'sea') pip('#4f9be0');
        if (p.water === 'lake') pip(s === WINTER ? '#ffffff' : '#8fe0f0');
        if (p.yard) {
          const yl = p.yard === 'hm' ? 'HB' : p.yard === 'h' ? 'H' : 'B',
            yw = textWidth(yl);
          x.fillStyle = '#14273d';
          x.fillRect(px - 1, py - 2, yw + 3, 7);
          drawText(x, yl, px + 1, py - 1, '#ffd23f');
          px += yw + 5;
        }
        if (!st.open) {
          const pc = portCost(p.id);
          drawText(x, '$' + (pc >= 1000 ? Math.round(pc / 100) / 10 + 'K' : pc), px + 1, py - 1, '#ffe36a', '#14273d');
        } else {
          const nj = st.jobs.length;
          if (nj) {
            drawText(x, String(nj), px + 1, py - 1, '#fff3d6', '#14273d');
            px += textWidth(String(nj)) + 3;
          }
          if (st.lay.length) drawText(x, st.lay.length + 'L', px + 1, py - 1, '#8fe0f0', '#14273d');
        }
      }
    }
    if (stopN >= 0) {
      x.fillStyle = '#14273d';
      x.fillRect(sx + r + 1, sy - r - 7, 7, 7);
      x.fillStyle = '#ffe36a';
      x.fillRect(sx + r + 2, sy - r - 6, 5, 5);
      drawText(x, String(stopN + 1), sx + r + 3, sy - r - 6, '#14273d');
    }
  });
  // craft
  const order = G.crafts.slice().sort((a, b) => a.sy - b.sy);
  order.forEach(c => {
    const T = CRAFT_BY[c.type],
      sp = sprOf(c),
      moving = c.state === 'move',
      face = (c.face || 1) > 0 ? 'r' : 'l',
      isSel = sel && sel.id === c.id;
    let sx = c.sx,
      sy = c.sy;
    if (sx < -40 || sx > bw + 40 || sy < -30 || sy > bh + 30) return;
    let alt = 0;
    if (T.cls === 'plane') {
      if (moving) {
        const r = c.route,
          edge = Math.min(r.pos, r.len - r.pos);
        alt = Math.round(clamp(edge / 12, 0, 1) * (5 + k * 2));
        x.globalAlpha = 0.3;
        x.drawImage(sp.sh, sx - (sp.w >> 1), sy - 2, sp.w, Math.max(2, sp.h >> 1));
        x.globalAlpha = 1;
      }
    } else if (moving || c.state === 'fish') {
      // wake
      if (moving) {
        x.fillStyle = '#d8ecf4';
        const dir = face === 'r' ? -1 : 1;
        for (let i = 1; i < 7; i++)
          if ((i + ((t * 6) | 0)) % 2) {
            x.fillRect(sx + dir * ((sp.w >> 1) + i * 2), sy + (i >> 1), 2, 1);
            x.fillRect(sx + dir * ((sp.w >> 1) + i * 2), sy - (i >> 1) - 1, 1, 1);
          }
      } else if (((t * 2) | 0) % 2) {
        x.fillStyle = '#d8ecf4';
        x.fillRect(sx - (sp.w >> 1) - 2, sy + 1, 2, 1);
        x.fillRect(sx + (sp.w >> 1), sy + 1, 2, 1);
      }
    }
    const bob = T.cls === 'boat' && Math.sin(t * 2.2 + c.id) > 0.3 ? 1 : 0,
      dx = sx - (sp.w >> 1),
      dy = sy - sp.h + 2 - alt + bob;
    if (isSel) {
      x.drawImage(face === 'r' ? sp.selR : sp.selL, dx - 1, dy - 1);
      selBrackets(x, dx - 3, dy - 3, sp.w + 5, sp.h + 5, t);
    } else x.drawImage(sp[face], dx, dy);
    c.hx = sx;
    c.hy = dy + (sp.h >> 1);
    if (c.state === 'fish') {
      drawText(x, 'FISHING', sx - 13, dy - 7, '#ffe36a', '#14273d');
      const f = clamp(c.fishT / c.fishDur, 0, 1);
      x.fillStyle = '#14273d';
      x.fillRect(sx - 9, dy - 1, 18, 3);
      x.fillStyle = '#7dff8a';
      x.fillRect(sx - 8, dy, Math.round(16 * f), 1);
    } else if (c.state === 'move' && c.route && c.route.cust > 0 && c.route.pos >= c.route.len) {
      drawText(x, 'CUSTOMS', sx - 13, dy - 7, '#ffe36a', '#14273d');
    } else if (c.state === 'hold' && c.holdWhy !== 'turnaround') {
      if (((t * 2) | 0) % 2) drawText(x, 'HOLD', sx - 7, dy - 7, '#ff9a6a', '#14273d');
    } else if (c.state === 'landed') {
      const by = dy - 11 - (((t * 4 + c.id) | 0) % 2);
      x.fillStyle = '#14273d';
      x.fillRect(sx - 5, by - 1, 10, 10);
      x.fillStyle = '#3f8f3a';
      x.fillRect(sx - 4, by, 8, 8);
      x.drawImage(ICON.coin, sx - 4, by);
    } else if (false) {
      const by = dy - 10 - (((t * 3 + c.id) | 0) % 2);
      x.fillStyle = '#14273d';
      x.fillRect(sx - 3, by - 1, 7, 9);
      x.fillRect(sx - 1, by + 8, 3, 1);
      x.fillStyle = '#ffd23f';
      x.fillRect(sx - 2, by, 5, 7);
      x.fillRect(sx, by + 7, 1, 1);
      x.fillStyle = '#14273d';
      x.fillRect(sx, by + 1, 1, 3);
      x.fillRect(sx, by + 5, 1, 1);
    }
    if (moving && k >= 1.5 && (c.jobs.length || c.fish)) {
      const n = c.fish ? c.fish.units : c.jobs.length;
      drawText(x, String(n), sx + (sp.w >> 1) + 1, dy, '#ffffff', '#14273d');
    }
  });
  if (night > 0.4)
    G.crafts.forEach(c => {
      if (c.state === 'move' && ((t * 2 + c.id) | 0) % 2) {
        x.fillStyle = CRAFT_BY[c.type].cls === 'plane' ? '#ff5a4a' : '#7dff8a';
        x.fillRect(c.hx, c.hy - 2, 1, 1);
      }
    });
  drawWeather(x, t);
  // names go on last, over the weather as well as the craft: a fog bank over Portland used to wash its name out
  relabel.forEach(l => drawText(x, l[0], l[1], l[2], l[3], '#14273d'));
  {
    const hd = holidayNow();
    if (hd) drawHolidayFx(x, bw, bh, t, hd.fx, night, 18);
  }
  // money popups
  for (let i = VIEW.popups.length - 1; i >= 0; i--) {
    const p = VIEW.popups[i];
    p.t += 1 / 60;
    if (p.t > 2.2) {
      VIEW.popups.splice(i, 1);
      continue;
    }
    const sx = wx2s(p.x) - textWidth(p.text) / 2,
      sy = wy2s(p.y) - 12 - p.t * 9;
    drawText(x, p.text, Math.round(sx), Math.round(sy), p.color, '#14273d');
  }
}
const PALHEX = {
  spark: ['#5fa6c4', '#6fb6d2', '#5b9cba', '#5c93ab'],
  seaText: ['#5b93b8', '#5f9cc4', '#5a8fb4', '#587f9c'],
  landText: ['#5d7a3c', '#3f7a34', '#5f6f30', '#aebccb'],
  farText: ['#6f7c62', '#657c60', '#73735a', '#a9b1b6']
};
function ring(x, cx, cy, r, col) {
  x.fillStyle = col;
  for (let i = -r + 2; i <= r - 2; i++) {
    x.fillRect(cx + i, cy - r, 1, 1);
    x.fillRect(cx + i, cy + r, 1, 1);
    x.fillRect(cx - r, cy + i, 1, 1);
    x.fillRect(cx + r, cy + i, 1, 1);
  }
  x.fillRect(cx - r + 1, cy - r + 1, 1, 1);
  x.fillRect(cx + r - 1, cy - r + 1, 1, 1);
  x.fillRect(cx - r + 1, cy + r - 1, 1, 1);
  x.fillRect(cx + r - 1, cy + r - 1, 1, 1);
}
function remainingPts(c) {
  const r = c.route,
    pts = r.pts,
    out = [];
  let d = r.pos;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (d <= l) {
      for (let j = i; j < pts.length; j++) out.push(pts[j]);
      break;
    }
    d -= l;
  }
  return out;
}
function drawPath(x, pts, col, t, alpha) {
  const k = KZ();
  x.fillStyle = col;
  x.globalAlpha = alpha;
  let acc = -((t * 8) | 0);
  for (let i = 1; i < pts.length; i++) {
    const ax = wx2s(pts[i - 1][0]),
      ay = wy2s(pts[i - 1][1]),
      bx = wx2s(pts[i][0]),
      by = wy2s(pts[i][1]),
      n = Math.max(1, Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
    for (let s = 0; s < n; s++, acc++) {
      if (((acc % 6) + 6) % 6 > 2) continue;
      const px = Math.round(ax + ((bx - ax) * s) / n),
        py = Math.round(ay + ((by - ay) * s) / n);
      if (px < 0 || py < 0 || px >= VIEW.bw || py >= VIEW.bh) continue;
      x.fillRect(px, py, 1, 1);
    }
  }
  x.globalAlpha = 1;
}

/* =====================================================================
   The port diorama: a little side-on scene of the selected place or craft
   ===================================================================== */
const SCENE_W = 184,
  SCENE_H = 70;
function skyColors(h, s, wx) {
  const n = nightAmount(h);
  let top, bot;
  if (n >= 1) {
    top = '#0b1638';
    bot = '#1a2c5a';
  } else if (n > 0) {
    top = h < 12 ? '#3a4a8a' : '#3a3a7a';
    bot = h < 12 ? '#f0a878' : '#f08a5a';
  } else {
    top = s === WINTER ? '#9ac4e4' : '#6fbdf0';
    bot = s === WINTER ? '#d4e8f4' : '#bfe6fa';
  }
  if (wx.storm || wx.snow) {
    top = n >= 1 ? '#10141f' : '#5a6474';
    bot = n >= 1 ? '#232a3a' : '#8a94a2';
  } else if (wx.fog) {
    top = n >= 1 ? '#232c3e' : '#b9c6cf';
    bot = n >= 1 ? '#39445a' : '#dbe4e9';
  }
  return [top, bot, n];
}
function drawPine(x, px, base, h, col, snow) {
  for (let r = 0; r < h; r++) {
    const w = 1 + ((r * 0.75) | 0);
    x.fillStyle = snow && r % 3 === 0 ? '#ffffff' : col;
    x.fillRect(px - w, base - h + r, w * 2 + 1, 1);
  }
  x.fillStyle = '#5e3b22';
  x.fillRect(px, base, 1, 2);
}
function drawLeafy(x, px, base, col) {
  x.fillStyle = col;
  x.fillRect(px - 3, base - 8, 7, 5);
  x.fillRect(px - 2, base - 10, 5, 2);
  x.fillRect(px - 2, base - 3, 5, 1);
  x.fillStyle = '#5e3b22';
  x.fillRect(px, base - 2, 1, 4);
}
// port: PORTS entry; craft: optional craft to feature; travel: craft is under way
function drawScene(x, port, craft, now) {
  const W = SCENE_W,
    H = SCENE_H,
    t = now / 1000,
    s = season(),
    h = hourOf(G.t),
    travel = craft && (craft.state === 'move' || craft.state === 'fish');
  const wx = travel ? wxAt(craft.x, craft.y) : wxAt(port.x, port.y),
    sk = skyColors(h, s, wx),
    night = sk[2];
  x.fillStyle = sk[0];
  x.fillRect(0, 0, W, H);
  x.fillStyle = sk[1];
  x.fillRect(0, 22, W, H - 22);
  for (let i = 0; i < W; i += 2) {
    x.fillStyle = sk[1];
    x.fillRect(i + 0, 20, 1, 1);
    x.fillRect(i + 1, 21, 1, 1);
    x.fillRect(i, 18, 1, 1);
  }
  if (night > 0.5) {
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++)
      if (hash2(i, 3) > 0.2 || ((t + i) | 0) % 3) x.fillRect((hash2(i, 1) * W) | 0, (hash2(i, 2) * 26) | 0, 1, 1);
    x.fillStyle = '#f4f0d8';
    x.fillRect(W - 30, 7, 6, 6);
    x.fillStyle = sk[0];
    x.fillRect(W - 28, 6, 5, 5);
  } else if (!wx.fog && !wx.storm && !wx.snow) {
    const sunX = Math.round(W * clamp((h - 5) / 15, 0.05, 0.95)),
      sunY = Math.round(26 - Math.sin(clamp((h - 5) / 15, 0, 1) * Math.PI) * 20);
    x.fillStyle = '#fff2a8';
    x.fillRect(sunX - 3, sunY - 2, 7, 5);
    x.fillRect(sunX - 2, sunY - 3, 5, 7);
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const cx = ((hash2(i, 9) * W + t * (1.5 + i)) % (W + 40)) - 20,
        cy = 5 + i * 6;
      x.fillRect(cx | 0, cy, 14, 2);
      x.fillRect((cx | 0) + 3, cy - 1, 7, 1);
      x.fillRect((cx | 0) - 2, cy + 1, 18, 1);
    }
  }
  const tree = ['#4e8a3c', '#2f6d37', '#2f6435', '#3d624c'][s],
    grass = ['#86a04e', '#5a9c42', '#8a9440', '#eef3f6'][s],
    grassD = ['#74904a', '#4a8a3a', '#787f38', '#d3dfe8'][s],
    fallC = ['#d9812b', '#bf452c', '#e3b535'];
  const seaC = night > 0.5 ? '#17335a' : ['#2f6f9a', '#3682b0', '#2f6c98', '#2a5c80'][s],
    seaL = night > 0.5 ? '#2a4c7a' : ['#5aa2c4', '#62b0d4', '#5a9cc0', '#4f88a8'][s];
  const HOR = 40,
    GND = 54;
  if (travel) {
    // under way: scrolling scenery, craft centre stage
    const T = CRAFT_BY[craft.type],
      sp = sprOf(craft),
      dir = (craft.face || 1) > 0 ? 1 : -1,
      sc = t * 22 * dir;
    if (T.cls === 'boat') {
      x.fillStyle = seaC;
      x.fillRect(0, HOR, W, H - HOR);
      for (let i = 0; i < 5; i++) {
        const ix = ((((hash2(i, 21) * 400 - sc * 0.3) % (W + 80)) + W + 80) % (W + 80)) - 40,
          iw = 14 + ((hash2(i, 22) * 22) | 0);
        x.fillStyle = s === WINTER ? '#dfe7ee' : '#3d6a4a';
        x.fillRect(ix | 0, HOR - 2, iw, 2);
        x.fillRect((ix | 0) + 3, HOR - 3, iw - 6, 1);
        for (let q = 2; q < iw - 2; q += 4) drawPine(x, (ix | 0) + q, HOR - 3, 4 + (q % 3), '#2c5238', s === WINTER);
      }
      x.fillStyle = seaL;
      for (let i = 0; i < 46; i++) {
        const wy = HOR + 2 + ((hash2(i, 5) * (H - HOR - 3)) | 0),
          wxp = ((((hash2(i, 6) * 300 - sc * (0.6 + (wy - HOR) / 30)) % (W + 20)) + W + 20) % (W + 20)) - 10;
        x.fillRect(wxp | 0, wy, 3 + (i % 3), 1);
      }
      const by = 58 + (Math.sin(t * 2.4) > 0 ? 0 : 1),
        bx = (W >> 1) - (sp.w >> 1);
      x.drawImage(dir > 0 ? sp.r : sp.l, bx, by - sp.h + 2);
      x.fillStyle = '#e8f4fa';
      for (let i = 0; i < 9; i++)
        if ((i + ((t * 8) | 0)) % 2) x.fillRect(bx + (dir > 0 ? -3 - i * 3 : sp.w + i * 3), by + 1 + (i >> 2), 3, 1);
      if (craft.state === 'fish') {
        x.fillStyle = '#1b1b24';
        x.fillRect(bx + (sp.w >> 1), by - sp.h - 2, 1, 4);
        drawText(x, 'HAULING...', (W >> 1) - 19, 8, '#ffffff', '#14273d');
        for (let i = 0; i < 3; i++) x.drawImage(SPR.buoy, bx - 14 - i * 12, by - 2 + (((t * 2 + i) | 0) % 2));
      }
    } else {
      const far = s === WINTER ? '#c4d2de' : s === FALL ? '#8a7a4a' : '#5a8a5a',
        near = s === WINTER ? '#eef3f6' : grassD;
      for (let i = 0; i < W; i++) {
        const hh = 6 + Math.round(vnoise((i + sc * 0.25) / 22, 3) * 12);
        x.fillStyle = far;
        x.fillRect(i, H - 14 - hh, 1, hh + 14);
      }
      for (let i = 0; i < W; i++) {
        const hh = 3 + Math.round(vnoise((i + sc * 0.6) / 12, 9) * 8);
        x.fillStyle = near;
        x.fillRect(i, H - 6 - hh, 1, hh + 6);
        if (hash2(Math.floor(i + sc * 0.6), 4) < 0.16)
          drawPine(
            x,
            i,
            H - 6 - hh,
            5,
            s === FALL && hash2(Math.floor(i + sc * 0.6), 8) < 0.5 ? fallC[(i >> 2) % 3] : tree,
            s === WINTER
          );
      }
      x.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) {
        const cx = ((((hash2(i, 31) * 300 - sc * 1.4) % (W + 60)) + W + 60) % (W + 60)) - 30,
          cy = 6 + i * 9;
        x.fillRect(cx | 0, cy, 18, 3);
        x.fillRect((cx | 0) + 4, cy - 2, 9, 2);
      }
      const by = 30 + Math.round(Math.sin(t * 1.7) * 1.5),
        bx = (W >> 1) - (sp.w >> 1);
      x.drawImage(dir > 0 ? sp.r : sp.l, bx, by - (sp.h >> 1));
      if (((t * 14) | 0) % 2) {
        x.fillStyle = '#e8eef2';
        x.fillRect(dir > 0 ? bx + sp.w - 1 : bx, by - (sp.h >> 1) + 2, 1, 5);
      }
    }
  } else {
    const coastal = port.water === 'sea',
      lake = port.water === 'lake',
      city = has(port, 'city'),
      island = has(port, 'island'),
      R = mulberry32((port.x * 7 + 3) | 0);
    // backdrop
    if (coastal) {
      x.fillStyle = seaC;
      x.fillRect(0, HOR, W, GND - HOR);
      for (let i = 0; i < 3; i++) {
        const ix = 10 + i * 62 + ((R() * 20) | 0),
          iw = 18 + ((R() * 20) | 0);
        x.fillStyle = s === WINTER ? '#dfe7ee' : '#3d6a4a';
        x.fillRect(ix, HOR - 2, iw, 2);
        for (let q = 2; q < iw - 1; q += 4) drawPine(x, ix + q, HOR - 3, 4 + ((R() * 3) | 0), '#2c5238', s === WINTER);
      }
    } else {
      const m1 = s === WINTER ? '#c9d6e2' : '#6f8fa8',
        m2 = s === WINTER ? '#e4ecf2' : s === FALL ? '#9a7f44' : '#4f8050';
      const woods = has(port, 'woods') || has(port, 'ski');
      for (let i = 0; i < W; i++) {
        const hh = (woods ? 10 : 4) + Math.round(vnoise(i / 26 + port.x, 2) * (woods ? 22 : 8));
        x.fillStyle = m1;
        x.fillRect(i, HOR - hh, 1, hh + 14);
        if (woods && hh > 24) {
          x.fillStyle = '#ffffff';
          x.fillRect(i, HOR - hh, 1, s === SUMMER ? 1 : 3);
        }
      }
      for (let i = 0; i < W; i++) {
        const hh = 2 + Math.round(vnoise(i / 14 + port.y, 6) * 9);
        x.fillStyle = m2;
        x.fillRect(i, HOR + 4 - hh, 1, hh + 10);
      }
    }
    {
      const ev = evActive();
      if (ev && ev.ship && ev.port === port.id && coastal) drawBigShip(x, ev.ship, 112, GND - 3, night, t);
    }
    // ground
    x.fillStyle = grass;
    x.fillRect(0, GND, W, H - GND);
    x.fillStyle = grassD;
    for (let i = 0; i < 40; i++)
      x.fillRect((hash2(i, 51) * W) | 0, GND + 1 + ((hash2(i, 52) * (H - GND - 2)) | 0), 2, 1);
    const waterX = coastal || lake ? (port.strip ? 112 : 70) : W + 1;
    // trees along the back
    for (let i = 0; i < 12; i++) {
      const tx = ((R() * (waterX - 6)) | 0) + 3;
      if (city && tx > 20 && tx < 90) continue;
      if (s !== WINTER && R() < (has(port, 'woods') ? 0.25 : 0.5))
        drawLeafy(x, tx, GND, s === FALL ? fallC[(R() * 3) | 0] : s === SPRING ? '#8fb85a' : '#4f9a3c');
      else drawPine(x, tx, GND - 1, 8 + ((R() * 5) | 0), tree, s === WINTER);
    }
    // buildings
    if (city) {
      for (let i = 0; i < 5; i++) {
        const bx = 22 + i * 13,
          bh = 12 + ((R() * 14) | 0);
        x.fillStyle = ['#9a5a48', '#b07058', '#8a8f98', '#a86a50', '#7a8088'][i];
        x.fillRect(bx, GND - bh, 11, bh);
        x.fillStyle = night > 0.5 ? '#ffd86a' : '#cfe6f4';
        for (let wy = GND - bh + 2; wy < GND - 2; wy += 4)
          for (let wxp = bx + 2; wxp < bx + 10; wxp += 3)
            if (night < 0.5 || hash2(wxp, wy) < 0.6) x.fillRect(wxp, wy, 1, 2);
      }
      if (has(port, 'capitol')) {
        x.fillStyle = '#e8e4d8';
        x.fillRect(46, GND - 30, 13, 6);
        x.fillStyle = '#c9a23a';
        x.fillRect(49, GND - 34, 7, 4);
        x.fillRect(51, GND - 36, 3, 2);
      }
    } else if (has(port, 'potato')) {
      x.fillStyle = '#b8402f';
      x.fillRect(30, GND - 13, 20, 13);
      x.fillStyle = '#7a2a22';
      for (let r = 0; r < 6; r++) x.fillRect(30 + r, GND - 14 - r + 1, 20 - r * 2, 1);
      x.fillStyle = '#fff';
      x.fillRect(38, GND - 7, 4, 7);
      x.fillStyle = '#c8ccd0';
      x.fillRect(52, GND - 20, 6, 20);
      x.fillRect(53, GND - 22, 4, 2);
      x.fillStyle = s === WINTER ? '#dfe7ee' : '#7a5a38';
      for (let r = 0; r < 4; r++) x.fillRect(62, GND + 3 + r * 3, 44, 1);
    } else if (has(port, 'ski')) {
      x.fillStyle = '#7a5a38';
      x.fillRect(30, GND - 11, 24, 11);
      x.fillStyle = s === WINTER ? '#ffffff' : '#4a3a2a';
      for (let r = 0; r < 7; r++) x.fillRect(28 + r * 2, GND - 12 - r, 28 - r * 4, 1);
      x.fillStyle = night > 0.5 ? '#ffd86a' : '#cfe6f4';
      x.fillRect(34, GND - 7, 3, 3);
      x.fillRect(45, GND - 7, 3, 3);
    } else {
      // a shingled house or camp
      x.fillStyle = has(port, 'lobster') || island ? '#9a9a8e' : '#8a6a48';
      x.fillRect(34, GND - 9, 15, 9);
      x.fillStyle = s === WINTER ? '#ffffff' : '#5a4a44';
      for (let r = 0; r < 5; r++) x.fillRect(33 + r * 2, GND - 10 - r, 17 - r * 4, 1);
      x.fillStyle = night > 0.5 ? '#ffd86a' : '#cfe6f4';
      x.fillRect(37, GND - 6, 2, 3);
      x.fillStyle = '#c8402f';
      x.fillRect(43, GND - 6, 3, 6);
      if (has(port, 'lobster')) {
        ['#f2c230', '#d8402f', '#3f7fc8', '#3f8f3a'].forEach((c, i) => {
          x.fillStyle = c;
          x.fillRect(51 + i * 3, GND - 7 + (i % 2), 2, 4);
        });
      }
    }
    // airstrip + hangar + windsock
    if (port.strip) {
      const paved = port.strip === 2,
        sy0 = GND + 7;
      x.fillStyle = paved ? '#5a6068' : s === SPRING ? '#8b7b55' : s === WINTER ? '#dfe7ee' : '#a8a468';
      x.fillRect(0, sy0, waterX - 4, 7);
      if (paved) {
        x.fillStyle = '#f1f1e6';
        for (let i = 4; i < waterX - 10; i += 10) x.fillRect(i, sy0 + 3, 5, 1);
      } else {
        x.fillStyle = '#f07a18';
        for (let i = 6; i < waterX - 8; i += 22) {
          x.fillRect(i, sy0 - 1, 2, 2);
        }
      }
      x.fillStyle = '#c9ced4';
      x.fillRect(4, GND - 12, 22, 12);
      x.fillStyle = '#9aa2ac';
      for (let r = 0; r < 4; r++) x.fillRect(4 + r, GND - 13 - r, 22 - r * 2, 1);
      x.fillStyle = '#1f3550';
      x.fillRect(8, GND - 8, 14, 8);
      x.fillStyle = '#c8402f';
      x.fillRect(4, GND - 10, 22, 1);
      const wsx = waterX - 12;
      x.fillStyle = '#1b1b24';
      x.fillRect(wsx, GND - 12, 1, 12);
      const fl = ((t * 3) | 0) % 2;
      x.fillStyle = '#f07a18';
      x.fillRect(wsx + 1, GND - 12 + fl, 3, 2);
      x.fillStyle = '#ffffff';
      x.fillRect(wsx + 4, GND - 12 + (fl ? 0 : 1), 2, 2);
      x.fillStyle = '#f07a18';
      x.fillRect(wsx + 6, GND - 12 + fl, 2, 1);
    }
    // water + wharf
    if (waterX < W) {
      const frozen = lake && s === WINTER;
      x.fillStyle = frozen ? '#dcecf4' : lake ? (night > 0.5 ? '#1c3c66' : '#4a93c4') : seaC;
      x.fillRect(waterX, GND - 2, W - waterX, H - GND + 2);
      x.fillStyle = frozen ? '#b9d4e2' : seaL;
      for (let i = 0; i < 22; i++) {
        const wy = GND + ((hash2(i, 61) * (H - GND - 1)) | 0),
          wxp = waterX + ((hash2(i, 62) * (W - waterX) + (frozen ? 0 : Math.sin(t + i) * 2)) | 0);
        x.fillRect(wxp, wy, 3, 1);
      }
      x.fillStyle = grass;
      x.fillRect(waterX - 3, GND - 2, 3, 3);
      x.fillStyle = '#8a8f98';
      x.fillRect(waterX - 1, GND, 2, H - GND);
      x.fillStyle = '#7a5a38';
      x.fillRect(waterX - 4, GND + 5, 30, 2);
      x.fillStyle = '#4a3422';
      for (let i = 0; i < 4; i++) x.fillRect(waterX + 2 + i * 7, GND + 7, 1, 6);
      if (coastal && !island && has(port, 'coast')) {
        const lx = W - 10;
        x.fillStyle = '#6a6f78';
        x.fillRect(lx - 5, HOR - 3, 12, 3);
        x.fillStyle = '#ffffff';
        x.fillRect(lx - 1, HOR - 14, 4, 11);
        x.fillStyle = '#c8402f';
        x.fillRect(lx - 1, HOR - 16, 4, 2);
        x.fillStyle = night > 0.3 && ((t * 1.5) | 0) % 2 ? '#fff3a8' : '#1b1b24';
        x.fillRect(lx, HOR - 15, 2, 1);
      }
    }
    {
      const hd = holidayNow();
      if (hd && G.ports[port.id].open) drawHolidayDeco(x, hd.deco, waterX, GND, t, night);
    }
    // cargo waiting on the ground, people milling about
    const st = G.ports[port.id];
    if (st.open) {
      const all = st.jobs.concat(st.lay),
        cargo = all.filter(j => j.kind === 'c').slice(0, 9),
        pax = all.filter(j => j.kind === 'p').slice(0, 8),
        cx0 = port.strip ? 28 : 54;
      cargo.forEach((j, i) => {
        const col = i % 4,
          row = (i / 4) | 0;
        x.drawImage(ICON[j.ic] || ICON.crate, cx0 + col * 8 + (row % 2) * 3, GND + 4 - row * 7 - 7);
      });
      pax.forEach((j, i) => {
        const span = Math.max(20, waterX - 30),
          ph = (hash2(j.id, 3) * span * 2 + t * (4 + hash2(j.id, 4) * 4)) % (span * 2),
          px = 12 + (ph < span ? ph : span * 2 - ph);
        drawWalker(x, px | 0, GND + 1 + (i % 3) * 2 - 4, j.id, ((t * 5 + i) | 0) % 2, j.ic);
      });
    } else {
      x.globalAlpha = 0.45;
      x.fillStyle = '#1f2a3a';
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;
      x.drawImage(SPR.lock, (W >> 1) - 6, 22, 12, 15);
    }
    // craft parked here
    const here = G.crafts
      .filter(c => c.at === port.id)
      .sort((a, b) => (craft && a.id === craft.id ? 1 : 0) - (craft && b.id === craft.id ? 1 : 0));
    let bi = 0,
      pi = 0;
    here.slice(-5).forEach(c => {
      const T = CRAFT_BY[c.type],
        sp = sprOf(c);
      let px, py;
      const onWater =
        T.cls === 'boat' || (T.floats && waterX < W && !(lake && s === WINTER) && !(T.wheels && port.strip));
      if (onWater) {
        px = Math.min(W - sp.w - 1, waterX + 6 + bi * 14);
        py = GND + 9 + (bi % 2) * 4 - sp.h + (Math.sin(t * 2 + c.id) > 0 ? 0 : 1);
        bi++;
      } else {
        px = Math.max(2, Math.min(waterX - sp.w - 14, 62 - Math.min(40, sp.w) + pi * 24));
        py = GND + 14 - sp.h;
        pi++;
      }
      if (craft && c.id === craft.id && sp.selR) x.drawImage(sp.selR, px - 1, py - 1);
      else x.drawImage(sp.r, px, py);
      if (craft && c.id === craft.id) {
        selBrackets(x, px - 3, py - 3, sp.w + 5, sp.h + 5, t);
        const ay = py - 6 - (((t * 3) | 0) % 2);
        x.fillStyle = '#14273d';
        x.fillRect(px + (sp.w >> 1) - 3, ay - 1, 7, 3);
        x.fillRect(px + (sp.w >> 1) - 2, ay + 2, 5, 1);
        x.fillRect(px + (sp.w >> 1) - 1, ay + 3, 3, 1);
        x.fillStyle = '#ffe36a';
        x.fillRect(px + (sp.w >> 1) - 2, ay, 5, 2);
        x.fillRect(px + (sp.w >> 1) - 1, ay + 2, 3, 1);
        x.fillRect(px + (sp.w >> 1), ay + 3, 1, 1);
      }
    });
  }
  // weather over everything
  if (wx.storm) {
    x.fillStyle = '#b8d4ee';
    for (let i = 0; i < 70; i++) {
      const ph = (t * 90 + hash2(i, 71) * 80) % (H + 10);
      x.fillRect(((hash2(i, 72) * (W + 30)) | 0) - ((ph * 0.4) | 0), ph | 0, 1, 3);
    }
    if (hash2((t * 2) | 0, 5) < 0.08) {
      x.globalAlpha = 0.5;
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;
    }
  }
  if (wx.snow || (s === WINTER && wx.storm)) {
    x.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const ph = (t * 14 + hash2(i, 81) * 80) % (H + 4);
      x.fillRect((hash2(i, 82) * W + Math.sin(t + i) * 3) | 0, ph | 0, 1, 1);
    }
  }
  if (wx.fog) {
    for (let b = 0; b < 5; b++) {
      x.globalAlpha = 0.2 + b * 0.04;
      x.fillStyle = night > 0.5 ? '#6a7890' : '#eef3f6';
      const off = Math.sin(t * 0.3 + b) * 8;
      for (let i = -1; i < 5; i++) x.fillRect((i * 50 + off + b * 13) | 0, 14 + b * 10, 38, 6);
    }
    x.globalAlpha = 1;
  }
  {
    const hd = holidayNow();
    if (hd) drawHolidayFx(x, W, H, t, hd.fx, night, 14);
  }
  if (night > 0 && !travel) {
    x.globalAlpha = 0.28 * night;
    x.fillStyle = '#081430';
    x.fillRect(0, GND - 30, W, H);
    x.globalAlpha = 1;
  }
}

/* ---------- ship calls and holiday dressing ---------- */
// where a visiting ship lies off a port: out along the longest run of open water from the dock
function shipSpot(p) {
  if (p.shipAt !== undefined) return p.shipAt;
  const o = p.dock || [p.x, p.y];
  let best = null,
    bs = 0;
  for (let a = 0; a < 16; a++) {
    const dx = Math.cos((a * Math.PI) / 8),
      dy = Math.sin((a * Math.PI) / 8);
    let run = 0;
    for (let d = 2; d <= 14; d++) {
      if (isSea(o[0] + dx * d, o[1] + dy * d)) run++;
      else break;
    }
    if (run > bs) {
      bs = run;
      const far = Math.min(12, 4 + run * 0.6);
      best = [o[0] + dx * far, o[1] + dy * far];
    }
  }
  return (p.shipAt = best);
}
function drawBigShip(x, kind, px, wl, night, t) {
  const lit = night > 0.4 ? '#ffd86a' : '#2b4666';
  if (kind === 'cruise') {
    x.fillStyle = '#f4f6f8';
    x.fillRect(px + 2, wl - 5, 50, 5);
    x.fillRect(px, wl - 5, 2, 3);
    x.fillRect(px + 52, wl - 5, 2, 4);
    x.fillStyle = '#1f3f78';
    x.fillRect(px + 1, wl - 2, 52, 1);
    x.fillStyle = '#8f2a22';
    x.fillRect(px + 3, wl - 1, 48, 1);
    x.fillStyle = '#ffffff';
    x.fillRect(px + 8, wl - 8, 38, 3);
    x.fillRect(px + 12, wl - 11, 30, 3);
    x.fillRect(px + 18, wl - 13, 18, 2);
    x.fillStyle = lit;
    for (let i = 0; i < 12; i++) {
      x.fillRect(px + 9 + i * 3, wl - 7, 2, 1);
      if (i > 0 && i < 10) x.fillRect(px + 13 + (i - 1) * 3, wl - 10, 2, 1);
      x.fillRect(px + 5 + i * 4, wl - 4, 1, 1);
    }
    x.fillStyle = '#f2c230';
    x.fillRect(px + 30, wl - 17, 5, 4);
    x.fillStyle = '#1f3f78';
    x.fillRect(px + 30, wl - 18, 5, 1);
    x.fillStyle = '#dfe7ee';
    for (let i = 0; i < 3; i++) x.fillRect(px + 34 + i * 3 + (((t * 2) | 0) % 2), wl - 20 - i * 2, 3, 1);
  } else {
    x.fillStyle = '#8f2a22';
    x.fillRect(px + 1, wl - 5, 52, 4);
    x.fillRect(px, wl - 5, 2, 2);
    x.fillStyle = '#1b1b24';
    x.fillRect(px + 2, wl - 1, 50, 1);
    const cols = ['#c8402f', '#3f7fc8', '#f2c230', '#3f8f3a', '#e08a2c', '#d3d8dd'];
    for (let i = 0; i < 8; i++)
      for (let k = 0; k < 2 + (i % 3 === 1 ? 1 : 0); k++) {
        x.fillStyle = cols[(i * 2 + k * 3) % cols.length];
        x.fillRect(px + 3 + i * 5, wl - 8 - k * 3, 4, 2);
      }
    x.fillStyle = '#f4f6f8';
    x.fillRect(px + 44, wl - 13, 7, 8);
    x.fillStyle = lit;
    x.fillRect(px + 45, wl - 12, 5, 1);
    x.fillRect(px + 45, wl - 9, 5, 1);
    x.fillStyle = '#1b1b24';
    x.fillRect(px + 47, wl - 17, 1, 4);
    x.fillStyle = '#f2c230';
    x.fillRect(px + 48, wl - 16, 2, 2);
  }
}
function drawHolidayDeco(x, deco, waterX, GND, t, night) {
  const xb = Math.min(waterX, SCENE_W) - 8,
    base = xb - 20,
    y0 = GND - 20;
  const pumpkin = (px, py, face) => {
    x.fillStyle = '#e07a1c';
    x.fillRect(px, py - 3, 5, 3);
    x.fillRect(px + 1, py - 4, 3, 1);
    x.fillStyle = '#3f8f3a';
    x.fillRect(px + 2, py - 5, 1, 1);
    if (face) {
      x.fillStyle = night > 0.4 ? '#fff0a0' : '#1b1b24';
      x.fillRect(px + 1, py - 3, 1, 1);
      x.fillRect(px + 3, py - 3, 1, 1);
      x.fillRect(px + 1, py - 1, 3, 1);
    } else {
      x.fillStyle = '#b85a12';
      x.fillRect(px + 2, py - 3, 1, 3);
    }
  };
  const string = (cols, flags) => {
    for (let px = 3; px <= xb; px++) {
      const yy = y0 + Math.round(5 * Math.sin((Math.PI * (px - 3)) / (xb - 3))),
        i = (px - 3) >> 2;
      x.fillStyle = '#1b1b24';
      x.fillRect(px, yy, 1, 1);
      if ((px - 3) % 4) continue;
      x.fillStyle = cols[i % cols.length];
      if (flags) {
        x.fillRect(px, yy + 1, 3, 1);
        x.fillRect(px + 1, yy + 2, 1, 1);
      } else if (((t * 2 + i) | 0) % 4) x.fillRect(px, yy + 1, 2, 2);
    }
    x.fillStyle = '#1b1b24';
    x.fillRect(3, y0, 1, GND - y0);
    x.fillRect(xb, y0, 1, GND - y0);
  };
  if (deco === 'pumpkins') {
    pumpkin(base, GND + 3, 1);
    pumpkin(base + 7, GND + 4, 1);
    pumpkin(base + 14, GND + 3, 1);
  } else if (deco === 'harvest') {
    x.fillStyle = '#d9b54a';
    x.fillRect(base + 12, GND - 2, 8, 5);
    x.fillStyle = '#a8842a';
    x.fillRect(base + 12, GND, 8, 1);
    x.fillRect(base + 15, GND - 2, 1, 5);
    pumpkin(base, GND + 3, 0);
    pumpkin(base + 6, GND + 4, 0);
    x.fillStyle = '#c9a04a';
    for (let r = 0; r < 7; r++) x.fillRect(base - 7 - (r >> 1), GND - 5 + r, 2 + r, 1);
    x.fillStyle = '#8a5a34';
    x.fillRect(base - 6, GND - 2, 3, 1);
  } else if (deco === 'lights') {
    string(['#ff4a3a', '#3fd05a', '#ffd23f', '#4fa0ff'], false);
    const tx = base + 10;
    drawPine(x, tx, GND + 3, 10, '#2f6d37', false);
    [
      [0, -3, '#ff4a3a'],
      [-2, -5, '#ffd23f'],
      [1, -6, '#4fa0ff'],
      [-1, -8, '#ff4a3a'],
      [2, -2, '#ffd23f']
    ].forEach((o, i) => {
      if (((t * 2 + i) | 0) % 3) {
        x.fillStyle = o[2];
        x.fillRect(tx + o[0], GND + 3 + o[1], 1, 1);
      }
    });
    x.fillStyle = '#ffe36a';
    x.fillRect(tx, GND - 8, 1, 2);
    x.fillRect(tx - 1, GND - 7, 3, 1);
  } else if (deco === 'flags') string(['#d8402f', '#ffffff', '#3f7fc8'], true);
  else if (deco === 'green') string(['#3fa04a', '#ffffff', '#f08a2c'], true);
  else if (deco === 'maple') string(['#c8402f', '#f2c230', '#e08a2c'], true);
  else if (deco === 'pink') string(['#ff7aa8', '#ffffff', '#d8402f'], true);
  else if (deco === 'gold') string(['#ffd23f', '#ffffff'], false);
}
function drawHolidayFx(x, W, H, t, fx, night, n) {
  if (!fx) return;
  if (fx === 'bats' && night <= 0.3) fx = 'leaves';
  if (fx === 'fireworks') {
    if (night <= 0.3) return;
    const pal = ['#ff6a5a', '#ffe36a', '#7dff8a', '#8fd8ee', '#ff9ad0'];
    for (let b = 0; b < 3; b++) {
      const cyc = t / 2.6 + hash2(b, 97) * 5,
        k = Math.floor(cyc),
        ph = cyc - k,
        cx = hash2(k, 98 + b) * W,
        cy = (0.08 + hash2(k, 109 + b) * 0.42) * H,
        rr = 2 + ph * 9;
      if (ph > 0.85) continue;
      x.fillStyle = pal[(k + b) % pal.length];
      for (let a = 0; a < 10; a++)
        if (ph < 0.55 || a % 2)
          x.fillRect((cx + Math.cos(a * 0.628) * rr) | 0, (cy + Math.sin(a * 0.628) * rr + ph * ph * 4) | 0, 1, 1);
    }
    return;
  }
  if (fx === 'bats') {
    x.fillStyle = '#c9a8f0';
    for (let i = 0; i < Math.ceil(n / 3); i++) {
      const px = (((((hash2(i, 94) * W + t * (9 + hash2(i, 95) * 8)) % (W + 10)) + W + 10) % (W + 10)) | 0) - 5,
        py = (2 + hash2(i, 96) * H * 0.55 + Math.sin(t * 2 + i) * 4) | 0,
        f = ((t * 6 + i) | 0) % 2 ? 1 : -1;
      x.fillRect(px - 1, py, 3, 1);
      x.fillRect(px - 2, py + f, 1, 1);
      x.fillRect(px + 2, py + f, 1, 1);
    }
    return;
  }
  const cols =
    fx === 'leaves'
      ? ['#d9812b', '#bf452c', '#e3b535']
      : fx === 'snow'
        ? ['#ffffff', '#dfeaf2']
        : fx === 'hearts'
          ? ['#ff7aa8', '#ff9ac0']
          : ['#ff6a5a', '#ffe36a', '#7dff8a', '#8fd8ee'];
  const sp = fx === 'snow' ? 8 : fx === 'hearts' ? -5 : 11,
    span = H + 8;
  for (let i = 0; i < n; i++) {
    const py = (((((t * sp * (0.7 + hash2(i, 91) * 0.6) + hash2(i, 92) * span) % span) + span) % span) | 0) - 4,
      px = ((((hash2(i, 93) * W + Math.sin(t * 1.3 + i) * 5 + (fx === 'leaves' ? py * 0.5 : 0)) % W) + W) % W) | 0;
    x.fillStyle = cols[i % cols.length];
    if (fx === 'hearts') {
      x.fillRect(px, py, 1, 1);
      x.fillRect(px + 2, py, 1, 1);
      x.fillRect(px, py + 1, 3, 1);
      x.fillRect(px + 1, py + 2, 1, 1);
    } else x.fillRect(px, py, fx === 'leaves' && i % 2 ? 2 : 1, 1);
  }
}
// a small sign of the season beside each port you serve, on the map
function drawHolidayPin(x, deco, px, py, t) {
  x.fillStyle = '#14273d';
  x.fillRect(px - 1, py - 1, 5, 6);
  if (deco === 'pumpkins' || deco === 'harvest') {
    x.fillStyle = '#e07a1c';
    x.fillRect(px, py + 1, 3, 3);
    x.fillStyle = '#3f8f3a';
    x.fillRect(px + 1, py, 1, 1);
  } else if (deco === 'lights') {
    x.fillStyle = '#3fa04a';
    x.fillRect(px + 1, py + 1, 1, 1);
    x.fillRect(px, py + 2, 3, 2);
    x.fillStyle = ((t * 2) | 0) % 2 ? '#ffe36a' : '#ff4a3a';
    x.fillRect(px + 1, py, 1, 1);
  } else {
    x.fillStyle = '#d3d8dd';
    x.fillRect(px, py, 1, 4);
    x.fillStyle =
      deco === 'green'
        ? '#3fa04a'
        : deco === 'maple'
          ? '#e08a2c'
          : deco === 'pink'
            ? '#ff7aa8'
            : deco === 'gold'
              ? '#ffd23f'
              : '#d8402f';
    x.fillRect(px + 1, py, 2, 2);
    if (deco === 'flags') {
      x.fillStyle = '#3f7fc8';
      x.fillRect(px + 1, py, 1, 1);
    }
  }
}
// yellow corner brackets around the craft in hand
function selBrackets(x, bx, by, bw2, bh2, t) {
  x.fillStyle = ((t * 2) | 0) % 2 ? '#ffe36a' : '#fff6c8';
  const L = 4;
  [
    [bx, by, L, 1],
    [bx, by, 1, L],
    [bx + bw2 - L + 1, by, L, 1],
    [bx + bw2, by, 1, L],
    [bx, by + bh2, L, 1],
    [bx, by + bh2 - L + 1, 1, L],
    [bx + bw2 - L + 1, by + bh2, L, 1],
    [bx + bw2, by + bh2 - L + 1, 1, L]
  ].forEach(q => x.fillRect(q[0], q[1], q[2], q[3]));
}
