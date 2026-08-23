export class SpatialHash {
  private readonly cell = 16
  private map = new Map<string, number[]>()
  private key(x: number, z: number): string { return `${Math.floor(x/this.cell)},${Math.floor(z/this.cell)}` }
  clear(): void { this.map.clear() }
  insert(id: number, x: number, z: number): void {
    const k = this.key(x,z)
    const a = this.map.get(k); if (a) a.push(id); else this.map.set(k,[id])
  }
  // ponytail: naive 3x3 neighbour scan, expand to radius>1 if density >50
  queryRadius(x: number, z: number, r: number): number[] {
    const out: number[] = []
    const d = Math.ceil(r/this.cell)
    for (let dx=-d; dx<=d; dx++) for (let dz=-d; dz<=d; dz++) {
      const a = this.map.get(this.key(x+dx*this.cell, z+dz*this.cell)); if (a) out.push(...a)
    }
    return out
  }
}
