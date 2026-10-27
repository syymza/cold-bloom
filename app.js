const canvas = document.querySelector('#crystal');
const ctx = canvas.getContext('2d');
const supply = document.querySelector('#supply');
const deposition = document.querySelector('#deposition');
const status = document.querySelector('#status');
const guidance = document.querySelector('#guidance');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const worker = new Worker(new URL('./worker.js?v=20261027-release-5', import.meta.url), {type: 'module'});
const scene = [];
const RETIRE_MS = 3000;
const MAX_GROWTH_STEPS = 3200;
const MAX_VISIBLE = 5;
let active, generation = 0, pending = false, disposed = false;
let timer = 0, frame = 0, dueAt = 0, width = 0, height = 0;
let hiddenAt = document.hidden ? performance.now() : null, pausedTime = 0;
let queued = false, failed = false;
const now = () => (hiddenAt ?? performance.now()) - pausedTime;
const parameters = () => ({supply: +supply.value, deposition: .0008 * 10 ** ((+deposition.value - 38) / 100 * 2.3)});
const description = () => ({supply: +supply.value < .45 ? 'Low' : +supply.value < .59 ? 'Steady' : 'Rich', deposition: +deposition.value < 35 ? 'Low' : +deposition.value < 65 ? 'Steady' : 'High'});

function labels() {
  const text = description();
  document.querySelector('#supply-value').value = text.supply;
  document.querySelector('#deposition-value').value = text.deposition;
  supply.setAttribute('aria-valuetext', `${text.supply} vapor supply for the next crystal`);
  deposition.setAttribute('aria-valuetext', `${text.deposition} ice buildup for the next crystal`);
  for (const input of [supply, deposition]) input.style.setProperty('--fill', `${(+input.value - +input.min) / (+input.max - +input.min) * 100}%`);
}
function updateText() {
  if (failed) { status.textContent = 'Growth was interrupted. Reload to continue.'; return; }
  status.textContent = document.hidden ? 'Resting in the background' : active?.done ? 'A new seed will follow' : 'A crystal is taking shape';
  const text = queued ? 'Ready for the next crystal. Earlier shapes stay as they are.' : `New crystal: ${active.words.supply.toLowerCase()} vapour, ${active.words.deposition.toLowerCase()} ice buildup. Changes wait for the next.`;
  if (guidance.textContent !== text) guidance.textContent = text;
}
function release(item) {
  item.ice = null;
  if (item.cache) { item.cache.width = 0; item.cache.height = 0; item.cache = null; }
}
function startNext() {
  if (disposed || failed || document.hidden) return;
  // Six considered seats leave room for five crystals without overlap.
  if (scene.length >= MAX_VISIBLE) {
    const oldest = scene[0];
    if (!motion.matches) {
      oldest.retireAt ??= now();
      if (now() - oldest.retireAt < RETIRE_MS) {
        schedule(oldest.retireAt + RETIRE_MS);
        draw();
        return;
      }
    }
    release(scene.shift());
  }
  generation++;
  active = {id: generation, seat: (generation - 1) % 6, parameters: parameters(), words: description(), ice: new Float32Array([0, 0, 1]), tick: 0, extent: 0, done: false, cache: null, dirty: true, retireAt: null};
  scene.push(active);
  queued = false;
  pending = true;
  worker.postMessage({type: 'reset', generation, ...active.parameters});
  updateText();
  draw();
}
function schedule(time) {
  clearTimeout(timer);
  dueAt = time;
  if (disposed || failed || document.hidden || pending || !active) return;
  timer = setTimeout(() => {
    timer = 0;
    if (disposed || failed || document.hidden) return;
    if (active.done) startNext();
    else {
      pending = true;
      worker.postMessage({type: 'step', generation, count: motion.matches ? 12 : 8, ...active.parameters});
    }
  }, Math.max(0, time - now()));
}
function settlementDelay() {
  if (motion.matches) return 14000;
  if (scene.length < MAX_VISIBLE) return 1000;
  scene[0].retireAt ??= now();
  return Math.max(1000, RETIRE_MS - (now() - scene[0].retireAt));
}
worker.onmessage = ({data}) => {
  if (disposed || data.generation !== generation) return;
  pending = false;
  if (!data.ice?.length || !Number.isFinite(data.tick) || !Number.isFinite(data.extent)) { failGrowth(); return; }
  const advance = Math.max(0, data.extent - active.extent);
  Object.assign(active, data, {done: data.done || data.tick >= MAX_GROWTH_STEPS, dirty: true});
  const delay = active.done ? settlementDelay() : motion.matches ? 32 : 24 + (data.extent >= 8 ? advance * 35 : 0);
  draw();
  updateText();
  schedule(now() + delay);
};
function failGrowth() {
  failed = true;
  pending = false;
  clearTimeout(timer);
  cancelAnimationFrame(frame);
  frame = 0;
  updateText();
}
worker.onerror = failGrowth;

