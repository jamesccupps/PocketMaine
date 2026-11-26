# Layout audit: at several screen sizes, walk every screen and fail on anything clipped, spilling, or off-screen,
# and on a port screen that opens without a LOAD button in view.
import sys
from playwright.sync_api import sync_playwright
AUDIT = """() => { const out=[]; const vw=innerWidth, vh=innerHeight, FONT_MIN=12;
  const scrollers=new Set(['fleet','sbody','scols','sleft','mbox','sheetwrap','tmsg']);
  const ignoreIds=new Set(['mapwrap','scenebox','app','stage','daybar','xpbar','splash','modal','sheet','scene','map','dock','main']);
  const desc=el=>{ let s=el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/).join('.'):''); const t=(el.textContent||'').trim().replace(/\\s+/g,' ').slice(0,28); return s+(t?' "'+t+'"':''); };
  // the map canvas fits its frame: it may run a pixel or two over (it is cut to whole map pixels), never a strip of the map hidden.
  // (The map and its frame are skipped by the checks below, which is how a canvas 60 px too tall went unnoticed.)
  { const fr=document.getElementById('mapwrap').getBoundingClientRect(), r=document.getElementById('map').getBoundingClientRect(); if(fr.width>1&&fr.height>1&&(r.bottom-fr.bottom>4||r.right-fr.right>4||fr.bottom-r.bottom>1||fr.right-r.right>1)) out.push('MAP DOES NOT FIT ITS FRAME by '+Math.round(r.right-fr.right)+','+Math.round(r.bottom-fr.bottom)+' px'); }
  const root=document.querySelector('#modal.show')||document.getElementById('app');
  root.querySelectorAll('*').forEach(el=>{ const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') return; const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) return;
    if(el.closest('#sheetwrap:not(.show)')||el.closest('#tip')||el.closest('#toasts')||el.closest('#banner')||el.closest('#splash')) return;
    if(el.id==='tmi') return; if(ignoreIds.has(el.id)||scrollers.has(el.id)) return; if(el.classList.contains('bar')||el.classList.contains('pb')) return;
    const clipX=(cs.overflowX==='hidden'||cs.overflowX==='clip'), clipY=(cs.overflowY==='hidden'||cs.overflowY==='clip');
    if(el.scrollWidth>el.clientWidth+1 && el.clientWidth>0 && cs.display!=='inline'){ out.push((clipX?'CLIPPED ':'SPILLS ')+desc(el)+' '+el.scrollWidth+'>'+el.clientWidth); }
    if(clipY && el.scrollHeight>el.clientHeight+2) out.push('CLIPPED-Y '+desc(el)+' '+el.scrollHeight+'>'+el.clientHeight);
    // nothing a player has to read is under 12 px
    if([...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>0)){ const fs=parseFloat(cs.fontSize); if(fs<FONT_MIN) out.push('SMALL-TEXT '+fs+'px '+(cs.fontFamily.indexOf('Silk')>=0?'silk':'vt')+' '+desc(el)); }
    if((r.right>vw+1||r.left<-1) && !el.closest('#fleet') && !el.closest('#mapwrap')) out.push('OFFSCREEN '+desc(el)+' '+Math.round(r.left)+'..'+Math.round(r.right));
    if(r.bottom>vh+1 && !el.closest('#sbody,#scols,#sleft,#mbox,#mapwrap')) out.push('BELOW-SCREEN '+desc(el)+' '+Math.round(r.bottom)+'>'+vh);
  });
  return [...new Set(out)]; }"""
LOADVIS = """() => { const b=document.querySelector('#sbody .jrow .btn.load'); if(!b) return 'no LOAD button exists'; const r=b.getBoundingClientRect(), f=document.getElementById('sfoot').getBoundingClientRect(), h=document.getElementById('shead').getBoundingClientRect();
  const rows=[...document.querySelectorAll('#sbody .jrow')].filter(x=>{const q=x.getBoundingClientRect(); return q.top>=h.bottom-1 && q.bottom<=f.top+1;}).length;
  return (r.top>=h.bottom && r.bottom<=f.top) ? 'ok '+rows+' rows fully visible' : 'LOAD NOT VISIBLE (button at y='+Math.round(r.top)+', footer starts '+Math.round(f.top)+')'; }"""
ROWVIS = """() => { const f=document.getElementById('sfoot').getBoundingClientRect(), h=document.getElementById('shead').getBoundingClientRect(); const note=document.querySelector('#sbody .note'); if(note){ const q=note.getBoundingClientRect(); if(q.top>=h.bottom-1 && q.bottom<=f.top+1) return 'ok the board says why it is empty'; }
  const rows=[...document.querySelectorAll('#sbody .jrow')]; if(!rows.length) return 'no rows';
  const vis=rows.filter(x=>{const q=x.getBoundingClientRect(); return q.top>=h.bottom-1 && q.bottom<=f.top+1;}).length; return vis ? 'ok '+vis+' rows visible' : 'NO JOB ROW VISIBLE (first row at y='+Math.round(rows[0].getBoundingClientRect().top)+', footer starts '+Math.round(f.top)+')'; }"""
