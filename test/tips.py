# What a screen is for, said once. Opens tabs and sections for the first time and checks that Aunt Bev's card is there,
# that GOT IT puts it away for good, that a quick look does not use it up but a proper read does, and that LESSONS: OFF silences them.
import sys, os
from playwright.sync_api import sync_playwright
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '386x630x3').split('x')]; touch=W<800; probs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); errs=[]
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(700); ev=pg.evaluate
    def tap(sel):
        loc=pg.locator(sel).first; (loc.tap if touch else loc.click)(timeout=3000); pg.wait_for_timeout(450)
    def expect(c,m):
        print(('  ok  ' if c else '  !!! ')+m)
        if not c: probs.append(m)
    TIP="""()=>{ const t=document.querySelector('#sbody .scrtip'); if(!t) return null; const r=t.getBoundingClientRect(), b=t.querySelector('.btn').getBoundingClientRect(), p=t.querySelector('p'); return { head:t.querySelector('b').textContent, text:p.textContent, fs:parseFloat(getComputedStyle(p).fontSize), w:r.width, h:r.height, inside:b.right<=r.right+1&&b.bottom<=r.bottom+1, vw:innerWidth }; }"""
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300)
    ev("()=>{ const c=G.crafts.find(c=>c.state==='dock'); selectCraft(c.id); UI.stab='craft'; forcePanel(); }"); pg.wait_for_timeout(500)
    expect(ev(TIP) is None, 'no cards while the tutorial is running')
    ev("()=>document.querySelector('[data-act=tutSkip]').click()"); pg.wait_for_timeout(400)
    ev("""()=>{ G.hol='off'; hideBanner(); G.wxNext=1e12; G.wx=[]; G.vipNext=1e12; G.level=9; G.money=60000; G.lesOff=false; G.lesAsked=1; G.lesAsk=0; UI.lesWait=1e15; UI.lesCur=''; LESSON_ORDER.forEach(id=>{ G.les[id]=1; }); deselect(); }""")
    open_craft="(a)=>{ const c=G.crafts.find(c=>c.state==='dock'); selectCraft(c.id); UI.stab=a[0]; if(a[0]==='craft') UI.cseg=a[1]; else if(a[1]) UI.yseg=a[1]; UI.toTop=true; forcePanel(); }"
    ev(open_craft,['jobs','']); pg.wait_for_timeout(500); expect(ev(TIP) is None, 'the jobs board, which the tutorial teaches, has no card')
    seen=[]
    for a in (['craft','gear'],['craft','looks'],['craft','crew'],['craft','run'],['craft','keep'],['port','parts'],['port','build'],['port','store'],['port','new'],['port','town']):
        ev(open_craft,a); pg.wait_for_timeout(450); t=ev(TIP)
        ok=t is not None and len(t['text'])>30 and t['fs']>=18 and t['inside'] and t['h']<=(260 if touch else 170)
        if not ok: probs.append('card for %s: %s'%(':'.join(a),t))
        else: seen.append(t['head'])
    expect(len(seen)==10 and len(set(seen))==10, 'each of the ten craft and yard sections has its own card, readable and not taller than it should be (%d)'%len(seen))
    # GOT IT puts it away for good
    ev(open_craft,['craft','gear']); pg.wait_for_timeout(450); tap('#sbody .scrtip [data-act=tipOk]'); expect(ev(TIP) is None and ev("()=>G.seen['craft:gear']")==1, 'GOT IT puts the card away')
    ev("()=>deselect()"); pg.wait_for_timeout(300); ev(open_craft,['craft','gear']); pg.wait_for_timeout(450); expect(ev(TIP) is None, 'and it stays away the next time')
    # a quick look does not use a card up; reading it does
    ev(open_craft,['craft','run']); pg.wait_for_timeout(600); ev("()=>deselect()"); pg.wait_for_timeout(400); ev(open_craft,['craft','run']); pg.wait_for_timeout(450)
    expect(ev(TIP) is not None, 'a look of under a second does not use the card up')
    pg.wait_for_timeout(4300); ev("()=>deselect()"); pg.wait_for_timeout(400); expect(ev("()=>G.seen['craft:run']")==1, 'leaving after it has been up long enough to read counts as read')
    ev(open_craft,['craft','run']); pg.wait_for_timeout(450); expect(ev(TIP) is None, 'so it is not shown again')
    # the Almanac, a port that is not open yet, and the switch
    ev("()=>openMenu('almanac')"); pg.wait_for_timeout(450); t=ev(TIP); expect(t is not None and 'ALMANAC' in t['head'].upper(), 'the Almanac has a card')
    ev("()=>{ const P=PORTS.find(p=>!G.ports[p.id].open); selectPort(P.id); }"); pg.wait_for_timeout(500); t=ev(TIP); expect(t is not None and 'NOT YOURS' in t['head'].upper(), 'a port that is not open yet says so')
    ev("()=>openMenu('contracts')"); pg.wait_for_timeout(400); expect(ev(TIP) is None, 'contracts already says what it is in its first line, so no card')
    ev("()=>{ openMenu('almanac'); }"); pg.wait_for_timeout(300); ev("()=>lesToggle()"); ev(open_craft,['port','new']); pg.wait_for_timeout(450); expect(ev(TIP) is None, 'LESSONS: OFF in the Almanac silences the cards too')
    ev("()=>lesToggle()"); n=ev("()=>{ const g=JSON.parse(JSON.stringify(G)); g.seen['<b>x']=1; sanitizeSave(g); return g.seen['<b>x'] ? -1 : Object.keys(g.seen).length; }"); expect(n>=2, 'what has been read is kept in the save (%d)'%n)
    if errs: probs.append('page errors: '+' | '.join(errs[:3]))
    b.close()
print('PROBLEMS:',len(probs)); [print('  ',x) for x in probs]
sys.exit(1 if probs else 0)
