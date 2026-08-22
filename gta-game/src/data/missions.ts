/**
 * Data-driven mission descriptors (interstellar-armada equipment.js pattern).
 */
export type MissionType = 'delivery' | 'assassination' | 'race' | 'chase'

export interface MissionDef {
  id: string
  name: string
  desc: string
  type: MissionType
  start: { x: number; z: number }
  reward: number
  xp: number
  requiresLevel: number
  /** delivery */
  pickup?: { x: number; z: number }
  dropoff?: { x: number; z: number }
  /** assassination: index of the thug to eliminate */
  targetId?: number
  /** race: ordered checkpoints */
  checkpoints?: Array<{ x: number; z: number }>
  /** chase: follow the target vehicle within this range for followTime seconds */
  followRange?: number
  followTime?: number
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'delivery_1',
    name: 'PIZZA DELIVERY',
    desc: 'Pick up the pizza and deliver it across town.',
    type: 'delivery',
    start: { x: -60, z: 60 },
    reward: 150,
    xp: 60,
    requiresLevel: 1,
    pickup: { x: -62, z: 58 },
    dropoff: { x: 92, z: -64 },
  },
  {
    id: 'race_1',
    name: 'MIDTOWN SPRINT',
    desc: 'Hit every checkpoint in order — fastest line wins.',
    type: 'race',
    start: { x: 82, z: -52 },
    reward: 250,
    xp: 90,
    requiresLevel: 1,
    checkpoints: [
      { x: 40, z: -80 },
      { x: -40, z: -80 },
      { x: -80, z: -40 },
      { x: -40, z: 40 },
      { x: 40, z: 80 },
      { x: 80, z: 40 },
    ],
  },
  {
    id: 'assassination_1',
    name: 'THUG CLEANUP',
    desc: 'The boss wants the marked thug gone. Do it quietly (or not).',
    type: 'assassination',
    start: { x: -92, z: -84 },
    reward: 400,
    xp: 150,
    requiresLevel: 2,
    targetId: 3,
  },
  {
    id: 'chase_1',
    name: 'TAIL THE TARGET',
    desc: 'Stay close to the speeding getaway car for 12 seconds.',
    type: 'chase',
    start: { x: 104, z: 64 },
    reward: 350,
    xp: 120,
    requiresLevel: 2,
    followRange: 35,
    followTime: 12,
  },
]

export const MISSION_START_DIST = 4.5
export const WAYPOINT_DIST = 6 // distance to consider a checkpoint reached
