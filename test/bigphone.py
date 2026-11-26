# A big phone (more than 430 CSS px across) gets the phone layout drawn 412 wide and scaled up to fill the screen;
# an ordinary phone, the same phone on its side, a tablet and a desktop are left exactly as they were.
import sys, os
from playwright.sync_api import sync_playwright
probs=[]
def expect(c,m):
    print(('  ok  ' if c else '  !!! ')+m)
    if not c: probs.append(m)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    R="()=>({meta:document.querySelector('meta[name=viewport]').content, w:innerWidth, h:innerHeight, scale:+visualViewport.scale.toFixed(3), sw:document.documentElement.scrollWidth, m:(()=>{ const x=document.getElementById('mbox'); return x.scrollHeight<=x.clientHeight+1; })(), start:(()=>{ const r=document.querySelector('#mbox .acts .btn').getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight; })() })"
    for (W,H,D,mob,big,label) in ((462,904,3,True,True,'a big phone'),(448,997,3,True,True,'another big phone'),(393,759,3,True,False,'an ordinary phone'),(412,915,2.6,True,False,'a 412 px phone'),(904,462,3,True,False,'the big phone on its side'),(768,1024,2,True,False,'a tablet'),(1280,720,1,False,False,'a desktop')):
        ctx=b.new_context(viewport={'width':W,'height':H}, screen={'width':W,'height':H}, device_scale_factor=D, has_touch=mob, is_mobile=mob); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('file://'+os.path.abspath('index.html')); pg.wait_for_timeout(1000); r=pg.evaluate(R)
        if big:
            expect(r['w']==412 and abs(r['scale']-W/412)<0.01 and r['sw']==412, '%s (%dx%d): laid out 412 wide and scaled up %.2f times, nothing off the side'%(label,W,H,r['scale']))
            expect(r['m'] and r['start'], '%s: the title fits and START is in view'%label)
        else:
            expect(r['w']==W and r['scale']==1 and 'device-width' in r['meta'], '%s (%dx%d): left as it was'%(label,W,H))
        if errs: probs.append('%s: page errors %s'%(label,errs[:2]))
        ctx.close()
    b.close()
print('PROBLEMS:',len(probs)); [print('  ',x) for x in probs]
sys.exit(1 if probs else 0)
