import { Color, DirectionalLight, Fog, AmbientLight, MathUtils } from 'three'

const DAY_LENGTH = 180 // seconds per full day/night cycle

const SKY_DAY = new Color(0x87ceeb)
const SKY_DUSK = new Color(0xff9a5a)
const SKY_NIGHT = new Color(0x0b1026)
const FOG_DAY = new Color(0xbfd4e4)
const FOG_NIGHT = new Color(0x0d1330)

/**
 * Day/night cycle: the sun orbits the city, sky/fog/light colors and
 * intensities lerp across the day, and a dim moon light takes over at night.
 * Day length is compressed (3 min) so the effect is visible in preview.
 */
export class DayNightSystem {
  /** 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk */
  timeOfDay = 0.55
  private readonly tmpSky = new Color()
  private readonly tmpFog = new Color()
  private readonly duskTint = new Color(0xff9a5a)
  private readonly sunDay = new Color(0xfff4e0)

  constructor(
    private readonly sun: DirectionalLight,
    private readonly ambient: AmbientLight,
    private readonly moon: DirectionalLight,
    private readonly skyColor: Color,
    private readonly fog: Fog,
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

    this.sun.position.set(
      Math.cos((t - 0.5) * Math.PI * 2) * 120,
      sunY * 140,
      Math.sin((t - 0.5) * Math.PI * 2) * 120,
    )

    // daylight amount 0..1 (smooth transitions)
    const day = MathUtils.smoothstep(MathUtils.clamp(elevation, -0.15, 0.4), -0.15, 0.4)
    const dusk = Math.max(0, 1 - Math.abs(elevation) * 5) // glow near horizon

    // sky: day → dusk tint near horizon → night
    this.tmpSky.copy(SKY_DAY).lerp(SKY_NIGHT, 1 - day)
    this.tmpSky.lerp(SKY_DUSK, dusk * (1 - day) * 0.7)
    this.skyColor.copy(this.tmpSky)

    this.tmpFog.copy(FOG_DAY).lerp(FOG_NIGHT, 1 - day)
    this.fog.color.copy(this.tmpFog)

    // sun light
    this.sun.intensity = MathUtils.lerp(0.15, 2.6, day)
    this.sun.color.copy(this.sunDay).lerp(this.duskTint, dusk * 0.6)

    // ambient
    this.ambient.intensity = MathUtils.lerp(0.12, 0.45, day)

    // moon
    this.moon.intensity = MathUtils.lerp(0.35, 0.02, day)
  }
}
