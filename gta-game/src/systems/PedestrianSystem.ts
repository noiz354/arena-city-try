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
import type { Collidable } from '../game/World'

const PEDESTRIAN_COUNT = 22
const WALK_SPEED = 1.4
const FLEE_SPEED = 4.2
const FLEE_DURATION = 3.5
const RADIUS = 0.4
const DIALOGUE_DIST = 5.5

const LINES = [
  'Nice weather today.',
  'Watch out for the traffic!',
  'I heard something weird downtown.',
  'Lovely morning for a walk.',
  'Have you seen my cat?',
  'That tower is so tall!',
  'I should really buy a car.',
  'The coffee here is great.',
  'Busy day in the city.',
  'Stay safe out there.',
]

const COLORS = [0x5d8aa8, 0xa86b5d, 0x6b8e5d, 0x8e5d8a, 0x7a7a5d, 0x5d7a8e]

interface State {
  kind: 'walk' | 'idle' | 'flee'
  timer: number
  angle: number
  panicSource?: Vector3
}

export class Pedestrian {
  readonly group = new Group()
  health = 100
  dead = false
  hitRadius = 0.42
  private state: State = { kind: 'idle', timer: 0, angle: 0 }
  private readonly rng: () => number
  private readonly spawnX: number
  private readonly spawnZ: number
  private speechCooldown = 0

  constructor(x: number, z: number, rng: () => number) {
    this.rng = rng
    this.spawnX = x
    this.spawnZ = z
    this.group.position.set(x, 0, z)
    this.state = { kind: this.rng() > 0.4 ? 'walk' : 'idle', timer: 2 + rng() * 5, angle: rng() * Math.PI * 2 }
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
      return true
    }
    // getting hurt → flee
    this.state = { kind: 'flee', timer: FLEE_DURATION, angle: this.state.angle, panicSource: new Vector3() }
    return false
  }

  /** Gunfire nearby → civilians panic and run. */
  panic(from: Vector3): void {
    if (this.dead || this.state.kind === 'flee') return
    this.state = { kind: 'flee', timer: FLEE_DURATION, angle: this.state.angle, panicSource: from.clone() }
  }

  /** Returns a dialogue line if the pedestrian wants to speak right now. */
  maybeSpeak(playerPos: Vector3): string | null {
    this.speechCooldown = Math.max(0, this.speechCooldown - 0.016)
    if (this.dead || this.speechCooldown > 0) return null
    const dx = this.group.position.x - playerPos.x
    const dz = this.group.position.z - playerPos.z
    if (dx * dx + dz * dz > DIALOGUE_DIST * DIALOGUE_DIST) return null
    if (this.rng() > 0.002) return null // ~0.2% chance per frame while close
    this.speechCooldown = 6
    return LINES[Math.floor(this.rng() * LINES.length)]
  }

  update(dt: number, collidables: Collidable[], pedestrians: Pedestrian[]): void {
    if (this.dead) {
      this.group.rotation.x = MathUtils.damp(this.group.rotation.x, -Math.PI / 2, 4, dt)
      this.group.position.y -= dt * 0.4
      if (this.group.position.y < -2) this.group.visible = false
      return
    }

    const st = this.state
    st.timer -= dt

    if (st.kind === 'flee' && st.timer <= 0) {
      this.state = { kind: 'idle', timer: 3 + this.rng() * 4, angle: st.angle }
    }

    let speed = 0
    if (st.kind === 'walk') {
      speed = WALK_SPEED
      st.angle += (this.rng() - 0.5) * 0.3 * dt
      if (st.timer <= 0) {
        this.state = { kind: 'idle', timer: 2 + this.rng() * 5, angle: st.angle }
      }
    } else if (st.kind === 'idle') {
      if (st.timer <= 0) {
        this.state = { kind: 'walk', timer: 4 + this.rng() * 8, angle: this.rng() * Math.PI * 2 }
      }
    } else {
      // flee away from the panic source
      speed = FLEE_SPEED
      if (st.panicSource) {
        const away = new Vector3(
          this.group.position.x - st.panicSource.x,
          0,
          this.group.position.z - st.panicSource.z,
        )
        if (away.lengthSq() > 0.01) st.angle = Math.atan2(away.x, away.z)
      }
    }

    if (speed > 0) {
      this.group.position.x += Math.sin(st.angle) * speed * dt
      this.group.position.z += Math.cos(st.angle) * speed * dt
      this.group.rotation.y = MathUtils.damp(this.group.rotation.y, st.angle, 8, dt)
    }

    this.resolveCollisions(collidables, pedestrians)
    // gentle return toward spawn area so pedestrians don't drift forever
    const dxHome = this.spawnX - this.group.position.x
    const dzHome = this.spawnZ - this.group.position.z
    const dHome = Math.hypot(dxHome, dzHome)
    if (dHome > 40) {
      this.group.position.x += (dxHome / dHome) * WALK_SPEED * dt
      this.group.position.z += (dzHome / dHome) * WALK_SPEED * dt
    }
    this.group.position.x = MathUtils.clamp(this.group.position.x, -CITY_HALF + 1, CITY_HALF - 1)
    this.group.position.z = MathUtils.clamp(this.group.position.z, -CITY_HALF + 1, CITY_HALF - 1)
    this.group.position.y = 0
  }

  private resolveCollisions(collidables: Collidable[], pedestrians: Pedestrian[]): void {
    const p = this.group.position
    for (const { box } of collidables) {
      if (box.max.y < 0 || box.min.y > 2) continue
      const cx = MathUtils.clamp(p.x, box.min.x, box.max.x) - p.x
      const cz = MathUtils.clamp(p.z, box.min.z, box.max.z) - p.z
      const d2 = cx * cx + cz * cz
      if (d2 >= RADIUS * RADIUS) continue
      const d = Math.sqrt(d2) || 0.001
      const push = RADIUS - d
      p.x += (cx / d) * push
      p.z += (cz / d) * push
    }
    for (const other of pedestrians) {
      if (other === this || other.dead) continue
      const dx = p.x - other.group.position.x
      const dz = p.z - other.group.position.z
      const d2 = dx * dx + dz * dz
      if (d2 > 0.01 && d2 < (RADIUS * 2) ** 2) {
        const d = Math.sqrt(d2)
        const push = (RADIUS * 2 - d) * 0.4
        p.x += (dx / d) * push
        p.z += (dz / d) * push
      }
    }
  }

  private buildBody(): void {
    const shirt = new Color(COLORS[Math.floor(this.rng() * COLORS.length)])
    const pants = new Color(0x3a3a44).offsetHSL(0, 0, (this.rng() - 0.5) * 0.15)
    const skin = new Color(0xb08a6a).offsetHSL(0, 0, (this.rng() - 0.5) * 0.12)
    const shirtMat = new MeshStandardMaterial({ color: shirt, roughness: 0.85 })
    const pantsMat = new MeshStandardMaterial({ color: pants, roughness: 0.9 })
    const skinMat = new MeshStandardMaterial({ color: skin, roughness: 0.8 })
    const hairMat = new MeshStandardMaterial({ color: 0x2b2118, roughness: 0.9 })

    const torso = new Mesh(new BoxGeometry(0.5, 0.7, 0.3), shirtMat)
    torso.position.y = 1.05
    torso.castShadow = true
    this.group.add(torso)

    const head = new Mesh(new BoxGeometry(0.3, 0.32, 0.3), skinMat)
    head.position.y = 1.62
    head.castShadow = true
    this.group.add(head)

    const hair = new Mesh(new BoxGeometry(0.32, 0.1, 0.32), hairMat)
    hair.position.y = 1.76
    this.group.add(hair)

    for (const side of [-1, 1]) {
      const leg = new Mesh(new BoxGeometry(0.16, 0.72, 0.18), pantsMat)
      leg.position.set(side * 0.13, 0.36, 0)
      this.group.add(leg)
    }
  }
}

