# The installed app: serves the repository over http://localhost, lets the service worker take a copy, then cuts the
# network and reloads. The game has to come back from the copy, and a hanging network must not hold it up.
#   python3 test/offline.py
import sys, os, subprocess, time
from playwright.sync_api import sync_playwright
PORT=8765; probs=[]
srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'--bind','127.0.0.1'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1.2)
def expect(c,m):
    print(('  ok  ' if c else '  !!! ')+m)
    if not c: probs.append(m)
try:
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
        ctx=b.new_context(viewport={'width':386,'height':700}); pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:%d/'%PORT); pg.wait_for_timeout(800)
        ready=pg.evaluate("()=>navigator.serviceWorker.ready.then(r=>!!r.active)"); expect(ready, 'the service worker registers and becomes active on localhost')
        man=pg.evaluate("()=>fetch('manifest.webmanifest').then(r=>r.json()).then(m=>({name:m.name,icons:m.icons.length,start:m.start_url,display:m.display}))"); expect(man['icons']>=2 and man['display'] in ('standalone','fullscreen'), 'the manifest names the app and its icons: %s'%man)
        pg.reload(); pg.wait_for_timeout(1200)      # second load goes through the worker and fills its cache
        ctx.set_offline(True); t0=time.time(); pg.reload(); pg.wait_for_timeout(800)
        expect(pg.evaluate("()=>!!document.getElementById('mbox')&&document.title.indexOf('Pocket Maine')>=0&&typeof newGame==='function'"), 'with the network cut, the game still loads from the copy (%.1f s)'%(time.time()-t0))
        expect(not errs, 'no errors: %s'%errs[:2]); b.close()
finally:
    srv.terminate()
print('PROBLEMS:',len(probs)); sys.exit(1 if probs else 0)
