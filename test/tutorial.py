# Follows the tutorial exactly as a new player would: read what Aunt Bev says, tap the thing she has ringed (or her NEXT button),
# wait when she says wait. Fails if it gets stuck, if the bubble covers the thing it points at, runs off the screen, or says the wrong word for the craft.
import sys, re
from playwright.sync_api import sync_playwright
exec(open('test/audit.py').read().split("sizes=[")[0].split("import sys")[1].split("from playwright.sync_api import sync_playwright")[1])  # AUDIT
STATE = """() => { const b=document.getElementById('coachbub'), r=document.getElementById('coachring'), on=document.getElementById('coach').classList.contains('on');
  if(!on) return {on:false, done:G.tutDone, screen:UI.screen, sheet:UI.sheet, tut:Object.keys(G.tut).join(',')};
  const br=b.getBoundingClientRect(), rr=r.classList.contains('on')?r.getBoundingClientRect():null, nx=b.querySelector('[data-act=tutNext]'), sk=b.querySelector('[data-act=tutSkip]'), c=UI.selCraft;
  return {on:true, done:G.tutDone, id:UI.coachId, text:b.querySelector('p').innerText, head:b.querySelector('b').innerText, bub:[br.left,br.top,br.right,br.bottom], ring:rr?[rr.left,rr.top,rr.right,rr.bottom]:null, spot:r.classList.contains('spot'),
    next:nx?[nx.getBoundingClientRect().left+nx.offsetWidth/2, nx.getBoundingClientRect().top+nx.offsetHeight/2]:null, skip:!!sk, vw:innerWidth, vh:innerHeight, boat:c?CRAFT_BY[c.type].cls==='boat':null, screen:UI.screen, tut:Object.keys(G.tut).join(',')}; }"""
