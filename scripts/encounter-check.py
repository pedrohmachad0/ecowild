"""Live game camera/encounter checks with explicit fixtures; Chromium emulation only."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('EVIDENCE_DIR','/tmp/ecowild-encounter'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':844,'height':390},has_touch=True,is_mobile=True)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173');page.locator('#enter').click(timeout=60000)
    page.evaluate("""async()=>{
      const {heightAt}=await import('/src/game/world/terrain.ts');
      const s=window.__controlsTest.getSim();s.player.x=-8;s.player.z=-4;s.player.y=heightAt(-8,-4);
      const c=s.creatures.find(c=>c.speciesId==='auryn');c.x=-8;c.z=-6;c.y=heightAt(-8,-6);c.trust=20;c.observe=0;c.fear=0;
      s.discoveries.auryn={seen:true,habitat:true,behavior:false,interacted:false};
    }""")
    page.locator('#observe').wait_for(state='visible');page.locator('#observe').click()
    page.wait_for_function("window.__controlsTest.getCamera().focus==='auryn-1'")
    assert page.locator('#field-note').is_visible()
    assert 'Auryn' in page.locator('#field-note').inner_text()
    assert page.locator('#observe').get_attribute('aria-pressed')=='true'
    counts=page.evaluate('window.__controlsTest.getSceneCounts()')
    page.wait_for_timeout(350)
    page.screenshot(path=str(out/'auryn-observation-landscape.png'))
    # The observation camera does not complete a bond or grant items.
    assert not page.evaluate("window.__controlsTest.getSim().creatures.find(c=>c.speciesId==='auryn').tamed")
    page.locator('#open-pause').click();assert not page.locator('#field-note').is_visible()
    page.locator('#close-sheet').click();assert page.locator('#field-note').is_visible()
    page.keyboard.down('d');page.wait_for_function('window.__controlsTest.getCamera().focus===null');page.keyboard.up('d')
    page.keyboard.press('q');page.wait_for_function('window.__controlsTest.getCamera().focus!==null')
    page.keyboard.press('q');page.wait_for_function('window.__controlsTest.getCamera().focus===null')
    page.keyboard.press('v');page.wait_for_function("window.__controlsTest.getCamera().mode==='first'")
    page.keyboard.press('v');page.wait_for_function("window.__controlsTest.getCamera().mode==='third'")
    # Geometric proxy on a real tree, compared against requested orbit distance.
    page.evaluate("""async()=>{
      const {treeList}=await import('/src/game/world/layout.ts');const {heightAt}=await import('/src/game/world/terrain.ts');
      const t=treeList()[0],s=window.__controlsTest.getSim();s.player.x=t.x;s.player.z=t.z-2;s.player.y=heightAt(t.x,t.z-2);
    }""")
    page.wait_for_timeout(400)
    cam=page.evaluate('window.__controlsTest.getCamera()')
    d=sum((cam['position'][k]-cam['target'][k])**2 for k in ['x','y','z'])**.5
    assert d<cam['distance']-.4, (d,cam)
    assert page.evaluate('window.__controlsTest.getSceneCounts()')==counts
    page.screenshot(path=str(out/'tree-camera-clearance.png'))
    page.set_viewport_size({'width':390,'height':844});page.locator('#portrait-dismiss').click()
    page.locator('#open-pause').click();page.locator('#close-sheet').click()
    assert not errors, errors
    result={'fixture':True,'observation':'button + Q; moving exits; menus hide note; V still toggles','bond_not_granted_by_camera':True,'tree_boom_distance':d,'requested_distance':cam['distance'],'scene_counts_stable':counts,'errors':errors}
    (out/'results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));print(json.dumps(result,indent=2,ensure_ascii=False))
    browser.close()
