import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three'
import { WEAPONS, type WeaponDef } from '../data/weapons'
import type { InputManager } from '../utils/InputManager'
import { rayAABB, rayCapsule } from '../utils/raycast'
import type { Collidable } from '../game/World'
import type { EnemySystem } from './EnemySystem'

interface AmmoState {
  mag: number
  reserve: number
  reloading: boolean
  reloadTimer: number
  fireTimer: number
}

interface TransientEffect {
  obj: Object3D
  life: number
  maxLife: number
}

/** Soft targets (enemies/pedestrians) that can also be shot. */
export interface ShootableTarget {
  position: Vector3 // feet position
  hitRadius: number
  /** total body height for the hit capsule (default 1.8) */
  hitHeight?: number
  takeDamage(amount: number): boolean // returns true when killed
}

export interface WeaponHooks {
  onHit?: () => void
  onKill?: (kind: 'enemy' | 'civilian') => void
  onShoot?: (weapon: WeaponDef) => void
  onReload?: () => void
  onEmpty?: () => void
}

/**
 * Hitscan weapon system (bloodwave shooting.js pattern):
 * - data-driven weapons, mag/reserve ammo, timed reload
 * - raycast from the camera crosshair; enemies via ray-sphere, environment
 *   (buildings/cars) via ray-AABB occlusion
 * - tracers + impact/blood flash effects with automatic cleanup
 */
export class WeaponSystem {
  enabled = true
  currentWeaponId = 'pistol'
  private readonly ammo = new Map<string, AmmoState>()
  private readonly owned = new Set<string>(['pistol'])
  private readonly effects: TransientEffect[] = []
  private readonly tmpOrigin = new Vector3()
  private readonly tmpDir = new Vector3()

  constructor(
    private readonly scene: Scene,
    private readonly camera: PerspectiveCamera,
    private readonly input: InputManager,
    private readonly enemies: EnemySystem,
    private readonly getCollidables: () => Collidable[],
    readonly hooks: WeaponHooks = {},
    private readonly getExtraTargets: () => ShootableTarget[] = () => [],
  ) {
    for (const def of Object.values(WEAPONS)) {
      this.ammo.set(def.id, {
        mag: def.magSize,
        reserve: def.reserveMax,
        reloading: false,
        reloadTimer: 0,
        fireTimer: 0,
      })
    }
  }

  get currentDef(): WeaponDef {
    return WEAPONS[this.currentWeaponId]
  }

  get currentState(): AmmoState {
    return this.ammo.get(this.currentWeaponId) ?? this.ammo.values().next().value!
  }

  get mag(): number {
    return this.currentState.mag
  }

  get reserve(): number {
    return this.currentState.reserve
  }

  get reloading(): boolean {
    return this.currentState.reloading
  }

  get reloadProgress(): number {
    const st = this.currentState
    if (!st.reloading) return 0
    return 1 - st.reloadTimer / this.currentDef.reloadTime
  }

  hasWeapon(id: string): boolean {
    return this.owned.has(id)
  }

  giveWeapon(id: string): void {
    if (!WEAPONS[id]) return
    this.owned.add(id)
    const st = this.ammo.get(id)
    if (!st) return
    st.mag = Math.max(st.mag, Math.floor(WEAPONS[id].magSize * 0.8))
    st.reserve = Math.min(st.reserve + Math.floor(WEAPONS[id].reserveMax * 0.5), WEAPONS[id].reserveMax)
    this.currentWeaponId = id
  }

  giveAmmo(fraction = 0.4): void {
    for (const def of Object.values(WEAPONS)) {
      const st = this.ammo.get(def.id)!
      st.reserve = Math.min(st.reserve + Math.floor(def.reserveMax * fraction), def.reserveMax)
    }
  }

  /** Serializable snapshot (weapon inventory + ammo) for save games. */
  serialize(): { owned: string[]; current: string; ammo: Record<string, { mag: number; reserve: number }> } {
    const ammo: Record<string, { mag: number; reserve: number }> = {}
    for (const [id, st] of this.ammo) {
      ammo[id] = { mag: st.mag, reserve: st.reserve }
    }
    return { owned: [...this.owned], current: this.currentWeaponId, ammo }
  }

  /** Restore a saved inventory snapshot. */
  deserialize(data: { owned: string[]; current: string; ammo: Record<string, { mag: number; reserve: number }> }): void {
    this.owned.clear()
    for (const id of data.owned) if (WEAPONS[id]) this.owned.add(id)
    if (WEAPONS[data.current]) this.currentWeaponId = data.current
    for (const [id, st] of Object.entries(data.ammo)) {
      const state = this.ammo.get(id)
      if (!state || !WEAPONS[id]) continue
      state.mag = Math.min(st.mag, WEAPONS[id].magSize)
      state.reserve = Math.min(st.reserve, WEAPONS[id].reserveMax)
      state.reloading = false
      state.reloadTimer = 0
    }
  }

  switchWeapon(id: string): void {
    if (!this.owned.has(id) || id === this.currentWeaponId) return
    const st = this.currentState
    if (st.reloading) {
      st.reloading = false
      st.reloadTimer = 0
    }
    this.currentWeaponId = id
  }

  startReload(): void {
    const st = this.currentState
    if (st.reloading || st.reserve <= 0 || st.mag >= this.currentDef.magSize) return
    st.reloading = true
    st.reloadTimer = this.currentDef.reloadTime
    this.hooks.onReload?.()
  }

