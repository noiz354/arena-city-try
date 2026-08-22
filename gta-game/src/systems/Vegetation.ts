import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { terrainSurfaceY } from '../game/World'

const BLADE_COUNT = 24000
const RING_MIN = 280 // start beyond the flat city square (half-diagonal ≈ 250)
const RING_MAX = 760 // terrain extent (800 half) minus margin

const ROOT_COLOR = new Color(0x5f9a45)
const TIP_COLOR = new Color(0xa8d54a)

/**
 * Instanced stylized grass (threejs-procedural-vegetation skill): a procedural
 * cross-plane blade geometry instanced across the outer terrain ring, with a
 * wind shader that bends each blade by a per-instance phase + height so the
 * meadow reads as alive. One draw call; no shadows (ground cover). Sandbox-safe
 * (fully procedural, no assets).
 */
export class Vegetation {
  readonly root = new Group()
  private readonly blades: InstancedMesh
  private readonly material: ShaderMaterial
  private readonly timeUniform = { value: 0 }

  constructor() {
    const geometry = buildBladeGeometry()
    this.material = buildGrassMaterial(this.timeUniform)

    this.blades = new InstancedMesh(geometry, this.material, BLADE_COUNT)
    this.blades.frustumCulled = false
    this.blades.instanceMatrix.setUsage(35048) // DynamicDrawUsage

    const m = new Matrix4()
    const up = new Vector3(0, 1, 0)
    const axis = new Vector3()
    const scale = new Vector3()
    const pos = new Vector3()

    let placed = 0
    let guard = 0
    while (placed < BLADE_COUNT && guard < BLADE_COUNT * 40) {
      guard++
      // rejection-sample inside the ring so blades avoid the flat city
      const ang = Math.random() * Math.PI * 2
      const rad = RING_MIN + Math.sqrt(Math.random()) * (RING_MAX - RING_MIN)
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad

      const y = terrainSurfaceY(x, z)
      pos.set(x, y, z)

      const heightScale = 0.7 + Math.random() * 0.7
      scale.set(0.8 + Math.random() * 0.5, heightScale, 0.8 + Math.random() * 0.5)
      axis.set(0, 1, 0)
      m.compose(pos, new Quaternion().setFromAxisAngle(up, Math.random() * Math.PI * 2), scale)

      this.blades.setMatrixAt(placed, m)
      // encode per-blade wind phase (r) and height variation (g) in instance color
      this.blades.setColorAt(placed, new Color(Math.random(), heightScale, Math.random()))
      placed++
    }
    this.blades.count = placed
    this.blades.instanceMatrix.needsUpdate = true
    if (this.blades.instanceColor) this.blades.instanceColor.needsUpdate = true

    this.root.add(this.blades)
  }

  update(time: number): void {
    this.timeUniform.value = time
  }

  dispose(): void {
    this.blades.geometry.dispose()
    this.material.dispose()
  }
}

/** Cross-plane tapered grass blade (3 planes at 0°/60°/120°), leaning slightly. */
function buildBladeGeometry(): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const planes = 3
  const segments = 4
  const height = 1.0
  const width = 0.06

  for (let p = 0; p < planes; p++) {
    const angle = (p / planes) * Math.PI
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const normal = new Vector3(sin, 0.3, cos).normalize()
    const base = positions.length / 3

    for (let seg = 0; seg <= segments; seg++) {
      const t = seg / segments
      const taper = Math.pow(1 - t, 1.4)
      const y = t * height
      const lean = t * t * 0.12
      const halfWidth = width * (0.2 + 0.8 * taper)
      for (const side of [-1, 1]) {
        const localX = side * halfWidth
        const localZ = lean
        positions.push(localX * cos - localZ * sin, y, localX * sin + localZ * cos)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(side < 0 ? 0 : 1, t)
      }
    }
    for (let seg = 0; seg < segments; seg++) {
      const row = base + seg * 2
      indices.push(row, row + 1, row + 2, row + 1, row + 3, row + 2)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeBoundingSphere()
  return geo
}

/** Wind-bent, two-tone lambert-lit grass shader (per-instance phase via instanceColor). */
function buildGrassMaterial(time: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: time,
      uRootColor: { value: ROOT_COLOR },
      uTipColor: { value: TIP_COLOR },
      uWind: { value: 0.35 },
      uSun: { value: new Vector3(-0.4, 0.75, 0.5).normalize() },
    },
    side: 2, // DoubleSide
    vertexShader: /* glsl */ `
      precision highp float;
      // note: instanceMatrix and instanceColor are injected by three.js
      // (USE_INSTANCING / USE_INSTANCING_COLOR); do not redeclare them.
      uniform float uTime;
      uniform float uWind;
      varying vec2 vUv;
      varying float vShade;

      void main() {
        vUv = uv;
        vec3 p = position;
        // wind: bend by the square of blade height so roots stay planted
        float phase = instanceColor.r * 6.2831;
        float gust = sin(uTime * 1.8 + phase) * 0.6 + sin(uTime * 3.1 + phase * 1.7) * 0.4;
        float bend = uWind * gust * (p.y * p.y);
        p.x += bend;
        p.z += bend * 0.4;

        // simple lambert term (direction fixed in view space for stability)
        vec3 n = normalize(normal);
        vShade = 0.55 + 0.45 * max(dot(n, normalize(vec3(-0.4, 0.75, 0.5))), 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying float vShade;
      uniform vec3 uRootColor;
      uniform vec3 uTipColor;
      void main() {
        vec3 col = mix(uRootColor, uTipColor, vUv.y) * vShade;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}
