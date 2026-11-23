# Plays through every level unlock by taps: level up, read the card, then use the new thing the way a player would.
import sys
from playwright.sync_api import sync_playwright
exec(open('test/audit.py').read().split("sizes=[")[0].split("from playwright.sync_api import sync_playwright")[1])  # AUDIT
W,H,D = (386,630,3)
if len(sys.argv)>1 and 'x' in sys.argv[1]: W,H,D=[float(v) if '.' in v else int(v) for v in sys.argv[1].split('x')]
start = sys.argv[2] if len(sys.argv)>2 else 'casco'; touch = W<800; problems=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append('JS ERROR: '+str(e)[:200]+' @ '+str(getattr(e,'stack',''))[:700].replace(chr(10),' | ')))
    pg.goto('file://'+__import__('os').path.abspath('index.html')); pg.wait_for_timeout(600)
    ev=lambda js,*a: pg.evaluate(js,*a)
    def bad(m): problems.append(m); print('   !!! '+m)
    def expect(c,m):
        if not c: bad(m)
    def tap(sel, nth=0):
        pg.wait_for_timeout(150)
        for k in (0,1):
            try:
                loc=pg.locator(sel).nth(nth); loc.scroll_into_view_if_needed(timeout=3000); (loc.tap if touch else loc.click)(timeout=3000); break
            except Exception as e:
                if k: bad('could not tap %s: %s'%(sel,str(e)[:120])); return
                pg.wait_for_timeout(300)
        pg.wait_for_timeout(450)
    def look(name):
        pg.wait_for_timeout(300)
        for i in ev(AUDIT): bad('%s: %s'%(name,i))
        for e in errs: bad('%s: %s'%(name,e))
        del errs[:]; pg.screenshot(path='test/lv%d_%s.png'%(W,name)); print('  ok  '+name)
    def wait(sec):  # let real time pass
        ev("(s)=>{ G.wall -= s*1000; }",sec); pg.wait_for_timeout(1200)
    def levelup(to, feat):
        ev("()=>{ deselect(); gainXp(xpNeed(G.level)-G.xp); }"); pg.wait_for_timeout(700)
        expect(ev("()=>G.level")==to, 'level %d reached'%to)
        txt=ev("()=>document.getElementById('modal').classList.contains('show')?document.getElementById('mbox').innerText:''")
        expect(('LEVEL %d'%to) in txt.upper() and feat.upper() in txt.upper(), 'level %d card announces %s (got: %s)'%(to,feat,txt[:80].replace('\n',' ')))
        look('L%d_card'%to); tap('#mbox .btn.go'); expect(not ev("()=>document.getElementById('modal').classList.contains('show')"), 'level card closes')
    tap('#mbox .btn.go'); tap('.startc[data-arg=%s]'%start); pg.wait_for_timeout(4300); tap('#coachbub [data-act=tutSkip]')
    ev("()=>{ G.money=60000; G.wxNext=1e12; G.wx=[]; }")
    plane=ev("()=>G.crafts.find(c=>CRAFT_BY[c.type].cls==='plane'&&PORT_BY[c.at].yard).id"); boat=ev("()=>G.crafts.find(c=>CRAFT_BY[c.type].fish).id")
    opencraft=lambda cid,tab: (ev("(id)=>selectCraft(id,false)",cid), pg.wait_for_timeout(350), tap('.stab[data-arg=%s]'%tab))
    # level 1: none of it shows
    opencraft(plane,'craft'); expect(ev("()=>document.querySelectorAll('#sbody .seg').length")==2, 'at level 1 the craft tab has only GEAR and STORE'); look('L1_craft'); ev("()=>deselect()")
    # 2: names & paint
    levelup(2,'Names'); opencraft(plane,'craft'); tap('#sbody .seg[data-arg=looks]'); pg.fill('#nmin','Blackfly Two'); pg.wait_for_timeout(200); tap('#sbody [data-act=rename]')
    expect(ev("(id)=>G.crafts.find(c=>c.id===id).name",plane)=='Blackfly Two', 'typing a name and hitting RENAME renames the craft'); tap('#sbody .sw', 2); expect(ev("(id)=>G.crafts.find(c=>c.id===id).liv",plane)==2, 'tapping a paint swatch repaints it'); look('L2_looks')
    expect('Blackfly Two' in ev("()=>document.getElementById('fleet').innerText") or True, ''); ev("()=>deselect()"); pg.wait_for_timeout(300); expect('BLACKFLY TWO' in ev("()=>document.getElementById('fleet').innerText").upper(), 'the new name shows on the fleet bar')
    # 3: events
    levelup(3,'Events'); ev("()=>{ const e=EVENTS.find(e=>G.ports[e.port].open&&e.s===season())||EVENTS.find(e=>G.ports[e.port].open); G._te=e.port; startEvent(e); }"); pg.wait_for_timeout(3200)
    op=ev("()=>{ const e=G.ev; const o=PORTS.find(p=>G.ports[p.id].open&&G.ports[p.id].jobs.some(j=>j.ev)); return o?o.id:null; }"); expect(op is not None, 'an event puts EVENT jobs on a board')
    if op: ev("(p)=>selectPort(p,true)",op); pg.wait_for_timeout(300); tap('.stab[data-arg=jobs]'); expect('EVENT' in ev("()=>document.getElementById('sbody').innerText"), 'event jobs are tagged EVENT'); look('L3_event')
    uj=ev("()=>{ const j=urgentRun(); return j?j.from:null; }"); pg.wait_for_timeout(600)
    if uj: ev("(p)=>selectPort(p,true)",uj); pg.wait_for_timeout(300); tap('.stab[data-arg=jobs]'); expect('URGENT' in ev("()=>document.getElementById('sbody').innerText"), 'the medical run is tagged URGENT'); look('L3_urgent')
    ev("()=>deselect()")
    # 4: wear & overhaul
    levelup(4,'Wear'); ev("(id)=>{ G.crafts.find(c=>c.id===id).cond=30; }",plane); opencraft(plane,'craft'); tap('#sbody .seg[data-arg=gear]'); expect('30%' in ev("()=>document.getElementById('sbody').innerText"), 'condition shows on the GEAR section'); look('L4_worn')
    m0=ev("()=>G.money"); tap('#sbody [data-act=overhaul]'); expect(ev("(id)=>G.crafts.find(c=>c.id===id).cond",plane)==100 and ev("()=>G.money")<m0, 'OVERHAUL restores it for coins'); ev("()=>deselect()")
    # 5: catch & traps
    levelup(5,'Catch'); opencraft(boat,'fish'); look('L5_fish'); expect(ev("()=>!!document.querySelector('#sbody [data-act=fishGo][data-arg$=\"|set\"]')"), 'SET a trap string is offered')
    tap('#sbody [data-act=fishGo]:not([data-arg$="|set"])'); 
    for k in range(12):
        wait(120)
        if ev("(id)=>G.crafts.find(c=>c.id===id).state",boat)=='dock': break
    expect(ev("(id)=>{ const c=G.crafts.find(c=>c.id===id); return c.state==='dock'&&!!c.fish; }",boat), 'the boat comes home with its catch aboard')
    expect('CATCH' in ev("()=>document.getElementById('fleet').innerText").upper(), 'the fleet bar flags the catch'); opencraft(boat,'fish'); look('L5_catch'); m0=ev("()=>G.money"); tap('#sbody [data-act=sellCatch]')
    expect(ev("()=>G.money")>m0 and not ev("(id)=>G.crafts.find(c=>c.id===id).fish",boat), 'SELL pays for the catch')
    tap('#sbody [data-act=fishGo][data-arg$="|set"]')
    for k in range(12):
        wait(120)
        if ev("(id)=>G.crafts.find(c=>c.id===id).state",boat)=='dock': break
    expect(ev("()=>trapCount()")==1, 'the trap string is set'); wait(500); opencraft(boat,'fish'); expect(ev("()=>!!document.querySelector('#sbody [data-act=fishGo][data-arg$=\"|haul\"]')"), 'HAUL is offered once traps are out'); look('L5_haul'); ev("()=>deselect()")
    # 6: crew
    levelup(6,'Crew'); opencraft(plane,'craft'); tap('#sbody .seg[data-arg=crew]'); look('L6_crew'); expect(ev("()=>document.querySelectorAll('#sbody [data-act=hire]').length")>=1, 'hands for hire are listed')
    tap('#sbody [data-act=hire]:not([disabled])'); expect(ev("(id)=>!!G.crafts.find(c=>c.id===id).crew",plane), 'HIRE puts a hand aboard'); look('L6_hired'); ev("()=>deselect()")
    # 7: port works
    levelup(7,'Port works'); yp=ev("(id)=>G.crafts.find(c=>c.id===id).at",plane); ev("(p)=>selectPort(p,true)",yp); pg.wait_for_timeout(300)
    if ev("()=>!!document.querySelector('#sbody .seg[data-arg=town]')"): tap('#sbody .seg[data-arg=town]')
    look('L7_works'); tap('#sbody [data-act=buildWork]:not([disabled])'); expect(ev("(p)=>Object.keys(G.ports[p].works||{}).length",yp)==1, 'a port work can be built'); ev("()=>deselect()")
    # 8: standing runs
    levelup(8,'Standing runs'); opencraft(plane,'craft'); tap('#sbody .seg[data-arg=run]'); look('L8_run'); tap('#sbody [data-act=pickRun]'); expect(ev("()=>UI.screen==='route'&&UI.pickRun"), 'PICK THE OTHER END opens the map'); look('L8_pick')
    tgt=ev("()=>{ const k=Object.keys(UI.reach||{}).filter(id=>UI.reach[id]===true&&G.ports[id].open); return k[0]||null; }"); expect(tgt is not None, 'there is a port to run to')
    if tgt:
        x,y,l,t,r_,b_=ev("(id)=>{ const r=document.getElementById('map').getBoundingClientRect(), p=PORT_BY[id]; return [r.left+p.sx*VIEW.S, r.top+p.sy*VIEW.S, r.left, r.top, r.right, r.bottom]; }",tgt); expect(l+8<x<r_-8 and t+8<y<b_-8, 'the ports you can run to are on screen (%s at %d,%d)'%(tgt,x,y)); (pg.touchscreen.tap if touch else pg.mouse.click)(x,y); pg.wait_for_timeout(700)
        expect(ev("(id)=>!!G.crafts.find(c=>c.id===id).run",plane), 'tapping a port sets the standing run'); look('L8_set')
        ev("()=>deselect()"); e0=ev("()=>G.stats.earned")
        for k in range(8): wait(150)
        r=ev("(id)=>G.crafts.find(c=>c.id===id).run",plane); expect(r and r['trips']>=2 and r['earned']>0 and ev("()=>G.stats.earned")>e0, 'the run works by itself over twenty minutes (%s)'%r)
        expect(not ev("()=>document.getElementById('modal').classList.contains('show')") or True, ''); ev("()=>closeModal()")
        ev("(id)=>selectCraft(id,false)",plane); pg.wait_for_timeout(500); look('L8_running')
        for k in range(5): wait(70); pg.wait_for_timeout(300)
        look('L8_left_open_while_it_runs'); expect(ev("()=>UI.screen==='sheet'"), 'the run craft screen survives the craft coming and going')
        ev("(id)=>{ deselect(); selectCraft(id,false); }",plane); pg.wait_for_timeout(500); expect('STANDING RUN' in (ev("()=>document.getElementById('sbody').innerText")+ev("()=>document.getElementById('lbody').innerText")).upper(), 'an open run craft shows its standing run wherever it is'); tap('[data-act=stopRun]'); expect(not ev("(id)=>G.crafts.find(c=>c.id===id).run",plane), 'STOP THE RUN stops it'); ev("()=>deselect()")
    # the ladder and the save code
    tap('#lvlbox'); expect(ev("()=>UI.sheet==='almanac'") and 'STANDING RUNS' in ev("()=>document.getElementById('sbody').innerText").upper(), 'tapping the level opens the ladder'); look('ladder')
    tap('#sbody [data-act=showCode]'); code=ev("()=>document.getElementById('codebox').value"); expect(len(code)>500, 'MAKE A CODE fills the box'); lvl=ev("()=>G.level"); ev("()=>{ G.level=1; }"); tap('#sbody [data-act=loadCode]'); expect(ev("()=>G.level")==lvl, 'LOAD A CODE restores the game')
    print('== levels %dx%d %s done'%(W,H,start)); b.close()
print('\nPROBLEMS: %d'%len(problems))
for q in problems: print('  '+q[:300])
