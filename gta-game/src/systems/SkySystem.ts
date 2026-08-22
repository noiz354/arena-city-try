import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three'

/**
 * Single-scatter atmospheric sky (threejs-atmosphere-aerial-perspective skill,
 * analytic tier): a BackSide sphere whose fragment shader ray-marches a flat
 * exponential atmosphere (Rayleigh + Mie) from a ground-level camera, producing
 * physically-grounded sky radiance, a sun disc + halo, and horizon haze that all
 * share ONE sun direction with the directional light and fog.
 *
 * The pack's LUT tier needs precomputed `.exr`/`.bin` textures and its
 * scattering coefficients are tuned for a normalized (0..1) density profile, so
 * they are not portable to this raymarch. Per the skill's routing boundary
 * ("adapt the architecture, not imports") this uses canonical physical
 * sea-level coefficients instead, and stays sandbox-safe (pure shader, no assets).
 */
export class SkySystem {
  readonly mesh: Mesh
  readonly uniforms: {
    /** unit vector pointing toward the sun (light travel direction) */
    sunDirection: { value: Vector3 }
    /** radiance color of the sun (driven by day/night) */
    sunColor: { value: Color }
    /** overall radiance scale (driven by day/night) */
    intensity: { value: number }
    /** extra exposure trim for tuning */
    exposure: { value: number }
  }

  constructor() {
    this.uniforms = {
      sunDirection: { value: new Vector3(0.3, 0.8, 0.4).normalize() },
      sunColor: { value: new Color(0xfff4e0) },
      intensity: { value: 26 },
      exposure: { value: 1.0 },
    }

    const geo = new SphereGeometry(900, 40, 20)
    const mat = new ShaderMaterial({
      uniforms: this.uniforms,
      side: BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorldPos;

        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform float intensity;
        uniform float exposure;

        const float PI = 3.141592653589793;

        // Canonical physical sea-level scattering coefficients (m^-1) and
        // scale heights (m) — the well-tested single-scatter baseline.
        const vec3  betaR = vec3(3.8e-6, 13.5e-6, 33.1e-6); // Rayleigh
        const float betaM = 21.0e-6;                        // Mie
        const float H_R   = 8000.0;
        const float H_M   = 1200.0;
        const float g     = 0.8;                            // Mie anisotropy
        const float sunAngularRadius = 0.004675;            // ~0.268 deg

        const int VIEW_SAMPLES  = 16;
        const int LIGHT_SAMPLES = 8;
        const float T_MAX = 60000.0;

        float rayleighPhase(float c) {
          return 3.0 / (16.0 * PI) * (1.0 + c * c);
        }

        float henyeyGreenstein(float c, float gg) {
          float g2 = gg * gg;
          float denom = 1.0 + g2 - 2.0 * gg * c;
          return (1.0 - g2) / (4.0 * PI * denom * sqrt(denom));
        }

        void main() {
          vec3 rd = normalize(vWorldPos - cameraPosition);
          float muSun = dot(rd, sunDirection);

          // ---- march the view ray through a flat exponential atmosphere ----
          float viewOD = 0.0;
          vec3 inscatter = vec3(0.0);
          float dt = T_MAX / float(VIEW_SAMPLES);
          float dtL = T_MAX / float(LIGHT_SAMPLES);

          for (int i = 0; i < VIEW_SAMPLES; i++) {
            float t = (float(i) + 0.5) * dt;
            vec3 p = cameraPosition + rd * t;
            float h = max(p.y, 0.0);
            float dR = exp(-h / H_R) * dt;
            float dM = exp(-h / H_M) * dt;
            viewOD += dR + dM;

            // optical depth from this sample toward the sun
            float lightOD = 0.0;
            for (int j = 0; j < LIGHT_SAMPLES; j++) {
              float tL = (float(j) + 0.5) * dtL;
              vec3 pL = p + sunDirection * tL;
              float hL = max(pL.y, 0.0);
              lightOD += (exp(-hL / H_R) + exp(-hL / H_M)) * dtL;
            }
            vec3 tr = exp(-(betaR * lightOD + betaM * lightOD));
            inscatter += tr * (betaR * dR * rayleighPhase(muSun) + betaM * dM * henyeyGreenstein(muSun, g));
          }

          vec3 col = inscatter * sunColor * intensity;

          // ---- sun disc + soft halo, attenuated by airmass (red at horizon) ----
          float airmass = 1.0 / max(muSun, 0.04);
          vec3 sunTr = exp(-(betaR * H_R + betaM * H_M) * 0.35 * airmass);
          float cosAng = clamp(muSun, 0.0, 1.0);
          float disc = smoothstep(1.0 - sunAngularRadius * 8.0, 1.0 - sunAngularRadius * 0.5, cosAng);
          float halo = pow(cosAng, 120.0) * 0.06 + pow(cosAng, 16.0) * 0.12;
          col += sunColor * sunTr * (disc * 1.6 + halo) * intensity;

          // ---- night floor: never fully black so the dome reads as sky ----
          col += vec3(0.006, 0.008, 0.02) * (1.0 - clamp(muSun + 0.5, 0.0, 1.0));

          gl_FragColor = vec4(col * exposure, 1.0);
        }
      `,
    })

    this.mesh = new Mesh(geo, mat)
    this.mesh.name = 'sky'
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -10
  }

  /** Set the shared sun direction (unit vector). Reused each frame, no alloc. */
  setSunDirection(x: number, y: number, z: number): void {
    this.uniforms.sunDirection.value.set(x, y, z).normalize()
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    ;(this.mesh.material as ShaderMaterial).dispose()
  }
}
