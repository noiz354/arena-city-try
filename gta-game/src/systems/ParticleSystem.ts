import { Color, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, Vector3 } from 'three'

interface Particle {
  mesh: Mesh
  vel: Vector3
  life: number
  maxLife: number
  gravity: number
  scaleVel: number
}

const POOL_SIZE = 140

/**
 * Pooled particle system (interstellar-armada pools.js + SYNTHBLAST Particle
 * patterns): additive billboards for explosions/sparks/smoke. Zero allocation
 * during gameplay after construction.
 */
export class ParticleSystem {
  private readonly pool: Particle[] = []
  private readonly active: Particle[] = []

  constructor(private readonly scene: Scene) {
    const geo = new PlaneGeometry(0.5, 0.5)
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: 2, // THREE.AdditiveBlending
        opacity: 0,
      })
      const mesh = new Mesh(geo, mat)
      mesh.visible = false
      this.scene.add(mesh)
      this.pool.push({
        mesh,
        vel: new Vector3(),
        life: 0,
        maxLife: 1,
        gravity: 0,
        scaleVel: 0,
      })
    }
  }

  /** Fire burst: orange/yellow explosion + rising gray smoke. */
  explosion(pos: Vector3, scale = 1): void {
    for (let i = 0; i < 26; i++) this.burst(pos, 0xff9933, 8 * scale, 0.9, 6, 3)
    for (let i = 0; i < 14; i++) this.burst(pos, 0xffd166, 4 * scale, 0.6, 2, 5)
    for (let i = 0; i < 10; i++) this.burst(pos, 0x555566, 2 * scale, 1.6, -1.5, 4)
  }

  /** Generic burst of `count` particles with random velocity. */
  private burst(
    pos: Vector3,
    color: number,
    speed: number,
    life: number,
    gravity: number,
    count: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool.pop()
      if (!p) return
      const a = Math.random() * Math.PI * 2
      const v = Math.random() * speed
      p.vel.set(Math.cos(a) * v, (Math.random() - 0.2) * speed, Math.sin(a) * v)
      p.life = p.maxLife = life * (0.6 + Math.random() * 0.7)
      p.gravity = gravity
      p.scaleVel = 1.5
      p.mesh.position.copy(pos)
      p.mesh.visible = true
      p.mesh.scale.setScalar(0.4 + Math.random() * 0.8)
      ;(p.mesh.material as MeshBasicMaterial).color.setHex(color)
      ;(p.mesh.material as MeshBasicMaterial).opacity = 0.95
      this.active.push(p)
    }
  }

  /** Continuous smoke emission from a wrecked vehicle. */
  smoke(pos: Vector3, dt: number): void {
    if (Math.random() < dt * 6) {
      this.burst(
        pos.clone().add(new Vector3((Math.random() - 0.5) * 0.6, 1.4, (Math.random() - 0.5) * 0.6)),
        0x777788,
        1.2,
        2.2,
        1.2,
        1,
      )
    }
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]
      p.life -= dt
      if (p.life <= 0) {
        p.mesh.visible = false
        this.pool.push(p)
        this.active.splice(i, 1)
        continue
      }
      p.vel.y += p.gravity * dt
      p.mesh.position.addScaledVector(p.vel, dt)
      const mat = p.mesh.material as MeshBasicMaterial
      mat.opacity = Math.max(0, (p.life / p.maxLife) * 0.9)
      p.mesh.scale.multiplyScalar(1 + p.scaleVel * dt)
      // smoke rises slower and fades gray
      if (p.gravity < 0) mat.color.lerp(new Color(0x888899), dt * 0.4)
    }
  }

  dispose(): void {
    for (const p of this.pool) {
      p.mesh.geometry.dispose()
      ;(p.mesh.material as MeshBasicMaterial).dispose()
    }
    for (const p of this.active) {
      p.mesh.geometry.dispose()
      ;(p.mesh.material as MeshBasicMaterial).dispose()
    }
  }
}
