# Retakes the screenshots in docs/ from the built page, so the README shows the game as it is now.
#   python3 test/docs.py            # writes docs/desktop-map.png, desktop-port.png, phone-map/port/ferry/yard/lesson.png, social.png
# docs/social.png (1280x640) is the picture GitHub and chat apps show for a link to the repository or the game.
# The game is staged the same way each time: holidays off, a clear summer day, a mid-game fleet across New England.
import os, sys
from playwright.sync_api import sync_playwright

OUT = 'docs/'
STAGE = """() => {
  G.tutDone = true; G.lesOff = true; ['Tin Goose', 'Whiskey Jack', 'Sea Smoke', 'Three Sons'].forEach((n, i) => { if (G.crafts[i]) G.crafts[i].name = n; });
  G.level = 12; G.xp = 0; G.money = 48250; G.slots = 12;
  G.wx = []; G.wxNext = 1e12; G.vipNext = 1e12; G.reqNext = 1e12; G.rivalNext = 1e12; G.t = 300 * 0.42;
  ['pwm','rkd','vin','lew','aug','bbh','bgr','bhb','sto','mat','rng','gls','psm','mht','btv','leb','bos','pvc','ack','hya','pvd','npt','hvn']
    .forEach(id => { G.ports[id].open = true; refreshBoard(PORT_BY[id]); });
  const add = (t, at, name) => { const p = PORT_BY[at]; return canBase(CRAFT_BY[t], p) ? addCraft(t, at, name) : null; };
  const send = (c, to) => { if (!c) return; const st = G.ports[c.at]; st.jobs.filter(j => j.to === to).slice(0, 6).forEach(j => loadJob(c, j.id)); dispatch(c, [to]); };
  window.DOC = {
    wagon: add('wagon', 'pwm', 'North Star'), ferry: add('ferry', 'rkd', 'Numb As A Hake'),
    a: add('beav', 'aug', 'Katahdin Queen'), b: add('twin', 'bos', 'Dirigo'), c: add('mail', 'bos', 'Miss Bev'),
    d: add('loon', 'rng', 'The Loon'), e: add('amphib', 'btv', 'Dawn Treader'), f: add('down', 'bbh', 'Lori Ann') };
  send(DOC.a, 'bgr'); send(DOC.b, 'ack'); send(DOC.c, 'pvc'); send(DOC.d, 'mht'); send(DOC.e, 'pwm'); send(DOC.f, 'vin');
  G.crafts.filter(c => c.state === 'dock' && c.at === 'pwm' && c !== DOC.wagon && CRAFT_BY[c.type].cls === 'plane').slice(0, 1).forEach(c => send(c, 'lew'));
  for (let i = 0; i < 28; i++) tick(2);
  SIM.events = []; deselect();
}"""

def run(pg, W):
    ev = lambda js, *a: pg.evaluate(js, *a)
    phone = W < 800
    def shot(name): pg.wait_for_timeout(700); pg.screenshot(path=OUT + name + '.png'); print('wrote', OUT + name + '.png')
    pg.goto('file://' + os.path.abspath('index.html')); pg.wait_for_timeout(700); ev("() => { HOLIDAY_FORCE = 'off'; }")
    ev("() => act('chooseStart')"); ev("() => act('newGame','casco')"); pg.wait_for_timeout(4600)
    ev("() => act('tutNext')"); ev("() => act('tutSkip')"); pg.wait_for_timeout(2600)
    ev(STAGE); pg.wait_for_timeout(3200)          # let the toasts from staging clear
    # the map
    ev("(d) => { VIEW.zi = 0; const p = PORT_BY.pwm; centerOn(p.x + d[0], p.y + d[1]); }", [-5, 35] if phone else [0, 45]); shot(('phone' if phone else 'desktop') + '-map')
    # a port, with a craft half loaded
    ev("""() => { const c = DOC.wagon, st = G.ports.pwm; const tos = {}; st.jobs.forEach(j => { if (legInfo(c, 'pwm', j.to).ok) tos[j.to] = (tos[j.to] || 0) + 1; });
        const pax = to => Math.min(2, st.jobs.filter(j => j.to === to && j.kind === 'p' && !j.n).length);
        const best = Object.keys(tos).sort((a, b) => pax(b) - pax(a) || tos[b] - tos[a])[0], mine = st.jobs.filter(j => j.to === best && !j.n);
        mine.filter(j => j.kind === 'p').slice(0, 2).concat(mine.filter(j => j.kind === 'c').slice(0, 1)).forEach(j => loadJob(c, j.id)); selectCraft(c.id, true); }""")
    shot(('phone' if phone else 'desktop') + '-port')
    if not phone: return
    # a big craft: its load by destination
    ev("""() => { const f = DOC.ferry, st = G.ports.rkd; refreshBoard(PORT_BY.rkd);
        st.jobs.unshift({ id: G.nextId++, from: 'rkd', to: 'bos', kind: 'p', n: 10, pay: 1180, label: 'The high school band', ic: 'tourist' });
        st.jobs.slice(0, 10).forEach(j => loadJob(f, j.id)); selectCraft(f.id, true); }"""); shot('phone-ferry')
    # the yard
    ev("() => { deselect(); givePart('beav', 0); givePart('beav', 1); givePart('loon', 2); stockShelf('pwm'); selectPort('pwm', true); act('stab', 'port'); }"); shot('phone-yard')
    # a lesson: Aunt Bev pointing at the goods for sale
    ev("""() => { deselect(); G.lesOff = false; G.les = {}; LESSON_ORDER.forEach(id => { G.les[id] = 1; }); delete G.les.trade; G.lesAsked = 1; G.lesAsk = 0; UI.lesWait = 0; UI.lesCur = 'trade';      // as if she had been followed here from the map
        const c = DOC.wagon; c.jobs.slice().forEach(j => unloadJob(c, j.id)); selectCraft(c.id, true); }"""); pg.wait_for_timeout(900); shot('phone-lesson'); ev("() => { G.lesOff = true; }")

