# A fleet too long for the strip. The far end, and the + FLEET SLOT button after it, must be reachable with a mouse:
# the wheel turns the strip sideways, and an arrow stands at whichever end has more to show.
import sys, os
from playwright.sync_api import sync_playwright
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '1280x720x1').split('x')]; touch=W<800; probs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); errs=[]
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(700); ev=pg.evaluate
    def tap(sel):
        loc=pg.locator(sel).first; (loc.tap if touch else loc.click)(timeout=3000); pg.wait_for_timeout(450)
    def expect(c,m):
        print(('  ok  ' if c else '  !!! ')+m)
        if not c: probs.append(m)
    S="""()=>{ const f=document.getElementById('fleet'), fr=f.getBoundingClientRect(), bt=f.querySelector('[data-act=buySlot]').getBoundingClientRect(), L=document.getElementById('fleetL'), R=document.getElementById('fleetR');
      const vis=e=>{ const r=e.getBoundingClientRect(); return !e.hidden && r.width>0 && r.height>0; };
      return { sl:Math.round(f.scrollLeft), max:Math.round(f.scrollWidth-f.clientWidth), buyIn: bt.left>=fr.left-1 && bt.right<=fr.right+1, L:vis(L), R:vis(R), Rw:R.getBoundingClientRect().width, Rh:R.getBoundingClientRect().height }; }"""
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300)
    ev("()=>document.querySelector('[data-act=tutSkip]').click()"); pg.wait_for_timeout(3200)
    ev("()=>{ G.hol='off'; hideBanner(); G.wxNext=1e12; G.wx=[]; G.vipNext=1e12; G.lesOff=true; G.money=5; deselect(); }"); pg.wait_for_timeout(400)
    s=ev(S)
    if s['max']<=4: expect(not s['L'] and not s['R'], 'a fleet that fits shows no arrows')
    else: expect(s['R'] and not s['L'], 'the starting fleet already runs past the strip here, and the right arrow says so')
    ev("()=>{ G.slots=13; G.money=1e6; const pid=G.crafts[0].home; while(G.crafts.length<13) addCraft(G.crafts[0].type,pid); UI.fleetKey=''; }"); pg.wait_for_timeout(600); s=ev(S)
    expect(s['max']>200 and not s['buyIn'], 'thirteen craft: the strip overflows and + FLEET SLOT is out of sight (%d px to scroll)'%s['max'])
    expect(s['R'] and not s['L'] and s['Rw']>=24 and s['Rh']>=40, 'an arrow at the right end says there is more, big enough to hit (%dx%d)'%(s['Rw'],s['Rh']))
    if not touch:
        box=pg.locator('#fleet').bounding_box(); pg.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2); pg.mouse.wheel(0, 300); pg.wait_for_timeout(300); s2=ev(S)
        expect(s2['sl']>=250, 'the mouse wheel turns the strip sideways (%d px)'%s2['sl'])
        expect(s2['L'], 'and once it has moved, an arrow at the left end leads back')
        ev("()=>{ document.getElementById('fleet').scrollLeft=0; }"); pg.wait_for_timeout(200)
    n=0
    while n<12:
        s=ev(S)
        if not s['R']: break
        tap('#fleetR'); pg.wait_for_timeout(500); n+=1
    s=ev(S); expect(s['buyIn'] and not s['R'] and s['L'], 'the right arrow walks to the end in %d taps: + FLEET SLOT is in view, and the arrow is gone'%n)
    slots=ev("()=>G.slots"); tap('#fleet [data-act=buySlot]'); expect(ev("()=>G.slots")==slots+1, 'and the button works from there')
    tap('#fleetL'); pg.wait_for_timeout(500); s3=ev(S); expect(s3['sl']<s['sl'], 'the left arrow goes back')
    # a port screen covers the strip on a phone; when the map comes back the arrows must be right again
    ev("()=>{ document.getElementById('fleet').scrollLeft=0; const c=G.crafts.find(c=>c.state==='dock'); selectCraft(c.id); }"); pg.wait_for_timeout(600); ev("()=>deselect()"); pg.wait_for_timeout(600); s4=ev(S)
    expect(s4['R'] and not s4['L'], 'after a port screen has been open and closed the right arrow is back')
    if errs: probs.append('page errors: '+' | '.join(errs[:3]))
    pg.screenshot(path='/tmp/fleet_%d.png'%W); b.close()
print('PROBLEMS:',len(probs)); [print('  ',x) for x in probs]
sys.exit(1 if probs else 0)
