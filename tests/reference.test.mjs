import test from 'node:test';
import assert from 'node:assert/strict';
import {Crystal} from '../model.js';
const at = (model, q, r) => model.cells.find(cell => cell[0] === q && cell[1] === r)[2];
const directions = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const close = (actual, expected, tolerance = 1e-11) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('published Figure 2 interior update, rounded to its three decimal places', () => {
  // Reiter preprint p.12, Figure 2. Embed the local patch far from the seed/boundary.
  const model = new Crystal(60, .2, .1);
  const rows = [[1,1,1],[.5,1,1,1],[.2,.5,1,1,1],[.2,.2,.5,1],[.2,.2,.5]];
  for (let r = -2; r <= 2; r++) {
    const start = Math.max(-2, -r - 2);
    rows[r + 2].forEach((value, column) => { model.mass[at(model, 20 + start + column, r)] = value; });
  }
  model.step();
  for (const [q,r,expected] of [[0,0,1.1],[1,0,1.1],[0,-1,1.1],[1,-1,1.1],[-1,0,.633],[-1,1,.350],[0,1,.617]]) {
    assert.equal(+model.mass[at(model, 20 + q, r)].toFixed(3), expected);
  }
});

test('paper limiting cases: no supply means no growth; deposition alone forms plates', () => {
  const still = new Crystal(30, 0, 0); still.step(100);
  assert.equal(still.snapshot().ice.length / 3, 1);
  const plate = new Crystal(30, 0, 1);
  for (let n = 1; n <= 4; n++) {
    plate.step();
    assert.equal(plate.snapshot().ice.length / 3, 3 * n * (n + 1) + 1);
    close(plate.mass[at(plate, 0, 0)], n + 1);
  }
});

test('half-center/six-twelfths diffusion and receptive deposition are synchronous', () => {
  const model = new Crystal(20, .5, .1); model.step();
  close(model.mass[at(model, 0, 0)], 1.1);
  close(model.mass[at(model, 1, 0)], .725);
  close(model.mass[at(model, 2, 0)], 11 / 24);
  close(model.mass[at(model, 1, 1)], 5 / 12);
});

test('reservoir follows Euclidean distance and remains fixed', () => {
  const model = new Crystal(14, .4, .02);
  assert.ok(model.cells.some(([q,r]) => Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r)) > 14));
  for (const [q,r,i] of model.cells) {
    assert.ok(q*q+q*r+r*r <= 14*14);
    assert.equal(!!model.boundary[i], directions.some(([a,b]) => (q+a)**2+(q+a)*(r+b)+(r+b)**2 > 14*14));
  }
  model.step(20);
  for (let i=0;i<model.mass.length;i++) if (model.boundary[i]) close(model.mass[i], .4);
});

test('background changes proportionally rescale only the free field', () => {
  const model = new Crystal(30, .4, .002); model.step(30); model.classify();
  const before = model.mass.slice(), receptive = model.receptive.slice();
  model.configure(.6, .005);
  for (let i=0;i<before.length;i++) close(model.mass[i], receptive[i] ? before[i] : before[i]*1.5);
  assert.throws(() => new Crystal(20,0,0).configure(.4,.01), /new seed/);
});

test('without deposition, diffusion conserves mass before a disturbance reaches the reservoir', () => {
  const model = new Crystal(30, .4, 0);
  const total = () => model.cells.reduce((sum,[,,i]) => sum + model.mass[i], 0);
  const before = total(); model.step(5); close(total(), before, 1e-9);
});
