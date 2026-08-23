import { ecsWorld } from './world'
import { Position, Velocity, BulletTag } from './components'
import { bulletQuery } from './queries'

// ponytail: single-file bullet tick, O(n) naive — SpatialHash added T2 when n>50
export function updateBullets(dt: number): void {
  const eids = bulletQuery(ecsWorld)
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i]
    Position.x[eid] += Velocity.x[eid] * dt
    Position.z[eid] += Velocity.z[eid] * dt
    BulletTag.life[eid] -= dt
  }
}
