import { Vehicle } from '../entities/Vehicle'
import { VEHICLE_CONFIGS, type VehicleData } from '../data/vehicles'
import { BLOCK_COUNT, BLOCK_SIZE, CELL, CITY_HALF, seededRng } from './CityGenerator'
import type { Collidable } from '../game/World'

const PARKED_COUNT = 20
const VISIBLE_DIST = 95 // parked cars beyond this are hidden (fog covers them)
const ENTER_DIST = 3.6

/**
 * Manages the city's parked (enterable) vehicles: deterministic spawn spots
 * along roads, distance culling, nearest-vehicle query for enter/exit, and
 * active collidables for physics/camera.
 */
export class VehicleManager {
  readonly vehicles: Vehicle[] = []
  private readonly rng = seededRng(0x5eed1234)

  constructor() {
    this.spawnParkedCars()
    this.spawnCenterCars()
  }

  /**
   * A few cars right around the player spawn so the city feels alive
   * immediately. Spots are ON road strips: x=0 / z=0 are the center road
   * center lines (roads span ±5m), so offsets ride along them.
   */
  private spawnCenterCars(): void {
    const sedan = VEHICLE_CONFIGS[0]
    const taxi = VEHICLE_CONFIGS[1]
    const spots: Array<[number, number, number, VehicleData]> = [
      [0, 7, 0, sedan], // vertical road x=0, north of the intersection
      [0, -8, Math.PI, taxi], // vertical road x=0, south, facing north
      [8, 0, Math.PI / 2, sedan], // horizontal road z=0, east
      [-9, 0, -Math.PI / 2, VEHICLE_CONFIGS[2]], // horizontal road z=0, west
    ]
    for (const [x, z, yaw, config] of spots) {
      this.vehicles.push(new Vehicle(config, x, z, yaw))
    }
  }

  update(playerX: number, playerZ: number): void {
    for (const v of this.vehicles) {
      const dx = v.position.x - playerX
      const dz = v.position.z - playerZ
      v.group.visible = dx * dx + dz * dz < VISIBLE_DIST * VISIBLE_DIST
    }
  }

  getNearest(x: number, z: number): Vehicle | null {
    let best: Vehicle | null = null
    let bestD = ENTER_DIST * ENTER_DIST
    for (const v of this.vehicles) {
      if (!v.group.visible || v.wrecked) continue
      const dx = v.position.x - x
      const dz = v.position.z - z
      const d = dx * dx + dz * dz
      if (d < bestD) {
        bestD = d
        best = v
      }
    }
    return best
  }

  /** Collidables for visible vehicles (axis-aligned footprint approximation). */
  getCollidables(exclude?: Vehicle): Collidable[] {
    const list: Collidable[] = []
    for (const v of this.vehicles) {
      if (v.group.visible && v !== exclude) list.push({ box: v.getCollidableBox() })
    }
    return list
  }

  /**
   * Deterministic parking spots: for each interior block, with some probability
   * a car parks on the road east or south of the block, 2.2m off the sidewalk.
   */
  private spawnParkedCars(): void {
    let spawned = 0
    for (let gi = 0; gi < BLOCK_COUNT && spawned < PARKED_COUNT; gi++) {
      for (let gj = 0; gj < BLOCK_COUNT && spawned < PARKED_COUNT; gj++) {
        if (gi >= BLOCK_COUNT - 1 && gj >= BLOCK_COUNT - 1) continue

        const blockMinX = gi * CELL - CITY_HALF
        const blockMinZ = gj * CELL - CITY_HALF
        const config = VEHICLE_CONFIGS[Math.floor(this.rng() * VEHICLE_CONFIGS.length)]

        // east road (vertical road at block's east edge)
        if (gi < BLOCK_COUNT - 1 && this.rng() < 0.3) {
          const x = blockMinX + BLOCK_SIZE + 2.3
          const z = blockMinZ + 3 + this.rng() * (BLOCK_SIZE - 6)
          this.vehicles.push(new Vehicle(config, x, z, 0))
          spawned++
          if (spawned >= PARKED_COUNT) break
        }

        // south road (horizontal road at block's south edge)
        if (gj < BLOCK_COUNT - 1 && spawned < PARKED_COUNT && this.rng() < 0.3) {
          const z = blockMinZ + BLOCK_SIZE + 2.3
          const x = blockMinX + 3 + this.rng() * (BLOCK_SIZE - 6)
          this.vehicles.push(new Vehicle(config, x, z, Math.PI / 2))
          spawned++
        }
      }
    }
  }

  dispose(): void {
    this.vehicles.length = 0
  }
}
