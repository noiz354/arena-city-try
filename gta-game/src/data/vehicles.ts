/**
 * Data-driven vehicle configuration (racing skill pattern: VehicleData interface
 * + separate per-vehicle configs).
 */
export interface VehicleData {
  name: string
  color: number
  cabinColor: number
  // physics
  acceleration: number // m/s^2
  maxSpeed: number // m/s
  reverseMax: number // m/s
  brakeForce: number // decel m/s^2 when braking
  friction: number // per-second velocity multiplier (0.98 style)
  turnRate: number // rad/s at full steer
  rollFactor: number // visual roll per steer input
  // dimensions (hitbox + visuals)
  width: number
  height: number
  length: number
  wheelRadius: number
  // durability
  maxHealth: number
}

export const VEHICLE_SEDAN: VehicleData = {
  name: 'Sedan',
  color: 0x2e86de,
  cabinColor: 0x1b4f72,
  acceleration: 11,
  maxSpeed: 24,
  reverseMax: 8,
  brakeForce: 18,
  friction: 0.985,
  turnRate: 1.7,
  rollFactor: 0.06,
  width: 2.1,
  height: 1.5,
  length: 4.6,
  wheelRadius: 0.38,
  maxHealth: 100,
}

export const VEHICLE_TAXI: VehicleData = {
  ...VEHICLE_SEDAN,
  name: 'Taxi',
  color: 0xf5c542,
  cabinColor: 0x6d5a1a,
  maxSpeed: 22,
}

export const VEHICLE_MUSCLE: VehicleData = {
  name: 'Muscle',
  color: 0xc0392b,
  cabinColor: 0x641e16,
  acceleration: 16,
  maxSpeed: 30,
  reverseMax: 9,
  brakeForce: 22,
  friction: 0.982,
  turnRate: 1.5,
  rollFactor: 0.08,
  width: 2.2,
  height: 1.4,
  length: 4.8,
  wheelRadius: 0.42,
  maxHealth: 100,
}

export const VEHICLE_TRUCK: VehicleData = {
  name: 'Truck',
  color: 0x8fa3b8,
  cabinColor: 0x46586e,
  acceleration: 7,
  maxSpeed: 17,
  reverseMax: 6,
  brakeForce: 14,
  friction: 0.99,
  turnRate: 1.0,
  rollFactor: 0.04,
  width: 2.6,
  height: 2.2,
  length: 6.4,
  wheelRadius: 0.5,
  maxHealth: 150,
}

export const VEHICLE_CONFIGS: VehicleData[] = [
  VEHICLE_SEDAN,
  VEHICLE_TAXI,
  VEHICLE_MUSCLE,
  VEHICLE_TRUCK,
]
