import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { WEAPONS, type WeaponDef } from '../data/weapons'

const HOLD_POS = new Vector3(0.42, 1.02, 0.18) // right-hand anchor on the player
const HOLD_ROT_X = -0.12 // slight downward aim

/**
 * Third-person weapon viewmodel (bloodwave viewmodel pattern, adapted to the
 * 3rd-person camera): a procedural gun model held by the player character,
 * swapped per weapon, with recoil kick on fire and movement bob. Hidden
 * automatically while driving (the player group is hidden).
 */
export class WeaponView {
  readonly holder = new Group()
  private readonly models = new Map<string, Group>()
  private readonly muzzle: Mesh
  private readonly muzzleMat: MeshBasicMaterial
  private kickAmount = 0
  private flash = 0
  private bobTime = 0

  constructor() {
    this.holder.position.copy(HOLD_POS)
    this.holder.rotation.x = HOLD_ROT_X

    for (const def of Object.values(WEAPONS)) {
      const model = this.buildModel(def)
      model.visible = false
      this.models.set(def.id, model)
      this.holder.add(model)
    }

    // muzzle flash (additive billboard at the barrel tip)
    this.muzzleMat = new MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: 2, // AdditiveBlending
    })
    this.muzzle = new Mesh(new BoxGeometry(0.16, 0.16, 0.16), this.muzzleMat)
    this.muzzle.position.set(0, 0.02, -0.55)
    this.muzzle.rotation.z = Math.PI / 4
    this.holder.add(this.muzzle)

    this.setWeapon('pistol')
  }

  setWeapon(id: string): void {
    for (const [key, model] of this.models) model.visible = key === id
  }

  /** Recoil kick — called on every shot. */
  kick(): void {
    this.kickAmount = 1
    this.flash = 1
  }

  update(dt: number, moving: boolean, speedRatio: number): void {
    // recoil decay
    this.kickAmount = Math.max(0, this.kickAmount - dt * 7)
    const k = this.kickAmount
    this.holder.position.z = HOLD_POS.z + k * 0.12
    this.holder.position.x = HOLD_POS.x + k * 0.015
    this.holder.rotation.x = HOLD_ROT_X + k * 0.14

    // movement bob
    if (moving) {
      this.bobTime += dt * (6 + speedRatio * 10)
      const bobY = Math.abs(Math.sin(this.bobTime)) * 0.02
      const bobX = Math.sin(this.bobTime * 0.5) * 0.012
      this.holder.position.y = HOLD_POS.y + bobY
      this.holder.rotation.z = bobX
    } else {
      this.holder.position.y = MathUtils.damp(this.holder.position.y, HOLD_POS.y, 8, dt)
      this.holder.rotation.z = MathUtils.damp(this.holder.rotation.z, 0, 8, dt)
    }

    // muzzle flash decay
    this.flash = Math.max(0, this.flash - dt * 14)
    this.muzzleMat.opacity = this.flash * 0.9
    this.muzzle.scale.setScalar(0.7 + this.flash * 0.6)
  }

  /** Compact procedural gun per weapon (box assemblies, bloodwave-style). */
  private buildModel(def: WeaponDef): Group {
    const g = new Group()
    const metal = new MeshStandardMaterial({ color: def.color, roughness: 0.45, metalness: 0.7 })
    const dark = new MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.7 })
    const accent = new MeshStandardMaterial({ color: 0xc9a227, roughness: 0.4, metalness: 0.6 })

    const box = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
      const m = new Mesh(new BoxGeometry(w, h, d), mat)
      m.position.set(x, y, z)
      g.add(m)
    }
    const cyl = (rt: number, rb: number, h: number, mat: MeshStandardMaterial, x: number, y: number, z: number): void => {
      const m = new Mesh(new CylinderGeometry(rt, rb, h, 10), mat)
      m.rotation.x = Math.PI / 2
      m.position.set(x, y, z)
      g.add(m)
    }

    switch (def.id) {
      case 'pistol':
        box(0.045, 0.085, 0.22, metal, 0, 0, -0.02)
        box(0.035, 0.07, 0.08, dark, 0, 0.035, 0.09) // slide
        box(0.04, 0.09, 0.05, dark, 0, -0.06, 0.02) // grip
        cyl(0.012, 0.012, 0.14, metal, 0, 0.01, -0.16) // barrel
        break
      case 'smg':
        box(0.05, 0.09, 0.3, metal, 0, 0, -0.05)
        cyl(0.011, 0.011, 0.24, dark, 0, 0.005, -0.26) // suppressor barrel
        box(0.035, 0.14, 0.05, dark, 0, -0.09, -0.03) // mag
        box(0.04, 0.1, 0.05, dark, 0, -0.08, 0.08) // grip
        box(0.04, 0.05, 0.16, metal, 0, 0.045, 0.12) // stock
        break
      case 'shotgun':
        box(0.06, 0.1, 0.38, metal, 0, 0, -0.05)
        cyl(0.016, 0.016, 0.4, dark, 0, 0.02, -0.28) // barrel
        box(0.055, 0.09, 0.2, dark, 0, -0.05, 0.14) // stock
        box(0.045, 0.1, 0.06, accent, 0, -0.09, -0.02) // pump
        break
      case 'rifle':
        box(0.05, 0.09, 0.34, metal, 0, 0, -0.06)
        cyl(0.013, 0.013, 0.34, dark, 0, 0.012, -0.32) // long barrel
        box(0.04, 0.13, 0.06, dark, 0, -0.1, -0.05) // mag
        box(0.045, 0.12, 0.06, dark, 0, -0.09, 0.09) // grip
        box(0.04, 0.06, 0.2, metal, 0, 0.05, 0.14) // stock
        cyl(0.02, 0.02, 0.14, accent, 0, 0.075, -0.12) // scope
        break
    }
    return g
  }
}
