import { MathUtils, Vector3 } from 'three'
import { EnemySystem } from './EnemySystem'
import { CITY_HALF, ROADS_X, ROADS_Z } from './CityGenerator'

const MAX_STARS = 6
const POLICE_AT_STARS = 2 // cops appear from this wanted level
const MAX_COPS = 3
const HEAT_DECAY_TIME = 14 // s without crimes before a star drops
const STAR_DROP_INTERVAL = 8 // s per star once heat decays

/**
 * Wanted system (GTA-style):
 * - crimes (shooting near civilians, killing civilians, killing cops) raise
 *   stars 1..6
 * - stars decay over time when the player behaves
 * - from 2 stars, police officers spawn near the player and chase them;
 *   cleared when stars reach 0
 */
export class WantedSystem {
  stars = 0
  private heat = 0
  private lastCrime = -999
  private dropTimer = 0
  private copTimer = 0
  private readonly cops: ReturnType<EnemySystem['spawnCop']>[] = []

  constructor(private readonly enemies: EnemySystem) {}

  /** Report a crime. severity: 1=gunfire, 2=civilian killed, 3=cop killed. */
  reportCrime(severity: number, playerPos: Vector3): void {
    this.lastCrime = performance.now() / 1000
    if (severity >= 2) {
      this.stars = MathUtils.clamp(Math.max(this.stars, severity === 3 ? this.stars + 2 : severity), 1, MAX_STARS)
      this.heat = 0
    } else {
      // gunfire builds heat; 3 bursts within a short window = 1 star
      this.heat += 1
      if (this.heat >= 3) {
        this.heat = 0
        this.stars = MathUtils.clamp(this.stars + 1, 1, MAX_STARS)
      }
    }
    void playerPos
  }

  /** Called every frame while the player is on foot (and alive). */
  update(dt: number, playerPos: Vector3): void {
    const now = performance.now() / 1000

    // star decay
    if (this.stars > 0 && now - this.lastCrime > HEAT_DECAY_TIME) {
      this.dropTimer += dt
      if (this.dropTimer >= STAR_DROP_INTERVAL) {
        this.dropTimer = 0
        this.stars--
        if (this.stars <= 0) this.clearCops()
      }
    } else {
      this.dropTimer = 0
    }

    // police response
    this.copTimer -= dt
    if (this.stars >= POLICE_AT_STARS && this.cops.length < MAX_COPS && this.copTimer <= 0) {
      this.copTimer = 6
      this.spawnCop(playerPos)
    }
  }

  private spawnCop(playerPos: Vector3): void {
    const angle = Math.random() * Math.PI * 2
    const dist = 50 + Math.random() * 30
    let x = playerPos.x + Math.cos(angle) * dist
    let z = playerPos.z + Math.sin(angle) * dist
    // snap onto the nearest road center line so cops come from the streets
    x = nearestRoad(x, ROADS_X)
    z = nearestRoad(z, ROADS_Z)
    x = MathUtils.clamp(x, -CITY_HALF + 8, CITY_HALF - 8)
    z = MathUtils.clamp(z, -CITY_HALF + 8, CITY_HALF - 8)
    this.cops.push(this.enemies.spawnCop(x, z))
  }

  private clearCops(): void {
    for (const cop of this.cops) this.enemies.removeEnemy(cop)
    this.cops.length = 0
  }

  dispose(): void {
    this.clearCops()
  }
}

function nearestRoad(v: number, lines: number[]): number {
  let best = lines[0]
  let bestD = Math.abs(v - best)
  for (const l of lines) {
    const d = Math.abs(v - l)
    if (d < bestD) {
      bestD = d
      best = l
    }
  }
  return best
}
