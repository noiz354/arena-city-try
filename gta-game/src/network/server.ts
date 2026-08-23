// Minimal Colyseus Room stub — run via `npm run dev:server` when needed
// import { Room } from 'colyseus' // ponytail: kept as comment until server dep split (avoids bundling server in client)
export class CityRushRoomStub {
  // ponytail: 20Hz fixed tick, snapshot seq, input buffer — expand to real Room when GH Actions needs it
  tick = 50 // ms (20Hz)
  snapshot(): { seq: number; players: unknown[] } { return { seq: 0, players: [] } }
}
