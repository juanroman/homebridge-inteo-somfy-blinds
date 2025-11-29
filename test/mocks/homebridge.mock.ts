import { vi } from 'vitest';

/**
 * Mock Homebridge Logger for testing.
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
    success: vi.fn(),
  };
}

/**
 * Mock HAP Characteristic values.
 */
export const mockCharacteristic = {
  CurrentPosition: 'CurrentPosition',
  TargetPosition: 'TargetPosition',
  PositionState: {
    DECREASING: 0,
    INCREASING: 1,
    STOPPED: 2,
  },
  Manufacturer: 'Manufacturer',
  Model: 'Model',
  SerialNumber: 'SerialNumber',
  Name: 'Name',
};

/**
 * Mock HAP Service types.
 */
export const mockService = {
  WindowCovering: 'WindowCovering',
  AccessoryInformation: 'AccessoryInformation',
};

/**
 * Mock HAP Status codes.
 */
export const mockHAPStatus = {
  SERVICE_COMMUNICATION_FAILURE: -70402,
};

/**
 * Mock HapStatusError class.
 */
export class MockHapStatusError extends Error {
  constructor(public readonly hapStatus: number) {
    super(`HAP Status Error: ${String(hapStatus)}`);
    this.name = 'HapStatusError';
  }
}

/**
 * Create a mock characteristic with onGet/onSet handlers.
 */
export function createMockCharacteristic() {
  const handlers: {
    get?: () => unknown;
    set?: (value: unknown) => Promise<void>;
  } = {};

  const characteristic = {
    onGet: vi.fn((handler: () => unknown) => {
      handlers.get = handler;
      return characteristic;
    }),
    onSet: vi.fn((handler: (value: unknown) => Promise<void>) => {
      handlers.set = handler;
      return characteristic;
    }),
    // Helper to invoke handlers in tests
    _handlers: handlers,
  };

  return characteristic;
}

/**
 * Create a mock service with getCharacteristic.
 */
export function createMockService() {
  const characteristics = new Map<string, ReturnType<typeof createMockCharacteristic>>();

  const service = {
    getCharacteristic: vi.fn((name: string) => {
      if (!characteristics.has(name)) {
        characteristics.set(name, createMockCharacteristic());
      }
      return characteristics.get(name)!;
    }),
    setCharacteristic: vi.fn(() => service),
    updateCharacteristic: vi.fn(() => service),
    _characteristics: characteristics,
  };

  return service;
}

/**
 * Create a mock platform accessory.
 */
export function createMockAccessory(displayName: string, uuid: string) {
  const services = new Map<string, ReturnType<typeof createMockService>>();
  let infoService: ReturnType<typeof createMockService> | undefined;

  const accessory = {
    displayName,
    UUID: uuid,
    context: {} as Record<string, unknown>,
    getService: vi.fn((serviceType: string) => {
      if (serviceType === mockService.AccessoryInformation) {
        infoService ??= createMockService();
        return infoService;
      }
      return services.get(serviceType);
    }),
    addService: vi.fn((serviceType: string) => {
      const service = createMockService();
      services.set(serviceType, service);
      return service;
    }),
    _services: services,
  };

  return accessory;
}

/**
 * Create a mock platform with all required properties.
 */
export function createMockPlatform() {
  const platform = {
    Service: mockService,
    Characteristic: mockCharacteristic,
    api: {
      hap: {
        HapStatusError: MockHapStatusError,
        HAPStatus: mockHAPStatus,
        uuid: {
          generate: vi.fn((input: string) => `uuid-${input}`),
        },
      },
      registerPlatformAccessories: vi.fn(),
      unregisterPlatformAccessories: vi.fn(),
      platformAccessory: vi.fn((name: string, uuid: string) => createMockAccessory(name, uuid)),
    },
    log: createMockLogger(),
  };

  return platform;
}

/**
 * Create a mock INeocontrolClient.
 */
export function createMockNeocontrolClient() {
  return {
    executeScene: vi.fn().mockResolvedValue(undefined),
  };
}
