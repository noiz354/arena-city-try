import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MathUtils,
  Vector3,
} from 'three'
import type { SkySystem } from './SkySystem'

const DAY_LENGTH = 180 // seconds per full day/night cycle

const SKY_DAY = new Color(0x87ceeb)
const SKY_DUSK = new Color(0xff9a5a)
const SKY_NIGHT = new Color(0x0b1026)
const FOG_DAY = new Color(0xbfd4e4)
const FOG_NIGHT = new Color(0x0d1330)

/**
 * Day/night cycle: computes the sun DIRECTION (azimuth/elevation) and the
 * sun/sky/fog/light colors + intensities across the day, and drives the
 * single-scatter sky (SkySystem) so sky, fog, and the directional light all
 * share ONE sun direction. It deliberately does NOT position the directional
 * light — the World places the light + shadow frustum around the player from
 * this direction (see World.updateSun), so shadows follow the player instead of
 * orbiting the origin. Day length is compressed (3 min) so it reads in preview.
 */
export class DayNightSystem {
  /** 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk */
  timeOfDay = 0.55

  /** Unit vector pointing toward the sun (shared by light, sky, fog). */
  readonly sunDirection = new Vector3(0.3, 0.8, 0.4).normalize()

  /** Normalized daylight amount 0..1 (smooth), exposed for other systems. */
  day = 1

  private readonly tmpSky = new Color()
  private readonly tmpFog = new Color()
  private readonly duskTint = new Color(0xff9a5a)
  private readonly sunDay = new Color(0xfff4e0)

  constructor(
    private readonly sun: DirectionalLight,
    private readonly ambient: AmbientLight,
    private readonly hemi: HemisphereLight,
    private readonly moon: DirectionalLight,
    private readonly skyColor: Color,
    private readonly fog: Fog,
    private readonly sky: SkySystem,
  ) {}

  get isNight(): boolean {
    const h = this.hour()
    return h < 6 || h > 19
  }

  hour(): number {
    return this.timeOfDay * 24
  }

  update(dt: number): void {
    this.timeOfDay = (this.timeOfDay + dt / DAY_LENGTH) % 1
    const t = this.timeOfDay

    // sun elevation: peaks at noon (0.5), below horizon at night
    const elevation = Math.sin((t - 0.25) * Math.PI * 2)
    const sunY = MathUtils.clamp(elevation, -0.35, 1)

    // unit direction toward the sun (azimuth orbits the city; elevation tilts)
    this.sunDirection
      .set(
        Math.cos((t - 0.5) * Math.PI * 2),
        sunY,
        Math.sin((t - 0.5) * Math.PI * 2),
      )
      .normalize()

    // daylight amount 0..1 (smooth transitions)
    const day = MathUtils.smoothstep(MathUtils.clamp(elevation, -0.15, 0.4), -0.15, 0.4)
    const dusk = Math.max(0, 1 - Math.abs(elevation) * 5) // glow near horizon
    this.day = day

    // scene background fallback color (only used if the sky mesh were hidden)
    this.tmpSky.copy(SKY_DAY).lerp(SKY_NIGHT, 1 - day)
    this.tmpSky.lerp(SKY_DUSK, dusk * (1 - day) * 0.7)
    this.skyColor.copy(this.tmpSky)

    // sun-aware fog: base day/night color tinted toward the sun at dusk
    this.tmpFog.copy(FOG_DAY).lerp(FOG_NIGHT, 1 - day)
    this.tmpFog.lerp(SKY_DUSK, dusk * (1 - day) * 0.5)
    this.fog.color.copy(this.tmpFog)

    // --- lights ---
    this.sun.intensity = MathUtils.lerp(0.15, 2.6, day)
    this.sun.color.copy(this.sunDay).lerp(this.duskTint, dusk * 0.6)

    this.hemi.intensity = MathUtils.lerp(0.12, 0.5, day)
    this.ambient.intensity = MathUtils.lerp(0.12, 0.45, day)

    // moon
    this.moon.intensity = MathUtils.lerp(0.35, 0.02, day)

    // --- single-scatter sky uniforms (shared sun direction) ---
    this.sky.setSunDirection(this.sunDirection.x, this.sunDirection.y, this.sunDirection.z)
    this.sky.uniforms.sunColor.value.copy(this.sun.color)
    // radiance scale: bright at noon, a dim moonlit glow at night
    this.sky.uniforms.intensity.value = MathUtils.lerp(1.2, 26, day)
    this.sky.uniforms.exposure.value = 1.0
  }
}