SOCIAL = """(phone) => {
  HOLIDAY_FORCE = 'off'; deselect(); VIEW.zi = 1; const pw = PORT_BY.pwm; centerOn(pw.x - 78, pw.y + 5);
  const fleet = ['cub', 'down', 'loon', 'mail', 'beav', 'ferry'].map(k => '<img src="' + SPR[k].url + '" style="width:' + SPR[k].w * 4 + 'px;image-rendering:pixelated" alt="">').join('');
  const d = document.createElement('div'); d.id = 'social';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:hidden;background:#16263d';
  d.innerHTML = '<img id="socmap" style="position:absolute;left:0;top:0;width:1280px;height:640px;object-fit:cover;object-position:50% 50%;image-rendering:pixelated" alt="">' +
    '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,27,46,.98) 0,rgba(16,27,46,.97) 57%,rgba(16,27,46,.3) 67%,rgba(16,27,46,.06) 100%)"></div>' +
    '<div style="position:absolute;left:72px;top:74px;width:700px">' +
      '<div style="font-family:Silkscreen,monospace;font-weight:700;font-size:88px;line-height:.92;color:#ffd23f;text-shadow:6px 6px 0 #c8402c;letter-spacing:2px">POCKET<br>MAINE</div>' +
      '<div style="font-family:Silkscreen,monospace;font-size:27px;color:#8fd0f0;letter-spacing:9px;margin-top:20px">AIR AND SEA</div>' +
      '<div style="display:inline-flex;gap:18px;align-items:flex-end;margin-top:28px;padding:16px 18px 9px;background:linear-gradient(#8fd0f0 0,#bfe6fa 64%,#3682b0 64%,#2f6f9a 100%);border:5px solid #0f1a2c">' + fleet + '</div>' +
      '<div style="font-family:VT323,monospace;font-size:38px;line-height:1.02;color:#f6e7c1;margin-top:24px;width:640px">A cozy pixel-art transport tycoon. Bush planes, ferries and lobster boats across 54 ports, from Maine across New England.</div>' +
      '<div style="font-family:Silkscreen,monospace;font-size:19px;color:#ffd23f;margin-top:22px;letter-spacing:1px">FREE IN THE BROWSER \u00b7 NO TIMERS \u00b7 NOTHING TO BUY</div>' +
    '</div>' +
    '<div style="position:absolute;right:86px;top:44px;width:296px;height:552px;border:7px solid #0f1a2c;background:#0f1a2c;box-shadow:12px 12px 0 rgba(8,14,26,.55);overflow:hidden"><img src="' + phone + '" style="width:100%;display:block" alt=""></div>';
  document.body.appendChild(d);
  requestAnimationFrame(() => { document.getElementById('socmap').src = VIEW.canvas.toDataURL(); });
}"""

def social(b):
    import base64
    ctx = b.new_context(viewport={'width': 1280, 'height': 640}, device_scale_factor=1); pg = ctx.new_page(); ev = pg.evaluate
    pg.goto('file://' + os.path.abspath('index.html')); pg.wait_for_timeout(700); ev("() => { HOLIDAY_FORCE = 'off'; }")
    ev("() => act('chooseStart')"); ev("() => act('newGame','casco')"); pg.wait_for_timeout(4600)
    ev("() => act('tutNext')"); ev("() => act('tutSkip')"); pg.wait_for_timeout(2600); ev(STAGE); pg.wait_for_timeout(1500)
    ev(SOCIAL, 'data:image/png;base64,' + base64.b64encode(open(OUT + 'phone-port.png', 'rb').read()).decode()); pg.wait_for_timeout(1200)
    pg.screenshot(path=OUT + 'social.png'); print('wrote', OUT + 'social.png'); ctx.close()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'), args=['--no-sandbox'])
    for (W, H, D) in ((1280, 720, 1), (386, 720, 2)):
        ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=D, has_touch=W < 800, is_mobile=W < 800)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        run(pg, W)
        if errs: print('JS ERRORS', errs[:3]); sys.exit(1)
        ctx.close()
    social(b)
    b.close()
