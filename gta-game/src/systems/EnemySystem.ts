import {
  BoxGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { BLOCK_COUNT, BLOCK_SIZE, CELL, CITY_HALF, seededRng } from './CityGenerator'
import { rayAABB } from '../utils/raycast'
import type { Collidable } from '../game/World'

const ENEMY_COUNT = 14
const CHASE_DIST = 34 // start chasing within this distance (m)
const LOSE_DIST = 55 // give up beyond this
const ATTACK_RANGE = 2.1
const ATTACK_COOLDOWN = 1.15 // s
const MOVE_SPEED = 3.6 // m/s
const HIT_RADIUS = 0.62
const RADIUS = 0.45

export class Enemy {
  readonly group = new Group()
  health = 100
  dead = false
  attackCooldown = 0
  hitRadius = HIT_RADIUS
  respawnTimer = 0
  private wanderAngle: number
  private readonly wanderSpeed: number
  private state: 'idle' | 'chase' = 'idle'
  private readonly tmpDir = new Vector3()

  constructor(
    x: number,
    z: number,
    private readonly rng: () => number,
  ) {
    this.group.position.set(x, 0, z)
    this.wanderAngle = rng() * Math.PI * 2
    this.wanderSpeed = 0.5 + rng() * 0.8
    this.buildBody()
  }

  get position(): Vector3 {
    return this.group.position
  }

  takeDamage(amount: number): boolean {
    if (this.dead) return false
    this.health -= amount
    if (this.health <= 0) {
      this.dead = true
      this.health = 0
      return true
    }
    return false
  }

  update(dt: number, playerPos: Vector3, collidables: Collidable[], enemies: Enemy[]): void {
    if (this.dead) {
      if (this.group.visible) {
        // fall over + sink into ground, then hide and start respawn timer
        this.group.rotation.x = MathUtils.damp(this.group.rotation.x, -Math.PI / 2, 4, dt)
        this.group.position.y -= dt * 0.4
        if (this.group.position.y < -2) {
          this.group.visible = false
          this.respawnTimer = 20
        }
      } else {
        this.respawnTimer -= dt
      }
      return
    }

    this.attackCooldown = Math.max(0, this.attackCooldown - dt)

    const toPlayer = this.tmpDir
      .copy(playerPos)
      .sub(this.group.position)
    toPlayer.y = 0
    const dist = toPlayer.length()

    // --- line of sight (buildings block vision) ---
    let hasLOS = true
    if (dist > 1) {
      const start = this.group.position.clone()
      start.y += 0.9
      const end = playerPos.clone()
      end.y += 0.9
      const dir = end.clone().sub(start).normalize()
      const maxDist = dist + 0.5
      for (const { box } of collidables) {
        const t = rayAABB(start, dir, box.min, box.max, maxDist)
        if (t !== null) {
          hasLOS = false
          break
        }
      }
    }

    if (this.state === 'idle') {
      if (hasLOS && dist < CHASE_DIST) this.state = 'chase'
    } else if (!hasLOS && dist > LOSE_DIST) {
      this.state = 'idle'
    }

    if (this.state === 'chase') {
      // face the player
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z)

      if (dist > ATTACK_RANGE) {
        const step = MOVE_SPEED * dt
        this.group.position.x += (toPlayer.x / dist) * step
        this.group.position.z += (toPlayer.z / dist) * step
        this.group.position.y = 0
      } else if (this.attackCooldown <= 0) {
        // melee attack
        this.attackCooldown = ATTACK_COOLDOWN
        this.group.rotation.x = -0.35 // lunge
        this.lastAttacked = true
      } else {
        this.group.rotation.x = MathUtils.damp(this.group.rotation.x, 0, 6, dt)
      }
    } else {
      // idle wander in place
      this.wanderAngle += (this.rng() - 0.5) * 0.4 * dt
      const step = this.wanderSpeed * dt * 0.5
      this.group.position.x += Math.sin(this.wanderAngle) * step
      this.group.position.z += Math.cos(this.wanderAngle) * step
      this.group.rotation.y = this.wanderAngle
      this.group.position.y = 0
    }

    this.resolveCollisions(collidables, enemies)
    this.group.position.x = MathUtils.clamp(this.group.position.x, -CITY_HALF + 2, CITY_HALF - 2)
    this.group.position.z = MathUtils.clamp(this.group.position.z, -CITY_HALF + 2, CITY_HALF - 2)
  }

  /** True when this enemy delivered a melee hit this frame (consumed by Game). */
  lastAttacked = false

  private resolveCollisions(collidables: Collidable[], enemies: Enemy[]): void {
    const p = this.group.position
    // buildings
    for (const { box } of collidables) {
      if (box.max.y < 0 || box.min.y > 2.2) continue
      const cx = MathUtils.clamp(p.x, box.min.x, box.max.x) - p.x
      const cz = MathUtils.clamp(p.z, box.min.z, box.max.z) - p.z
      const d2 = cx * cx + cz * cz
      if (d2 >= RADIUS * RADIUS) continue
      const d = Math.sqrt(d2) || 0.001
      const push = RADIUS - d
      p.x += (cx / d) * push
      p.z += (cz / d) * push
    }
    // separation from other enemies
    for (const other of enemies) {
      if (other === this || other.dead || !other.group.visible) continue
      const dx = p.x - other.group.position.x
      const dz = p.z - other.group.position.z
      const d2 = dx * dx + dz * dz
      if (d2 > 0.04 && d2 < (RADIUS * 2.2) ** 2) {
        const d = Math.sqrt(d2)
        const push = (RADIUS * 2.2 - d) * 0.5
        p.x += (dx / d) * push
        p.z += (dz / d) * push
      }
    }
  }

  private buildBody(): void {
    const skin = new Color(0x9a7d5c).offsetHSL(0, 0, (this.rng() - 0.5) * 0.1)
    const cloth = new Color(0x3a2f45).offsetHSL(0, 0, (this.rng() - 0.5) * 0.12)
    const skinMat = new MeshStandardMaterial({ color: skin, roughness: 0.8 })
    const clothMat = new MeshStandardMaterial({ color: cloth, roughness: 0.85 })
    const darkMat = new MeshStandardMaterial({ color: 0x222226, roughness: 0.9 })
    const bandMat = new MeshStandardMaterial({ color: 0xc0392b, roughness: 0.7 })

    const body = new Mesh(new BoxGeometry(0.6, 0.75, 0.34), clothMat)
    body.position.y = 1.0
    body.castShadow = true
    this.group.add(body)

    const head = new Mesh(new BoxGeometry(0.34, 0.34, 0.34), skinMat)
    head.position.y = 1.55
    head.castShadow = true
    this.group.add(head)

    // cap + band (thug look)
    const cap = new Mesh(new BoxGeometry(0.38, 0.1, 0.38), darkMat)
    cap.position.y = 1.75
    this.group.add(cap)
    const band = new Mesh(new BoxGeometry(0.35, 0.07, 0.36), bandMat)
    band.position.y = 1.58
    this.group.add(band)

    // legs
    for (const side of [-1, 1]) {
      const leg = new Mesh(new BoxGeometry(0.18, 0.72, 0.2), darkMat)
      leg.position.set(side * 0.14, 0.36, 0)
      this.group.add(leg)
    }

    // arms (slightly raised, aggressive)
    for (const side of [-1, 1]) {
      const arm = new Mesh(new BoxGeometry(0.14, 0.6, 0.16), clothMat)
      arm.position.set(side * 0.4, 1.0, 0.05)
      arm.rotation.z = side * -0.5
      this.group.add(arm)
    }

    // health bar billboard (red/green)
    const bg = new Mesh(new BoxGeometry(0.7, 0.08, 0.02), new MeshStandardMaterial({ color: 0x222222 }))
    bg.position.y = 2.0
    this.group.add(bg)
    const fill = new Mesh(new BoxGeometry(0.66, 0.05, 0.03), new MeshStandardMaterial({ color: 0xe74c3c }))
    fill.position.y = 2.0
    this.group.add(fill)
    this.healthBarFill = fill
  }

  private healthBarFill: Mesh | null = null

  /** Update the billboard health bar (called from EnemySystem). */
  updateHealthBar(): void {
    if (!this.healthBarFill || this.dead) return
    const pct = Math.max(0, this.health / 100)
    this.healthBarFill.scale.x = pct
    this.healthBarFill.position.x = -(1 - pct) * 0.33
  }
}

