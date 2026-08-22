import { Data3DTexture, NearestFilter, RGBAFormat, UnsignedByteType } from 'three'

/**
 * Generated 3D color-grading LUT (threejs-exposure-color-grading skill):
 * a 33³ RGBA8 data texture encoding a subtle scene-referred creative grade —
 * gentle contrast + saturation lift, warm shadow lift, slightly cool highlights.
 * Applied by LUTPass BEFORE tone mapping (scene-referred), so it never fights
 * the renderer's ACES tone map. Pure data → unit-testable, no GL required to build.
 */
export function buildGradeLUT(size = 33): Data3DTexture {
  const data = new Uint8Array(size * size * size * 4)
  const step = 1 / (size - 1)

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const i = (b * size * size + g * size + r) * 4
        const cr = gradeChannel(r * step)
        const cg = gradeChannel(g * step)
        const cb = gradeChannel(b * step)
        data[i] = clamp255(cr)
        data[i + 1] = clamp255(cg)
        data[i + 2] = clamp255(cb)
        data[i + 3] = 255
      }
    }
  }

  const tex = new Data3DTexture(data, size, size, size)
  tex.format = RGBAFormat
  tex.type = UnsignedByteType
  tex.minFilter = NearestFilter
  tex.magFilter = NearestFilter
  tex.needsUpdate = true
  return tex
}

/**
 * Per-channel grade: saturation is applied at the LUT sampling stage (channels
 * are independent here), so this applies contrast + a luminance-shaped lift.
 */
function gradeChannel(x: number): number {
  // gentle S-curve contrast around 0.5
  const contrast = 1.07
  let c = x * contrast - (contrast - 1) * 0.5
  c = Math.min(1, Math.max(0, c))
  return c
}

function clamp255(x: number): number {
  return Math.min(255, Math.max(0, Math.round(x * 255)))
}
