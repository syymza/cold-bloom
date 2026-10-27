const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path');const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','continuous');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/app.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(root+'/app.js','utf8')+'\nwindow.qaRead=()=>({generation,pending,scene:scene.map(c=>({id:c.id,seat:c.seat,tick:c.tick,done:c.done,extent:c.extent,parameters:c.parameters,ice:c.ice?.length,retireAt:c.retireAt,cache:c.cache?.width||0})),workerCount:1});'}));
 await p.addInitScript(()=>{window.qa={constructors:0,inFlight:0,maxInFlight:0,requests:[],states:[],terminated:0};const W=Worker;window.Worker=class extends W{constructor(...a){super(...a);qa.constructors++;this.addEventListener('message',({data:d})=>{qa.inFlight--;qa.states.push({generation:d.generation,tick:d.tick,extent:d.extent,done:d.done,time:performance.now()});});}postMessage(d){qa.requests.push({...d,time:performance.now()});qa.inFlight++;qa.maxInFlight=Math.max(qa.maxInFlight,qa.inFlight);super.postMessage(d);}terminate(){qa.terminated++;super.terminate();}};});
 await p.goto('http://127.0.0.1:4178/');assert.equal(await p.locator('input[type=range]').count(),2);assert.equal(await p.getByRole('button',{name:/Pause|Restart|Save image|Start growing/}).count(),0);
 const set=async(s,a)=>p.evaluate(({s,a})=>{for(const[id,v]of[['supply',s],['deposition',a]]){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input'));}},{s,a});
 const next=async(n)=>p.waitForFunction(n=>window.qaRead?.().generation>=n,n,{timeout:120000});
 await p.waitForFunction(()=>window.qa?.states.at(-1)?.tick>30);await set(.65,80);
 assert.match(await p.locator('#guidance').textContent(),/next crystal/);
 await next(2);const first=await p.evaluate(()=>({snapshot:qaRead(),resets:qa.requests.filter(r=>r.type==='reset'),finished:qa.states.filter(s=>s.done)}));
 assert.equal(first.resets[1].supply,.65);assert.ok(Math.abs(first.resets[1].deposition-.0008*10**((80-38)/100*2.3))<1e-10);
 assert.ok(await p.evaluate(()=>qa.requests.filter(r=>r.type==='step'&&r.generation===1).every(r=>r.supply===.45&&r.deposition===.0008)));
 console.log('FIRST_TRANSITION',JSON.stringify(first));await p.screenshot({path:out+'/first-transition.png',fullPage:true});
 await p.waitForFunction(()=>qaRead().scene.at(-1).tick>50);await set(.62,60);await next(3);
 assert.equal(await p.evaluate(()=>qa.requests.filter(r=>r.type==='reset').at(-1).supply),.62);
 await set(.72,100);await next(5);
 await p.waitForFunction(()=>qaRead().generation===5&&qaRead().scene.at(-1).done,{},{timeout:120000});
 const crowd=await p.evaluate(()=>qaRead());assert.equal(crowd.scene.length,5);assert.ok(crowd.scene.some(c=>c.retireAt!==null));await p.screenshot({path:out+'/crowded-desktop.png',fullPage:true});
 const ticks=await p.evaluate(()=>qaRead().scene.map(c=>[c.id,c.tick]));await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:out+'/crowded-mobile.png',fullPage:true});
 for(const[id,tick]of ticks){const current=await p.evaluate(id=>qaRead().scene.find(c=>c.id===id),id);if(current)assert.equal(current.tick,tick);}
 await next(6);assert.ok(await p.evaluate(()=>qaRead().scene.length<=5&&!qaRead().scene.some(c=>c.id===1)));
 // Simulate document visibility deterministically; no claim of OS background testing.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(100);const hidden=await p.evaluate(()=>qa.states.at(-1));await p.waitForTimeout(500);assert.deepEqual(await p.evaluate(()=>qa.states.at(-1)),hidden);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(750);assert.ok(await p.evaluate(t=>qa.states.at(-1).generation>t.generation || qa.states.at(-1).tick>t.tick,hidden));
 await next(7);const final=await p.evaluate(()=>({scene:qaRead(),constructors:qa.constructors,maxInFlight:qa.maxInFlight,finished:qa.states.filter(s=>s.done),resets:qa.requests.filter(r=>r.type==='reset')}));
 assert.equal(final.constructors,1);assert.equal(final.maxInFlight,1);assert.ok(final.finished.length>=6);assert.ok(final.scene.scene.length<=5);assert.ok(final.scene.scene.every(c=>c.cache<=640));assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/normal-speed.json',JSON.stringify(final,null,2));console.log('NORMAL_PASS',JSON.stringify(final));
 await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));assert.equal(await p.evaluate(()=>qa.terminated),1);await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
