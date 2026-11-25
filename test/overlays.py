# One thing over the game at a time. Raises a banner, three notes and a lesson together and checks who shows:
# the banner alone first, then the lesson with the notes taking turns, under the top bar and clear of her bubble.
import sys, os
from playwright.sync_api import sync_playwright
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '386x630x3').split('x')]; touch=W<800; probs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); errs=[]
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(700)
    ev=pg.evaluate
    def tap(sel):
        loc=pg.locator(sel).first; (loc.tap if touch else loc.click)(timeout=3000); pg.wait_for_timeout(450)
    def expect(c,m):
        print(('  ok  ' if c else '  !!! ')+m)
        if not c: probs.append(m)
    SEE="""()=>{ const vis=el=>{ if(!el) return null; const r=el.getBoundingClientRect(), cs=getComputedStyle(el); return (r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden')?{l:r.left,t:r.top,r:r.right,b:r.bottom}:null; };
      const ban=document.getElementById('banner'), bs=getComputedStyle(ban), hud=document.getElementById('hud').getBoundingClientRect();
      return { banner: ban.classList.contains('show') && parseFloat(bs.opacity)>0.05, bub: vis(document.getElementById('coachbub')), notes: Array.from(document.getElementById('toasts').children).map(d=>({txt:d.textContent, r:vis(d)})), waiting: TOASTQ.length, hud: hud.bottom, phone: innerWidth<=700 }; }"""
    hit=lambda a,c: a and c and a['l']<c['r'] and a['r']>c['l'] and a['t']<c['b'] and a['b']>c['t']
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300); tap('#coachbub [data-act=tutSkip]'); pg.wait_for_timeout(3200)
    # every dialog opens at its top (the start screen used to open scrolled past its own heading on a phone)
    ev("""()=>{ G.hol='off'; G.wxNext=1e12; G.wx=[]; G.vipNext=1e12; G.level=Math.max(G.level,3); deselect(); document.getElementById('toasts').innerHTML=''; TOASTQ.length=0; hideBanner();
      G.lesOff=false; G.les={}; LESSON_ORDER.forEach(id=>{ G.les[id]=1; }); delete G.les.trade; G.lesAsked=1; G.lesAsk=0; UI.lesWait=0; UI.coachKey=''; }""")
    pg.wait_for_timeout(900); s=ev(SEE); expect(s['bub'] is not None and not s['banner'], 'a lesson is up on the map with nothing else')
    ev("()=>{ banner('Summer','Tourists by the busload.'); toast('First note'); toast('Second note','good'); toast('Third note'); }"); pg.wait_for_timeout(700); s=ev(SEE)
    expect(s['banner'], 'the banner shows')
    expect(s['bub'] is None, 'Aunt Bev steps back while the banner is up')
    expect(len(s['notes'])==0 and s['waiting']==3, 'the three notes wait for the banner: %d showing, %d waiting'%(len(s['notes']),s['waiting']))
    ev("()=>toast('Too far for this craft.','bad')"); pg.wait_for_timeout(200); s=ev(SEE)
    expect([n['txt'] for n in s['notes']]==['Too far for this craft.'] and s['waiting']==3, 'but a note that answers a tap comes through even then')
    pg.wait_for_timeout(3900); s=ev(SEE); cap=1 if s['phone'] else 2
    expect(not s['banner'] and s['bub'] is not None, 'banner gone, the lesson is back')
    expect(0<len(s['notes'])<=cap, 'notes take turns: %d showing (at most %d here)'%(len(s['notes']),cap))
    expect(all(not hit(n['r'],s['bub']) for n in s['notes']), 'no note sits on her bubble')
    expect(all(n['r'] and n['r']['t']>=s['hud']-1 for n in s['notes']) if s['phone'] else True, 'on a phone the note is under the top bar, not on it')
    seen=set(n['txt'] for n in s['notes'])
    for _ in range(12):
        pg.wait_for_timeout(400); s=ev(SEE); seen|=set(n['txt'] for n in s['notes'])
        if len(s['notes'])>cap or any(hit(n['r'],s['bub']) for n in s['notes']): probs.append('notes piled up or covered the bubble while taking turns'); break
    expect(seen>={'First note','Second note','Third note'}, 'all three notes were shown in turn: '+', '.join(sorted(seen)))
    pg.wait_for_timeout(3000); s=ev(SEE); expect(len(s['notes'])==0 and s['waiting']==0, 'and they clear')
    # a note that answers a tap does not wait its turn
    ev("()=>{ toast('Waiting one'); toast('Waiting two'); toast('Out of range.','bad'); }"); pg.wait_for_timeout(150); s=ev(SEE)
    expect(any(n['txt']=='Out of range.' for n in s['notes']), 'a note that something went wrong shows at once')
    # with a sheet open a banner becomes a note, so nothing lands on the port screen in big letters
    ev("()=>{ document.getElementById('toasts').innerHTML=''; TOASTQ.length=0; G.les.trade=1; UI.lesCur=''; UI.coachKey=''; selectCraft(G.crafts[0].id); }"); pg.wait_for_timeout(500)
    ev("()=>banner('Level 9','$900 bonus.')"); pg.wait_for_timeout(300); s=ev(SEE)
    expect(not s['banner'] and len(s['notes'])==1, 'over a port screen a banner arrives as one note: screen '+ev('()=>UI.screen')+', banner '+str(s['banner'])+', notes '+str([n['txt'][:30] for n in s['notes']]))
    # the start screen opens at its top
    ev("()=>{ deselect(); showTitle(false); document.getElementById('mbox').scrollTop=9999; showStart(); }"); pg.wait_for_timeout(300)
    expect(ev("()=>document.getElementById('mbox').scrollTop")==0, 'a dialog opens at its top')
    if errs: probs.append('page errors: '+' | '.join(errs[:3]))
    b.close()
print('overlays %dx%d: %s'%(W,H,'ok' if not probs else '%d problem(s): '%len(probs)+'; '.join(probs)))
sys.exit(1 if probs else 0)
