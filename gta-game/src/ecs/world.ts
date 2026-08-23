import { createWorld as bitCreateWorld, type IWorld } from 'bitecs'

// Addy Osmani: Scaffold (Vite/Yeoman) → PRPL (20Hz snapshot)
export type EcsWorld = IWorld & { time: number; dt: number }

export function createEcsWorld(): EcsWorld {
  const w = bitCreateWorld() as EcsWorld
  w.time = 0
  w.dt = 0
  return w
}

// single global for CITY RUSH — ponytail: global lock, per-room worlds if multiplayer shards needed
export const ecsWorld = createEcsWorld()
