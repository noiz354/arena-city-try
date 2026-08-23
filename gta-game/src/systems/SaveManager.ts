import { z } from 'zod'

/**
 * localStorage persistence — v2 with zod validation + migration from v1.
 * ponytail: single-file schema, no versioned DB; add IndexedDB when save >5KB.
 */
export interface WeaponSave {
  owned: string[]
  current: string
  ammo: Record<string, { mag: number; reserve: number }>
}

export interface SaveData {
  profile: string // serialized MissionSystem profile
  pos: { x: number; z: number }
  health: number
  kills: number
  weapons: WeaponSave
}

const WeaponSaveSchema = z.object({
  owned: z.array(z.string()),
  current: z.string(),
  ammo: z.record(z.object({ mag: z.number().int().min(0), reserve: z.number().int().min(0) })),
})

const SaveSchema = z.object({
  v: z.literal(2).optional(), // ponytail: marker, tolerate missing on read
  profile: z.string(),
  pos: z.object({ x: z.number(), z: z.number() }),
  health: z.number().int().min(0).max(100),
  kills: z.number().int().min(0),
  weapons: WeaponSaveSchema,
})

export class SaveManager {
  private readonly keyV2 = 'cityrush_save_v2'
  private readonly keyV1 = 'cityrush_save_v1'
  constructor(private readonly key = 'cityrush_save_v2') {}

  save(data: SaveData): boolean {
    try {
      const payload = { v: 2 as const, ...data }
      SaveSchema.parse(payload) // validate before persist
      localStorage.setItem(this.keyV2, JSON.stringify(payload))
      localStorage.setItem(this.key, JSON.stringify(payload)) // keep alias for callers using custom key
      return true
    } catch {
      return false
    }
  }

  load(): SaveData | null {
    try {
      // try v2 first
      let raw = localStorage.getItem(this.keyV2) ?? localStorage.getItem(this.key)
      if (!raw) {
        // migrate v1 → v2 (opportunistic)
        const v1 = localStorage.getItem(this.keyV1)
        if (!v1) return null
        raw = v1
      }
      const parsed = JSON.parse(raw) as unknown
      const data = SaveSchema.parse(parsed) as SaveData & { v?: number }
      // migrate side-effect: persist as v2 for next boot
      if ((data as { v?: number }).v !== 2) {
        try { localStorage.setItem(this.keyV2, JSON.stringify({ v: 2, ...data })) } catch {}
      }
      // strip v before returning (callers expect SaveData)
      const { v: _v, ...rest } = data as SaveData & { v?: number }
      void _v
      return rest as SaveData
    } catch {
      return null // corrupt / schema mismatch — ignore (ponytail: no repair prompt)
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.keyV2)
      localStorage.removeItem(this.keyV1)
      localStorage.removeItem(this.key)
    } catch {
      // ignore
    }
  }
}
