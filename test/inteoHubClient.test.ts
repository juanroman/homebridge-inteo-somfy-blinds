import type { RemoteInfo } from 'dgram';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  InteoHubClient,
  buildScenePacket,
  deserializeHubAck,
  getLocalAddresses,
  isSelfEcho,
} from '../src/inteoHubClient.js';
import { createMockLogger } from './mocks/homebridge.mock.js';
import { MockInteoHub } from './mocks/inteoHub.mock.js';

const HUB_MAC = '44:D5:F2:C1:03:AC';
const HUB_MAC_BYTES = new Uint8Array([0x44, 0xd5, 0xf2, 0xc1, 0x03, 0xac]);

// Fake local IP set — loopback (127.0.0.1) is NOT in this set so mock ACKs are never filtered
const FAKE_LOCAL_ADDRESSES = new Set(['10.0.0.1']);

describe('buildScenePacket', () => {
  it('sets MsgSize to 27 at bytes 0-1', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf.readUInt16BE(0)).toBe(0x001b);
  });

  it('sets ACK byte to 0x00', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[2]).toBe(0x00);
  });

  it('sets SenderMAC bytes 3-8 to all zeros', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    for (let i = 3; i <= 8; i++) {
      expect(buf[i]).toBe(0);
    }
  });

  it('sets DestMAC bytes 9-14 to hub MAC', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[9]).toBe(0x44);
    expect(buf[10]).toBe(0xd5);
    expect(buf[11]).toBe(0xf2);
    expect(buf[12]).toBe(0xc1);
    expect(buf[13]).toBe(0x03);
    expect(buf[14]).toBe(0xac);
  });

  it('sets SysId byte 15 to 0x02', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[15]).toBe(0x02);
  });

  it('sets SeqNum at byte 16', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 5, seqNum: 42 });
    expect(buf[16]).toBe(42);
  });

  it('masks SeqNum to single byte (wraps at 256)', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 256 });
    expect(buf[16]).toBe(0);

    const buf2 = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 257 });
    expect(buf2[16]).toBe(1);
  });

  it('sets SecurityId bytes 17-20 to all zeros', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[17]).toBe(0);
    expect(buf[18]).toBe(0);
    expect(buf[19]).toBe(0);
    expect(buf[20]).toBe(0);
  });

  it('sets MsgType byte 21 to 0x0D (SCENE_EXECUTE)', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[21]).toBe(0x0d);
  });

  it('sets MsgSubType byte 22 to 0x04', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[22]).toBe(0x04);
  });

  it('sets DataSize bytes 23-24 to 0x0001', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf.readUInt16BE(23)).toBe(0x0001);
  });

  it('sets Error byte 25 to 0x00', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf[25]).toBe(0x00);
  });

  it('sets SceneId at byte 26', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 7, seqNum: 0 });
    expect(buf[26]).toBe(7);
  });

  it('produces exactly 27 bytes', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 0, seqNum: 0 });
    expect(buf.length).toBe(27);
  });

  it('matches known-good sample hex (scene 1, seq 1)', () => {
    const buf = buildScenePacket({ destMac: HUB_MAC_BYTES, sceneId: 1, seqNum: 1 });
    const expected = Buffer.from(
      '001b00000000000000' +
        '44d5f2c103ac' +
        '02' +
        '01' +
        '00000000' +
        '0d' +
        '04' +
        '0001' +
        '00' +
        '01',
      'hex',
    );
    expect(buf.equals(expected)).toBe(true);
  });
});

describe('deserializeHubAck', () => {
  function makeAck(seqNum: number, ackBit: number): Buffer {
    const buf = Buffer.alloc(26);
    buf[2] = ackBit;
    buf[16] = seqNum;
    return buf;
  }

  it('returns success=true when buf[2] === 0x01', () => {
    const ack = deserializeHubAck(makeAck(5, 0x01));
    expect(ack.success).toBe(true);
  });

  it('returns success=false when buf[2] !== 0x01', () => {
    expect(deserializeHubAck(makeAck(0, 0x00)).success).toBe(false);
    expect(deserializeHubAck(makeAck(0, 0x02)).success).toBe(false);
  });

  it('extracts seqNum from buf[16]', () => {
    expect(deserializeHubAck(makeAck(42, 0x01)).seqNum).toBe(42);
    expect(deserializeHubAck(makeAck(255, 0x01)).seqNum).toBe(255);
    expect(deserializeHubAck(makeAck(0, 0x01)).seqNum).toBe(0);
  });
});

describe('isSelfEcho', () => {
  const makeRinfo = (address: string): RemoteInfo => ({
    address,
    family: 'IPv4',
    port: 9325,
    size: 27,
  });

  it('returns true when address is in localAddresses set', () => {
    const locals = new Set(['192.168.1.10', '10.0.0.5']);
    expect(isSelfEcho(makeRinfo('192.168.1.10'), locals)).toBe(true);
    expect(isSelfEcho(makeRinfo('10.0.0.5'), locals)).toBe(true);
  });

  it('returns false when address is not in localAddresses set', () => {
    const locals = new Set(['192.168.1.10']);
    expect(isSelfEcho(makeRinfo('192.168.1.99'), locals)).toBe(false);
  });

  it('handles empty set (nothing is self-echo)', () => {
    expect(isSelfEcho(makeRinfo('192.168.1.1'), new Set())).toBe(false);
  });
});

