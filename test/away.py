# Does the game keep going while nobody is looking? Sends a craft out, hides the page for twenty seconds without closing it,
# then closes the page and reopens it: after a real wait, after two hours, and after twenty.
import sys, os, json
from playwright.sync_api import sync_playwright
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '386x630x3').split('x')]; touch=W<800; probs=[]; KEY='finestkind.save.v2'
REAL=int(sys.argv[2]) if len(sys.argv)>2 else 40
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); errs=[]
    url='file://'+os.path.abspath('index.html')
    def open_page():
        pg=ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.goto(url); pg.wait_for_timeout(700); return pg
    def tap(pg,sel):
        loc=pg.locator(sel).first; (loc.tap if touch else loc.click)(timeout=3000); pg.wait_for_timeout(450)
    def expect(c,m):
        print(('  ok  ' if c else '  !!! ')+m)
        if not c: probs.append(m)
    STATE="()=>{ const c=G.crafts.find(q=>q.id===%d); return {state:c.state, at:c.at, rem:c.state==='move'?(c.route.len-c.route.pos)/cstat(c).speed:0, pend:c.pend?c.pend.pay:0, t:G.t, money:G.money, toast:document.getElementById('toasts').innerText}; }"
    pg=open_page(); tap(pg,'#mbox .btn.go'); tap(pg,'.startc[data-arg=casco]'); pg.wait_for_timeout(4300); tap(pg,'#coachbub [data-act=tutSkip]')
    cid=pg.evaluate("()=>{ G.wxNext=1e12; G.wx=[]; const c=G.crafts.find(q=>q.at==='pwm'&&CRAFT_BY[q.type].wheels), j={id:G.nextId++,from:'pwm',to:'lew',kind:'p',pay:100,label:'Test fare',ic:'any'}; G.ports.pwm.jobs.unshift(j); loadJob(c,j.id); dispatch(c,['lew']); return c.id; }")
    # Hidden but still open: another app in front, another tab, a phone with its screen off. The browser stops drawing frames,
    # but the autosave timer and the visibility event still fire. Frames are stopped here the same way, for twenty real seconds.
    HIDE="""()=>{ window.__raf=window.requestAnimationFrame; window.requestAnimationFrame=f=>{ window.__pending=f; return 0; }; window.__hid=true;
      Object.defineProperty(document,'hidden',{get:()=>window.__hid,configurable:true}); document.dispatchEvent(new Event('visibilitychange')); }"""
    SHOW="""()=>{ window.__hid=false; document.dispatchEvent(new Event('visibilitychange')); window.requestAnimationFrame=window.__raf; if(window.__pending) window.__raf(window.__pending); }"""
    pg.wait_for_timeout(1500); h0=pg.evaluate(STATE%cid); pg.evaluate(HIDE); __import__('time').sleep(20); pg.evaluate(SHOW); pg.wait_for_timeout(700); h1=pg.evaluate(STATE%cid)
    print('hidden but open for 20 real seconds: game clock moved %.0f s, %.0f s of flying left'%(h1['t']-h0['t'],h1['rem']))
    expect(h1['t']-h0['t']>=20 and abs((h0['rem']-h1['rem'])-(h1['t']-h0['t']))<3, 'time kept passing while the page was hidden but still open')
    s0=pg.evaluate(STATE%cid); pg.evaluate("()=>saveGame(STORE)"); pg.close()
    print('sent out: %s, %.0f s of flying left; page closed for %d real seconds'%(s0['state'],s0['rem'],REAL))
    expect(s0['state']=='move' and s0['rem']>REAL+20, 'the craft is under way with more than the wait left to fly')
    __import__('time').sleep(REAL)
    pg=open_page(); tap(pg,'#mbox [data-act=continue]'); pg.wait_for_timeout(900); s1=pg.evaluate(STATE%cid)
    print('reopened: %s, %.0f s left, game clock moved %.0f s'%(s1['state'],s1['rem'],s1['t']-s0['t']))
    expect(s1['state']=='move' and abs((s0['rem']-s1['rem'])-(s1['t']-s0['t']))<3 and s1['t']-s0['t']>=REAL, 'the trip kept going while the page was closed, by the real time away')
    def away(pg,hours):
        # the page saves itself as it closes, so the clock in the save is wound back from the title screen of a fresh page, then that page is loaded again
        pg.evaluate("()=>saveGame(STORE)"); pg.close(); q=open_page()
        q.evaluate("([k,h])=>{ const g=JSON.parse(localStorage.getItem(k)); g.wall-=h*3600*1000; localStorage.setItem(k,JSON.stringify(g)); }",[KEY,hours]); q.reload(); q.wait_for_timeout(700)
        tap(q,'#mbox [data-act=continue]'); q.wait_for_timeout(1500); return q
    pg=away(pg,2); s2=pg.evaluate(STATE%cid); print('after 2 hours closed: %s at %s, fare waiting $%d, clock moved %.0f s, toast: %s'%(s2['state'],s2['at'],s2['pend'],s2['t']-s1['t'],s2['toast'][:90].replace('\n',' ')))
    expect(s2['state']=='landed' and s2['at']=='lew' and s2['pend']==100, 'it landed while closed and the fare is waiting to be collected')
    expect(abs((s2['t']-s1['t'])-7200)<30, 'two hours closed is two hours of game time')
    expect('Away' in s2['toast'], 'a note says how long you were away')
    m0=s2['money']; pg.evaluate("(id)=>{ selectCraft(id,true); }",cid); pg.wait_for_timeout(900); s3=pg.evaluate(STATE%cid); expect(s3['money']==m0+100 and s3['state']=='dock', 'opening the craft collects the fare')
    pg=away(pg,20); s4=pg.evaluate(STATE%cid); print('after 20 hours closed: clock moved %.1f hours'%((s4['t']-s3['t'])/3600))
    expect(abs((s4['t']-s3['t'])-12*3600)<60, 'longer than twelve hours counts as twelve')
    expect(not errs, 'no errors: '+str(errs[:2])); print('PROBLEMS:',len(probs)); b.close()
