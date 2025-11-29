import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InteoSomfyBlindsPlatform } from '../src/platform.js';
import { createMockLogger } from './mocks/homebridge.mock.js';

describe('InteoSomfyBlindsPlatform', () => {
  let mockApi: any;
  let mockLog: ReturnType<typeof createMockLogger>;
  let didFinishLaunchingCallback: (() => void) | null = null;

  const validConfig = {
    platform: 'InteoSomfyBlinds',
    name: 'Somfy Blinds',
    hubMac: '44:D5:F2:C1:03:AC',
    baseUrl: 'http://localhost:9999',
    blinds: [
      { name: 'Living Room', openScene: 1, closeScene: 0 },
      { name: 'Bedroom', openScene: 3, closeScene: 2 },
    ],
  };

  beforeEach(() => {
    mockLog = createMockLogger();
    didFinishLaunchingCallback = null;

    mockApi = {
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'didFinishLaunching') {
          didFinishLaunchingCallback = callback;
        }
      }),
      hap: {
        Service: {
          WindowCovering: 'WindowCovering',
          AccessoryInformation: 'AccessoryInformation',
        },
        Characteristic: {
          CurrentPosition: 'CurrentPosition',
          TargetPosition: 'TargetPosition',
          PositionState: { STOPPED: 2 },
          Manufacturer: 'Manufacturer',
          Model: 'Model',
          SerialNumber: 'SerialNumber',
          Name: 'Name',
        },
        uuid: {
          generate: vi.fn((input: string) => `uuid-${input}`),
        },
        HapStatusError: class extends Error {
          constructor(public status: number) {
            super();
          }
        },
        HAPStatus: {
          SERVICE_COMMUNICATION_FAILURE: -70402,
        },
      },
      registerPlatformAccessories: vi.fn(),
      unregisterPlatformAccessories: vi.fn(),
      platformAccessory: vi.fn((name: string, uuid: string) => ({
        displayName: name,
        UUID: uuid,
        context: {},
        getService: vi.fn(() => ({
          setCharacteristic: vi.fn().mockReturnThis(),
          getCharacteristic: vi.fn(() => ({
            onGet: vi.fn().mockReturnThis(),
            onSet: vi.fn().mockReturnThis(),
          })),
          updateCharacteristic: vi.fn().mockReturnThis(),
        })),
        addService: vi.fn(() => ({
          setCharacteristic: vi.fn().mockReturnThis(),
          getCharacteristic: vi.fn(() => ({
            onGet: vi.fn().mockReturnThis(),
            onSet: vi.fn().mockReturnThis(),
          })),
          updateCharacteristic: vi.fn().mockReturnThis(),
        })),
      })),
    };

    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should register didFinishLaunching listener', () => {
      new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      expect(mockApi.on).toHaveBeenCalledWith('didFinishLaunching', expect.any(Function));
    });

    it('should log debug message on initialization', () => {
      new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      expect(mockLog.debug).toHaveBeenCalledWith(
        'Finished initializing platform:',
        validConfig.name,
      );
    });
  });

  describe('configureAccessory', () => {
    it('should cache restored accessories', () => {
      const platform = new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      const mockAccessory = {
        displayName: 'Cached Blind',
        UUID: 'cached-uuid',
      };

      platform.configureAccessory(mockAccessory as any);

      expect(mockLog.info).toHaveBeenCalledWith('Loading accessory from cache:', 'Cached Blind');
    });
  });

  describe('device discovery', () => {
    it('should register accessories for each blind in config', () => {
      new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      // Trigger didFinishLaunching
      didFinishLaunchingCallback?.();

      // Each blind is registered separately (one call per blind)
      expect(mockApi.registerPlatformAccessories).toHaveBeenCalledTimes(2);
      expect(mockApi.registerPlatformAccessories).toHaveBeenCalledWith(
        'homebridge-inteo-somfy-blinds',
        'InteoSomfyBlinds',
        expect.any(Array),
      );
    });

    it('should generate unique UUIDs per blind', () => {
      new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      didFinishLaunchingCallback?.();

      expect(mockApi.hap.uuid.generate).toHaveBeenCalledWith(`${validConfig.hubMac}-Living Room`);
      expect(mockApi.hap.uuid.generate).toHaveBeenCalledWith(`${validConfig.hubMac}-Bedroom`);
    });

    it('should use default baseUrl if not provided', () => {
      const configWithoutBaseUrl = { ...validConfig };
      delete (configWithoutBaseUrl as any).baseUrl;

      new InteoSomfyBlindsPlatform(mockLog as any, configWithoutBaseUrl as any, mockApi);

      didFinishLaunchingCallback?.();

      // Should not throw and should register accessories
      expect(mockApi.registerPlatformAccessories).toHaveBeenCalled();
    });

    it('should restore cached accessories instead of creating new ones', () => {
      const platform = new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      // Simulate cached accessory
      const cachedAccessory = {
        displayName: 'Living Room',
        UUID: `uuid-${validConfig.hubMac}-Living Room`,
        context: {},
        getService: vi.fn(() => ({
          setCharacteristic: vi.fn().mockReturnThis(),
          getCharacteristic: vi.fn(() => ({
            onGet: vi.fn().mockReturnThis(),
            onSet: vi.fn().mockReturnThis(),
          })),
          updateCharacteristic: vi.fn().mockReturnThis(),
        })),
        addService: vi.fn(() => ({
          setCharacteristic: vi.fn().mockReturnThis(),
          getCharacteristic: vi.fn(() => ({
            onGet: vi.fn().mockReturnThis(),
            onSet: vi.fn().mockReturnThis(),
          })),
          updateCharacteristic: vi.fn().mockReturnThis(),
        })),
      };

      platform.configureAccessory(cachedAccessory as any);

      didFinishLaunchingCallback?.();

      expect(mockLog.info).toHaveBeenCalledWith(
        'Restoring existing accessory from cache:',
        'Living Room',
      );
    });
  });

  describe('configuration validation', () => {
    it('should log error if hubMac is missing', () => {
      const invalidConfig = { ...validConfig, hubMac: '' };

      new InteoSomfyBlindsPlatform(mockLog as any, invalidConfig as any, mockApi);
      didFinishLaunchingCallback?.();

      expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('hubMac is required'));
      expect(mockApi.registerPlatformAccessories).not.toHaveBeenCalled();
    });

    it('should log error if blinds array is missing', () => {
      const invalidConfig = { ...validConfig, blinds: undefined };

      new InteoSomfyBlindsPlatform(mockLog as any, invalidConfig as any, mockApi);
      didFinishLaunchingCallback?.();

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.stringContaining('blinds array is required'),
      );
    });

    it('should log warning if blinds array is empty', () => {
      const emptyConfig = { ...validConfig, blinds: [] };

      new InteoSomfyBlindsPlatform(mockLog as any, emptyConfig as any, mockApi);
      didFinishLaunchingCallback?.();

      expect(mockLog.warn).toHaveBeenCalledWith('No blinds configured');
    });

    it('should log error if blind is missing name', () => {
      const invalidConfig = {
        ...validConfig,
        blinds: [{ openScene: 1, closeScene: 0 }],
      };

      new InteoSomfyBlindsPlatform(mockLog as any, invalidConfig as any, mockApi);
      didFinishLaunchingCallback?.();

      expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('missing name'));
    });

    it('should log error if blind is missing openScene', () => {
      const invalidConfig = {
        ...validConfig,
        blinds: [{ name: 'Test', closeScene: 0 }],
      };

      new InteoSomfyBlindsPlatform(mockLog as any, invalidConfig as any, mockApi);
      didFinishLaunchingCallback?.();

      expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('missing openScene'));
    });

    it('should log error if blind is missing closeScene', () => {
      const invalidConfig = {
        ...validConfig,
        blinds: [{ name: 'Test', openScene: 1 }],
      };

      new InteoSomfyBlindsPlatform(mockLog as any, invalidConfig as any, mockApi);
      didFinishLaunchingCallback?.();

      expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('missing closeScene'));
    });
  });

  describe('stale accessory removal', () => {
    it('should remove accessories no longer in config', () => {
      const platform = new InteoSomfyBlindsPlatform(mockLog as any, validConfig as any, mockApi);

      // Simulate a cached accessory that's not in current config
      const staleAccessory = {
        displayName: 'Old Blind',
        UUID: 'stale-uuid',
        context: {},
        getService: vi.fn(),
        addService: vi.fn(),
      };

      platform.configureAccessory(staleAccessory as any);

      didFinishLaunchingCallback?.();

      expect(mockApi.unregisterPlatformAccessories).toHaveBeenCalledWith(
        'homebridge-inteo-somfy-blinds',
        'InteoSomfyBlinds',
        [staleAccessory],
      );
      expect(mockLog.info).toHaveBeenCalledWith('Removing stale accessory:', 'Old Blind');
    });
  });
});
