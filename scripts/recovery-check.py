"""Chromium regression checks for recovery, conflicting tabs and touch zoom.

Run against Vite dev, after editing has finished:
  python scripts/recovery-check.py --output /tmp/ecowild-recovery

Requires Python Playwright and Chromium. Uses isolated browser contexts and
explicit save fixtures, not an exploration playthrough or physical-device test.
"""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4173")
parser.add_argument("--output", default="/tmp/ecowild-recovery")
args = parser.parse_args()
output = Path(args.output)
output.mkdir(parents=True, exist_ok=True)
results = {}
errors = []


def ready(page):
    page.wait_for_function("window.__controlsTest?.getHud().ready", timeout=60000)


def open_page(context):
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(args.url)
    ready(page)
    return page


def hud(page):
    return page.evaluate("window.__controlsTest.getHud()")


def seed(page, primary, backup):
    # A fresh isolated context owns this database. No real player data is used.
    page.evaluate("""async ({primary,backup}) => {
      const db=await new Promise((resolve,reject)=>{
        const q=indexedDB.open('ecowild',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
      });
      try { await new Promise((resolve,reject)=>{
        const tx=db.transaction('slots','readwrite'), store=tx.objectStore('slots');
        store.clear();
        if(primary!==null) store.put(primary,'primary');
        if(backup!==null) store.put(backup,'backup');
        tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
      }); } finally { db.close(); }
    }""", {"primary": primary, "backup": backup})
    page.reload()
    ready(page)


def raw_slots(page):
    return page.evaluate("""async () => {
      const db=await new Promise((resolve,reject)=>{
        const q=indexedDB.open('ecowild',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
      });
      try { return await new Promise((resolve,reject)=>{
        const tx=db.transaction('slots'), store=tx.objectStore('slots');
        const values={};
        for(const key of ['primary','backup']) {const q=store.get(key);q.onsuccess=()=>values[key]=q.result??null;}
        tx.oncomplete=()=>resolve(values);tx.onabort=()=>reject(tx.error);
      }); } finally { db.close(); }
    }""")


