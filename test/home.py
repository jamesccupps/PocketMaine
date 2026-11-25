# Home ports: a tag and a way back. The CRAFT tab shows where a craft is based; away from home it offers SEND HOME and HOME HERE;
# the fleet strip keeps craft together by home, with a marker per group once the fleet is past the four you start with.
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
    tap('#mbox .btn.go'); tap('.startc[data-arg=casco]'); pg.wait_for_timeout(4300)
    ev("()=>document.querySelector('[data-act=tutSkip]').click()"); pg.wait_for_timeout(400)
    ev("""()=>{ G.hol='off'; hideBanner(); G.wxNext=1e12; G.wx=[]; G.vipNext=1e12; G.level=9; G.money=60000; G.lesOff=true; deselect(); }""")
    ROW="""()=>{ const r=document.querySelector('#sbody .homerow'); if(!r) return null; const bb=r.getBoundingClientRect(); return { text:r.querySelector('.hl').textContent.trim(), btns:[...r.querySelectorAll('button')].map(b=>b.textContent.trim()), fits:[...r.querySelectorAll('button')].every(b=>{ const q=b.getBoundingClientRect(); return q.left>=bb.left-1&&q.right<=bb.right+1&&q.right<=innerWidth; }) }; }"""
    cid=ev("()=>{ const c=G.crafts.find(c=>c.state==='dock'&&CRAFT_BY[c.type].cls==='plane'); selectCraft(c.id); UI.stab='craft'; UI.cseg='gear'; UI.toTop=true; forcePanel(); return c.id; }"); pg.wait_for_timeout(500)
    r=ev(ROW); home=ev("(id)=>portName(G.crafts.find(c=>c.id===id).home)",cid)
    expect(r is not None and home in r['text'] and 'here' in r['text'] and r['btns']==[], 'at home the CRAFT tab says where she is based and offers nothing: %s'%(r and r['text']))
    # put her somewhere else, as if she had just landed there
    other=ev("""(id)=>{ const c=G.crafts.find(c=>c.id===id); const o=PORTS.find(p=>G.ports[p.id].open&&p.id!==c.home&&legInfo(c,c.home,p.id).ok); c.at=o.id; c.x=o.x; c.y=o.y; selectCraft(c.id); UI.stab='craft'; UI.toTop=true; forcePanel(); return o.name; }""",cid); pg.wait_for_timeout(500)
    r=ev(ROW); expect(r is not None and home in r['text'] and 'here' not in r['text'] and len(r['btns'])==2 and r['fits'], 'away from home she offers SEND HOME and HOME HERE, both inside the row: %s'%(r and r['btns']))
    tap('#sbody .homerow [data-act=setHome]'); r=ev(ROW)
    expect(r is not None and other in r['text'] and 'here' in r['text'] and ev("(id)=>G.crafts.find(c=>c.id===id).home===G.crafts.find(c=>c.id===id).at",cid), 'HOME HERE bases her at %s'%other)
    # back to the first home by hand, then send her to the new one
    ev("""(id)=>{ const c=G.crafts.find(c=>c.id===id); const o=PORTS.find(p=>G.ports[p.id].open&&p.id!==c.home&&legInfo(c,c.home,p.id).ok); c.at=o.id; c.x=o.x; c.y=o.y; selectCraft(c.id); UI.stab='craft'; UI.toTop=true; forcePanel(); }""",cid); pg.wait_for_timeout(500)
    m0=ev("()=>G.money"); tap('#sbody .homerow [data-act=sendHome]'); pg.wait_for_timeout(300)
    st=ev("(id)=>{ const c=G.crafts.find(c=>c.id===id); return { state:c.state, to:c.plan&&c.plan.stops[c.plan.stops.length-1], home:c.home, money:G.money }; }",cid)
    expect(st['state'] in ('move','hold') and st['to']==st['home'] and st['money']<m0, 'SEND HOME puts her on her way home and the fuel is paid: %s'%st)
    # the fleet strip: no markers with the four you start with; grouped and marked once there are more
    ev("()=>deselect()"); pg.wait_for_timeout(400)
    n0=ev("()=>document.querySelectorAll('#fleet .fgrp').length"); expect(n0==0, 'no home markers in the strip with the starting fleet')
    ev("""()=>{ G.slots=8; const hs=[...new Set(G.crafts.map(c=>c.home))]; addCraft(G.crafts[0].type, hs[0]); addCraft(G.crafts[0].type, hs[hs.length-1]); UI.fleetKey=''; }"""); pg.wait_for_timeout(500)
    f=ev("""()=>{ const out=[]; document.querySelectorAll('#fleet > *').forEach(e=>{ if(e.classList.contains('fgrp')) out.push('#'+e.querySelector('b').textContent); else if(e.dataset.act==='selCraft'){ const c=G.crafts.find(c=>c.id===+e.dataset.arg); out.push(c.home); } }); const fs=[...document.querySelectorAll('#fleet .fgrp i, #fleet .fgrp b')].map(e=>parseFloat(getComputedStyle(e).fontSize)); return { seq:out, min:Math.min.apply(null,fs) }; }""")
    seq=f['seq']; marks=[x for x in seq if x.startswith('#')]; homes=[x for x in seq if not x.startswith('#')]
    grouped=all(homes[i]==homes[i-1] or homes[i] not in homes[:i] for i in range(1,len(homes)))
    expect(len(marks)==len(set(homes)) and grouped and f['min']>=16, 'with six craft the strip keeps them together by home, one marker a group: %s'%' '.join(seq))
    if errs: probs.append('page errors: '+' | '.join(errs[:3]))
    pg.screenshot(path='/tmp/home_%d.png'%W); b.close()
print('PROBLEMS:',len(probs)); [print('  ',x) for x in probs]
sys.exit(1 if probs else 0)
