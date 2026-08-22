import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three'

/**
 * Procedural gradient sky dome (AAA pass — replaces the flat background color):
 * a BackSide sphere with a vertical gradient (zenith → horizon), a warm
 * horizon glow band, and an optional sun disc. The day/night system drives the
 * uniforms every frame, so dawn/dusk/night read correctly without any texture.
 *
 * Sandbox-safe: pure shader, no external assets. One draw call, frustumCulled
 * off, renderOrder first so everything draws over it.
 */
export class SkySystem {
  readonly mesh: Mesh
  readonly uniforms: {
    topColor: { value: Color }
    horizonColor: { value: Color }
    glowColor: { value: Color }
    glowAmount: { value: number }
    sunDir: { value: { x: number; y: number; z: number } }
    sunColor: { value: Color }
  }

  constructor() {
    this.uniforms = {
      topColor: { value: new Color(0x2b4a8a) },
      horizonColor: { value: new Color(0x9fc4e8) },
      glowColor: { value: new Color(0xff9a5a) },
      glowAmount: { value: 0 },
      sunDir: { value: { x: 0, y: 1, z: 0 } },
      sunColor: { value: new Color(0xfff4e0) },
    }

    const geo = new SphereGeometry(900, 24, 12)
    const mat = new ShaderMaterial({
      uniforms: this.uniforms,
      side: BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 glowColor;
        uniform float glowAmount;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        varying vec3 vWorld;
        void main() {
          vec3 dir = normalize(vWorld);
          float h = clamp(dir.y, 0.0, 1.0);
          // vertical gradient: horizon -> zenith
          vec3 col = mix(horizonColor, topColor, pow(h, 0.55));
          // warm glow near the horizon
          float glowBand = pow(1.0 - abs(dir.y), 4.0) * glowAmount;
          col += glowColor * glowBand;
          // sun disc + soft halo
          float s = max(dot(dir, normalize(sunDir)), 0.0);
          col += sunColor * (pow(s, 700.0) * 2.5 + pow(s, 64.0) * 0.35);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })

    this.mesh = new Mesh(geo, mat)
    this.mesh.name = 'sky'
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as ShaderMaterial).dispose()
  }
}
