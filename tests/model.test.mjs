import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Crystal} from '../model.js';
const hash=c=>createHash('sha256').update(Buffer.from(c.snapshot().ice.buffer)).digest('hex');
test('exact sixfold symmetry under uniform conditions',()=>{const c=new Crystal(70);c.step(600);const ice=new Set(c.cells.filter(([, ,i])=>c.mass[i]>=1).map(([q,r])=>`${q},${r}`));for(const [q0,r0] of c.cells){let q=q0,r=r0;for(let k=0;k<6;k++){assert.equal(ice.has(`${q},${r}`),ice.has(`${q0},${r0}`));[q,r]=[-r,q+r];}}});
test('documented deterministic internal reference',()=>{const c=new Crystal(120,.45,.0008);c.step(800);assert.equal(hash(c),'2b18d0bbec20c123517dd8c3d1f75fc1471343869ea5cadcb13ea278f0677e31');assert.equal(c.snapshot().extent,54);});
test('both conditions alter subsequent growth without removing existing ice',()=>{const a=new Crystal(),b=new Crystal(),c=new Crystal();for(const v of[a,b,c])v.step(350);const before=a.cells.filter(([, ,i])=>a.mass[i]>=1);b.configure(.67,.0008);c.configure(.45,.015);for(const v of[a,b,c])v.step(350);assert.notEqual(hash(a),hash(b));assert.notEqual(hash(a),hash(c));for(const v of[a,b,c])for(const [, ,i]of before)assert.ok(v.mass[i]>=1);});
test('bounded completion and finite nonnegative mass at control extremes',()=>{const c=new Crystal(35,.72,.02);c.step(20000);assert.ok(c.done);assert.ok(c.tick<18000);assert.ok(c.mass.every(n=>Number.isFinite(n)&&n>=0));});
test('each condition still changes future occupancy at early, middle and near-boundary stages',()=>{
  for(const ticks of [120,800,1500]){
    const baseline=new Crystal(),supply=new Crystal(),edge=new Crystal();
    for(const model of [baseline,supply,edge])model.step(ticks);
    const frozen=baseline.cells.filter(([, ,i])=>baseline.mass[i]>=1);
    supply.configure(.62,.0008);edge.configure(.45,.012);
    for(const model of [baseline,supply,edge])model.step(120);
    assert.notEqual(hash(baseline),hash(supply),`supply after step ${ticks}`);
    assert.notEqual(hash(baseline),hash(edge),`edge after step ${ticks}`);
    for(const model of [supply,edge])for(const [, ,i]of frozen)assert.ok(model.mass[i]>=1);
  }
});
