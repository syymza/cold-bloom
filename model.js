// Reiter's two-stage local rule, with a circular reservoir on an axial lattice.
export class Crystal {
  constructor(radius = 120, supply = .45, deposition = .0008) {
    if (!Number.isInteger(radius) || radius < 6) throw new RangeError('Radius must be an integer of at least six.');
    this.validateConditions(supply, deposition);
    this.radius = radius;
    this.supply = supply;
    this.deposition = deposition;
    const key = (q, r) => `${q},${r}`;
    const canonical = (q, r) => {
      let best = [q, r];
      for (let turn = 0; turn < 5; turn++) {
        [q, r] = [-r, q + r];
        if (q < best[0] || (q === best[0] && r < best[1])) best = [q, r];
      }
      return key(...best);
    };
    const map = new Map(), representatives = [];
    this.cells = [];
    // q² + qr + r² is Euclidean distance squared in this lattice.
    const bound = Math.ceil(2 * radius / Math.sqrt(3));
    for (let q = -bound; q <= bound; q++) {
      for (let r = -bound; r <= bound; r++) {
        if (q * q + q * r + r * r > radius * radius) continue;
        const representative = canonical(q, r);
        if (!map.has(representative)) {
          map.set(representative, map.size);
          representatives.push([q, r]);
        }
        this.cells.push([q, r, map.get(representative)]);
      }
    }
    const directions = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    this.neighbors = representatives.map(([q, r]) => directions.map(([a, b]) => map.get(canonical(q + a, r + b)) ?? -1));
    this.boundary = Uint8Array.from(this.neighbors, neighbors => neighbors.some(index => index < 0) ? 1 : 0);
    this.mass = new Float64Array(map.size).fill(supply);
    this.next = new Float64Array(map.size);
    this.free = new Float64Array(map.size);
    this.receptive = new Uint8Array(map.size);
    this.mass[map.get('0,0')] = 1;
    this.tick = 0;
    this.done = false;
  }
  validateConditions(supply, deposition) {
    if (!Number.isFinite(supply) || supply < 0 || supply >= 1 || !Number.isFinite(deposition) || deposition < 0) {
      throw new RangeError('Use a background in [0,1) and nonnegative deposition.');
    }
  }
  classify() {
    for (let i = 0; i < this.mass.length; i++) {
      this.receptive[i] = this.mass[i] >= 1 || this.neighbors[i].some(j => j >= 0 && this.mass[j] >= 1) ? 1 : 0;
      this.free[i] = this.receptive[i] ? 0 : this.mass[i];
    }
  }
  configure(supply, deposition) {
    this.validateConditions(supply, deposition);
    if (supply !== this.supply) {
      if (this.supply === 0) throw new RangeError('Start a new seed to change a zero background to a positive one.');
      this.classify();
      const ratio = supply / this.supply;
      for (let i = 0; i < this.mass.length; i++) if (!this.receptive[i]) this.mass[i] *= ratio;
    }
    this.supply = supply;
    this.deposition = deposition;
  }
  step(count = 1) {
    if (!Number.isInteger(count) || count < 0) throw new RangeError('Step count must be a nonnegative integer.');
    for (let step = 0; step < count && !this.done; step++) {
      this.classify();
      for (let i = 0; i < this.mass.length; i++) {
        if (this.boundary[i]) { this.next[i] = this.supply; continue; }
        let sum = 0;
        for (const neighbor of this.neighbors[i]) sum += neighbor < 0 ? this.supply : this.free[neighbor];
        this.next[i] = (this.receptive[i] ? this.mass[i] + this.deposition : 0) + .5 * this.free[i] + sum / 12;
      }
      [this.mass, this.next] = [this.next, this.mass];
      this.tick++;
      if (this.tick % 8 === 0) {
        const stop = (this.radius - 5) ** 2;
        this.done = this.cells.some(([q, r, i]) => this.mass[i] >= 1 && q * q + q * r + r * r >= stop);
      }
      if (this.tick >= 18000) this.done = true;
    }
  }
  snapshot() {
    const ice = [];
    let extentSquared = 0;
    for (const [q, r, i] of this.cells) {
      if (this.mass[i] < 1) continue;
      ice.push(q, r, Math.min(4, this.mass[i]));
      extentSquared = Math.max(extentSquared, q * q + q * r + r * r);
    }
    return {ice: new Float32Array(ice), tick: this.tick, done: this.done, extent: Math.sqrt(extentSquared)};
  }
}