function placement(item) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const compactLandscape = matchMedia('(max-width: 950px) and (max-height: 600px)').matches;
  if (mobile || compactLandscape) {
    const seats = [[.25, .18, .95], [.75, .82, .96], [.75, .18, .92], [.25, .82, 1], [.50, .50, 1.04]];
    // Five consecutive generations fill the portrait composition without a spare hole.
    const [x, y, size] = seats[(item.id - 1) % 5];
    const top = compactLandscape && !mobile ? 170 : 145;
    const space = Math.max(180, height - top - 60);
    return {x: width * x, y: top + space * y, radius: Math.min(width * .185, space * .18) * size};
  }
  const seats = [[.52, .43, 1], [.82, .24, .83], [.19, .74, .87], [.50, .78, .86], [.82, .72, .95], [.26, .43, .76]];
  const [x, y, size] = seats[item.seat];
  return {x: width * x, y: height * y, radius: Math.min(width * .12, height * .18) * size};
}
function stamp(item, radius) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const side = Math.min(640, Math.ceil((radius + 5) * 2 * dpr));
  if (!item.cache) item.cache = document.createElement('canvas');
  if (item.cache.width !== side) { item.cache.width = side; item.cache.height = side; item.dirty = true; }
  if (!item.dirty) return;
  const c = item.cache.getContext('2d');
  c.clearRect(0, 0, side, side);
  const center = side / 2;
  const scale = (center - 5 * dpr) / 120;
  const hex = scale * .61;
  for (let k = 0; k < item.ice.length; k += 3) {
    const q = item.ice[k], r = item.ice[k + 1], mass = item.ice[k + 2];
    const x = center + (q + r * .5) * scale, y = center + r * Math.sqrt(3) / 2 * scale;
    const light = Math.min(1, (mass - 1) * .28);
    c.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = Math.PI / 3 * j + Math.PI / 6;
      const px = x + Math.cos(angle) * hex, py = y + Math.sin(angle) * hex;
      if (j) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath();
    c.fillStyle = `rgb(${Math.round(176 + light * 42)} ${Math.round(197 + light * 26)} ${Math.round(180 + light * 29)})`;
    c.fill();
    if (scale > 1.4) { c.strokeStyle = 'rgba(242,246,219,.18)'; c.lineWidth = .35; c.stroke(); }
  }
  item.dirty = false;
}
function draw() {
  if (disposed || !width || !height || document.hidden) return;
  for (let i = scene.length - 1; i >= 0; i--) {
    const item = scene[i];
    if (item.retireAt !== null && (motion.matches || now() - item.retireAt >= RETIRE_MS)) { release(item); scene.splice(i, 1); }
  }
  ctx.clearRect(0, 0, width, height);
  for (const item of scene) {
    // Reduced motion presents finished stills rather than animated growth.
    if (motion.matches && !item.done) continue;
    const {x, y, radius} = placement(item);
    stamp(item, radius);
    const age = Math.max(0, generation - item.id);
    const retirement = item.retireAt === null ? 1 : Math.max(0, 1 - (now() - item.retireAt) / RETIRE_MS);
    ctx.globalAlpha = (item === active ? 1 : Math.max(.72, .96 - age * .08)) * retirement;
    ctx.drawImage(item.cache, x - radius - 5, y - radius - 5, (radius + 5) * 2, (radius + 5) * 2);
    if (item === active && item.extent < 5 && !motion.matches) {
      ctx.strokeStyle = '#9caf8b66'; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  if (!motion.matches && scene.some(item => item.retireAt !== null) && !frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
}
function resize() {
  const box = canvas.getBoundingClientRect();
  width = box.width; height = box.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const item of scene) item.dirty = true;
  draw();
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);
function adjust() { queued = true; labels(); updateText(); }
supply.addEventListener('input', adjust);
deposition.addEventListener('input', adjust);
function visibility() {
  const time = performance.now();
  if (document.hidden) {
    if (hiddenAt === null) hiddenAt = time;
    clearTimeout(timer); cancelAnimationFrame(frame); frame = 0;
  } else {
    if (hiddenAt !== null) { pausedTime += time - hiddenAt; hiddenAt = null; }
    if (!active) startNext(); else schedule(dueAt);
    draw();
  }
  if (active) updateText();
}
function motionChanged() {
  if (active && !pending) schedule(now() + (active.done ? settlementDelay() : motion.matches ? 32 : 24));
  draw();
}
document.addEventListener('visibilitychange', visibility);
motion.addEventListener('change', motionChanged);
function dispose() {
  if (disposed) return;
  disposed = true;
  clearTimeout(timer); cancelAnimationFrame(frame);
  worker.terminate(); observer.disconnect();
  document.removeEventListener('visibilitychange', visibility);
  motion.removeEventListener('change', motionChanged);
  supply.removeEventListener('input', adjust); deposition.removeEventListener('input', adjust);
  for (const item of scene) release(item);
  scene.length = 0;
}
window.addEventListener('pagehide', event => {
  if (!event.persisted) dispose();
  else { if (hiddenAt === null) hiddenAt = performance.now(); clearTimeout(timer); cancelAnimationFrame(frame); frame = 0; }
});
window.addEventListener('pageshow', event => { if (event.persisted) visibility(); });
labels();
if (!document.hidden) startNext();