describe('InteoHubClient — socket behavior', () => {
  let mockHub: MockInteoHub;
  let mockPort: number;
  let log: ReturnType<typeof createMockLogger>;

  function makeClient(retryAttempts = 3, commandTimeout = 2000): InteoHubClient {
    return new InteoHubClient(HUB_MAC, retryAttempts, commandTimeout, log, {
      destination: '127.0.0.1',
      port: mockPort,
      localAddresses: FAKE_LOCAL_ADDRESSES,
    });
  }

  beforeEach(async () => {
    log = createMockLogger();
    mockHub = new MockInteoHub();
    mockPort = await mockHub.start();
    mockHub.setNextBehavior('ack');
  });

  afterEach(async () => {
    await mockHub.stop();
  });

  it('resolves when hub sends valid ACK', async () => {
    await expect(makeClient().executeScene(5)).resolves.toBeUndefined();
  });

  it('sends a 27-byte packet to the hub', async () => {
    await makeClient().executeScene(3);
    expect(mockHub.recordedPackets[0]?.length).toBe(27);
  });

  it('encodes the scene number at byte 26 of the sent packet', async () => {
    await makeClient().executeScene(7);
    expect(mockHub.recordedPackets[0]?.[26]).toBe(7);
  });

  it('retries on timeout and resolves on subsequent ACK', async () => {
    // First attempt: silent (timeout), then switch to ack for retry
    mockHub.setNextBehavior('silent');

    const client = makeClient(3, 200);

    // Schedule behavior switch mid-flight
    setTimeout(() => {
      mockHub.setNextBehavior('ack');
    }, 250);

    await expect(client.executeScene(1)).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('failed (attempt 1/3)'));
  });

  it('rejects after all retries exhausted', async () => {
    mockHub.setNextBehavior('silent');
    const client = makeClient(2, 100);
    await expect(client.executeScene(0)).rejects.toThrow(
      /Failed to execute scene 0 after 2 attempts/,
    );
  });

  it('seqNum increments with each call', async () => {
    const client = makeClient();
    await client.executeScene(1);
    await client.executeScene(2);
    const seqFirst = mockHub.recordedPackets[0]?.[16] ?? -1;
    const seqSecond = mockHub.recordedPackets[1]?.[16] ?? -1;
    expect(seqSecond).toBe((seqFirst + 1) & 0xff);
  });

  it('seqNum wraps from 255 to 0', async () => {
    const client = makeClient(1, 500);

    const TOTAL = 257;
    for (let i = 0; i < TOTAL; i++) {
      await client.executeScene(0);
    }

    const seqAt255 = mockHub.recordedPackets[255]?.[16] ?? -1;
    const seqAt256 = mockHub.recordedPackets[256]?.[16] ?? -1;
    expect(seqAt255).toBe(255);
    expect(seqAt256).toBe(0);
  });

  it('retries when hub sends a NACK then resolves on ACK', async () => {
    // First packet: nack; second packet (retry): ack
    mockHub.queueBehaviors('nack', 'ack');
    const client = makeClient(3, 500);
    await expect(client.executeScene(2)).resolves.toBeUndefined();
  });

  it('ignores short messages then resolves on next ACK', async () => {
    // short-msg causes timeout (client waits for valid ACK); retry uses ack
    mockHub.queueBehaviors('short-msg', 'ack');
    const client = makeClient(3, 300);
    await expect(client.executeScene(4)).resolves.toBeUndefined();
  });

  it('ignores messages with wrong seqNum then resolves on next ACK', async () => {
    // wrong-seqnum causes timeout; retry uses ack
    mockHub.queueBehaviors('wrong-seqnum', 'ack');
    const client = makeClient(3, 300);
    await expect(client.executeScene(6)).resolves.toBeUndefined();
  });

  it('accepts hub MAC with colons', async () => {
    const client = new InteoHubClient('44:D5:F2:C1:03:AC', 1, 2000, log, {
      destination: '127.0.0.1',
      port: mockPort,
      localAddresses: FAKE_LOCAL_ADDRESSES,
    });
    await expect(client.executeScene(0)).resolves.toBeUndefined();
    expect(mockHub.recordedPackets[0]?.[9]).toBe(0x44);
    expect(mockHub.recordedPackets[0]?.[14]).toBe(0xac);
  });

  it('accepts hub MAC without colons', async () => {
    const client = new InteoHubClient('44D5F2C103AC', 1, 2000, log, {
      destination: '127.0.0.1',
      port: mockPort,
      localAddresses: FAKE_LOCAL_ADDRESSES,
    });
    await expect(client.executeScene(0)).resolves.toBeUndefined();
    expect(mockHub.recordedPackets[0]?.[9]).toBe(0x44);
  });

  it('handles two concurrent executeScene calls without ACK collision', async () => {
    const client = makeClient();
    await Promise.all([client.executeScene(1), client.executeScene(2)]);
    expect(mockHub.recordedPackets).toHaveLength(2);
  });

  it('ignores packets with wrong MsgType then resolves on next ACK', async () => {
    mockHub.queueBehaviors('wrong-msgtype', 'ack');
    const client = makeClient(3, 300);
    await expect(client.executeScene(8)).resolves.toBeUndefined();
  });
});

describe('getLocalAddresses', () => {
  it('returns a non-empty set of IPv4 addresses', () => {
    const addrs = getLocalAddresses();
    expect(addrs.size).toBeGreaterThan(0);
    for (const addr of addrs) {
      // IPv4 addresses have dots
      expect(addr).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }
  });

  it('includes loopback address', () => {
    const addrs = getLocalAddresses();
    expect(addrs.has('127.0.0.1')).toBe(true);
  });
});
