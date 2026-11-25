import sys, asyncio, json
from playwright.sync_api import sync_playwright
W=int(sys.argv[1]) if len(sys.argv)>1 else 1440; H=int(sys.argv[2]) if len(sys.argv)>2 else 900
script=sys.argv[3] if len(sys.argv)>3 else 'basic'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':W,'height':H})
    errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR: '+str(e)))
    pg.goto('file://'+__import__('os').path.abspath('index.html'))
    pg.wait_for_timeout(1200)
    pg.screenshot(path='test/s_title.png')
    exec(open('test/steps_'+script+'.py').read())
    print('console issues:', len(errs)); [print('  ',e[:300]) for e in errs[:12]]
    b.close()
if errs: sys.exit(1)
