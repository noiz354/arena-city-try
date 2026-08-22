import { Vector3 } from 'three'
import { CITY_HALF, ROADS_X, ROADS_Z } from './CityGenerator'

const SIZE = 168
const VIEW = 420 // meters shown across the minimap

/**
 * 2D canvas minimap (bottom-right): road grid, player arrow (rotated by yaw),
 * active waypoint, and mission start zones. Sandbox-safe (no textures/CDN).
 */
export class MinimapSystem {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = SIZE
    this.canvas.height = SIZE
    this.canvas.className = 'minimap'
    document.getElementById('ui-root')!.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
  }

  update(playerPos: Vector3, playerYaw: number, waypoint: Vector3 | null, zones: Array<{ pos: Vector3; color: number }>): void {
    const ctx = this.ctx
    const half = SIZE / 2
    const scale = SIZE / VIEW

    // background
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = 'rgba(10, 14, 18, 0.82)'
    ctx.beginPath()
    ctx.arc(half, half, half - 2, 0, Math.PI * 2)
    ctx.fill()

    // clip to circle
    ctx.save()
    ctx.beginPath()
    ctx.arc(half, half, half - 4, 0, Math.PI * 2)
    ctx.clip()

    const px = (wx: number) => half + (wx - playerPos.x) * scale
    const py = (wz: number) => half + (wz - playerPos.z) * scale

    // roads
    ctx.strokeStyle = 'rgba(120, 130, 145, 0.5)'
    ctx.lineWidth = 2
    for (const r of ROADS_X) {
      ctx.beginPath()
      ctx.moveTo(px(r), 0)
      ctx.lineTo(px(r), SIZE)
      ctx.stroke()
    }
    for (const r of ROADS_Z) {
      ctx.beginPath()
      ctx.moveTo(0, py(r))
      ctx.lineTo(SIZE, py(r))
      ctx.stroke()
    }

    // city bounds
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.strokeRect(px(-CITY_HALF), py(-CITY_HALF), px(CITY_HALF) - px(-CITY_HALF), py(CITY_HALF) - py(-CITY_HALF))

    // mission start zones
    for (const z of zones) {
      ctx.fillStyle = '#2ecc71'
      ctx.beginPath()
      ctx.arc(px(z.pos.x), py(z.pos.z), 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // waypoint
    if (waypoint) {
      ctx.fillStyle = '#ffd166'
      ctx.beginPath()
      ctx.arc(px(waypoint.x), py(waypoint.z), 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,209,102,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(px(waypoint.x), py(waypoint.z), 9, 0, Math.PI * 2)
      ctx.stroke()
    }

    // player arrow
    ctx.translate(half, half)
    ctx.rotate(playerYaw)
    ctx.fillStyle = '#7ef0ff'
    ctx.beginPath()
    ctx.moveTo(0, -7)
    ctx.lineTo(5, 6)
    ctx.lineTo(-5, 6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // border
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(half, half, half - 2, 0, Math.PI * 2)
    ctx.stroke()
  }
}
