import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlindAccessory } from '../src/blindAccessory.js';
import { Position } from '../src/types.js';
import {
  createMockAccessory,
  createMockLogger,
  createMockNeocontrolClient,
  createMockPlatform,
  MockHapStatusError,
} from './mocks/homebridge.mock.js';

describe('BlindAccessory', () => {
  let mockPlatform: ReturnType<typeof createMockPlatform>;
  let mockAccessory: ReturnType<typeof createMockAccessory>;
  let mockClient: ReturnType<typeof createMockNeocontrolClient>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let blindAccessory: BlindAccessory;

  const blindConfig = {
    name: 'Test Blind',
    openScene: 1,
    closeScene: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPlatform = createMockPlatform();
    mockAccessory = createMockAccessory('Test Blind', 'uuid-test');
    mockClient = createMockNeocontrolClient();
    mockLogger = createMockLogger();

    blindAccessory = new BlindAccessory(
      mockPlatform as any,
      mockAccessory as any,
      blindConfig,
      mockClient,
      mockLogger as any,
    );
  });

  describe('initialization', () => {
    it('should start at unknown position (50%)', () => {
      expect(blindAccessory.getCurrentPosition()).toBe(Position.UNKNOWN);
      expect(blindAccessory.getTargetPosition()).toBe(Position.UNKNOWN);
    });

    it('should always report position state as STOPPED', () => {
      expect(blindAccessory.getPositionState()).toBe(
        mockPlatform.Characteristic.PositionState.STOPPED,
      );
    });

    it('should create or get WindowCovering service', () => {
      // The accessory should have tried to get the service first
      expect(mockAccessory.getService).toHaveBeenCalledWith('WindowCovering');
      // Since it doesn't exist, it should add it
      expect(mockAccessory.addService).toHaveBeenCalledWith('WindowCovering');
    });

    it('should get accessory information service', () => {
      expect(mockAccessory.getService).toHaveBeenCalledWith('AccessoryInformation');
    });
  });

  describe('setTargetPosition - opening', () => {
    it('should open when target > 50', async () => {
      await blindAccessory.setTargetPosition(100);

      expect(mockClient.executeScene).toHaveBeenCalledWith(blindConfig.openScene);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.OPEN);
      expect(blindAccessory.getTargetPosition()).toBe(Position.OPEN);
    });

    it('should open when target is 51', async () => {
      await blindAccessory.setTargetPosition(51);

      expect(mockClient.executeScene).toHaveBeenCalledWith(blindConfig.openScene);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.OPEN);
    });

    it('should open when target is 75', async () => {
      await blindAccessory.setTargetPosition(75);

      expect(mockClient.executeScene).toHaveBeenCalledWith(blindConfig.openScene);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.OPEN);
    });

    it('should log info message when opening', async () => {
      await blindAccessory.setTargetPosition(100);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Opening'));
    });
  });

  describe('setTargetPosition - closing', () => {
    it('should close when target < 50', async () => {
      await blindAccessory.setTargetPosition(0);

      expect(mockClient.executeScene).toHaveBeenCalledWith(blindConfig.closeScene);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.CLOSED);
      expect(blindAccessory.getTargetPosition()).toBe(Position.CLOSED);
    });

    it('should close when target is 49', async () => {
      await blindAccessory.setTargetPosition(49);

      expect(mockClient.executeScene).toHaveBeenCalledWith(blindConfig.closeScene);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.CLOSED);
    });

    it('should close when target is 25', async () => {
      await blindAccessory.setTargetPosition(25);

      expect(mockClient.executeScene).toHaveBeenCalledWith(blindConfig.closeScene);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.CLOSED);
    });

    it('should log info message when closing', async () => {
      await blindAccessory.setTargetPosition(0);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Closing'));
    });
  });

  describe('setTargetPosition - unknown (50)', () => {
    it('should ignore target = 50', async () => {
      await blindAccessory.setTargetPosition(50);

      expect(mockClient.executeScene).not.toHaveBeenCalled();
      expect(blindAccessory.getCurrentPosition()).toBe(Position.UNKNOWN);
    });

    it('should log debug message when ignoring 50', async () => {
      await blindAccessory.setTargetPosition(50);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring target position 50'),
      );
    });
  });

  describe('error handling', () => {
    it('should revert to unknown on failure', async () => {
      mockClient.executeScene.mockRejectedValueOnce(new Error('Network error'));

      await expect(blindAccessory.setTargetPosition(100)).rejects.toThrow();

      expect(blindAccessory.getCurrentPosition()).toBe(Position.UNKNOWN);
      expect(blindAccessory.getTargetPosition()).toBe(Position.UNKNOWN);
    });

    it('should throw HapStatusError on failure', async () => {
      mockClient.executeScene.mockRejectedValueOnce(new Error('Network error'));

      await expect(blindAccessory.setTargetPosition(100)).rejects.toThrow(MockHapStatusError);
    });

    it('should log error message on failure', async () => {
      mockClient.executeScene.mockRejectedValueOnce(new Error('Test error'));

      await expect(blindAccessory.setTargetPosition(100)).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Command failed'));
    });
  });

  describe('concurrent command prevention', () => {
    it('should ignore commands while executing', async () => {
      // Make the first command take time
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      mockClient.executeScene.mockImplementationOnce(() => firstPromise);

      // Start first command
      const first = blindAccessory.setTargetPosition(100);

      // Try second command while first is executing
      await blindAccessory.setTargetPosition(0);

      // Second command should have been ignored
      expect(mockClient.executeScene).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Command already in progress'),
      );

      // Complete first command
      resolveFirst!();
      await first;
    });

    it('should allow commands after previous completes', async () => {
      await blindAccessory.setTargetPosition(100);
      await blindAccessory.setTargetPosition(0);

      expect(mockClient.executeScene).toHaveBeenCalledTimes(2);
      expect(mockClient.executeScene).toHaveBeenNthCalledWith(1, blindConfig.openScene);
      expect(mockClient.executeScene).toHaveBeenNthCalledWith(2, blindConfig.closeScene);
    });

    it('should allow commands after previous fails', async () => {
      mockClient.executeScene.mockRejectedValueOnce(new Error('First failed'));

      await expect(blindAccessory.setTargetPosition(100)).rejects.toThrow();
      await blindAccessory.setTargetPosition(0);

      expect(mockClient.executeScene).toHaveBeenCalledTimes(2);
    });
  });

  describe('idempotent commands', () => {
    it('should allow repeated open commands', async () => {
      await blindAccessory.setTargetPosition(100);
      await blindAccessory.setTargetPosition(100);

      expect(mockClient.executeScene).toHaveBeenCalledTimes(2);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.OPEN);
    });

    it('should allow repeated close commands', async () => {
      await blindAccessory.setTargetPosition(0);
      await blindAccessory.setTargetPosition(0);

      expect(mockClient.executeScene).toHaveBeenCalledTimes(2);
      expect(blindAccessory.getCurrentPosition()).toBe(Position.CLOSED);
    });
  });
});
