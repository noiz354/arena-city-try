import { Vector3 } from 'three'
// ponytail: B3 race checkpoints adapted from repos/racing/data/tracks/track_1.ts:89 5 pts, city-fit -120..120
export const TRACK_1_POINTS = [
  new Vector3(50, 0.2, 0),
  new Vector3(120, 0.2, 80),
  new Vector3(0, 0.2, 120),
  new Vector3(-100, 0.2, -40),
  new Vector3(-40, 0.2, -100),
]
export const TRACK_1_CHECKPOINTS = [
  { position: new Vector3(50, 0, 0), width: 12, height: 100 },
  { position: new Vector3(120, 0, 80), width: 12, height: 100 },
  { position: new Vector3(0, 0, 120), width: 12, height: 100 },
  { position: new Vector3(-100, 0, -40), width: 12, height: 100 },
  { position: new Vector3(-40, 0, -100), width: 12, height: 100 },
]
