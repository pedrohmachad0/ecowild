"""Run against `npm run dev -- --port 4173`. Requires Python Playwright + Chromium.
Uses real keyboard and Chromium CDP multi-touch; probes exist only in Vite dev.
Fixtures used for failure injection and isolated pet/UI checks are explicitly labelled.
"""
import argparse, json, math, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--output', default='/tmp/ecowild-browser')
args = parser.parse_args(); output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
results = {}; errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True)
    page = context.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(args.url); page.locator('#enter').click(timeout=60000)
    page.wait_for_function('window.__controlsTest?.getHud().playing')
    def hud(): return page.evaluate('window.__controlsTest.getHud()')
    cdp = context.new_cdp_session(page)
    cdp.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 5})
    def point(id,x,y): return {'id':id,'x':x,'y':y,'radiusX':4,'radiusY':4,'force':1}
    def send(kind,points): cdp.send('Input.dispatchTouchEvent', {'type':kind,'touchPoints':points})
    pad = page.locator('#pad').bounding_box(); cx=pad['x']+pad['width']/2; cy=pad['y']+pad['height']/2
    initial = hud(); yaw = initial['yaw']
    send('touchStart',[point(1,cx,cy),point(2,500,190)])
    send('touchMove',[point(1,cx,cy-35),point(2,545,200)])
    sprint = page.locator('#sprint').bounding_box(); sx=sprint['x']+20; sy=sprint['y']+20
    send('touchStart',[point(1,cx,cy-35),point(2,545,200),point(3,sx,sy)])
    page.wait_for_timeout(900)
    assert abs(hud()['yaw']-yaw) > .05, 'camera did not rotate with joystick'
    assert page.evaluate('window.__controlsTest.getSpeed()') > 5, 'simultaneous sprint missing'
    send('touchEnd',[point(3,sx,sy)])
    page.wait_for_timeout(300)
    assert 1 < page.evaluate('window.__controlsTest.getSpeed()') < 5, 'sprint did not release independently'
    send('touchCancel',[]); page.wait_for_timeout(300)
    assert page.evaluate('window.__controlsTest.getSpeed()') == 0
    assert page.locator('#pad-knob').evaluate('(el)=>el.style.transform') == 'translate(-50%, -50%)'
    results['cdp_multitouch'] = 'joystick + camera + sprint; independent release + cancellation'
    # Real pointer lifecycle for each region; synthetic cancel/blur reproduces interruptions.
    send('touchStart',[point(4,sx,sy)])
    page.evaluate("window.dispatchEvent(new Event('blur'))"); send('touchCancel',[])
    assert page.locator('#sheet').is_visible(); assert not page.locator('#touch-controls').is_visible()
    page.locator('#close-sheet').click(); page.wait_for_timeout(150)
    assert page.evaluate('window.__controlsTest.getSpeed()') == 0
    for width,height in [(667,375),(812,375),(844,390),(390,844)]:
        page.set_viewport_size({'width':width,'height':height}); page.wait_for_timeout(300)
        if height>width:
            assert page.locator('#orientation-prompt').is_visible()
            page.locator('#portrait-dismiss').click(); assert not page.locator('#orientation-prompt').is_visible()
        for id in ['pad','jump','sprint','interact','camera-touch']:
            box=page.locator('#'+id).bounding_box(); assert box and box['width']>=44 and box['height']>=44
            assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+.1 and box['y']+box['height']<=height+.1
        page.screenshot(path=str(output/f'{width}x{height}.png'))
    results['viewports'] = ['667x375','812x375','844x390','390x844 + dismissible orientation notice']
    page.set_viewport_size({'width':844,'height':390})
    page.locator('#open-pause').click()
    page.locator('#quality').select_option('low')
    page.locator('#sensitivity').fill('0.008'); page.locator('#deadzone').fill('0.25')
    page.locator('#save-now').click(); page.wait_for_function("window.__controlsTest.getHud().saveStatus === 'Salvo neste aparelho.'")
    page.reload(); page.locator('#resume').click(timeout=60000)
    assert abs(hud()['lookSens']-.008)<.0001 and abs(hud()['deadzone']-.25)<.001 and hud()['quality']=='low'
    results['preferences_reload'] = True
    page.keyboard.press('v');page.wait_for_function("window.__controlsTest.getCamera().mode==='first'")
    page.keyboard.press('v');page.wait_for_function("window.__controlsTest.getCamera().mode==='third'")
    page.locator('#open-pause').click()
    counts=page.evaluate('window.__controlsTest.getSceneCounts()')
    for q in ['high','low','high','medium','low']:
        page.locator('#quality').select_option(q);page.wait_for_timeout(250)
    assert page.evaluate('window.__controlsTest.getSceneCounts()')==counts
    results['quality_cycle_counts']=counts
    page.locator('#close-sheet').click()
    # Dev module fixture: concurrent snapshots, transaction abort, storage unavailable.
    results['idb'] = page.evaluate('''async () => {
      const {writeSave,loadSave}=await import('/src/game/persistence/save.ts');
      const {createSim,toSave}=await import('/src/game/sim/simulation.ts');
      const data=toSave(createSim(null),{quality:'low',lookSens:.0045});
      const a=structuredClone(data), b=structuredClone(data); a.inventory.berries=1;b.inventory.berries=2;
      const saved=await Promise.all([writeSave(a),writeSave(b)]);
      const latest=await loadSave();
      const put=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){const req=put.apply(this,args);this.transaction.abort();return req;};
      const aborted=await writeSave(data);IDBObjectStore.prototype.put=put;
      const after=await loadSave();
      const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(){throw new DOMException('Blocked','SecurityError');};
      const unavailable=await loadSave();const failed=await writeSave(data);IDBFactory.prototype.open=open;
      return {saved,berries:latest.data.inventory.berries,aborted,preserved:after.data.inventory.berries,unavailable:unavailable.status,failed};
    }''')
    assert results['idb']=={'saved':[True,True],'berries':2,'aborted':False,'preserved':2,'unavailable':'unavailable','failed':False}
    # New-game cancel and confirmed replacement leave an atomic backup.
    page.reload(); page.locator('#resume').wait_for(state='visible',timeout=60000)
    page.once('dialog',lambda d:d.dismiss()); page.locator('#enter').click()
    assert page.locator('#title').is_visible()
    page.once('dialog',lambda d:d.accept()); page.locator('#enter').click()
    page.locator('#open-pause').click();page.locator('#save-now').click()
    page.wait_for_function("window.__controlsTest.getHud().saveStatus==='Salvo neste aparelho.'")
    backup=page.evaluate('''async()=>{const db=await new Promise(r=>{const q=indexedDB.open('ecowild',1);q.onsuccess=()=>r(q.result)});const result=await new Promise(r=>{const q=db.transaction('slots').objectStore('slots').get('backup');q.onsuccess=()=>r(q.result)});db.close();return result.inventory.berries;}''')
    assert backup==2; results['new_game_cancel_backup']=True
    # Isolated menu fixture verifies commands while PAUSED and safe user-authored names.
    page.evaluate("(()=>{const c=window.__controlsTest.getSim().creatures.find(c=>c.speciesId==='auryn');c.tamed=true;c.trust=100;c.name='<img src=x>';})()")
    page.wait_for_selector('[data-pet="STAY"]')
    for cmd in ['STAY','PROTECT','RETURN','FOLLOW']:
        page.locator('[data-pet="'+cmd+'"]').click()
        page.wait_for_function('(cmd)=>window.__controlsTest.getHud().pet.command===cmd',arg=cmd)
    assert page.locator('#sheet img').count()==0
    page.locator('#save-now').click();page.wait_for_function("window.__controlsTest.getHud().saveStatus==='Salvo neste aparelho.'")
    results['paused_pet_commands_and_escaping']=True
    # InputManager regression fixture: standard gamepad edges and native menu Tab.
    results['input'] = page.evaluate('''async()=>{
      const {InputManager}=await import('/src/game/input/InputManager.ts');
      const canvas=document.createElement('canvas');document.body.append(canvas);const manager=new InputManager(canvas);
      let pressed=true; const original=navigator.getGamepads; Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{mapping:'standard',axes:[0,0,0,0],buttons:[{pressed}]}]});
      const first=manager.sample().jumpEdge, held=manager.sample().jumpEdge;pressed=false;manager.sample();pressed=true;const again=manager.sample().jumpEdge;
      const event=new KeyboardEvent('keydown',{code:'Tab',cancelable:true});window.dispatchEvent(event);const menuTab=!event.defaultPrevented;manager.setGameplay(true);window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE'}));const quickTap=manager.sample().interactEdge;
      manager.setHold('sprint',true);manager.clear();const released=!manager.sample().sprint;
      manager.dispose();canvas.remove();Object.defineProperty(navigator,'getGamepads',{configurable:true,value:original});
      return {first,held,again,menuTab,released,quickTap};
    }''')
    assert results['input']=={'first':True,'held':False,'again':True,'menuTab':True,'released':True,'quickTap':True}
    page.locator('#close-sheet').click()
    # Software renderer measurement; not a hardware target assertion.
    samples=[]
    for _ in range(10): page.wait_for_timeout(500); samples.append(hud()['fps'])
    results['software_fps']={'samples':samples,'mean':sum(samples)/len(samples),'renderer':'Chromium headless SwiftShader; low; 844x390'}
    # Real WEBGL_lose_context extension; this is software-renderer recovery only.
    supported=page.evaluate("(()=>{const c=document.querySelector('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');window.loss=gl.getExtension('WEBGL_lose_context');return !!window.loss;})()")
    if supported:
        page.evaluate('window.loss.loseContext()');page.wait_for_selector('#fatal:not([hidden])')
        page.wait_for_timeout(300);page.evaluate('window.loss.restoreContext()')
        page.wait_for_selector('#fatal[hidden]',state='attached',timeout=30000)
        assert page.locator('#sheet').is_visible()
        results['webgl_context_restore']='paused, message cleared after restoration (SwiftShader)'
    else: results['webgl_context_restore']='extension unavailable'
    results['console_errors']=errors; assert not errors, errors
    (output/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
    print(json.dumps(results,indent=2,ensure_ascii=False),flush=True)
    browser.close()
