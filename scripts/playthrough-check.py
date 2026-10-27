"""Keyboard playthrough from spawn; reads the dev probe to navigate, never edits simulation.
Run against Vite dev. Chromium software rendering is not a physical device test.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import os,json,math,time
out=Path(os.environ.get('EVIDENCE_DIR','/tmp/ecowild-playthrough'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':720});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:4173');page.locator('#enter').click(timeout=60000)
 def sim():return page.evaluate('window.__controlsTest.getSim()')
 held=set()
 def keys(next):
  global held
  for key in held-set(next):page.keyboard.up(key)
  for key in set(next)-held:page.keyboard.down(key)
  held=set(next)
 def walk(x,z,tolerance=.7):
  deadline=time.time()+20
  while time.time()<deadline:
   state=sim();dx=x-state['player']['x'];dz=z-state['player']['z']
   if math.hypot(dx,dz)<tolerance:keys([]);return
   move=[]
   if abs(dx)>.35:move.append('d' if dx>0 else 'a')
   if abs(dz)>.35:move.append('s' if dz>0 else 'w')
   keys(move);page.wait_for_timeout(130)
  keys([]);raise AssertionError(f'Path blocked toward {x},{z}; player {sim()["player"]}')
 # Dry western trail, avoiding the tree at (-5,7).
 for x,z in [(0,11),(-8,10),(-8,-4)]:walk(x,z)
 page.keyboard.press('e')
 page.wait_for_function('window.__controlsTest.getSim().inventory.glowfruit>=1',timeout=10000)
 # Follow the real wandering animal calmly and wait for its approach.
 # The runtime caps dt per frame. SwiftShader under CPU contention can take
 # several wall seconds for one simulated second; keep a separate hard guard.
 started=time.monotonic(); deadline=started+240; sim_started=sim()['time']; sim_deadline=sim_started+45
 trace=[]
 while time.monotonic()<deadline:
  state=sim();pet=next(c for c in state['creatures'] if c['speciesId']=='auryn');player=state['player']
  if state['time']>=sim_deadline:break
  d=math.hypot(pet['x']-player['x'],pet['z']-player['z'])
  trace.append({'seconds':state['time'],'wall_elapsed':time.monotonic()-started,'distance':d,'trust':pet['trust'],'observe':pet['observe'],'fear':pet['fear'],'state':pet['state'],'player':[player['x'],player['z']],'auryn':[pet['x'],pet['z']],'prompt':state['prompt']})
  if d>4.5:walk(pet['x'],pet['z'],3.2)
  elif pet['trust']<58 or pet['observe']<3:keys([]);page.wait_for_timeout(350)
  elif d>2.2:walk(pet['x'],pet['z'],1.9)
  else:
   keys([]);page.keyboard.press('e');page.wait_for_timeout(250)
   if next(c for c in sim()['creatures'] if c['speciesId']=='auryn')['tamed']:break
 if not next(c for c in sim()['creatures'] if c['speciesId']=='auryn')['tamed']:
  (out/'failed-playthrough.json').write_text(json.dumps({'trace':trace,'sim':sim(),'errors':errors},indent=2,ensure_ascii=False))
  page.screenshot(path=str(out/'failed-playthrough.png'))
  print(json.dumps(trace[-8:],indent=2,ensure_ascii=False),flush=True)
  raise AssertionError('No bond in actual playthrough; see failed-playthrough.json')
 bond_timing={'simulated_seconds':sim()['time']-sim_started,'wall_seconds':time.monotonic()-started}
 page.screenshot(path=str(out/'bond.png'))
 page.locator('#open-pause').click();page.locator('[data-pet="STAY"]').click();page.locator('#pet-name').fill('Luz');page.locator('#rename-pet').click()
 page.wait_for_function("window.__controlsTest.getHud().saveStatus==='Salvo neste aparelho.'")
 page.reload();page.locator('#resume').click(timeout=60000)
 pet=page.evaluate('window.__controlsTest.getHud().pet');assert pet['name']=='Luz' and pet['command']=='STAY'
 page.locator('#open-catalog').click();assert 'Pesquisa 100%' in page.locator('#sheet').inner_text()
 page.screenshot(path=str(out/'catalog.png'))
 result={'path':'spawn → trail → glow-0 → observe actual wandering Auryn → offer → STAY/name → save/reload → diary','state_modified_by_test':False,'bond_timing':bond_timing,'pet':pet,'errors':errors}
 assert not errors,errors
 (out/'results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));print(json.dumps(result,indent=2,ensure_ascii=False),flush=True);b.close()
