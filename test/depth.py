# Plays the depth features by taps: goods bought and sold, a port request filled, rival and connection tags, a fit, a three-stop run, the rival switch.
import sys, os
from playwright.sync_api import sync_playwright
exec(open('test/audit.py').read().split("sizes=[")[0].split("from playwright.sync_api import sync_playwright")[1])
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '386x630x3').split('x')]; touch=W<800; out='test/'; probs=[]
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
    def look(name):
        pg.wait_for_timeout(400); iss=ev(AUDIT); sp=ev("()=>[...document.querySelectorAll('.jtx')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.innerText.replace(/\\n/g,' ').slice(0,50))")
        expect(not iss and not sp and not errs, '%s: layout clean %s %s %s'%(name,iss[:2],sp[:2],errs[:2])); del errs[:]; pg.screenshot(path=out+'g%d_%s.png'%(W,name))
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300); tap('#coachbub [data-act=tutSkip]')
    ev("()=>{ G.wxNext=1e12; G.wx=[]; G.vipNext=1e12; G.reqNext=1e12; G.rivalNext=1e12; G.hol='off'; deselect(); gainXp(xpNeed(G.level)-G.xp); }"); pg.wait_for_timeout(600); tap('#mbox .btn.go')
    ev("()=>{ deselect(); gainXp(xpNeed(G.level)-G.xp); }"); pg.wait_for_timeout(600); card=ev("()=>document.getElementById('mbox').innerText"); expect('GOODS' in card.upper() and 'EVENTS' in card.upper(), 'level 3 card announces goods and events'); look('L3_card'); tap('#mbox .btn.go')
    ev("()=>{ G.money=4000; G.ev=null; ['vin','rkd'].forEach(id=>{ G.ports[id].open=true; refreshBoard(PORT_BY[id]); }); G.reqs=[{id:G.nextId++,pid:'vin',g:'wares',n:3,got:0,until:G.t+6000}]; const c=G.crafts.find(c=>c.type==='skiff'); window.BID=c.id; selectCraft(c.id,true); }"); pg.wait_for_timeout(600)
    ev("()=>{ const b=document.getElementById('sbody'); b.scrollTop=b.scrollHeight; }"); look('goods_for_sale')
    expect(ev("()=>!!document.querySelector('.dg.trade [data-act=buyGood]')"), 'the job board ends with goods for sale')
    tap('[data-act=buyGood]'); expect(ev("()=>goodsCount(UI.selCraft)")==3, 'BUY fills the cargo room that is left (3 on a skiff)'); look('goods_aboard')
    ev("()=>{ dispatch(UI.selCraft,['vin']); }"); pg.wait_for_timeout(300); ev("()=>{ G.wall-=1800*1000; }"); pg.wait_for_timeout(1800); ev("()=>{ selectCraft(window.BID,true); }"); pg.wait_for_timeout(900)
    txt=ev("()=>document.getElementById('sbody').innerText"); expect('asking for 3 city wares' in txt and 'GOODS ABOARD' in txt, 'at the other end: the request and the goods aboard are shown'); look('sell_here')
    m0=ev("()=>G.money"); tap('[data-act=sellGood]'); pg.wait_for_timeout(500); expect(ev("()=>G.money")>m0 and ev("()=>goodsCount(UI.selCraft)")==0 and ev("()=>G.ports.vin.favor")==1, 'SELL pays, empties the hold and fills the request'); look('sold')
    ev("()=>{ G.level=8; G.money=90000; deselect(); const c=G.crafts.find(c=>c.at==='pwm'&&CRAFT_BY[c.type].wheels); window.PID=c.id; G.ports.pwm.jobs.slice(0,3).forEach(j=>{ j.rv=G.t+80; }); G.ports.pwm.jobs[4].conn=1; selectCraft(c.id,true); }"); look('rival_tags')
    expect('RIVAL WANTS IT' in ev("()=>document.getElementById('sbody').innerText"), 'a claimed load is tagged')
    ev("()=>{ UI.stab='craft'; UI.cseg='gear'; forcePanel(); }"); pg.wait_for_timeout(500); look('fits'); tap('[data-act=fit][data-arg=range]'); expect(ev("()=>UI.selCraft.fit")=='range', 'a fit is bought on the GEAR page at a yard'); look('fitted')
    ev("()=>{ UI.cseg='run'; forcePanel(); }"); pg.wait_for_timeout(400); tap('[data-act=pickRun]'); ev("()=>{ setRun(UI.selCraft,'lew'); cancelRoute(); UI.stab='craft'; UI.cseg='run'; forcePanel(); }"); pg.wait_for_timeout(500)
    expect(ev("()=>!!document.querySelector('[data-act=pickRun]')") and 'ADD A STOP' in ev("()=>document.getElementById('sbody').innerText"), 'a run offers ADD A STOP'); look('run_two'); tap('[data-act=pickRun]')
    ev("()=>{ let e=setRun(UI.selCraft,'bbh'); if(e) e=setRun(UI.selCraft,'rkd'); window.E=e; cancelRoute(); UI.stab='craft'; UI.cseg='run'; forcePanel(); }"); pg.wait_for_timeout(500); expect(ev("()=>runStops(UI.selCraft.run).length")==3, 'and takes a third stop: '+str(ev("()=>runLabel(UI.selCraft.run)"))); look('run_three')
    ev("()=>{ openMenu('almanac'); const b=document.getElementById('sbody'); b.scrollTop=b.scrollHeight; }"); pg.wait_for_timeout(500); look('almanac_game'); tap('[data-act=rival]'); expect(ev("()=>G.rivalOff")==True, 'the rival can be switched off in the Almanac')
    print('PROBLEMS:',len(probs)); b.close()
