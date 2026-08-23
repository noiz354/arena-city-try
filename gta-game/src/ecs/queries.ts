import { defineQuery } from 'bitecs'
import { Position, Velocity, Health, VehicleComp, TrafficTag, PedTag, EnemyTag, BulletTag } from './components'

export const movingQuery = defineQuery([Position, Velocity])
export const vehicleQuery = defineQuery([Position, Velocity, VehicleComp])
export const trafficQuery = defineQuery([Position, Velocity, TrafficTag])
export const pedQuery = defineQuery([Position, PedTag])
export const enemyQuery = defineQuery([Position, Health, EnemyTag])
export const bulletQuery = defineQuery([Position, Velocity, BulletTag])
