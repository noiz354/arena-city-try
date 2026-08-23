import { Client } from 'colyseus.js'

// ponytail: JSON snapshot @20Hz until binary schema proves needed (colyseus schema adds bundle)
export class NetClient {
  private client?: Client
  private room?: import('colyseus.js').Room
  snapshot = { seq: 0, players: [] as { id: string; x: number; z: number; yaw: number }[] }
  async connect(url = 'ws://localhost:2567'): Promise<void> {
    this.client = new Client(url)
    this.room = await this.client.joinOrCreate('cityrush')
    this.room.onMessage('snapshot', (msg: typeof this.snapshot) => { this.snapshot = msg })
  }
  sendInput(input: { seq: number; x: number; z: number }): void { this.room?.send('input', input) }
  // client-side prediction: apply input locally, reconcile on snapshot
  predict(local: { x: number; z: number }, input: { x: number; z: number }): { x: number; z: number } {
    return { x: local.x + input.x * 0.016, z: local.z + input.z * 0.016 }
  }
}
export const netClient = new NetClient()
