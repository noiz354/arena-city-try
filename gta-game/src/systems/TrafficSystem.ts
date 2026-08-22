import { Vehicle } from '../entities/Vehicle'
import { VEHICLE_CONFIGS } from '../data/vehicles'
import { BLOCK_COUNT, BLOCK_SIZE, CELL, CITY_HALF, ROAD_WIDTH, seededRng } from './CityGenerator'
import type { Collidable } from '../game/World'

/** Road center lines per axis (one road between each pair of blocks). */
function roadLines(): number[] {
  const lines: number[] = []
  for (let i = 0; i < BLOCK_COUNT - 1; i++) {
    lines.push(i * CELL - CITY_HALF + BLOCK_SIZE + ROAD_WIDTH / 2)
  }
  return lines
}

const ROADS = roadLines() // e.g. [-120, -80, -40, 0, 40, 80, 120]
const CITY_LIMIT = CITY_HALF - 6
const TRAFFIC_COUNT = 10
const INTERSECTION_REACH = 6 // meters before an intersection to consider turning
const SAFE_GAP = 7 // stop if a vehicle is closer than this ahead
const ENTER_DIST = 3.6

type Axis = 'x' | 'z'

interface Route {
  axis: Axis
  dir: 1 | -1
  /** fixed coordinate on the perpendicular axis */
  lane: number
}

function yawFor(axis: Axis, dir: 1 | -1): number {
  // forward = (sin yaw, cos yaw)
  if (axis === 'x') return dir > 0 ? Math.PI / 2 : -Math.PI / 2
  return dir > 0 ? 0 : Math.PI
}

/** Right turn from (axis, dir): (x,d)->(z,d); (z,d)->(x,-d). Left is the opposite. */
function turn(axis: Axis, dir: 1 | -1, right: boolean): Route {
  if (axis === 'x') return { axis: 'z', dir: right ? dir : ((-dir) as 1 | -1), lane: 0 }
  return { axis: 'x', dir: right ? ((-dir) as 1 | -1) : dir, lane: 0 }
}

interface TrafficCar {
  vehicle: Vehicle
  route: Route
  speed: number
}

/**
 * Living traffic: AI cars drive along the road grid, choosing turns at
 * intersections, slowing for vehicles ahead. Cars can be hijacked (enter →
 * AI stops, player takes over).
 */
export class TrafficSystem {
  readonly cars: TrafficCar[] = []
  private readonly rng = seededRng(0x7a11ca9)

  constructor() {
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const lane = ROADS[Math.floor(this.rng() * ROADS.length)] // fixed perpendicular coord
      const axis: Axis = this.rng() > 0.5 ? 'x' : 'z'
      const dir: 1 | -1 = this.rng() > 0.5 ? 1 : -1
      const along = (CITY_HALF - 30) * (this.rng() > 0.5 ? 1 : -1) // start pos along travel axis
      const config = VEHICLE_CONFIGS[Math.floor(this.rng() * VEHICLE_CONFIGS.length)]

      const vehicle = new Vehicle(
        config,
        axis === 'x' ? along : lane,
        axis === 'z' ? along : lane,
        yawFor(axis, dir),
      )
      vehicle.group.visible = false // culled until near the player

      this.cars.push({
        vehicle,
        route: { axis, dir, lane },
        speed: 8 + this.rng() * 5,
      })
    }
  }

  /** Nearest non-occupied traffic car within enter range. */
  getNearest(x: number, z: number): Vehicle | null {
    let best: Vehicle | null = null
    let bestD = ENTER_DIST * ENTER_DIST
    for (const car of this.cars) {
      const v = car.vehicle
      if (v.occupied || !v.group.visible || v.wrecked) continue
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

  /** Drive all AI cars (skip occupied/stolen). */
  update(dt: number, playerX: number, playerZ: number, collidables: Collidable[]): void {
    for (const car of this.cars) {
      const v = car.vehicle
      // visibility culling
      const dx = v.position.x - playerX
      const dz = v.position.z - playerZ
      v.group.visible = dx * dx + dz * dz < 100 * 100

      if (v.occupied || v.stolen) continue // hijacked — player controls now

      this.drive(dt, car, collidables)
    }
  }

  private drive(dt: number, car: TrafficCar, collidables: Collidable[]): void {
    const v = car.vehicle
    const r = car.route
    const pos = v.position

    // blocked check: is there an obstacle ahead within SAFE_GAP?
    let blocked = false
    const aheadX = pos.x + Math.sin(v.yaw) * SAFE_GAP
    const aheadZ = pos.z + Math.cos(v.yaw) * SAFE_GAP
    for (const { box } of collidables) {
      if (
        aheadX > box.min.x - 0.5 && aheadX < box.max.x + 0.5 &&
        aheadZ > box.min.z - 0.5 && aheadZ < box.max.z + 0.5
      ) {
        blocked = true
        break
      }
    }
    for (const other of this.cars) {
      if (other.vehicle === v) continue
      const b = other.vehicle.getCollidableBox()
      if (
        aheadX > b.min.x - 0.5 && aheadX < b.max.x + 0.5 &&
        aheadZ > b.min.z - 0.5 && aheadZ < b.max.z + 0.5
      ) {
        blocked = true
        break
      }
    }

    const targetSpeed = blocked ? 0 : car.speed

    // next intersection along the travel axis
    const coord = r.axis === 'x' ? pos.x : pos.z
    const nextLine = r.dir > 0
      ? ROADS.find(l => l > coord + 1)
      : [...ROADS].reverse().find(l => l < coord - 1)

    let targetYaw = yawFor(r.axis, r.dir)
    if (nextLine !== undefined && Math.abs(nextLine - coord) < INTERSECTION_REACH) {
      // at an intersection: pick straight/left/right
      const roll = this.rng()
      const right = roll < 0.25
      const straight = roll < 0.75
      if (!straight) {
        const newRoute = turn(r.axis, r.dir, right)
        newRoute.lane = nextLine
        car.route = newRoute
        targetYaw = yawFor(newRoute.axis, newRoute.dir)
      }
    }

    v.aiDrive(dt, targetYaw, targetSpeed, collidables)

    // keep inside the city
    pos.x = Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, pos.x))
    pos.z = Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, pos.z))
    if (Math.abs(pos.x) >= CITY_LIMIT || Math.abs(pos.z) >= CITY_LIMIT) {
      // reached the edge: reverse direction on the same lane
      car.route = { axis: r.axis, dir: (r.dir * -1) as 1 | -1, lane: r.lane }
    }
  }

  dispose(): void {
    this.cars.length = 0
  }
}
