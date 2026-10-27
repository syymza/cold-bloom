import {Crystal} from './model.js?v=20261027-release-5';
let crystal, generation=0;
onmessage=({data})=>{
  if (!Number.isFinite(data.supply) || !Number.isFinite(data.deposition)) throw new RangeError('Growth conditions are invalid. Reload the current app.');
  if(data.type==='reset') {generation=data.generation;crystal=new Crystal(120,data.supply,data.deposition);}
  if(data.generation!==generation || !crystal) return;
  if(data.type==='step') {crystal.configure(data.supply,data.deposition);crystal.step(data.count);}
  const state=crystal.snapshot();postMessage({...state,generation},[state.ice.buffer]);
};
