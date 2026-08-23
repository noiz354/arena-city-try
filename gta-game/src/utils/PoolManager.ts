import { addEntity, removeEntity } from 'bitecs'
import { ecsWorld } from '../ecs/world'
import type { Object3D } from 'three'

export class PoolManager {
  private free: number[] = []
  acquire(): number { return this.free.pop() ?? addEntity(ecsWorld) }
  release(eid: number): void { try { removeEntity(ecsWorld, eid) } catch {} ; this.free.push(eid) }
  // ponytail: eid reuse via removeEntity, switch to ObjectPool<THREE.Mesh> if mesh cost dominates
}
export const bulletPool = new PoolManager()

// generic mesh/effect pool — avoids per-shot BoxGeometry/SphereGeometry alloc (GC spikes)
export class ObjectPool<T extends Object3D> {
  private free: T[] = []
  constructor(private readonly factory: () => T, private readonly reset: (o: T) => void = () => {}) {}
  acquire(): T { const o = this.free.pop(); return o ? (this.reset(o), o) : this.factory() }
  release(o: T): void { this.free.push(o) }
  get size(): number { return this.free.length }
}