sizes=[(386,630,3),(360,640,3),(393,759,3),(390,844,3),(462,904,3),(412,915,2.6),(768,1024,2),(1024,768,1),(1280,720,1),(1440,900,1),(1920,1080,1)]
if len(sys.argv)>1: sizes=[tuple(float(v) if '.' in v else int(v) for v in a.split('x')) for a in sys.argv[1:]]
total=0
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=__import__('os').environ.get('CHROME','/usr/bin/google-chrome'), args=['--no-sandbox'])
    for (W,H,D) in sizes:
        ctx=b.new_context(viewport={'width':W,'height':H}, device_scale_factor=D, has_touch=W<800, is_mobile=W<800)
        pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://'+__import__('os').path.abspath('index.html')); pg.wait_for_timeout(700)
        found=[]
        def chk(name, shot=False):
            global total
            pg.wait_for_timeout(350); iss=pg.evaluate(AUDIT)
            if shot: pg.screenshot(path='test/a_%dx%d_%s.png'%(W,H,name))
            for i in iss: found.append(name+': '+i)
        # A dialog's buttons are in view when it opens, whatever its length; and on a phone of ordinary height the title and the
        # start screen fit without scrolling (START used to sit below the fold, and the third start card was cut off).
        DLG="""() => { const m=document.getElementById('mbox'), mr=m.getBoundingClientRect(), out=[]; const bt=m.querySelector('.acts .btn');
          if(bt){ const r=bt.getBoundingClientRect(); if(r.bottom>mr.bottom+1||r.top<mr.top-1||r.bottom>innerHeight) out.push('DIALOG BUTTON OUT OF VIEW '+bt.textContent.trim()+' at y='+Math.round(r.top)+' (box ends '+Math.round(mr.bottom)+')'); }
          if(innerWidth<=700&&innerHeight>=740&&m.scrollHeight>m.clientHeight+1) out.push('DIALOG NEEDS SCROLLING '+m.scrollHeight+' in '+m.clientHeight);
          if(mr.top<0||mr.bottom>innerHeight+1) out.push('DIALOG OFF SCREEN'); return out; }"""
        chk('title', True); found.extend('title: '+x for x in pg.evaluate(DLG))
        pg.evaluate("() => act('chooseStart')"); chk('start', True); found.extend('start: '+x for x in pg.evaluate(DLG))
        pg.evaluate("() => act('newGame','casco')"); pg.wait_for_timeout(4600); chk('tut_intro', True)
        pg.evaluate("() => act('tutNext')"); chk('tut_pick', True)
        pg.evaluate("() => act('tutSkip')"); pg.wait_for_timeout(2800); chk('map', True)
        # open the first craft exactly as a player would: tap its card
        pg.locator('#fleet .fc').first.click(); pg.wait_for_timeout(500)
        lv=pg.evaluate(LOADVIS); 
        if not lv.startswith('ok'): found.append('port: '+lv)
        chk('port', True)
        pg.evaluate("() => { const b=document.querySelector('#sbody .jrow .btn.load:not([disabled])'); if(b) b.click(); }"); chk('loaded', True)
        pg.evaluate("() => act('stab','port')"); chk('porttab')
        pg.evaluate("() => act('stab','craft')"); chk('crafttab')
        pg.evaluate("() => act('stab','jobs')")
        pg.evaluate("() => act('route')"); pg.wait_for_timeout(300)
        pg.evaluate("() => { if(!UI.stops.length){ const c=UI.selCraft; const d=PORTS.find(p=>G.ports[p.id].open&&p.id!==c.at&&legInfo(c,c.at,p.id).ok); if(d) addStop(d.id); } }"); chk('route', True)
        pg.evaluate("() => act('go')"); chk('flying')
        pg.locator('#fleet .fc').first.click(); chk('underway', True)
        pg.evaluate("() => { deselect(); G.wall -= 500000; }"); pg.wait_for_timeout(1200); chk('landedmap')
        pg.evaluate("() => act('nextIdle')"); pg.wait_for_timeout(300); chk('collected', True)
        # the boat's fishing tab
        pg.evaluate("() => { const c=G.crafts.find(c=>CRAFT_BY[c.type].fish&&c.state!=='move'); if(c){ selectCraft(c.id,false); act('stab','fish'); } }"); chk('fishing')
        for m in ('contracts','market','almanac','yard'):
            pg.evaluate("(m) => openMenu(m)", m); chk(m, m=='market')
        pg.evaluate("() => selectPort('aug')"); chk('locked', True)
        # late game: long names, many craft, big hold
        pg.evaluate("""() => { G.money=900000; G.level=18; G.slots=12; ['gls','chm','sug','fkt','bgr','pqi','rkd'].forEach(id=>{G.ports[id].open=true; refreshBoard(PORT_BY[id]);}); G.ports.pwm.lvl=5; refreshBoard(PORT_BY.pwm);
            ['commuter','otter','ferry','freight','beav'].forEach(t=>{ const port=PORTS.find(p=>G.ports[p.id].open&&canBase(CRAFT_BY[t],p)&&p.id==='pwm')||PORTS.find(p=>G.ports[p.id].open&&canBase(CRAFT_BY[t],p)); addCraft(t,port.id); });
            const c=G.crafts.find(c=>c.type==='commuter'); selectCraft(c.id,true); const st=G.ports[c.at]; st.jobs.slice().forEach(j=>loadJob(c,j.id)); forcePanel(); }"""); chk('bigcraft', True); rv=pg.evaluate(ROWVIS); found.extend(['bigcraft: '+rv] if not rv.startswith('ok') else [])
        pg.evaluate("() => { act('unloadAll'); }"); pg.wait_for_timeout(350); lv=pg.evaluate(LOADVIS); found.extend(['bigcraft-empty: '+lv] if not lv.startswith('ok') else [])
        pg.evaluate("""() => { deselect(); ['commuter','ferry','freight','beav','down'].forEach((t,i)=>{ for(let s=0;s<3;s++) if(i<3||s<2) givePart(t,s); }); givePart('cub',1); givePart('cub',1);
            G.stored.push({type:'commuter',name:'Old Reliable-ish',upg:{ifr:1},stored:true},{type:'ferry',name:'Numb As A Hake',upg:{},stored:true},{type:'beav',name:'Katahdin Queen',upg:{},stored:true});
            stockShelf('pwm'); G.ports.pwm.shelf[0].sale=true; selectPort('pwm',true); }"""); chk('yard_full', True)
        for sg in ('build','store','new','town'):
            pg.evaluate("(g) => act('yseg',g)", sg); chk('yard_'+sg, True)
        pg.evaluate("() => { const e=document.getElementById('sbody'); e.scrollTop=e.scrollHeight; const c=document.getElementById('scols'); c.scrollTop=c.scrollHeight; }"); chk('yard_bottom', True)
        pg.evaluate("() => openMenu('yard')"); chk('yardmenu_full', True)
        pg.evaluate("() => selectPort('lew',true)"); chk('noyard_port', True)
        pg.evaluate("() => { const c=G.crafts.find(c=>c.at==='pwm'&&c.state==='dock'); selectCraft(c.id,false); act('stab','craft'); }"); chk('crafttab_yard')
        # ---- late game: every level feature on screen at once ----
        pg.evaluate("""() => { G.level=9; G.money=250000; refreshHall(); startEvent(EVENTS.find(e=>e.id==='oldport')); urgentRun();
            const c=G.crafts.find(c=>c.at==='pwm'&&c.state==='dock'&&CRAFT_BY[c.type].cls==='plane'); c.cond=18; c.name='Wicked Long Name X'; c.liv=2; c.crew={name:'Thelma',perk:'charm',seed:77}; c.run={a:'pwm',b:'lew',earned:12480,trips:41,wait:0};
            givePart(c.type,0); selectCraft(c.id,false); act('stab','craft'); }"""); chk('lg_gear', True)
        for sg in ('looks','crew','run','keep'):
            pg.evaluate("(g) => act('cseg',g)", sg); chk('lg_'+sg, True)
        pg.evaluate("() => { UI.selCraft.run=null; act('cseg','run'); }"); chk('lg_run_empty')
        pg.evaluate("() => act('pickRun')"); chk('lg_pickrun', True); pg.evaluate("() => cancelRoute()")
        pg.evaluate("() => act('stab','jobs')"); chk('lg_jobs_event', True)
        pg.evaluate("""() => { const b=G.crafts.find(c=>CRAFT_BY[c.type].fish&&c.state==='dock'); b.jobs.slice().forEach(j=>unloadJob(b,j.id)); G.traps={}; const o=fishOptions(b).find(o=>o.inRange&&!o.mode); G.traps[o.g.id]={t:G.t-200}; selectCraft(b.id,false); act('stab','fish'); }"""); chk('lg_fish_traps', True)
        pg.evaluate("() => { const b=UI.selCraft; b.fish={sp:'lobster',units:4}; forcePanel(); }"); chk('lg_catch', True)
        pg.evaluate("() => { UI.selCraft.fish=null; deselect(); selectPort('lew',true); }"); chk('lg_town_works', True)
        pg.evaluate("() => { selectPort('pwm',true); act('yseg','town'); }"); chk('lg_yard_town')
        pg.evaluate("() => openMenu('almanac')"); chk('lg_almanac', True)
        pg.evaluate("() => { const e=document.getElementById('sbody'); e.scrollTop=700; const c2=document.getElementById('scols'); if(c2) c2.scrollTop=700; act('showCode'); }"); chk('lg_almanac_code', True)
        pg.evaluate("() => { deselect(); showUnlock({level:8,bonus:800,unlocked:['Katahdin Twin'],feats:['runs','works']}); }"); chk('lg_levelup', True); pg.evaluate("() => closeModal()")
        pg.evaluate("() => deselect()"); chk('bigmap', True)
        print('%4dx%-4d  issues: %d%s'%(W,H,len(found),'  JS errors: '+str(errs[:2]) if errs else '')); total+=len(found)
        for f in (found if __import__('os').environ.get('AUDIT_ALL') else found[:14]): print('     ',f[:170])
        ctx.close()
    b.close()
print('TOTAL', total)
sys.exit(1 if total else 0)
