# Playtest: drives the real interface with taps (phone) or clicks (desktop), the way a player would,
# prints what is written on each screen, and checks layout, wording and errors at every step.
import sys, re
from playwright.sync_api import sync_playwright
exec(open('test/audit.py').read().split("sizes=[")[0].split("import sys")[1].split("from playwright.sync_api import sync_playwright")[1])  # AUDIT, LOADVIS, ROWVIS
DUMP = """() => { const T=(sel,n)=>{ const e=document.querySelector(sel); if(!e) return ''; const cs=getComputedStyle(e); if(cs.display==='none') return ''; return (e.innerText||'').replace(/\\s+/g,' ').trim().slice(0,n||400); };
  const vis=sel=>[...document.querySelectorAll(sel)].filter(e=>e.offsetParent!==null).map(e=>(e.innerText||'').replace(/\\s+/g,' ').trim());
  const c=UI.selCraft; return { screen: UI.screen+(UI.sheet?':'+UI.sheet:'')+(UI.screen==='sheet'&&UI.sheet!=='contracts'&&UI.sheet!=='market'&&UI.sheet!=='almanac'&&UI.sheet!=='yard'?'/'+UI.stab:''), craft: c? CRAFT_BY[c.type].name+' ('+CRAFT_BY[c.type].cls+') '+c.state : '',
    hud: T('#moneybox')+' | '+T('#lvlbox',20)+' | '+T('#landbtn'), bev: T('#bevmap',200), head: UI.screen==='sheet'?T('#shead',160):'', left: UI.screen==='sheet'?T('#lbody',330):'', tabs: UI.screen==='sheet'?T('#stabs',80):'',
    body: UI.screen==='sheet'?T('#sbody',520):'', foot: UI.screen==='sheet'?T('#sfoot',220):'', route: T('#routebar',300), fleet: UI.screen==='sheet'?'':vis('#fleet .fc').join(' || ').slice(0,420), toasts: vis('#toasts .toast').join(' || ') }; }"""
WORDS = """() => { const c=UI.selCraft; const out=[]; const grab=sels=>sels.map(s=>{const e=document.querySelector(s); return e&&e.offsetParent!==null?(e.innerText||''):'';}).join(' \\n ');
  const all=grab(['#app']); const m=all.match(/undefined|NaN|\\[object|null\\b/); if(m) out.push('BAD TEXT "'+m[0]+'" near: '+all.slice(Math.max(0,m.index-40),m.index+30).replace(/\\s+/g,' '));
  if(c && UI.screen!=='map'){ const boat=CRAFT_BY[c.type].cls==='boat'; const stab=UI.stab; let t=grab(['#shead','#lbody','#sfoot','#routebar','#bevmap','#toasts']); if(UI.screen==='sheet'&&(stab==='jobs'||stab==='fish')) t+=' '+grab(['#sbody']);
    const bad = boat ? /\\b(FLY|Fly|fly|flying|Flying|flight|Flights?|flights|LANDED|Landed|landed at|takeoff|runway|up there|can land)\\b/ : /\\b(CAST OFF|Steaming|Under way|Heading in|out there|tie up|GO FISHING)\\b/;
    const m2=t.match(bad); if(m2) out.push((boat?'BOAT':'PLANE')+' SCREEN SAYS "'+m2[0]+'": ...'+t.slice(Math.max(0,m2.index-50),m2.index+40).replace(/\\s+/g,' ')+'...'); }
  return out; }"""
