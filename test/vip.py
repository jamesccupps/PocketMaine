# Plays the VIP, holiday and event flow by taps: the level cards, the gold row, LOAD, delivery, the Almanac, save and reload.
import sys, os
from playwright.sync_api import sync_playwright
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '386x630x3').split('x')]; touch=W<800; probs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(600)
    ev=lambda js,*a: pg.evaluate(js,*a)
    def tap(sel):
        loc=pg.locator(sel).first; loc.scroll_into_view_if_needed(timeout=3000); (loc.tap if touch else loc.click)(timeout=3000); pg.wait_for_timeout(450)
    def expect(c,m):
        print(('  ok  ' if c else '  !!! ')+m)
        if not c: probs.append(m)
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300); tap('#coachbub [data-act=tutSkip]')
    ev("()=>{ G.wxNext=1e12; G.wx=[]; G.vipNext=1e12; deselect(); gainXp(xpNeed(G.level)-G.xp); }"); pg.wait_for_timeout(700)
    card=ev("()=>document.getElementById('mbox').innerText"); expect('VIPS' in card.upper() and 'NAMES' in card.upper(), 'level 2 card announces VIPs and names')
    expect(ev("()=>vipJobs().length")==1, 'a VIP is on a board the moment level 2 is reached'); tap('#mbox .btn.go')
    toast=ev("()=>document.getElementById('toasts').innerText"); expect('VIP at' in toast, 'a toast says where the VIP is: '+toast[:70].replace('\n',' '))
    ev("()=>{ PORTS.forEach(p=>{ const st=G.ports[p.id]; st.jobs=st.jobs.filter(j=>!j.vip); }); const c=G.crafts.find(c=>c.at==='pwm'&&CRAFT_BY[c.type].wheels); G.ports.pwm.jobs.unshift({id:G.nextId++,from:'pwm',to:'lew',kind:'p',pay:240,label:'A film location scout',ic:'tourist',vip:'part',exp:G.t+480}); selectCraft(c.id,true); }"); pg.wait_for_timeout(700)
    first=ev("()=>{ const r=document.querySelector('.rows .dg .jrow'); return r?r.className+' | '+r.innerText.replace(/\\n/g,' '):''; }"); expect('vip' in first and 'VIP' in first and 'PARTS CRATE' in first, 'the VIP row is first on the board with its reward: '+first[:90])
    n0=ev("()=>partsCount()"); tap('.jrow.vip .btn.load')
    expect(ev("()=>UI.selCraft.jobs.some(j=>j.vip)"), 'LOAD puts the VIP aboard')
    ev("()=>{ dispatch(UI.selCraft,['lew']); }"); pg.wait_for_timeout(400); ev("()=>{ G.wall -= 400*1000; }"); pg.wait_for_timeout(1500)
    expect(ev("()=>G.stats.vips")==1 and ev("()=>partsCount()")==n0+1, 'delivered: counted, and the parts crate arrived')
    expect(ev("()=>logCount('vip')")==1, 'logbook has the VIP')
    ev("()=>{ openMenu('almanac'); }"); pg.wait_for_timeout(500); alm=ev("()=>document.getElementById('sbody').innerText"); expect('VIPs met 1 of' in alm and '1 carried' in alm, 'almanac shows VIPs carried and met')
    expect(('THANKSGIVING' in alm.upper()) == bool(ev("()=>!!holidayNow()")), 'almanac ON NOW matches the calendar')
    for i in range(8): tap('[data-act=holiday]')
    expect(ev("()=>holidayPref()")=='auto', 'the HOLIDAYS switch cycles back to AUTO')
    ev("()=>{ deselect(); gainXp(xpNeed(G.level)-G.xp); }"); pg.wait_for_timeout(700); card=ev("()=>document.getElementById('mbox').innerText"); expect('EVENTS' in card.upper() and ev("()=>!!G.ev"), 'level 3 card announces events and one is on: '+str(ev("()=>G.ev&&G.ev.name")))
    tap('#mbox .btn.go'); ev("()=>{ openMenu('almanac'); }"); pg.wait_for_timeout(500); alm=ev("()=>document.getElementById('sbody').innerText"); expect(ev("()=>G.ev.name").upper() in alm.upper() and 'Ends in' in alm, 'almanac describes the event')
    ev("()=>{ saveGame(STORE); }"); pg.reload(); pg.wait_for_timeout(900); tap('#mbox [data-act=continue]'); pg.wait_for_timeout(600)
    expect(ev("()=>G.stats.vips")==1 and ev("()=>!!G.ev") and not errs, 'save and reload keeps it all, no errors')
    print('errs',errs); print('PROBLEMS:',len(probs)); b.close()
