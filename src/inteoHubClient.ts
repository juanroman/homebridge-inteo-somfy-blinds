import * as dgram from 'dgram';
import * as os from 'os';

import type { Logger } from 'homebridge';

export interface SceneCommand {
  destMac: Uint8Array;
  sceneId: number;
  seqNum: number;
}

export interface HubAck {
  seqNum: number;
  success: boolean;
}

/** Constructs the 27-byte binary scene command packet. */
export function buildScenePacket(cmd: SceneCommand): Buffer {
  const buf = Buffer.alloc(27);
  buf.writeUInt16BE(0x001b, 0); // MsgSize = 27
  buf[2] = 0x00; // ACK = 0
  // bytes 3-8: SenderMAC = all zeros (already zero)
  Buffer.from(cmd.destMac).copy(buf, 9); // DestMAC at bytes 9-14
  buf[15] = 0x02; // SysId
  buf[16] = cmd.seqNum & 0xff; // SeqNum
  // bytes 17-20: SecurityId = all zeros
  buf[21] = 0x0d; // MsgType = SCENE_EXECUTE
  buf[22] = 0x04; // MsgSubType
  buf.writeUInt16BE(0x0001, 23); // DataSize = 1
  buf[25] = 0x00; // Error
  buf[26] = cmd.sceneId; // SceneId
  return buf;
}

/** Parses the 26-byte hub ACK response. */
export function deserializeHubAck(buf: Buffer): HubAck {
  return {
    success: buf[2] === 0x01,
    seqNum: buf[16] ?? 0,
  };
}

/** Returns true if the response came from our own machine (self-echo). */
export function isSelfEcho(rinfo: dgram.RemoteInfo, localAddresses: Set<string>): boolean {
  return localAddresses.has(rinfo.address);
}

/** Collects all local IPv4 addresses from all network interfaces. */
export function getLocalAddresses(): Set<string> {
  const addrs = new Set<string>();
  for (const ifaces of Object.values(os.networkInterfaces())) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4') {
        addrs.add(iface.address);
      }
    }
  }
  return addrs;
}

export interface IInteoHubClient {
  executeScene(sceneId: number): Promise<void>;
}

export interface InteoHubClientOptions {
  /** Override broadcast destination — for testing via loopback. */
  destination?: string;
  /** Override UDP port — for testing with a mock hub on a random port. */
  port?: number;
  /** Override local address set — for testing (avoids filtering loopback responses). */
  localAddresses?: Set<string>;
}

/**
 * Sends scene commands directly to the Inteo/Somfy hub via UDP broadcast on port 9325.
 *
 * Each call opens its own socket, sends the 27-byte binary packet, waits for
 * the hub's ACK (filtering out our own broadcast echo), then closes the socket.
 * The seqNum counter persists across all calls to avoid hub deduplication.
 */
export class InteoHubClient implements IInteoHubClient {
  private readonly hubMacBytes: Uint8Array;
  private readonly destination: string;
  private readonly port: number;
  private readonly localAddresses: Set<string>;

  // Shared across all executeScene calls — hub silently ignores duplicate seqNums
  private seqNum = 0;

  constructor(
    hubMac: string,
    private readonly retryAttempts: number,
    private readonly commandTimeout: number,
    private readonly log: Logger,
    options?: InteoHubClientOptions,
  ) {
    const macHex = hubMac.replace(/:/g, '');
    this.hubMacBytes = new Uint8Array((macHex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));
    this.destination = options?.destination ?? '255.255.255.255';
    this.port = options?.port ?? 9325;
    this.localAddresses = options?.localAddresses ?? getLocalAddresses();
  }

  async executeScene(sceneId: number): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.sendOnce(sceneId);
        this.log.debug(
          `Scene ${String(sceneId)} executed successfully on attempt ${String(attempt)}`,
        );
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log.warn(
          `Scene ${String(sceneId)} failed (attempt ${String(attempt)}/${String(this.retryAttempts)}): ${lastError.message}`,
        );
      }
    }

    throw new Error(
      `Failed to execute scene ${String(sceneId)} after ${String(this.retryAttempts)} attempts: ${lastError?.message ?? 'unknown error'}`,
    );
  }

  private sendOnce(sceneId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const localAddresses = this.localAddresses;
      const sentSeqNum = this.seqNum;
      this.seqNum = (this.seqNum + 1) & 0xff;

      const cmd: SceneCommand = {
        destMac: this.hubMacBytes,
        sceneId,
        seqNum: sentSeqNum,
      };
      const packet = buildScenePacket(cmd);

      const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      let settled = false;

      const cleanup = (err?: Error): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.close(() => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      };

      const timer = setTimeout(() => {
        cleanup(new Error(`Command timeout after ${String(this.commandTimeout)}ms`));
      }, this.commandTimeout);

      socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
        if (settled) return;
        if (isSelfEcho(rinfo, localAddresses)) return;
        if (msg.length !== 26) return;
        if (msg[21] !== 0x0d) return;
        const ack = deserializeHubAck(msg);
        if (ack.seqNum !== sentSeqNum) return;
        if (!ack.success) {
          cleanup(new Error(`Hub returned error for scene ${String(sceneId)}`));
          return;
        }
        cleanup();
      });

      socket.on('error', (err: Error) => {
        cleanup(err);
      });

      socket.bind({ port: 0 }, () => {
        socket.setBroadcast(true);
        socket.send(packet, this.port, this.destination, (err) => {
          if (err) {
            cleanup(err);
          }
        });
      });
    });
  }
}
