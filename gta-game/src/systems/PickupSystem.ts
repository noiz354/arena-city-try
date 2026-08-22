import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { WEAPONS } from '../data/weapons'

const PICKUP_RANGE = 1.9

interface Pickup {
  group: Group
  kind: 'weapon' | 'ammo'
  weaponId?: string
  taken: boolean
  bobPhase: number
  fillMat: MeshStandardMaterial
}

export interface PickupHooks {
  onWeapon?: (id: string) => void
  onAmmo?: () => void
}

/**
 * Ground pickups: weapon crates (color-coded band per weapon) and ammo boxes.
 * Walk-over collection with a small bob/rotate animation. Dead enemies drop
 * ammo via `spawnAmmo`.
 */
export class PickupSystem {
  private readonly pickups: Pickup[] = []
  private readonly group = new Group()

  constructor(
    private readonly scene: { add(o: Group): void; remove(o: Group): void },
    private readonly playerPos: () => Vector3,
    readonly hooks: PickupHooks = {},
  ) {
    this.scene.add(this.group)
  }

  spawnWeapon(id: string, x: number, z: number): void {
    const def = WEAPONS[id]
    if (!def) return
    const group = new Group()
    group.position.set(x, 0.5, z)

    const crate = new Mesh(
      new BoxGeometry(0.8, 0.6, 0.8),
      new MeshStandardMaterial({ color: 0x6b5638, roughness: 0.7 }),
    )
    crate.castShadow = true
    group.add(crate)

    const bandMat = new MeshStandardMaterial({ color: def.color, roughness: 0.5 })
    const band = new Mesh(new BoxGeometry(0.84, 0.14, 0.84), bandMat)
    band.position.y = 0.1
    group.add(band)

    this.pickups.push({
      group,
      kind: 'weapon',
      weaponId: id,
      taken: false,
      bobPhase: Math.random() * Math.PI * 2,
      fillMat: bandMat,
    })
  }

  spawnAmmo(x: number, z: number): void {
    const group = new Group()
    group.position.set(x, 0.35, z)
    const box = new Mesh(
      new BoxGeometry(0.5, 0.3, 0.5),
      new MeshStandardMaterial({ color: 0xb8860b, roughness: 0.6, emissive: 0x4a3600, emissiveIntensity: 0.4 }),
    )
    box.castShadow = true
    group.add(box)
    const band = new Mesh(
      new BoxGeometry(0.52, 0.06, 0.52),
      new MeshStandardMaterial({ color: 0xffd166, roughness: 0.4 }),
    )
    band.position.y = 0.16
    group.add(band)

    this.pickups.push({
      group,
      kind: 'ammo',
      taken: false,
      bobPhase: Math.random() * Math.PI * 2,
      fillMat: band.material as MeshStandardMaterial,
    })
  }

  update(dt: number): void {
    const p = this.playerPos()
    for (const pick of this.pickups) {
      if (pick.taken) continue
      pick.bobPhase += dt * 2.2
      pick.group.position.y = 0.5 + Math.sin(pick.bobPhase) * 0.12
      pick.group.rotation.y += dt * 1.4

      const dx = pick.group.position.x - p.x
      const dz = pick.group.position.z - p.z
      if (dx * dx + dz * dz < PICKUP_RANGE * PICKUP_RANGE) {
        this.collect(pick)
      }
    }
  }

  private collect(pick: Pickup): void {
    pick.taken = true
    if (pick.kind === 'weapon' && pick.weaponId) {
      this.hooks.onWeapon?.(pick.weaponId)
    } else {
      this.hooks.onAmmo?.()
    }
    // pop animation then remove
    const g = pick.group
    const pop = () => {
      g.scale.setScalar(Math.max(g.scale.x - 0.2, 0.01))
      g.position.y += 0.06
      if (g.scale.x > 0.05) requestAnimationFrame(pop)
      else {
        this.group.remove(g)
        g.traverse(o => {
          if (o instanceof Mesh) {
            o.geometry.dispose()
            ;(o.material as MeshStandardMaterial).dispose()
          }
        })
      }
    }
    requestAnimationFrame(pop)
  }

  get visibleCount(): number {
    return this.pickups.filter(p => !p.taken).length
  }
}
