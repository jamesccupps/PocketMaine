# Aunt Bev's lessons: one for each thing a level opens. For each, the game is put where that thing has just unlocked,
# and the test does only what she points at: taps the ringed thing, or her GOT IT. Fails if a lesson never comes up,
# comes up out of order, gets stuck, covers what it points at, or runs off the screen.
#   python3 test/lessons.py 386x630x3
import sys, os
from playwright.sync_api import sync_playwright
exec(open('test/audit.py').read().split("sizes=[")[0].split("import sys")[1].split("from playwright.sync_api import sync_playwright")[1])  # AUDIT
W,H,D=[int(v) for v in (sys.argv[1] if len(sys.argv)>1 else '386x630x3').split('x')]; touch=W<800; probs=[]
STATE = """() => { const b=document.getElementById('coachbub'), r=document.getElementById('coachring'), on=document.getElementById('coach').classList.contains('on');
  if(!on) return {on:false, cur:UI.lesCur||'', done:Object.keys(G.les||{}).filter(k=>G.les[k]===1), screen:UI.screen};
  const br=b.getBoundingClientRect(), rr=r.classList.contains('on')?r.getBoundingClientRect():null, nx=b.querySelector('[data-act=lesNext]');
  return {on:true, id:UI.coachId, cur:UI.lesCur||'', text:b.querySelector('p').innerText, head:b.querySelector('b').innerText, bub:[br.left,br.top,br.right,br.bottom], ring:rr?[rr.left,rr.top,rr.right,rr.bottom]:null,
    next:nx?[nx.getBoundingClientRect().left+nx.offsetWidth/2, nx.getBoundingClientRect().top+nx.offsetHeight/2]:null, skip:!!b.querySelector('[data-act=lesSkip]'), vw:innerWidth, vh:innerHeight,
    done:Object.keys(G.les||{}).filter(k=>G.les[k]===1), screen:UI.screen}; }"""
