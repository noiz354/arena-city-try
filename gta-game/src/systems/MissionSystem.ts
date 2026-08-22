import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { MISSIONS, MISSION_START_DIST, WAYPOINT_DIST, type MissionDef } from '../data/missions'
import type { EnemySystem } from './EnemySystem'
import type { Vehicle } from '../entities/Vehicle'

export interface Profile {
  money: number
  xp: number
  level: number
  done: string[]
  started: string[]
}

export interface ActiveMission {
  def: MissionDef
  /** current objective index (type-specific meaning) */
  objective: number
  startTime: number
  followTime: number
}

export interface MissionHooks {
  onMissionStart?: (mission: MissionDef) => void
  onMissionComplete?: (mission: MissionDef, reward: number) => void
  onObjective?: (mission: MissionDef, objectiveText: string) => void
}

function xpToLevel(xp: number): number {
  return Math.floor(xp / 100) + 1
}

/**
 * Mission system: start zones in the world, objective-driven missions
 * (delivery / race / assassination / chase), 3D waypoint markers, and the
 * money/XP/level progression profile with save/load support.
 */
export class MissionSystem {
  readonly markers = new Group()
  active: ActiveMission | null = null
  profile: Profile = { money: 0, xp: 0, level: 1, done: [], started: [] }
  readonly hooks: MissionHooks = {}

  private chaseTarget: Vehicle | null = null
  private chaseTargetOriginalSpeed = 0

  constructor(
    private readonly enemies: EnemySystem,
    private readonly getPlayerPos: () => Vector3,
    private readonly getTrafficVehicles: () => Vehicle[],
  ) {}

  // --- progression ---

  addReward(money: number, xp: number): void {
    this.profile.money += money
    this.profile.xp += xp
    this.profile.level = xpToLevel(this.profile.xp)
  }

  /** Missions the player may start right now. */
  availableMissions(): MissionDef[] {
    return MISSIONS.filter(
      m => this.profile.level >= m.requiresLevel && !this.profile.done.includes(m.id) && !this.profile.started.includes(m.id),
    )
  }

  startedMission(id: string): boolean {
    return this.profile.started.includes(id)
  }

  // --- world interaction ---

  /** Mission start zone the player is standing in, if any. */
  zoneAt(x: number, z: number): MissionDef | null {
    for (const m of this.availableMissions()) {
      const dx = m.start.x - x
      const dz = m.start.z - z
      if (dx * dx + dz * dz < MISSION_START_DIST * MISSION_START_DIST) return m
    }
    return null
  }

  startMission(def: MissionDef): void {
    if (this.active) return
    this.profile.started.push(def.id)
    this.active = {
      def,
      objective: 0,
      startTime: performance.now(),
      followTime: 0,
    }
    if (def.type === 'chase') {
      const candidates = this.getTrafficVehicles().filter(v => !v.occupied && !v.wrecked)
      this.chaseTarget = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : null
      if (this.chaseTarget) {
        this.chaseTargetOriginalSpeed = this.chaseTarget.speed
        this.chaseTarget.speed = Math.max(this.chaseTarget.speed, 14)
      }
    }
    this.hooks.onMissionStart?.(def)
    this.emitObjective()
  }

  /** Objective text for the active mission. */
  objectiveText(): string {
    const m = this.active!
    const d = m.def
    const pos = this.getPlayerPos()
    switch (d.type) {
      case 'delivery':
        return m.objective === 0
          ? `Pick up the package (${Math.round(distToPos(pos, d.pickup!.x, d.pickup!.z))}m)`
          : `Deliver the package (${Math.round(distToPos(pos, d.dropoff!.x, d.dropoff!.z))}m)`
      case 'race':
        return `Reach checkpoint ${m.objective + 1}/${d.checkpoints!.length}`
      case 'assassination':
        return 'Eliminate the marked target'
      case 'chase':
        return `Stay within ${d.followRange}m of the target car (${Math.max(0, Math.ceil(d.followTime! - m.followTime))}s)`
    }
  }

  /** Current waypoint position for the active mission. */
  waypoint(): Vector3 | null {
    const m = this.active
    if (!m) return null
    const d = m.def
    switch (d.type) {
      case 'delivery': {
        const p = m.objective === 0 ? d.pickup! : d.dropoff!
        return new Vector3(p.x, 0, p.z)
      }
      case 'race': {
        const p = d.checkpoints![m.objective]
        return new Vector3(p.x, 0, p.z)
      }
      case 'assassination': {
        const target = this.enemies.enemies[d.targetId!]
        return target && !target.dead ? target.position.clone() : null
      }
      case 'chase':
        return this.chaseTarget ? this.chaseTarget.position.clone() : null
    }
  }

