import { addEntity } from 'bitecs'
import { ecsWorld } from './world'
import { Position, Velocity, Rotation, Health, VehicleComp } from './components'

export function createVehicleEid(x: number, z: number, maxSpeed = 12): number {
  const eid = addEntity(ecsWorld)
  Position.x[eid] = x; Position.y[eid] = 0.95; Position.z[eid] = z
  Velocity.x[eid] = 0; Velocity.y[eid] = 0; Velocity.z[eid] = 0
  Rotation.y[eid] = 0
  VehicleComp.maxSpeed[eid] = maxSpeed
  VehicleComp.wrecked[eid] = 0
  return eid
}
export function createPedEid(x: number, z: number): number {
  const eid = addEntity(ecsWorld)
  Position.x[eid] = x; Position.z[eid] = z
  Health.hp[eid] = 100; Health.max[eid] = 100
  return eid
}
// ponytail: prefabs thin, expand per Addy Data-driven (speeder_1.ts) when needed