# what has to be true in the world for each lesson to have something to point at
STAGE = {
 'vip':    "() => { let v=null; for(let i=0;i<40&&!v;i++) v=spawnVip(PORT_BY.pwm); const P=PORTS.find(p=>vipAt(p.id)); centerOn(P.x,P.y); }",
 'names':  "() => {}", 'events': "() => {}",
 'trade':  "() => { G.crafts.filter(c=>c.state==='dock').forEach(c=>c.jobs.slice().forEach(j=>unloadJob(c,j.id))); }",
 'reg1':   "() => {}", 'wear': "() => {}", 'catch': "() => {}", 'fits': "() => {}", 'reg2': "() => {}", 'crew': "() => {}",
 'works':  "() => { const p=PORT_BY.pwm; centerOn(p.x,p.y); }",
 'rival':  "() => { const st=G.ports.pwm; refreshBoard(PORT_BY.pwm); st.jobs.slice(0,2).forEach(j=>{ j.rv=G.t+80; }); centerOn(PORT_BY.pwm.x,PORT_BY.pwm.y); }",
 'reg3':   "() => {}", 'runs': "() => {}" }
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)[:300])); ev=pg.evaluate
    pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(600)
    def tap(sel):
        loc=pg.locator(sel).first; (loc.tap if touch else loc.click)(timeout=3000); pg.wait_for_timeout(450)
    tapxy=lambda x,y: ((pg.touchscreen.tap if touch else pg.mouse.click)(x,y), pg.wait_for_timeout(650))
    def bad(m): probs.append(m); print('   !!! '+m)
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300); tap('#coachbub [data-act=tutSkip]')
    ev("() => { HOLIDAY_FORCE='off'; G.wx=[]; G.wxNext=1e12; G.vipNext=1e12; G.reqNext=1e12; G.rivalNext=1e12; G.money=60000; G.t=300*0.45; }")
    st=ev(STATE); 
    if st['on']: bad('a lesson came up at level 1, before anything had unlocked: %s'%st.get('text'))
    order=ev("() => LESSON_ORDER"); lv=ev("() => { const o={}; LESSON_ORDER.forEach(id=>o[id]=FEATURE_BY[id].lvl); return o; }"); names=ev("() => { const o={}; LESSON_ORDER.forEach(id=>o[id]=FEATURE_BY[id].name.toUpperCase()); return o; }")
    for les in order:
        ev("() => { deselect(); UI.lesWait=1e15; }"); ev(STAGE[les]); ev("(l) => { G.level=l; UI.lesCur=''; UI.lesWait=0; UI.coachKey=''; }", lv[les]); pg.wait_for_timeout(700)
        print('== %s (level %d)'%(les, lv[les])); last=None; same=0; steps=0; shown=False
        while steps<14:
            steps+=1; st=ev(STATE)
            if les in st['done']: break
            if not st['on']:
                same+=1; pg.wait_for_timeout(500)
                if same>6: bad('%s: nothing on screen to follow (screen %s)'%(les,st['screen'])); break
                continue
            if st['cur']!=les: bad('%s: the lesson on screen is "%s"'%(les,st['cur'])); break
            if st['id']!=last:
                shown=True; same=0; print('   %-13s %s | %s'%(st['id'],st['head'],st['text']))
                if names[les] not in st['head']: bad('%s: the bubble is headed "%s"'%(les,st['head']))
                if not st['skip']: bad('%s: no SKIP button'%st['id'])
                for i in ev(AUDIT): bad('%s: %s'%(st['id'],i))
                bx=st['bub']; rg=st['ring']
                if bx[0]<-1 or bx[1]<-1 or bx[2]>st['vw']+1 or bx[3]>st['vh']+1: bad('%s: bubble runs off the screen %s'%(st['id'],[round(v) for v in bx]))
                if rg and not (bx[2]<=rg[0] or bx[0]>=rg[2] or bx[3]<=rg[1] or bx[1]>=rg[3]): bad('%s: bubble covers the thing it points at (bubble %s ring %s)'%(st['id'],[round(v) for v in bx],[round(v) for v in rg]))
                if rg and (rg[0]<-6 or rg[1]<-6 or rg[2]>st['vw']+6 or rg[3]>st['vh']+6): bad('%s: the ringed thing is off the screen %s'%(st['id'],[round(v) for v in rg]))
                if steps<=2 or st['next']: pg.screenshot(path='test/les%d_%s_%s.png'%(W,les,st['id'].split('-')[-1]))
            else:
                same+=1
                if same>4: bad('%s: stuck on "%s"'%(les,st['text'])); break
            last=st['id']
            if st['next']: tapxy(*st['next'])
            elif st['ring']: rg=st['ring']; tapxy((rg[0]+rg[2])/2,(rg[1]+rg[3])/2)
            else: bad('%s: step "%s" points at nothing and has no button'%(les,st['id'])); break
        fin=ev(STATE)
        if not shown: bad('%s: the lesson never came up'%les)
        elif les not in fin['done']: bad('%s: following it did not finish it'%les)
        for e in errs: bad('JS ERROR: '+e)
        del errs[:]
    # SKIP drops one lesson; the Almanac switch silences them all; REPLAY brings them back
    ev("() => { deselect(); G.les={}; G.level=3; UI.lesWait=0; UI.lesCur=''; }"); pg.wait_for_timeout(700); st=ev(STATE)
    if not st['on']: bad('with the lessons reset at level 3, none came up')
    else:
        cur=st['cur']; tap('#coachbub [data-act=lesSkip]'); pg.wait_for_timeout(500); st2=ev(STATE)
        if cur not in st2['done']: bad('SKIP did not drop the "%s" lesson'%cur)
    ev("() => { openMenu('almanac'); }"); pg.wait_for_timeout(500); loc=pg.locator('#sbody [data-act=lesToggle]'); loc.scroll_into_view_if_needed(); (loc.tap if touch else loc.click)(); pg.wait_for_timeout(400)
    ev("() => { deselect(); UI.lesWait=0; }"); pg.wait_for_timeout(700)
    if ev(STATE)['on'] or not ev("() => G.lesOff"): bad('LESSONS: OFF in the Almanac does not silence them')
    ev("() => { openMenu('almanac'); }"); pg.wait_for_timeout(400); loc=pg.locator('#sbody [data-act=tutRestart]'); loc.scroll_into_view_if_needed(); (loc.tap if touch else loc.click)(); pg.wait_for_timeout(600)
    if ev("() => G.lesOff || Object.keys(G.les).length || G.tutDone"): bad('REPLAY THE TUTORIAL does not bring the lessons back')
    # a lesson that points at a craft card must not pin the fleet strip: the rest of the strip stays reachable
    ev("() => { G.tutDone=true; G.lesOff=false; G.les={}; G.level=2; G.slots=8; ['cub','cub','cub','cub'].forEach(t=>addCraft(t,'pwm')); deselect(); UI.lesWait=0; UI.lesCur=''; G.vipNext=1e12; PORTS.forEach(p=>{ G.ports[p.id].jobs=G.ports[p.id].jobs.filter(j=>!j.vip); }); }"); pg.wait_for_timeout(800)
    st=ev(STATE)
    if not (st['on'] and st['ring']): bad('expected a lesson pointing at a craft card on the map, got %s'%st.get('id'))
    ev("() => { const f=document.getElementById('fleet'); f.scrollLeft=f.scrollWidth; }"); pg.wait_for_timeout(700)
    fl=ev("() => { const f=document.getElementById('fleet'); return [f.scrollLeft, f.scrollWidth-f.clientWidth]; }")
    if fl[1]>20 and fl[0]<fl[1]-4: bad('a lesson pointing at a craft pins the fleet strip: scrolled to the end, it snapped back to %d of %d'%(fl[0],fl[1]))
    ev("() => { deselect(); }")
    # a save from before the lessons existed, with a lot already unlocked, is asked once instead of being handed a queue
    def old_save(level):
        ev("(l) => { G.tutDone=true; G.level=l; delete G.les; delete G.lesOff; delete G.lesAsked; delete G.lesAsk; G.vipNext=1e12; saveGame(STORE); }", level); pg.reload(); pg.wait_for_timeout(700); tap('#mbox [data-act=continue]'); pg.wait_for_timeout(1200); return ev(STATE)
    st=old_save(5)
    if not (st['on'] and st['id']=='les-offer' and 'CATCHING UP' in st['head']): bad('an older save at level 5 is not asked whether it wants the lessons (got %s)'%st.get('id'))
    else:
        print('   offer         %s | %s'%(st['head'],st['text'])); pg.screenshot(path='test/les%d_offer.png'%W)
        for i in ev(AUDIT): bad('offer: %s'%i)
        tapxy(*st['next']); pg.wait_for_timeout(500); st2=ev(STATE)
        if not (st2['on'] and st2['id']!='les-offer' and st2['cur']): bad('SHOW ME does not start the lessons (got %s)'%st2.get('id'))
    st=old_save(5)
    if st.get('id')!='les-offer': bad('the offer does not come back for another old save')
    else:
        tap('#coachbub [data-act=lesSkip]'); pg.wait_for_timeout(500); st2=ev(STATE); armed=ev("() => LESSON_ORDER.filter(id => feat(id) && !G.les[id]).length")
        if st2['on'] or armed: bad('NO THANKS leaves %d lessons waiting'%armed)
        ev("() => { G.level=6; UI.lesWait=0; }"); pg.wait_for_timeout(800); st3=ev(STATE)
        if not (st3['on'] and st3['cur'] in ('reg2','crew')): bad('after NO THANKS, the next level still gets its own lesson (got %s)'%st3.get('cur'))
    st=old_save(2); 
    if st.get('id')=='les-offer': bad('a game with only a couple of things unlocked gets the offer instead of the lessons')
    # opening a craft for your own reasons never brings up a lesson you were not following
    ev("() => { G.les={}; G.lesAsked=1; G.lesAsk=0; G.level=6; UI.lesCur=''; UI.lesWait=1e15; deselect(); const c=G.crafts.find(x=>x.state==='dock'); selectCraft(c.id,true); UI.lesWait=0; }"); pg.wait_for_timeout(800); st=ev(STATE)
    if st['on']: bad('a lesson came up inside a craft that was opened without following one: %s'%st.get('text'))
    for e in errs: bad('JS ERROR: '+e)
    b.close()
print('\nPROBLEMS: %d'%len(probs))
for q in probs: print('  '+q[:300])
