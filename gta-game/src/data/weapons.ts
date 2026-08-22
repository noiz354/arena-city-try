/**
 * Data-driven weapon definitions (bloodwave shooting.js pattern).
 */
export interface WeaponDef {
  id: string
  name: string
  key: string // number key to switch
  damage: number
  magSize: number
  reserveMax: number
  reloadTime: number // seconds
  fireRate: number // seconds between shots
  auto: boolean
  spread: number // radians
  pellets: number
  recoil: number // camera pitch kick (radians)
  range: number // meters
  color: number
  /** muzzle flash / tracer color */
  tracerColor: number
}

export const WEAPONS: Record<string, WeaponDef> = {
  pistol: {
    id: 'pistol',
    name: 'PISTOL',
    key: '1',
    damage: 34,
    magSize: 12,
    reserveMax: 60,
    reloadTime: 1.1,
    fireRate: 0.28,
    auto: false,
    spread: 0.012,
    pellets: 1,
    recoil: 0.012,
    range: 120,
    color: 0x2c2c30,
    tracerColor: 0xffe9a0,
  },
  smg: {
    id: 'smg',
    name: 'SMG',
    key: '2',
    damage: 18,
    magSize: 30,
    reserveMax: 120,
    reloadTime: 1.6,
    fireRate: 0.085,
    auto: true,
    spread: 0.028,
    pellets: 1,
    recoil: 0.008,
    range: 100,
    color: 0x33333a,
    tracerColor: 0xffe9a0,
  },
  shotgun: {
    id: 'shotgun',
    name: 'SHOTGUN',
    key: '3',
    damage: 16,
    magSize: 8,
    reserveMax: 40,
    reloadTime: 2.6,
    fireRate: 0.9,
    auto: false,
    spread: 0.09,
    pellets: 6,
    recoil: 0.05,
    range: 45,
    color: 0x4a3a2a,
    tracerColor: 0xffd27a,
  },
  rifle: {
    id: 'rifle',
    name: 'RIFLE',
    key: '4',
    damage: 30,
    magSize: 24,
    reserveMax: 96,
    reloadTime: 2.0,
    fireRate: 0.11,
    auto: true,
    spread: 0.018,
    pellets: 1,
    recoil: 0.012,
    range: 160,
    color: 0x1f1f24,
    tracerColor: 0xfff2b0,
  },
}

export const WEAPON_LIST: WeaponDef[] = Object.values(WEAPONS)