/**
 * City pedestrians: walk along sidewalks, idle, flee from gunfire, react to
 * being shot, and occasionally speak when the player is near (basic dialogue).
 */
export class PedestrianSystem {
  readonly pedestrians: Pedestrian[] = []
  readonly group = new Group()
  private readonly rng = seededRng(0xabc12345)

  constructor() {
    for (let i = 0; i < PEDESTRIAN_COUNT; i++) {
      const spot = this.pickSidewalkSpot()
      const p = new Pedestrian(spot[0], spot[1], this.rng)
      this.pedestrians.push(p)
      this.group.add(p.group)
    }
  }

  get alive(): Pedestrian[] {
    return this.pedestrians.filter(p => !p.dead)
  }

  update(dt: number, collidables: Collidable[], shotOrigin?: Vector3): void {
    for (const p of this.pedestrians) {
      if (shotOrigin && !p.dead) p.panic(shotOrigin)
      p.update(dt, collidables, this.pedestrians)
    }
  }

  /** Panic everyone near a gunshot. */
  panicNear(from: Vector3, radius: number): void {
    for (const p of this.pedestrians) {
      if (p.dead) continue
      const dx = p.position.x - from.x
      const dz = p.position.z - from.z
      if (dx * dx + dz * dz < radius * radius) p.panic(from)
    }
  }

  /** Ask nearby pedestrians for a dialogue line (basic NPC dialogue). */
  maybeSpeak(playerPos: Vector3): string | null {
    for (const p of this.pedestrians) {
      const line = p.maybeSpeak(playerPos)
      if (line) return line
    }
    return null
  }

  /** Deterministic sidewalk spot (inside a block, near its edge). */
  private pickSidewalkSpot(): [number, number] {
    const gi = Math.floor(this.rng() * BLOCK_COUNT)
    const gj = Math.floor(this.rng() * BLOCK_COUNT)
    const blockMinX = gi * CELL - CITY_HALF
    const blockMinZ = gj * CELL - CITY_HALF
    // inside the block, 1.5m from a random edge
    const edge = Math.floor(this.rng() * 4)
    const inset = 2
    if (edge === 0) return [blockMinX + inset + this.rng() * (BLOCK_SIZE - inset * 2), blockMinZ + inset]
    if (edge === 1) return [blockMinX + inset + this.rng() * (BLOCK_SIZE - inset * 2), blockMinZ + BLOCK_SIZE - inset]
    if (edge === 2) return [blockMinX + inset, blockMinZ + inset + this.rng() * (BLOCK_SIZE - inset * 2)]
    return [blockMinX + BLOCK_SIZE - inset, blockMinZ + inset + this.rng() * (BLOCK_SIZE - inset * 2)]
  }
}
