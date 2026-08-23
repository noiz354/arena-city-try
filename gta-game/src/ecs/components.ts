import { defineComponent, Types } from 'bitecs'

// SoA — ponytail: Float32 for pos/vel (deterministic fixedDt 16ms), ui8 for ids
export const Position = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 })
export const Velocity = defineComponent({ x: Types.f32, y: Types.f32, z: Types.f32 })
export const Rotation = defineComponent({ y: Types.f32 })
export const Health = defineComponent({ hp: Types.ui8, max: Types.ui8 })
export const Wanted = defineComponent({ stars: Types.ui8, timer: Types.f32 })
export const VehicleComp = defineComponent({ speed: Types.f32, maxSpeed: Types.f32, width: Types.f32, length: Types.f32, wrecked: Types.ui8 })
export const WeaponComp = defineComponent({ ammo: Types.ui16, weaponId: Types.ui8 })
export const TrafficTag = defineComponent()
export const PedTag = defineComponent()
export const EnemyTag = defineComponent()
export const PlayerTag = defineComponent()
export const BulletTag = defineComponent({ life: Types.f32 })
