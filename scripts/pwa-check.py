"""Build first. Serves an isolated copy of dist at /ecowild/ and simulates two deployments.
No production deploy or source files are modified. Requires Python Playwright + Chromium.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import functools, hashlib, http.server, json, os, shutil, tempfile, threading, re
root = Path(__file__).resolve().parent.parent
out = Path(os.environ.get('EVIDENCE_DIR','/tmp/ecowild-pwa')); out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='ecowild-pwa-') as tmp:
    stage = Path(tmp)/'ecowild';shutil.copytree(root/'dist',stage)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=tmp))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/ecowild/'
    result={}; errors=[]
    with sync_playwright() as p:
        context=p.chromium.launch_persistent_context(str(Path(tmp)/'browser-profile'), executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],viewport={'width':844,'height':390},has_touch=True,is_mobile=True)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url);page.wait_for_function("!document.querySelector('#enter').disabled",timeout=60000)
        page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('!!navigator.serviceWorker.controller')
        assert page.evaluate('typeof window.__controlsTest')=='undefined'
        result['production_probe_absent']=True
        manifest=page.evaluate("fetch('manifest.webmanifest').then(r=>r.json())")
        assert manifest['start_url']=='./' and manifest['scope']=='./' and manifest['orientation']=='landscape'
        for icon in manifest['icons']:
            assert page.evaluate('(src)=>fetch(src).then(r=>r.ok)',icon['src'])
        cdp=context.new_cdp_session(page)
        result['installability']=cdp.send('Page.getInstallabilityErrors')
        result['manifest']=manifest
        # Valid v1 progress fixture to verify persistence through SW update/offline startup.
        page.evaluate('''async()=>{
          const data={version:1,player:{x:0,y:0,z:18,yaw:0,health:100,energy:100,thirst:8},inventory:{berries:2,glowfruit:1},picked:{'berry-0':true,'glow-0':true},discoveries:{auryn:{seen:true,habitat:true,behavior:true,interacted:true}},creatures:{'auryn-1':{x:0,z:20,hunger:.3,thirst:.2,fear:0,energy:.8,trust:100,tamed:true}},pet:{name:'Luz',xp:80,command:'STAY'},settings:{quality:'low',lookSens:.0045},seconds:100};
          const db=await new Promise((r,j)=>{const q=indexedDB.open('ecowild',1);q.onsuccess=()=>r(q.result);q.onerror=j});
          await new Promise((r,j)=>{const tx=db.transaction('slots','readwrite');tx.objectStore('slots').put(data,'primary');tx.oncomplete=r;tx.onerror=j});db.close();
        }''')
        context.set_offline(True);page.reload();page.locator('#resume').click(timeout=60000)
        page.locator('#open-pause').click();page.wait_for_selector('[data-pet="STAY"]'); assert 'Luz' in page.locator('#sheet').inner_text()
        page.locator('#open-inventory').is_visible() # underlying menu is inert while paused
        result['offline_start_and_pet_save']=True
        page.screenshot(path=str(out/'offline.png'))
        context.set_offline(False)
        # Simulate host removing the old hashed entry JS when deploying a new HTML.
        html=(stage/'index.html').read_text()
        old=re.search(r'src="(\./assets/index-[^"]+\.js)"',html).group(1)
        new=old.replace('.js','-next.js');shutil.copy(stage/old,stage/new);(stage/old).unlink()
        html=html.replace(old,new).replace('<title>EcoWild</title>','<title>EcoWild · atualização testada</title>')
        (stage/'index.html').write_text(html)
        files=sorted(str(f.relative_to(stage)) for f in stage.rglob('*') if f.is_file() and f.suffix in ['.html','.js','.css','.png','.webmanifest'] and f.name!='sw.js')
        digest=hashlib.sha256(b''.join((stage/f).read_bytes() for f in files)).hexdigest()[:16]
        template=(root/'scripts/sw-template.js').read_text().replace('__VERSION__',json.dumps(digest)).replace('__FILES__',json.dumps(files))
        (stage/'sw.js').write_text(template)
        page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
        page.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)',timeout=60000)
        assert page.title()=='EcoWild'
        second=context.new_page();second.goto(url);second.wait_for_function("!document.querySelector('#enter').disabled",timeout=60000)
        page.locator('#update-app').click();page.wait_for_function("document.querySelector('#pwa-status').textContent.includes('outras abas')")
        assert page.title()=='EcoWild';second.close()
        page.locator('#update-app').click();page.wait_for_function("document.title.includes('atualização testada')",timeout=60000)
        page.locator('#resume').click(timeout=60000);page.locator('#open-pause').click();page.wait_for_selector('[data-pet="STAY"]')
        assert 'Luz' in page.locator('#sheet').inner_text()
        result['update_waiting_multitab_guard_and_save']=True
        context.set_offline(True);page.reload();page.locator('#resume').click(timeout=60000)
        page.locator('#open-inventory').click();assert 'Fruto da mata: 2/20' in page.locator('#sheet').inner_text()
        assert page.title()=='EcoWild · atualização testada'
        result['updated_offline_no_stale_html']=True
        caches=page.evaluate('caches.keys()');assert len(caches)<=2
        result['cache_versions']=caches;result['page_errors']=errors;assert not errors,errors
        (out/'results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
        print(json.dumps(result,indent=2,ensure_ascii=False),flush=True)
        context.close()
    server.shutdown()