def downloaded_json(page, button, filename):
    with page.expect_download() as download_info:
        page.locator(button).click()
    download = download_info.value
    assert download.failure() is None
    target = output / filename
    download.save_as(target)
    return json.loads(target.read_text())


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM", "/usr/bin/chromium"),
        headless=True,
        args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    )
    context = browser.new_context(viewport={"width": 844, "height": 390}, accept_downloads=True)
    page = open_page(context)
    fixtures = page.evaluate("""async () => {
      const {createSim,toSave}=await import('/src/game/sim/simulation.ts');
      const sim=createSim(null), c=sim.creatures.find(c=>c.speciesId==='auryn');
      c.tamed=true;c.trust=100;c.name='Luz';c.command='STAY';c.xp=12;
      sim.petName='Luz';sim.inventory.berries=7;sim.time=123;
      sim.discoveries.auryn={seen:true,habitat:true,behavior:true,interacted:true};
      const backup=toSave(sim,{quality:'low',lookSens:.0045});
      const primary=toSave(createSim(null),{quality:'low',lookSens:.0045});
      primary.inventory.berries=2;
      return {primary,backup};
    }""")
    invalid = {"version": 99, "futurePayload": {"name": "Preservar sem coerção", "data": [1, 2, 3]}}
    seed(page, invalid, fixtures["backup"])
    page.locator("#manage-progress").click()
    page.locator("#restore-backup").wait_for(state="visible")
    before = raw_slots(page)
    page.once("dialog", lambda dialog: dialog.dismiss())
    page.locator("#restore-backup").click()
    assert raw_slots(page) == before, "Canceling restore changed stored progress"
    assert downloaded_json(page, "#export-current", "incompatible-primary.json") == invalid
    assert downloaded_json(page, "#export-backup", "backup.json") == fixtures["backup"]
    page.once("dialog", lambda dialog: dialog.accept())
    page.locator("#restore-backup").click()
    page.wait_for_function("window.__controlsTest.getHud().hasSave")
    stored = raw_slots(page)
    assert stored["primary"] == fixtures["backup"]
    assert stored["backup"] == invalid, "Restoration discarded incompatible original"
    page.locator("#close-progress").click()
    page.locator("#resume").click()
    page.wait_for_function("window.__controlsTest.getHud().playing")
    page.locator("#open-pause").click()
    assert hud(page)["pet"]["name"] == "Luz" and hud(page)["pet"]["command"] == "STAY"
    assert hud(page)["inventory"]["berries"] == 7
    assert next(item for item in hud(page)["catalog"] if item["id"] == "auryn")["progress"] == 100
    page.reload()
    ready(page)
    page.locator("#resume").click()
    page.locator("#open-pause").click()
    assert hud(page)["pet"]["name"] == "Luz"
    assert hud(page)["pet"]["command"] == "STAY"
    results["recovery_ui"] = "Cancel preserves both slots; raw downloads; incompatible primary preserved in backup; Auryn/command/catalog/inventory restored after reload"
    page.screenshot(path=str(output / "recovered-pause.png"))

    # Backend fixtures: transactional rollback, invalid backup and simultaneous CAS.
    page.reload()
    ready(page)
    seed(page, fixtures["primary"], fixtures["backup"])
    results["storage"] = page.evaluate("""async () => {
      const {SaveSession}=await import('/src/game/persistence/save.ts');
      const first=new SaveSession(), second=new SaveSession();
      const a=await first.load(),b=await second.load();
      const one=structuredClone(a.data),two=structuredClone(b.data);
      one.inventory.berries=3;two.inventory.berries=4;
      const race=await Promise.all([first.write(one),second.write(two)]);
      const loser=race[0].status==='conflict'?first:second;
      await loser.inspect();await loser.exportRaw('primary');
      const sticky=await loser.write(one);
      const verifier=new SaveSession();const winner=await verifier.load();
      const beforePrimary=await verifier.exportRaw('primary'),beforeBackup=await verifier.exportRaw('backup');
      const put=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){const req=put.apply(this,args);this.transaction.abort();return req;};
      let aborted;
      try {aborted=await verifier.restoreBackup();} finally {IDBObjectStore.prototype.put=put;}
      const afterPrimary=await verifier.exportRaw('primary'),afterBackup=await verifier.exportRaw('backup');
      const restored=await verifier.restoreBackup();
      const after=await verifier.load();
      const swapped=after.backup.data?.inventory.berries===winner.data.inventory.berries;
      return {race:race.map(r=>r.status),sticky:sticky.status,aborted:aborted.status,
        rollback:beforePrimary.json===afterPrimary.json&&beforeBackup.json===afterBackup.json,
        restored:restored.status,berries:after.data?.inventory.berries,swapped};
    }""")
    storage = results["storage"]
    assert sorted(storage["race"]) == ["conflict", "saved"]
    assert storage["sticky"] == "conflict"
    assert storage["aborted"] == "unavailable" and storage["rollback"]
    assert storage["restored"] == "saved" and storage["berries"] == 7 and storage["swapped"]
    seed(page, fixtures["primary"], invalid)
    assert page.evaluate("""async()=>{const {SaveSession}=await import('/src/game/persistence/save.ts');const s=new SaveSession();await s.load();return (await s.restoreBackup()).status;}""") == "invalid"
    assert raw_slots(page) == {"primary": fixtures["primary"], "backup": invalid}
    results["invalid_backup_preserved"] = True

    # Restore before the first new-game save must use the selected backup,
    # preserving unsaved play instead of overwriting that backup beforehand.
    seed(page, fixtures["primary"], fixtures["backup"])
    page.once("dialog", lambda dialog: dialog.accept())
    page.locator("#enter").click()
    page.locator("#open-pause").click()
    page.evaluate("window.__controlsTest.getSim().inventory.berries=9")
    page.locator("#manage-progress-pause").click()
    page.once("dialog", lambda dialog: dialog.accept())
    page.locator("#restore-backup").click()
    page.wait_for_function("window.__controlsTest.getHud().pet?.name==='Luz'")
    assert raw_slots(page)["primary"] == fixtures["backup"]
    assert raw_slots(page)["backup"]["inventory"]["berries"] == 9
    assert hud(page)["panel"] == "pause"
    page.wait_for_function("document.querySelector('#progress-dialog').getAttribute('aria-busy')==='false'")
    page.keyboard.press("Escape")
    page.locator("#progress-dialog").wait_for(state="hidden")
    assert hud(page)["panel"] == "pause", "Escape also resumed the underlying game"
    page.locator("#manage-progress-pause").click()
    page.once("dialog", lambda dialog: dialog.accept())
    page.locator("#restore-backup").click()
    page.wait_for_function("window.__controlsTest.getHud().inventory.berries===9")
    assert raw_slots(page)["backup"]["pet"]["name"] == "Luz"
    results["restore_unsaved_and_undo"] = "New unsaved session kept atomically; chosen backup restored; undo recovers 9 berries; Escape keeps pause"
    page.locator("#close-progress").click()

    # Two actual tabs, same origin/storage, independently loaded runtimes.
    seed(page, fixtures["primary"], fixtures["backup"])
    other = open_page(context)
    for tab in [page, other]:
        tab.bring_to_front()
        tab.locator("#resume").click()
        tab.locator("#open-pause").click()
    page.bring_to_front()
    page.locator("#save-now").click()
    page.wait_for_function("window.__controlsTest.getHud().saveStatus==='Salvo neste aparelho.'")
    primary_after_first = raw_slots(page)["primary"]
    other.bring_to_front()
    other.locator("#save-now").click()
    other.wait_for_function("/outra aba/i.test(window.__controlsTest.getHud().saveStatus)")
    assert raw_slots(other)["primary"] == primary_after_first, "Stale tab overwrote newer progress"
    other.locator("#manage-progress-pause").click()
    exported = downloaded_json(other, "#export-current", "conflicting-session.json")
    assert exported["version"] == 1
    assert raw_slots(other)["primary"] == primary_after_first
    other.once("dialog", lambda dialog: dialog.dismiss())
    other.locator("#reload-progress").click()
    assert other.locator("#progress-dialog").is_visible()
    other.once("dialog", lambda dialog: dialog.accept())
    other.locator("#reload-progress").click()
    ready(other)
    assert other.locator("#resume").is_visible()
    results["two_tabs"] = "Second stale runtime refuses save; session remains exportable; cancel/reload explicit"
    other.screenshot(path=str(output / "after-conflict-reload.png"))
    context.close()

    # A separate touch context avoids inherited saves and freezes involving two tabs.
    mobile = browser.new_context(viewport={"width": 844, "height": 390}, has_touch=True, is_mobile=True)
    page = open_page(mobile)
    page.locator("#enter").click()
    page.wait_for_function("window.__controlsTest.getHud().playing")
    cdp = mobile.new_cdp_session(page)
    cdp.send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 5})

    def point(identifier, x, y):
        return {"id": identifier, "x": x, "y": y, "radiusX": 4, "radiusY": 4, "force": 1}

    def touch(kind, points):
        cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": points})

    def camera():
        return page.evaluate("window.__controlsTest.getCamera()")

    pad = page.locator("#pad").bounding_box()
    cx, cy = pad["x"] + pad["width"] / 2, pad["y"] + pad["height"] / 2
    original = camera()
    touch("touchStart", [point(1, cx, cy), point(2, 450, 190), point(3, 560, 190)])
    touch("touchMove", [point(1, cx, cy - 35), point(2, 430, 190), point(3, 595, 190)])
    page.wait_for_timeout(350)
    zoomed = camera()
    assert zoomed["distance"] < original["distance"] - .1, "Pinch did not zoom while moving"
    assert abs(zoomed["yaw"] - original["yaw"]) < .001, "Pinch unexpectedly rotated camera"
    assert page.evaluate("window.__controlsTest.getSpeed()") > 1
    touch("touchEnd", [point(3, 595, 190)])
    page.wait_for_timeout(150)
    assert abs(camera()["yaw"] - zoomed["yaw"]) < .001, "Releasing second camera finger jumped yaw"
    touch("touchMove", [point(1, cx, cy - 35), point(2, 445, 190)])
    page.wait_for_timeout(200)
    assert abs(camera()["yaw"] - zoomed["yaw"]) > .02, "Remaining camera finger did not resume drag"
    assert abs(camera()["distance"] - zoomed["distance"]) < .001
    touch("touchCancel", [])
    page.wait_for_timeout(150)
    assert page.evaluate("window.__controlsTest.getSpeed()") == 0
    assert page.locator("#pad-knob").evaluate("el=>el.style.transform") == "translate(-50%, -50%)"
    still = camera()
    page.wait_for_timeout(200)
    assert camera() == still, "Canceled pinch leaked camera movement"
    results["touch_zoom"] = "Three simultaneous fingers: joystick + pinch; no rotation during pinch; 2-to-1 drag without jump; cancellation releases joystick/camera"
    page.screenshot(path=str(output / "touch-landscape.png"))
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#portrait-dismiss").click()
    page.locator("#open-pause").click()
    page.locator("#manage-progress-pause").click()
    assert page.locator("#progress-dialog").is_visible()
    for selector in ["#export-current", "#close-progress"]:
        box = page.locator(selector).bounding_box()
        assert box and box["width"] >= 44 and box["height"] >= 44
    page.screenshot(path=str(output / "progress-portrait.png"))
    results["recovery_portrait"] = "Recovery dialog accessible at 390x844; touch targets at least 44 CSS px"
    results["pageerrors"] = errors
    assert not errors, errors
    (output / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(json.dumps(results, indent=2, ensure_ascii=False), flush=True)
    browser.close()