  update(dt: number): void {
    this.updateMarkers()
    if (!this.active) return
    const m = this.active
    const d = m.def
    const pos = this.getPlayerPos()

    switch (d.type) {
      case 'delivery': {
        const target = m.objective === 0 ? d.pickup! : d.dropoff!
        if (distToPos(pos, target.x, target.z) < WAYPOINT_DIST) {
          if (m.objective === 0) {
            m.objective = 1
            this.emitObjective()
          } else {
            this.complete()
          }
        }
        break
      }
      case 'race': {
        const cp = d.checkpoints![m.objective]
        if (distToPos(pos, cp.x, cp.z) < WAYPOINT_DIST) {
          m.objective++
          if (m.objective >= d.checkpoints!.length) this.complete()
          else this.emitObjective()
        }
        break
      }
      case 'assassination': {
        const target = this.enemies.enemies[d.targetId!]
        if (!target || target.dead) this.complete()
        break
      }
      case 'chase': {
        if (!this.chaseTarget) {
          this.complete() // no target available — grant a consolation
          break
        }
        const dx = this.chaseTarget.position.x - pos.x
        const dz = this.chaseTarget.position.z - pos.z
        if (dx * dx + dz * dz < d.followRange! * d.followRange!) {
          m.followTime += dt
          if (m.followTime >= d.followTime!) this.complete()
        }
        break
      }
    }
  }

  // --- markers + minimap support ---

  /** World-space marker positions (start zones + active waypoint). */
  markerPositions(): Array<{ pos: Vector3; color: number }> {
    const list: Array<{ pos: Vector3; color: number }> = []
    if (!this.active) {
      for (const m of this.availableMissions()) {
        list.push({ pos: new Vector3(m.start.x, 1.2, m.start.z), color: 0x2ecc71 })
      }
      return list
    }
    const wp = this.waypoint()
    if (wp) list.push({ pos: wp.clone().setY(1.4), color: 0xffd166 })
    return list
  }

  complete(): void {
    const m = this.active!
    // restore chase target speed before clearing
    if (this.chaseTarget) {
      this.chaseTarget.speed = this.chaseTargetOriginalSpeed
    }
    this.addReward(m.def.reward, m.def.xp)
    this.profile.done.push(m.def.id)
    this.active = null
    this.chaseTarget = null
    this.hooks.onMissionComplete?.(m.def, m.def.reward)
    this.rebuildMarkers(this.markerPositions())
  }

  abort(): void {
    if (this.chaseTarget) {
      this.chaseTarget.speed = this.chaseTargetOriginalSpeed
    }
    this.active = null
    this.chaseTarget = null
    this.rebuildMarkers(this.markerPositions())
  }

  private emitObjective(): void {
    if (this.active) this.hooks.onObjective?.(this.active.def, this.objectiveText())
  }

  /**
   * Update 3D markers without per-frame rebuilds:
   * - marker *set* changes (mission start/complete/objective) rebuild the meshes
   * - moving waypoints (assassination target / chase car) only reposition the
   *   existing marker — no allocation, no geometry churn.
   */
  private updateMarkers(): void {
    const want = this.markerPositions()
    if (this.markerCache.length !== want.length) {
      this.rebuildMarkers(want)
      return
    }
    // same set: check color anchors (only changes on start/complete/objective)
    for (let i = 0; i < want.length; i++) {
      if (this.markerCache[i].color !== want[i].color) {
        this.rebuildMarkers(want)
        return
      }
    }
    // reposition moving waypoints
    for (let i = 0; i < want.length; i++) {
      this.markerCache[i].group.position.copy(want[i].pos)
    }
  }

  private rebuildMarkers(want: Array<{ pos: Vector3; color: number }>): void {
    for (const mm of this.markerCache) {
      mm.group.traverse(obj => {
        if (obj instanceof Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      mm.group.parent?.remove(mm.group)
    }
    this.markerCache = []
    for (const { pos, color } of want) {
      const group = makeMarker(pos, color)
      this.markers.add(group)
      this.markerCache.push({ group, color })
    }
  }

  private markerCache: Array<{ group: Group; color: number }> = []

  /** Serialize profile for localStorage. */
  serialize(): string {
    return JSON.stringify(this.profile)
  }

  deserialize(data: string): void {
    try {
      const p = JSON.parse(data) as Profile
      if (p && typeof p.money === 'number') {
        this.profile = { ...p, level: xpToLevel(p.xp ?? 0) }
      }
    } catch {
      // corrupt save — ignore
    }
  }
}

function distToPos(pos: Vector3, x: number, z: number): number {
  const dx = pos.x - x
  const dz = pos.z - z
  return Math.sqrt(dx * dx + dz * dz)
}

function makeMarker(pos: Vector3, color: number): Group {
  const group = new Group()
  group.position.copy(pos)

  // vertical light beam
  const beam = new Mesh(
    new BoxGeometry(0.35, 14, 0.35),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false }),
  )
  beam.position.y = 7
  group.add(beam)

  // floating ring
  const ring = new Mesh(
    new BoxGeometry(1.6, 1.6, 1.6),
    new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
  )
  ring.position.y = 1.2
  ring.rotation.y = Math.PI / 4
  group.add(ring)

  const base = new Mesh(
    new BoxGeometry(2.2, 0.15, 2.2),
    new MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: 0.6 }),
  )
  base.position.y = 0.08
  group.add(base)

  return group
}
