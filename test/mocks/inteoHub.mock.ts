import * as dgram from 'dgram';

type HubBehavior = 'ack' | 'nack' | 'wrong-seqnum' | 'short-msg' | 'self-echo-only' | 'silent';

/**
 * Real UDP socket that simulates the Inteo/Somfy hub for testing.
 *
 * Binds on a random port (port 0) to avoid conflicts. Tests configure
 * the client to send to 127.0.0.1:<mockPort> with a fake localAddresses set
 * so the mock's loopback response is never filtered as self-echo.
 */
export class MockInteoHub {
  private socket: dgram.Socket | null = null;
  private behavior: HubBehavior = 'ack';
  private behaviorQueue: HubBehavior[] = [];
  public readonly recordedPackets: Buffer[] = [];
  private port = 0;

  async start(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      sock.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
        this.recordedPackets.push(Buffer.from(msg));
        const behavior =
          this.behaviorQueue.length > 0
            ? (this.behaviorQueue.shift() ?? this.behavior)
            : this.behavior;
        this.handleMessageWith(sock, msg, rinfo, behavior);
      });

      sock.on('error', (err: Error) => {
        reject(err);
      });

      sock.bind(0, () => {
        const addr = sock.address();
        this.port = addr.port;
        this.socket = sock;
        resolve(this.port);
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.socket) {
        resolve();
        return;
      }
      this.socket.close(() => {
        this.socket = null;
        resolve();
      });
    });
  }

  setNextBehavior(behavior: HubBehavior): void {
    this.behavior = behavior;
  }

  /** Queue behaviors to use in order: first message uses behaviorQueue[0], then [1], etc. Falls back to behavior when queue exhausted. */
  queueBehaviors(...behaviors: HubBehavior[]): void {
    this.behaviorQueue = [...behaviors];
  }

  getPort(): number {
    return this.port;
  }

  private handleMessageWith(
    sock: dgram.Socket,
    msg: Buffer,
    rinfo: dgram.RemoteInfo,
    behavior: HubBehavior,
  ): void {
    if (behavior === 'silent') return;

    if (behavior === 'self-echo-only') {
      sock.send(msg, rinfo.port, rinfo.address);
      return;
    }

    if (behavior === 'nack') {
      // Send ACK with buf[2]=0x00 (failure)
      const seqNum = msg[16] ?? 0;
      const nack = buildMockAck(seqNum);
      nack[2] = 0x00;
      sock.send(nack, rinfo.port, rinfo.address);
      return;
    }

    if (behavior === 'wrong-seqnum') {
      // Send ACK with a seqNum that doesn't match the request
      const seqNum = msg[16] ?? 0;
      const ack = buildMockAck((seqNum + 1) & 0xff);
      sock.send(ack, rinfo.port, rinfo.address);
      return;
    }

    if (behavior === 'short-msg') {
      // Send a message shorter than 17 bytes (filtered by client)
      sock.send(Buffer.alloc(10), rinfo.port, rinfo.address);
      return;
    }

    // 'ack': send 26-byte success response with echoed seqNum
    const seqNum = msg[16] ?? 0;
    const ack = buildMockAck(seqNum);
    sock.send(ack, rinfo.port, rinfo.address);
  }
}

function buildMockAck(seqNum: number): Buffer {
  // 26-byte hub ACK: buf[2]=0x01 (success), buf[16]=echoed seqNum
  const buf = Buffer.alloc(26);
  buf.writeUInt16BE(0x001a, 0); // MsgSize = 26
  buf[2] = 0x01; // ACK = success
  // bytes 3-8: hub MAC (mock uses zeros)
  buf[15] = 0x02; // SysId
  buf[16] = seqNum & 0xff; // SeqNum echoed
  buf[21] = 0x0d; // MsgType
  buf[22] = 0x04; // MsgSubType
  buf.writeUInt16BE(0x0000, 23); // DataSize = 0
  buf[25] = 0x01; // success flag
  return buf;
}