W,H,D = (386,630,3)
if len(sys.argv)>1 and 'x' in sys.argv[1]: W,H,D=[float(v) if '.' in v else int(v) for v in sys.argv[1].split('x')]
starts = [a for a in sys.argv[2:] if a in ('casco','penobscot','bangor')] or ['casco','penobscot','bangor']
verbose = '-q' not in sys.argv
import os
SHOW_FROM=int(os.environ.get('SHOW_FROM','0'))
touch = W < 800
problems=[]; seen_cards=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    for si,start in enumerate(starts):
        ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch)
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('JS ERROR: '+str(e)[:200])); pg.on('console', lambda m: errs.append('CONSOLE: '+m.text[:200]) if m.type=='error' else None)
        pg.goto('file://'+__import__('os').path.abspath('index.html')); pg.wait_for_timeout(600)
        step=[0]
        def tap(sel, nth=0):
            pg.wait_for_timeout(120)
            if not sel.startswith('#mbox') and pg.evaluate("()=>document.getElementById('modal').classList.contains('show')&&!!document.querySelector('#mbox .card.unl')"):   # a level-up card: read it, close it, carry on
                seen_cards.append(pg.evaluate("()=>document.getElementById('mbox').innerText.slice(0,60)")); g=pg.locator('#mbox .btn.go'); (g.tap if touch else g.click)(); pg.wait_for_timeout(350)
            for attempt in (0,1):
                try:
                    loc=pg.locator(sel).nth(nth); loc.scroll_into_view_if_needed(timeout=3000)
                    (loc.tap if touch else loc.click)(timeout=3000); break
                except Exception as e:
                    if attempt: raise
                    pg.wait_for_timeout(300)
            pg.wait_for_timeout(420)
        def tap_xy(x,y):
            (pg.touchscreen.tap if touch else pg.mouse.click)(x,y); pg.wait_for_timeout(420)
        def port_xy(pid): return pg.evaluate("(pid)=>{ const r=document.getElementById('map').getBoundingClientRect(), p=PORT_BY[pid]; return [r.left+p.sx*VIEW.S, r.top+p.sy*VIEW.S, r.left, r.top, r.right, r.bottom]; }", pid)
        def check(label, show=True, shot=False):
            step[0]+=1; pg.wait_for_timeout(250); d=pg.evaluate(DUMP); iss=pg.evaluate(AUDIT)+pg.evaluate(WORDS)+errs[:]; del errs[:]
            if shot: pg.screenshot(path='test/pt%d_%s_%02d_%s.png'%(W,start,step[0],re.sub(r'\W+','_',label)[:24]))
            if show and ((verbose and step[0]>=SHOW_FROM) or iss):
                print('\n[%s %02d] %s  <%s>  %s'%(start,step[0],label,d['screen'],d['craft']))
                for k in ('hud','bev','head','left','tabs','body','foot','route','fleet','toasts'):
                    if d[k]: print('   %-6s %s'%(k+':',d[k]))
            for i in iss: problems.append('[%s %02d %s] %s'%(start,step[0],label,i)); print('   !!! '+i[:230])
            return d
        def expect(cond, msg):
            if not cond: problems.append('[%s %02d] EXPECTED: %s'%(start,step[0],msg)); print('   !!! EXPECTED: '+msg)
        ev=lambda js,*a: pg.evaluate(js,*a)
        # ---- title -> start ----
        check('title', show=si==0)
        tap('#mbox .btn.go'); check('choose start', show=si==0)
        tap('.startc[data-arg=%s]'%start); pg.wait_for_timeout(4400)
        expect(ev("()=>document.getElementById('coach').classList.contains('on')&&UI.coachId==='intro'"), 'a new game opens with the tutorial')
        tap('#coachbub [data-act=tutSkip]'); expect(ev("()=>G.tutDone"), 'SKIP turns the tutorial off')
        check('map at start', shot=True)
        n=ev("()=>G.crafts.length"); fished=False
        for i in range(n):
            tap('#fleet .fc', i)
            info=ev("()=>{ const c=UI.selCraft; return c?{cls:CRAFT_BY[c.type].cls, fish:!!CRAFT_BY[c.type].fish, name:c.name, at:c.at}:null; }")
            expect(info is not None, 'tapping fleet card %d opens a craft'%i)
            if not info: continue
            d=check('open craft %d: %s'%(i,info['name']), shot=(i==0 or info['cls']=='boat'))
            lv=ev(LOADVIS); 
            if ev("()=>document.querySelectorAll('#sbody .jrow .btn.load:not([disabled])').length") : expect(lv.startswith('ok'), 'a LOAD button is in view when the port opens: '+lv)
            if info['cls']=='boat' and info['fish'] and not fished:
                tap('.stab[data-arg=fish]'); check('fishing tab', shot=True)
                if ev("()=>document.querySelectorAll('#sbody [data-act=fishGo]').length"):
                    tap('#sbody [data-act=fishGo]'); fished=True; d=check('after GO fishing'); expect(ev("()=>G.crafts[%d].state"%i) in ('move','hold'), 'boat left to fish'); continue
                else: tap('.stab[data-arg=jobs]')
            if ev("()=>!!document.querySelector('#sbody .jrow .btn.load:not([disabled])')"):
                tap('#sbody .jrow .btn.load:not([disabled])'); check('loaded one job')
            tap('#sfoot .btn.go'); d=check('pressed %s'%('CAST OFF' if info['cls']=='boat' else 'FLY'), shot=(i==0 or info['cls']=='boat'))
            if d['screen']!='route':
                expect(False, 'main button leads to route picking (got %s)'%d['screen']); ev("()=>deselect()"); continue
            expect(ev("()=>UI.stops.length")==0, 'pressing the go button never picks the destination for you')
            if not ev("()=>UI.stops.length"):
                tgt=ev("()=>{ const k=Object.keys(UI.reach||{}).filter(id=>UI.reach[id]===true&&G.ports[id].open); const c=UI.selCraft; const want=c.jobs.map(j=>j.to).find(t=>k.indexOf(t)>=0); return want||k[0]||null; }")
                if not tgt:
                    check('NO PORT IN REACH (dead end?)', shot=True); tap('#routebar [data-act=cancelRoute]'); check('back from dead end'); tap('#shead [data-act=toMap]'); continue
                x,y,l,t,r,bt=port_xy(tgt); expect(l<=x<=r and t<=y<=bt, 'destination %s is on screen in route mode (x=%d y=%d)'%(tgt,x,y)); tap_xy(x,y)
                check('tapped %s on the map'%tgt); expect(ev("()=>UI.stops.length")==1, 'tapping a ringed port adds it to the route')
            tap('#routebar .btn.go'); d=check('sent'); expect(ev("()=>G.crafts[%d].state"%i) in ('move','hold'), 'craft %d departed'%i)
        # ---- watch one under way ----
        for idx in ev("()=>G.crafts.map((c,i)=>c.state==='move'||c.state==='fish'?i:-1).filter(i=>i>=0)"):
            tap('#fleet .fc', idx); check('craft %d under way'%idx, shot=True)
            # a coin drifts past: tap it where it is actually drawn on screen
            ev("()=>{ UI.coins.length=0; UI.coinNext=0; }"); pg.wait_for_timeout(2600)
            q=ev("()=>{ const q=UI.coins[0]; if(!q) return null; const v=sceneView(); return {x:v.r.left+(q.x-v.ox)*v.sc, y:v.r.top+(q.y-v.oy)*v.sc, l:v.r.left, t:v.r.top, r:v.r.right, b:v.r.bottom, m:G.money}; }")
            expect(q is not None, 'a coin appears in the travel scene')
            if q:
                expect(q['l']-12<=q['x']<=q['r']+12 and q['t']+4<=q['y']<=q['b']-4, 'the coin is inside the visible scene (y=%d, scene %d..%d)'%(q['y'],q['t'],q['b']))
                if q['l']+6<=q['x']<=q['r']-6: tap_xy(q['x'],q['y']); expect(ev("()=>G.money")>q['m'], 'tapping the coin pays out')
            vis=ev("()=>{ const c=UI.selCraft, v=sceneView(); return c&&c.state==='move' ? [v.oy, v.oy+v.vh] : null; }")
            if idx==0 and ev("()=>!!document.querySelector('#sfoot [data-act=follow]')"): tap('#sfoot [data-act=follow]'); check('watch on map')
            ev("()=>deselect()"); pg.wait_for_timeout(200)
        # ---- time passes ----
        ev("()=>{ G.wall -= 720000; }"); pg.wait_for_timeout(1300); check('12 minutes later', shot=True)
        m0=ev("()=>G.money"); k=0
        while ev("()=>G.crafts.some(c=>c.state==='landed')") and k<8:
            tap('#landbtn'); d=check('collect %d'%k, shot=(k==0)); k+=1
        expect(ev("()=>G.money")>m0, 'collecting pays out (was %d, now %d)'%(m0, ev("()=>G.money")))
        ev("()=>deselect()")
        # ---- menus ----
        for name,arg in (('contracts','contracts'),('hangar','yard'),('fish market','market'),('almanac','almanac')):
            tap('#menu .mbtn[data-arg=%s]'%arg); check('menu: '+name, show=(si==0 or arg=='yard'), shot=(arg=='yard')); tap('#shead [data-act=toMap]')
        # ---- open a port, buy a slot and a craft, fit an upgrade, sign a contract ----
        ev("()=>{ G.money += 30000; G.level = Math.max(G.level, 6); }")
        pid=ev("()=>PORTS.filter(p=>!G.ports[p.id].open).sort((a,b)=>portCost(a.id)-portCost(b.id))[0].id")
        ev("(pid)=>{ centerOn(PORT_BY[pid].x, PORT_BY[pid].y); }", pid); pg.wait_for_timeout(300); x,y,*_=port_xy(pid); tap_xy(x,y)
        d=check('tapped locked port %s on the map'%pid, shot=True); expect(d['screen'].startswith('sheet:port'), 'tapping a grey port opens its screen'); expect(not ev("(pid)=>G.ports[pid].open",pid), 'one tap on a grey port only opens its screen, it must not buy it')
        if ev("()=>!!document.querySelector('[data-act=unlock]:not([disabled])')"): tap('[data-act=unlock]'); check('opened port'); expect(ev("(pid)=>G.ports[pid].open",pid), 'port opened')
        ev("()=>deselect()")
        # ---- the yard: go there from the HANGAR menu, buy a part, build from parts, store a craft, take it out ----
        tap('#menu .mbtn[data-arg=yard]'); tap('#sbody [data-act=gotoYard]'); d=check('yard, from the HANGAR menu', shot=True)
        yp=ev("()=>UI.selPort"); expect(ev("()=>!!PORT_BY[UI.selPort].yard&&UI.stab==='port'"), 'GO opens that town on its yard tab')
        expect(ev("()=>(G.ports[UI.selPort].shelf||[]).length")>0, 'the yard has parts on the shelf')
        n0=ev("()=>partsCount()"); m0=ev("()=>G.money"); tap('#sbody [data-act=buyPart]:not([disabled])'); d=check('bought a part'); expect(ev("()=>partsCount()")==n0+1 and ev("()=>G.money")<m0, 'buying a part puts it in the bin and costs money')
        kind=ev("()=>PORT_BY[UI.selPort].yard.indexOf('h')>=0?'cub':'skiff'"); ev("(t)=>{ [0,1,2].forEach(s=>{ if(!G.parts[t+':'+s]) givePart(t,s); }); forcePanel(); }",kind); pg.wait_for_timeout(400)
        tap('#sbody .seg[data-arg=build]'); d=check('all three parts in the bin', shot=True); expect(ev("()=>!!document.querySelector('#sbody [data-act=build]:not([disabled])')"), 'a BUILD button appears when all three parts are held')
        full=ev("()=>G.crafts.length>=G.slots"); c0=ev("()=>G.crafts.length"); s0=ev("()=>G.stored.length")
        if ev("()=>!!document.querySelector('#sbody [data-act=build]:not([disabled])')"):
            tap('#sbody [data-act=build]:not([disabled])'); d=check('built from parts', shot=True)
            if full: expect(ev("()=>G.stored.length")==s0+1 and ev("()=>G.crafts.length")==c0, 'with the fleet full, the built craft goes into storage')
            else: expect(ev("()=>G.crafts.length")==c0+1, 'the built craft joins the fleet')
        ev("()=>deselect()"); pg.wait_for_timeout(200)
        tap('#fleet [data-act=buySlot]'); check('bought fleet slot'); 
        if ev("()=>G.stored.length"):
            ev("(p)=>{ selectPort(p,true); }",yp); pg.wait_for_timeout(400); tap('#sbody .seg[data-arg=store]'); check('storage section', shot=True); c0=ev("()=>G.crafts.length")
            if ev("()=>!!document.querySelector('#sbody [data-act=unstore]:not([disabled])')"):
                tap('#sbody [data-act=unstore]:not([disabled])'); d=check('took a craft out of storage'); expect(ev("()=>G.crafts.length")==c0+1, 'TAKE OUT puts the craft back in the fleet')
            else: expect(False, 'TAKE OUT is offered when there is a free slot')
            ev("()=>deselect()"); pg.wait_for_timeout(200); tap('#fleet [data-act=buySlot]')
        # store one through the CRAFT tab, then bring it back
        sid=ev("(p)=>{ const c=G.crafts.find(c=>c.at===p&&c.state==='dock'&&!c.jobs.length&&hasYard(p,CRAFT_BY[c.type])); return c?c.id:0; }",yp)
        if sid:
            ev("(id)=>{ selectCraft(id,false); }",sid); pg.wait_for_timeout(300); tap('.stab[data-arg=craft]'); d=check('craft tab at a yard', shot=True); c0=ev("()=>G.crafts.length")
            tap('#sbody .seg[data-arg=keep]'); tap('#sbody [data-act=store]:not([disabled])'); d=check('stored a craft', shot=True); expect(ev("()=>G.crafts.length")==c0-1 and ev("()=>G.stored.length")>=1, 'STORE moves the craft into storage and frees a slot')
            if ev("()=>!!document.querySelector('#sbody [data-act=unstore]:not([disabled])')"): tap('#sbody [data-act=unstore]:not([disabled])'); check('and took it back out')
        ev("()=>deselect()"); pg.wait_for_timeout(200)

        tap('#fleet .fc.fslot:not(.buy)'); d=check('tapped EMPTY SLOT', shot=True); expect(ev("()=>UI.screen==='sheet'&&!!PORT_BY[UI.selPort].yard"), 'EMPTY SLOT opens a yard'); tap('#sbody .seg[data-arg=new]'); check('yard: NEW')
        if ev("()=>!!document.querySelector('#sbody [data-act=buy]:not([disabled])')"):
            c0=ev("()=>G.crafts.length"); tap('#sbody [data-act=buy]:not([disabled])'); check('bought a craft'); expect(ev("()=>G.crafts.length")==c0+1, 'craft bought')
        else: expect(False, 'a craft can be bought from the EMPTY SLOT screen')
        if ev("()=>!!document.querySelector('.stab[data-arg=craft]')"):
            tap('.stab[data-arg=craft]'); check('craft tab', shot=True)
            if ev("()=>!!document.querySelector('#sbody [data-act=upg]:not([disabled])')"): tap('#sbody [data-act=upg]:not([disabled])'); check('fitted an upgrade', show=False)
        ev("()=>deselect()"); tap('#menu .mbtn', 0)
        if ev("()=>!!document.querySelector('[data-act=acceptK]:not([disabled])')"): tap('[data-act=acceptK]:not([disabled])'); check('signed a contract')
        ev("()=>deselect()")
        # ---- keep playing: 12 rounds of collect / load / send through the interface ----
        e0=ev("()=>G.stats.earned")
        for rnd in range(12):
            guard=0
            while guard<10 and ev("()=>G.crafts.some(c=>c.state==='landed'||(c.state==='dock'&&!c._tried))"):
                guard+=1; tap('#landbtn')
                st=ev("()=>{ const c=UI.selCraft; if(!c) return 'none'; c._tried=1; return UI.screen+'/'+c.state; }")
                if st!='sheet/dock': check('round %d: unexpected %s'%(rnd,st), show=False); ev("()=>deselect()"); continue
                check('round %d open'%rnd, show=False)
                # load everything for the best reachable destination using the chips and LOAD ALL
                dest=ev("()=>{ const c=UI.selCraft, st=G.ports[c.at], by={}; st.lay.concat(st.jobs).forEach(j=>{ if(legInfo(c,c.at,j.to).ok && roomFor(c,j.kind)>0) by[j.to]=(by[j.to]||0)+j.pay; }); const k=Object.keys(by).sort((a,b)=>by[b]-by[a]); return k[0]||null; }")
                if dest:
                    if ev("(d)=>!!document.querySelector('#sbody [data-act=loadAll][data-arg='+d+']')",dest): tap('#sbody [data-act=loadAll][data-arg=%s]'%dest)
                    elif ev("(d)=>!!document.querySelector('#sbody .dg[data-to='+d+'] .btn.load:not([disabled])')",dest): tap('#sbody .dg[data-to=%s] .btn.load:not([disabled])'%dest)
                    expect(ev("()=>UI.selCraft&&UI.selCraft.jobs.length")>0, 'round %d: loading for %s put something aboard'%(rnd,dest))
                    check('round %d loaded'%rnd, show=False)
                    tap('#sfoot .btn.go'); check('round %d route'%rnd, show=False)
                    if not ev("()=>UI.stops.length"):
                        x,y,l,t,r,bt=port_xy(dest); expect(l<=x<=r and t<=y<=bt, 'round %d: destination %s on screen'%(rnd,dest)); tap_xy(x,y)
                    if ev("()=>UI.stops.length"): tap('#routebar .btn.go'); check('round %d sent'%rnd, show=False)
                    else: check('round %d could not route to %s'%(rnd,dest)); ev("()=>deselect()")
                elif ev("()=>!!document.querySelector('.stab[data-arg=fish]')"):
                    tap('.stab[data-arg=fish]')
                    if ev("()=>!!document.querySelector('#sbody [data-act=fishGo]')"): tap('#sbody [data-act=fishGo]'); check('round %d fishing'%rnd, show=False)
                    else: ev("()=>deselect()")
                else: ev("()=>deselect()")
            ev("()=>{ G.crafts.forEach(c=>{ delete c._tried; }); deselect(); G.wall -= 300000; }"); pg.wait_for_timeout(900)
        d=check('after 12 more rounds (an hour of game time)', shot=True)
        e1=ev("()=>G.stats.earned"); expect(e1>e0+300, 'kept earning through the interface (earned %d -> %d)'%(e0,e1))
        print('\n== %s done: level %s, earned %s, stats %s'%(start, ev("()=>G.level"), e1, ev("()=>JSON.stringify(G.stats)")))
        ctx.close()
    b.close()
print('\nPROBLEMS: %d'%len(problems))
for q in problems: print('  '+q[:260])
