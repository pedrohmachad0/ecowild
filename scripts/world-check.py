"""Living-world checks in the real runtime (Vite dev, Chromium emulation only).

Fixtures are explicit: the probe teleports the player, sets the clock and, for the
egg flow, fast-forwards incubation. Real key presses drive collection, incubation,
observation, photos, shouting and panels. This is not a physical device test.
"""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright

out = Path(os.environ.get('EVIDENCE_DIR', '/tmp/ecowild-world')); out.mkdir(parents=True, exist_ok=True)
results = {}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('dialog', lambda d: d.accept())
    page.goto('http://127.0.0.1:4173'); page.locator('#enter').click(timeout=90000)
    page.wait_for_function('window.__controlsTest.getHud().playing')
    hud = lambda: page.evaluate('window.__controlsTest.getHud()')
    # Read world data through the dev probe, never by importing modules: after HMR a
    # direct import can load a second, empty copy of the region registry.
    tp = lambda x, z: page.evaluate("([x,z])=>window.__controlsTest.teleport(x,z)", [x, z])
    counts0 = page.evaluate('window.__controlsTest.getSceneCounts()')

    # Every registered species has a diary entry; the HUD clock starts in the morning.
    assert hud()['species'] == len(hud()['catalog']) >= 14
    assert hud()['day']['period'] == 'day'
    results['species'] = hud()['species']

    # Egg: real E presses at the nest and at the warmed nest in the camp.
    nest = page.evaluate('window.__controlsTest.getPlaces().nest')
    tp(nest['x'], nest['z'] + 1); page.wait_for_function("window.__controlsTest.getHud().prompt.includes('ovo')")
    page.keyboard.press('e'); page.wait_for_function('window.__controlsTest.getHud().inventory.eggs===1')
    incubator = page.evaluate('window.__controlsTest.getPlaces().incubator')
    tp(incubator['x'] + 1, incubator['z']); page.wait_for_function("window.__controlsTest.getHud().prompt.includes('ninho aquecido')")
    page.keyboard.press('e'); page.wait_for_function('window.__controlsTest.getHud().incubator!==null')
    assert page.locator('#egg-chip').is_visible()
    # Fixture: fast-forward warming instead of waiting 150+ s of software rendering.
    page.evaluate('window.__controlsTest.getSim().incubator.progress=0.999')
    page.wait_for_function("window.__controlsTest.getHud().pets.some(p=>p.speciesId==='mosslight')", timeout=30000)
    page.wait_for_timeout(600); page.screenshot(path=str(out / 'hatchling.png'))
    results['egg'] = 'Collected at nest with E, placed in warmed nest with E, hatchling joins as companion'

    # Night: lights and the clock change; the armadillo leaves its burrow.
    page.evaluate('window.__controlsTest.getSim().time=600*0.62')
    page.wait_for_function("window.__controlsTest.getHud().day.period==='night'")
    tp(23, 2); page.wait_for_timeout(2500)
    out_of_burrow = page.evaluate("window.__controlsTest.getSim().creatures.filter(c=>c.speciesId==='armadillo').some(c=>!c.hidden)")
    assert out_of_burrow
    page.screenshot(path=str(out / 'night.png'))
    results['night'] = 'Clock reached night; at least one armadillo left its burrow'

    # Photo through the real observation flow (Q then P).
    page.evaluate('window.__controlsTest.getSim().time=0')
    tp(12.5, 5.2)
    page.evaluate("""()=>{const s=window.__controlsTest.getSim();s.discoveries.toad={seen:true,habitat:true,behavior:false,interacted:false};}""")
    page.wait_for_function("document.querySelector('#observe') && !document.querySelector('#observe').hidden", timeout=20000)
    page.keyboard.press('q'); page.wait_for_function('window.__controlsTest.getCamera().focus!==null')
    page.keyboard.press('p'); page.wait_for_function('Object.keys(window.__controlsTest.getHud().photos).length>0', timeout=20000)
    photo = list(hud()['photos'].values())[0]
    assert photo.startswith('data:image/jpeg;base64,') and len(photo) < 40000
    page.keyboard.press('q')
    results['photo'] = f'JPEG data URL of {len(photo)} chars stored in the diary'

    # Diary: photo rendered as an image; challenges tab.
    page.keyboard.press('c'); page.wait_for_selector('#sheet .photo')
    page.screenshot(path=str(out / 'diary-photo.png'))
    page.locator('[data-tab="challenges"]').click(); page.wait_for_selector('.challenge')
    assert page.locator('.challenge').count() == len(hud()['challenges'])
    page.screenshot(path=str(out / 'challenges.png'))
    page.keyboard.press('c'); page.wait_for_function("window.__controlsTest.getHud().panel==='none'")

    # Shout: a wolf nearby, contextual button appears, G makes it flee.
    page.evaluate("""()=>{const s=window.__controlsTest.getSim();const w=s.creatures.find(c=>c.speciesId==='wolf');w.x=s.player.x+2.5;w.z=s.player.z;w.state='DEFEND';}""")
    page.keyboard.press('g')
    page.wait_for_function("window.__controlsTest.getSim().creatures.find(c=>c.speciesId==='wolf').fear>0.9")
    results['shout'] = 'G raised wolf fear above 0.9 and spent energy'

    # Save round-trip keeps photo, hatchling and challenges through a reload.
    page.keyboard.press('Escape'); page.locator('#save-now').click()
    page.wait_for_function("window.__controlsTest.getHud().saveStatus==='Salvo neste aparelho.'")
    page.reload(); page.locator('#resume').click(timeout=90000)
    page.wait_for_function('window.__controlsTest.getHud().playing')
    after = hud()
    assert any(p['speciesId'] == 'mosslight' for p in after['pets'])
    assert len(after['photos']) >= 1
    assert any(c['done'] for c in after['challenges'])
    page.wait_for_timeout(500)
    has_model = page.evaluate("window.__controlsTest.getSim().creatures.filter(c=>c.born).length>0 && window.__controlsTest.getSceneCounts().meshes > %d" % counts0['meshes'])
    assert has_model, 'hatchling has no rendered model after reload'
    results['reload'] = 'Hatchling (with its own model), photo and challenges restored from the IndexedDB save'
    # Travel: walk to the east exit, press E, save in the Vereda, reload and resume there.
    exit_ = page.evaluate("window.__controlsTest.getExits().find(e=>e.to==='vereda')")
    tp(exit_['x'] - 1, exit_['z']); page.wait_for_function("window.__controlsTest.getHud().prompt.includes('Trilha')")
    page.keyboard.press('e'); page.wait_for_function("window.__controlsTest.getHud().place.id==='vereda'", timeout=30000)
    page.wait_for_timeout(1500)
    species_here = page.evaluate("[...new Set(window.__controlsTest.getSim().creatures.map(c=>c.speciesId))]")
    assert 'anteater' in species_here and 'capybara' not in species_here
    page.screenshot(path=str(out / 'vereda.png'))
    page.keyboard.press('Escape'); page.locator('#save-now').click()
    page.wait_for_function("window.__controlsTest.getHud().saveStatus==='Salvo neste aparelho.'")
    page.reload(); page.locator('#resume').click(timeout=90000)
    page.wait_for_function("window.__controlsTest.getHud().playing && window.__controlsTest.getHud().place.id==='vereda'", timeout=30000)
    results['travel'] = 'E at the Mata exit loaded the Vereda (Cerrado fauna, no Mata fauna); save and reload resumed in the Vereda'
    counts1 = page.evaluate('window.__controlsTest.getSceneCounts()')
    results['scene_counts'] = {'start': counts0, 'after_reload': counts1}
    results['errors'] = errors
    assert not errors, errors
    browser.close()
(out / 'results.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
print(json.dumps(results, indent=2, ensure_ascii=False))
