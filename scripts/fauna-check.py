"""Render real EcoWild creatures in an isolated, repeatable Babylon studio.

Requires Vite dev at --url, Python Playwright and Chromium. It never opens a
player save or edits source files. --ref renders a self-contained actors.ts from
Git in memory for comparison; omit it to render the current production module.
Examples:
  python scripts/fauna-check.py --ref 2cdacf7 --output /tmp/ecowild-fauna-before
  python scripts/fauna-check.py --output /tmp/ecowild-fauna-after
This is emulated visual QA, not a physical-device or performance benchmark.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess

from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:4173")
parser.add_argument("--ref", help="Git ref of the original self-contained actors module")
parser.add_argument("--output", default="/tmp/ecowild-fauna-after")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
url = args.url.rstrip("/")
source_url = url + "/src/game/render/actors.ts"
source = None
if args.ref:
    original = subprocess.check_output(
        ["git", "show", f"{args.ref}:src/game/render/actors.ts"], cwd=root, text=True
    )
    source = subprocess.run(
        ["node", "--input-type=module", "-e", """
import ts from 'typescript';
let source=''; for await (const part of process.stdin) source+=part;
process.stdout.write(ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext
}}).outputText);
"""], input=original, text=True, cwd=root, check=True, capture_output=True
    ).stdout.replace('"@babylonjs/core"', '"/node_modules/.vite/deps/@babylonjs_core.js"')
    source_url = url + "/__fauna-original.js"

html = """<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>EcoWild · estudo da fauna</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#18292e;color:#f5ead3;font-family:system-ui,sans-serif}canvas{width:100%;height:100%;display:block}header{position:absolute;top:26px;left:34px;pointer-events:none}small{text-transform:uppercase;letter-spacing:.2em;color:#b7cbbd;font-size:12px}h1{font-family:Georgia,serif;font-size:34px;font-weight:400;margin:8px 0}footer{position:absolute;bottom:22px;left:34px;font-size:12px;color:#c7d1c2;pointer-events:none}</style>
<canvas id="studio"></canvas><header><small>EcoWild · estudo da fauna</small><h1 id="label"></h1></header><footer>Modelos reais do jogo · luz de estúdio para comparação · captura Chromium</footer></html>"""

setup = r"""async ({sourceUrl}) => {
  // Use Vite's exact dependency URL: importing both with/without its version
  // query would initialize Babylon twice and redefine its global extensions.
  const current = await fetch('/src/game/render/actors.ts').then(r=>r.text());
  const dependency = current.match(/"([^"]*@babylonjs_core\.js[^"]*)"/)[1];
  const B = await import(dependency);
  let moduleUrl = sourceUrl;
  if (sourceUrl.endsWith('__fauna-original.js')) {
    const source = (await fetch(sourceUrl).then(r=>r.text())).replace('/node_modules/.vite/deps/@babylonjs_core.js', new URL(dependency, location.href).href);
    moduleUrl = URL.createObjectURL(new Blob([source], {type:'text/javascript'}));
  }
  const A = await import(moduleUrl);
  const canvas = document.querySelector('#studio');
  const engine = new B.Engine(canvas, true, {preserveDrawingBuffer:true, stencil:false});
  const scene = new B.Scene(engine); scene.useRightHandedSystem=true;
  scene.clearColor = new B.Color4(.065,.102,.112,1);
  scene.ambientColor = new B.Color3(.04,.05,.055);
  const camera = new B.FreeCamera('studio-camera',new B.Vector3(3,2,4),scene);
  camera.minZ=.03; camera.maxZ=100; camera.fov=.65;
  const fill = new B.HemisphericLight('studio-fill',new B.Vector3(-.5,1,-.3),scene);
  fill.intensity=.75;fill.diffuse=new B.Color3(.79,.88,1);fill.groundColor=new B.Color3(.22,.2,.17);
  const key = new B.DirectionalLight('studio-key',new B.Vector3(-.5,-1,-.5),scene);
  key.position.set(5,8,6);key.intensity=1.3;key.diffuse=new B.Color3(1,.89,.7);
  const rim = new B.DirectionalLight('studio-rim',new B.Vector3(.6,-.5,.9),scene);
  rim.position.set(-5,4,-6);rim.intensity=.7;rim.diffuse=new B.Color3(.51,.83,.78);
  const mat=new B.StandardMaterial('studio-floor',scene);mat.diffuseColor=new B.Color3(.15,.22,.22);mat.specularColor.set(.02,.02,.02);
  const floor=B.MeshBuilder.CreateGround('studio-floor',{width:40,height:40},scene);floor.material=mat;floor.receiveShadows=true;
  const shadows=new B.ShadowGenerator(1024,key);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=B.ShadowGenerator.QUALITY_LOW;shadows.bias=.001;shadows.normalBias=.03;shadows.setDarkness(.25);
  const names={capybara:'Capivara',rabbit:'Coelho-tapiti',wolf:'Lobo-cinzento',eagle:'Águia-real',auryn:'Auryn'};
  const rigs=Object.keys(names).map(id=>A.buildCreature(scene,'studio-'+id,id));
  for(const rig of rigs) for(const mesh of rig.root.getChildMeshes())shadows.addShadowCaster(mesh);
  const count=()=>({meshes:scene.meshes.length,materials:scene.materials.length,transforms:scene.transformNodes.length});
  const metrics=()=>Object.fromEntries(rigs.map((rig,index)=>{
    let vertices=0,triangles=0,finite=true;
    let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(const m of rig.root.getChildMeshes()){
      m.computeWorldMatrix(true);vertices+=m.getTotalVertices();triangles+=m.getTotalIndices()/3;
      const box=m.getBoundingInfo().boundingBox;
      for(const p of [box.minimumWorld,box.maximumWorld])finite&&=[p.x,p.y,p.z].every(Number.isFinite);
      for(let a=0;a<3;a++){const k=['x','y','z'][a];min[a]=Math.min(min[a],box.minimumWorld[k]);max[a]=Math.max(max[a],box.maximumWorld[k]);}
    }
    return [Object.keys(names)[index],{meshes:rig.root.getChildMeshes().length,vertices,triangles,finite,bounds:{min,max}}];
  }));
  const tick=(state='IDLE',moving=false,steps=30)=>{
    for(let frame=0;frame<steps;frame++)for(const rig of rigs)A.animateRig(rig,frame/60*7,moving,frame/60,{state,fear:state==='FLEE'?.9:0,trust:68,tamed:state==='FOLLOW_OWNER',dt:1/60});
  };
  const render=async()=>{scene.render();await scene.whenReadyAsync();for(let i=0;i<5;i++){scene.render();await new Promise(requestAnimationFrame);}};
  const frameSpecies=async(id,view='three-quarter',state='IDLE')=>{
    const selected=Object.keys(names).indexOf(id);
    rigs.forEach((rig,index)=>{rig.root.setEnabled(index===selected);rig.root.position.set(0,index===3?1.15:0,0);rig.root.rotation.set(0,0,0);});
    tick(state,state==='WANDER');
    const frames={capybara:[3.65,.65],rabbit:[2.7,.52],wolf:[4.15,.82],eagle:[5.2,1.15],auryn:[3.8,.77]};
    const [distance,height]=frames[id];
    const angle=view==='front'?Math.PI/2:view==='profile'?0:Math.PI*.27;
    const elevation=view==='front'?.12:.26;
    camera.position.set(Math.cos(angle)*distance,height+distance*elevation,Math.sin(angle)*distance);
    camera.setTarget(new B.Vector3(0,height,0));
    document.querySelector('#label').textContent=names[id]+(state==='REST'?' · repouso':state==='DRINK'?' · bebendo':'');
    await render();return metrics()[id];
  };
  const lineup=async()=>{
    rigs.forEach((rig,index)=>{rig.root.setEnabled(true);rig.root.position.set((index-2)*2.6,index===3?1.15:0,0);rig.root.rotation.set(0,-.35,0);});
    tick();camera.position.set(0,2.45,9.1);camera.setTarget(new B.Vector3(0,.72,0));
    document.querySelector('#label').textContent='Habitantes da Mata da Nascente';await render();return count();
  };
  const stability=async()=>{
    const initial=count();
    for(const state of ['IDLE','WANDER','DRINK','EAT','REST','FLEE','FOLLOW_OWNER'])tick(state,state==='WANDER'||state==='FLEE',120);
    const after=count();const details=metrics();
    return {initial,after,details};
  };
  window.faunaStudio={frameSpecies,lineup,stability,render,resize:()=>engine.resize(),renderer:engine.getGlInfo(),dispose:()=>{scene.dispose();engine.dispose();}};
  await render();return {renderer:engine.getGlInfo(),initial:count()};
}"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM", "/usr/bin/chromium"), headless=True,
        args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    )
    context = browser.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route(url + "/__fauna-studio", lambda route: route.fulfill(status=200, content_type="text/html", body=html))
    if source is not None:
        page.route(source_url, lambda route: route.fulfill(status=200, content_type="application/javascript", body=source))
    page.goto(url + "/__fauna-studio")
    result = {"source": args.ref or "working-tree", "viewport": [1280, 900], "device": "Chromium emulated, SwiftShader"}
    result["setup"] = page.evaluate(setup, {"sourceUrl": source_url})
    result["species"] = {}
    for species in ["capybara", "rabbit", "wolf", "eagle", "auryn"]:
        for view in ["three-quarter", "profile"]:
            detail = page.evaluate("([id,view])=>window.faunaStudio.frameSpecies(id,view)", [species, view])
            assert detail["finite"] and detail["triangles"] > 0, (species, detail)
            assert all(high > low for low, high in zip(detail["bounds"]["min"], detail["bounds"]["max"])), species
            page.screenshot(path=str(out / f"{species}-{view}.png"))
        result["species"][species] = detail
        print(f"Captured {species}: {detail['meshes']} meshes, {detail['triangles']:.0f} triangles", flush=True)
    for species, state in [("capybara", "DRINK"), ("auryn", "REST")]:
        page.evaluate("([id,state])=>window.faunaStudio.frameSpecies(id,'three-quarter',state)", [species,state])
        page.screenshot(path=str(out / f"{species}-{state.lower()}.png"))
    page.set_viewport_size({"width": 1600, "height": 760})
    # Engine resize is explicit because the studio intentionally has no app listeners.
    page.evaluate("window.faunaStudio.resize()")
    result["lineup"] = page.evaluate("window.faunaStudio.lineup()")
    page.screenshot(path=str(out / "lineup.png"))
    result["stability"] = page.evaluate("window.faunaStudio.stability()")
    assert result["stability"]["initial"] == result["stability"]["after"], "Animation allocated rendering resources"
    assert all(detail["finite"] for detail in result["stability"]["details"].values())
    result["page_errors"] = errors
    assert not errors, errors
    (out / "results.json").write_text(json.dumps(result, indent=2, ensure_ascii=False))
    page.evaluate("window.faunaStudio.dispose()")
    browser.close()
print(f"Fauna QA passed: {out}", flush=True)