/**
 * City thugs: chase the player when seen (line of sight), melee attack on
 * contact, die on gunfire and drop ammo (via callback).
 */
export class EnemySystem {
  readonly enemies: Enemy[] = []
  readonly group = new Group()
  private readonly rng = seededRng(0xbeefcafe)
  private readonly spawnPoints: Array<[number, number]> = []
  onEnemyDeath?: (enemy: Enemy) => void
  private elapsed = 0

  constructor() {
    this.generateSpawnPoints()
    for (const [x, z] of this.spawnPoints) {
      const e = new Enemy(x, z, this.rng)
      this.enemies.push(e)
      this.group.add(e.group)
    }
  }

  get alive(): Enemy[] {
    return this.enemies.filter(e => !e.dead)
  }

  get aliveCount(): number {
    return this.enemies.filter(e => !e.dead).length
  }

  update(dt: number, playerPos: Vector3, collidables: Collidable[]): void {
    this.elapsed += dt
    for (const e of this.enemies) {
      e.update(dt, playerPos, collidables, this.enemies)
      e.updateHealthBar()
    }

    // respawn dead enemies after their timer at the spawn point
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]
      if (e.dead && !e.group.visible && e.respawnTimer <= 0) {
        const [x, z] = this.spawnPoints[i]
        e.dead = false
        e.health = 100
        e.respawnTimer = 0
        e.group.visible = true
        e.group.position.set(x, 0, z)
        e.group.rotation.set(0, 0, 0)
      }
    }
  }

  damageEnemy(enemy: Enemy, damage: number): boolean {
    const killed = enemy.takeDamage(damage)
    if (killed) this.onEnemyDeath?.(enemy)
    return killed
  }

  /** Deterministic spawn points on roads, spread over the city. */
  private generateSpawnPoints(): void {
    let placed = 0
    let guard = 0
    while (placed < ENEMY_COUNT && guard < 500) {
      guard++
      const gi = Math.floor(this.rng() * BLOCK_COUNT)
      const gj = Math.floor(this.rng() * BLOCK_COUNT)
      const blockMinX = gi * CELL - CITY_HALF
      const blockMinZ = gj * CELL - CITY_HALF
      const onVerticalRoad = this.rng() > 0.5

      const roadOffset = BLOCK_SIZE + 2.5 + this.rng() * (CELL - BLOCK_SIZE - 5)
      const along = 4 + this.rng() * (BLOCK_SIZE - 8)
      const x = onVerticalRoad ? blockMinX + roadOffset : blockMinX + along
      const z = onVerticalRoad ? blockMinZ + along : blockMinZ + roadOffset

      // keep the center (spawn area) mostly calm for the first seconds
      if (Math.abs(x) < 18 && Math.abs(z) < 18) continue
      this.spawnPoints.push([x, z])
      placed++
    }
  }
}
