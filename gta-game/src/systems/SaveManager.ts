/**
 * localStorage persistence for the game (extracted from Game.ts so the shell
 * stays lean — A-1 refactor step). Stores the progression profile, player
 * state, and weapon inventory in one JSON payload under a single key.
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

export class SaveManager {
  constructor(private readonly key = 'cityrush_save_v1') {}

  save(data: SaveData): boolean {
    try {
      localStorage.setItem(this.key, JSON.stringify(data))
      return true
    } catch {
      return false // storage unavailable — non-fatal
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return null
      const data = JSON.parse(raw) as SaveData
      if (!data || typeof data.profile !== 'string') return null
      return data
    } catch {
      return null // corrupt save — ignore
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key)
    } catch {
      // ignore
    }
  }
}