  update(dt: number): void {
    const st = this.currentState
    st.fireTimer -= dt

    if (st.reloading) {
      st.reloadTimer -= dt
      if (st.reloadTimer <= 0) this.finishReload()
    }

    if (this.enabled && st.fireTimer <= 0 && !st.reloading) {
      const wantFire = this.currentDef.auto
        ? this.input.isMouseDown() && !this.input.isDragging()
        : this.input.consumeClick()
      if (wantFire) this.fire()
    }

    if (st.mag <= 0 && !st.reloading && st.reserve > 0 && st.fireTimer <= -0.25) {
      this.startReload()
    }

    this.updateEffects(dt)
  }

  private fire(): void {
    const def = this.currentDef
    const st = this.currentState
    if (st.mag <= 0) {
      this.hooks.onEmpty?.()
      if (st.reserve > 0) this.startReload()
      return
    }
    st.mag--
    st.fireTimer = def.fireRate
    this.hooks.onShoot?.(def)

    const origin = this.tmpOrigin.copy(this.camera.position)
    const baseDir = this.camera.getWorldDirection(this.tmpDir).normalize()
    const collidables = this.getCollidables()
    let anyHit = false
    let anyKill = false
    let lastKillKind: 'enemy' | 'civilian' = 'enemy'

    for (let p = 0; p < def.pellets; p++) {
      const dir = baseDir.clone()
      dir.x += (Math.random() - 0.5) * def.spread
      dir.y += (Math.random() - 0.5) * def.spread
      dir.normalize()

      // nearest environment hit (buildings + parked cars)
      let envT = def.range
      for (const { box } of collidables) {
        const t = rayAABB(origin, dir, box.min, box.max, def.range)
        if (t !== null && t < envT) envT = t
      }

      // enemy hit (ray-capsule against each alive enemy — body from feet to head)
      let bestEnemy: EnemySystem['alive'][number] | null = null
      let bestT = envT
      for (const enemy of this.enemies.alive) {
        const t = rayCapsule(origin, dir, enemy.position, enemy.hitRadius, enemy.hitHeight, envT)
        if (t !== null && t < bestT) {
          bestT = t
          bestEnemy = enemy
        }
      }

      // extra soft targets (pedestrians) — nearest wins over enemies
      let bestExtra: ShootableTarget | null = null
      for (const target of this.getExtraTargets()) {
        const t = rayCapsule(origin, dir, target.position, target.hitRadius, target.hitHeight ?? 1.8, bestT)
        if (t !== null && t < bestT) {
          bestT = t
          bestExtra = target
          bestEnemy = null
        }
      }

      const hitPoint = origin.clone().addScaledVector(dir, bestT)
      if (bestEnemy) {
        const killed = this.enemies.damageEnemy(bestEnemy, def.damage)
        this.spawnEffect('blood', hitPoint, 0.35)
        anyHit = true
        if (killed) anyKill = true
      } else if (bestExtra) {
        const killed = bestExtra.takeDamage(def.damage)
        this.spawnEffect('blood', hitPoint, 0.35)
        anyHit = true
        if (killed) {
          anyKill = true
          lastKillKind = 'civilian'
        }
      } else if (envT < def.range - 0.05) {
        this.spawnEffect('spark', hitPoint, 0.12)
      }

      if (p === 0) this.spawnTracer(origin, hitPoint, def.tracerColor)
    }

    if (anyHit) this.hooks.onHit?.()
    if (anyKill) this.hooks.onKill?.(lastKillKind)
  }

  private finishReload(): void {
    const def = this.currentDef
    const st = this.currentState
    const take = Math.min(def.magSize - st.mag, st.reserve)
    st.mag += take
    st.reserve -= take
    st.reloading = false
  }

  // --- transient effects ---

  private spawnTracer(from: Vector3, to: Vector3, color: number): void {
    const dir = to.clone().sub(from)
    const len = dir.length()
    if (len < 0.1) return
    dir.normalize()
    const mesh = new Mesh(
      new BoxGeometry(0.03, 0.03, len),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }),
    )
    mesh.position.copy(from).addScaledVector(dir, len / 2)
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), dir)
    this.addEffect(mesh, 0.09)
  }

  private spawnEffect(kind: 'blood' | 'spark', point: Vector3, life: number): void {
    const mesh = new Mesh(
      new SphereGeometry(kind === 'blood' ? 0.18 : 0.09, 6, 5),
      new MeshBasicMaterial({
        color: kind === 'blood' ? 0x9b111e : 0xffd166,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    )
    mesh.position.copy(point)
    this.addEffect(mesh, life)
  }

  private addEffect(obj: Object3D, life: number): void {
    this.scene.add(obj)
    this.effects.push({ obj, life, maxLife: life })
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i]
      e.life -= dt
      if (e.life <= 0) {
        if (e.obj instanceof Mesh) {
          e.obj.geometry.dispose()
          ;(e.obj.material as MeshBasicMaterial).dispose()
        }
        this.scene.remove(e.obj)
        this.effects.splice(i, 1)
      } else {
        const m = e.obj as Mesh
        const mat = m.material as MeshBasicMaterial
        mat.opacity = (e.life / e.maxLife) * 0.9
        m.scale.setScalar(1 + (1 - e.life / e.maxLife) * (e.maxLife > 0.2 ? 1.2 : 0))
      }
    }
  }
}