W,H,D = (386,630,3)
if len(sys.argv)>1 and 'x' in sys.argv[1]: W,H,D=[float(v) if '.' in v else int(v) for v in sys.argv[1].split('x')]
starts=[a for a in sys.argv[2:] if a in ('casco','penobscot','bangor')] or ['casco','penobscot','bangor']
touch = W<800; problems=[]
import random
wander = '--wander' in sys.argv; random.seed(7)
WANDER = ["const c=G.crafts[(Math.random()*G.crafts.length)|0]; act('selCraft', c.id)", "act('toMap')", "act('menu','contracts')", "act('menu','almanac')", "act('menu','market')", "if(UI.screen==='sheet'&&UI.sheet==='craft') act('stab','craft')", "if(UI.screen==='sheet'&&UI.sheet==='craft') act('stab','port')", "if(UI.screen==='route') act('cancelRoute')", "const p=PORTS[(Math.random()*PORTS.length)|0]; selectPort(p.id)", "zoomBy(1)", "zoomBy(-1)", "if(UI.selCraft&&UI.selCraft.state==='dock'&&UI.screen==='sheet') act('route')"]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    for start in starts:
        ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=touch, is_mobile=touch); pg=ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append('JS ERROR: '+str(e)[:200]))
        pg.goto('file://'+__import__('os').path.abspath('index.html')); pg.wait_for_timeout(600)
        tapxy=lambda x,y: ((pg.touchscreen.tap if touch else pg.mouse.click)(x,y), pg.wait_for_timeout(650))
        def bad(msg): problems.append('[%s %dx%d] %s'%(start,W,H,msg)); print('   !!! '+msg)
        (pg.locator('#mbox .btn.go').tap if touch else pg.locator('#mbox .btn.go').click)(); pg.wait_for_timeout(400)
        loc=pg.locator('.startc[data-arg=%s]'%start); (loc.tap if touch else loc.click)(); pg.wait_for_timeout(4500)
        seen=[]; last=None; same=0; n=0; shots=0
        while n<(400 if wander else 80):
            n+=1
            if wander and random.random()<0.4: pg.evaluate('()=>{ %s }'%random.choice(WANDER)); pg.wait_for_timeout(500)
            st=pg.evaluate(STATE)
            if st['done']: break
            for e in errs: bad(e)
            del errs[:]
            if not st['on']:
                # the tutorial is waiting for the player to come back to the map: do what a player would
                if st['screen']=='route': pg.evaluate("()=>act('cancelRoute')")
                elif st['screen']=='sheet': pg.evaluate("()=>act('toMap')")
                else: pg.evaluate("()=>{ G.wall -= 20000; }")
                pg.wait_for_timeout(700); same+=1
                if same>(60 if wander else 12): bad('tutorial went quiet and never came back (done so far: %s)'%st['tut']); break
                continue
            key=st['id']
            if key!=last:
                print('  %-8s %s | %s'%(st['id'], st['head'], st['text'])); seen.append(key); same=0
                if shots<14: pg.screenshot(path='test/tut%d_%s_%02d_%s.png'%(W,start,len(seen),key)); shots+=1
                for i in pg.evaluate(AUDIT): bad('%s: %s'%(key,i))
                bx=st['bub']
                if bx[0]<-1 or bx[1]<-1 or bx[2]>st['vw']+1 or bx[3]>st['vh']+1: bad('%s: bubble runs off the screen %s'%(key,[round(v) for v in bx]))
                rg=st['ring']
                if rg and not (bx[2]<=rg[0] or bx[0]>=rg[2] or bx[3]<=rg[1] or bx[1]>=rg[3]): bad('%s: bubble covers the thing it points at (bubble %s ring %s)'%(key,[round(v) for v in bx],[round(v) for v in rg]))
                if rg and (rg[0]<-6 or rg[1]<-6 or rg[2]>st['vw']+6 or rg[3]>st['vh']+6): bad('%s: the ringed thing is off the screen %s'%(key,[round(v) for v in rg]))
                if st['boat'] is True and re.search(r'\b(FLY|fly|flying|land)\b', st['text']): bad('%s: says a plane word for a boat: %s'%(key,st['text']))
                if st['boat'] is False and re.search(r'\b(CAST OFF|tie up)\b', st['text']): bad('%s: says a boat word for a plane: %s'%(key,st['text']))
                if not st['skip']: bad('%s: no SKIP button'%key)
            else:
                same+=1
                if same>(60 if wander else 10): bad('stuck on step "%s": %s'%(key, st['text'])); break
            last=key
            if st['next']: tapxy(*st['next'])
            elif st['id']=='wait': pg.evaluate("()=>{ G.wall -= 45000; }"); pg.wait_for_timeout(900)
            elif st['ring']: rg=st['ring']; tapxy((rg[0]+rg[2])/2,(rg[1]+rg[3])/2)
            else: pg.evaluate("()=>{ G.wall -= 30000; }"); pg.wait_for_timeout(900)
        fin=pg.evaluate("()=>({done:G.tutDone, tut:Object.keys(G.tut).join(','), money:G.money, earned:G.stats.earned, out:G.crafts.filter(c=>c.state!=='dock').length})")
        if not fin['done']: bad('tutorial did not finish in %d moves (reached: %s)'%(n,fin['tut']))
        for k in (() if wander else ('intro','pick','load','fly','dest','go','collect','loop','yard','yard2','ports')):
            if k not in seen: bad('step "%s" never came up'%k)
        if fin['earned']<=0: bad('following the tutorial never earned a fare')
        # it can be replayed, and skipped
        pg.evaluate("()=>{ deselect(); openMenu('almanac'); }"); pg.wait_for_timeout(500)
        loc=pg.locator('#sbody [data-act=tutRestart]'); loc.scroll_into_view_if_needed(); (loc.tap if touch else loc.click)(); pg.wait_for_timeout(700)
        st=pg.evaluate(STATE)
        if not (st['on'] and st['id']=='intro'): bad('REPLAY THE TUTORIAL does not bring the first step back: %s'%st)
        loc=pg.locator('#coachbub [data-act=tutSkip]'); (loc.tap if touch else loc.click)(); pg.wait_for_timeout(600)
        if not pg.evaluate("()=>G.tutDone && !document.getElementById('coach').classList.contains('on')"): bad('SKIP TUTORIAL does not turn it off')
        print('== %s %dx%d: finished=%s in %d moves, steps: %s'%(start,W,H,fin['done'],n,' > '.join(seen)))
        ctx.close()
    b.close()
print('\nPROBLEMS: %d'%len(problems))
for q in problems: print('  '+q[:300])
sys.exit(1 if problems else 0)
