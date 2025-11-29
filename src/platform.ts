import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { BlindAccessory } from './blindAccessory.js';
import { NeocontrolClient } from './neocontrolClient.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import type { BlindConfig, InteoSomfyBlindsConfig } from './types.js';
import { DEFAULT_ADVANCED_CONFIG, DEFAULT_BASE_URL } from './types.js';

/**
 * Platform plugin for Inteo/Neocontrol Somfy RTS blinds.
 *
 * This plugin discovers blinds from configuration and exposes them as
 * HomeKit WindowCovering accessories with binary control (open/closed/unknown).
 */
export class InteoSomfyBlindsPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  /**
   * Cached accessories restored by Homebridge from disk.
   * Used to avoid re-registering existing accessories.
   */
  private readonly cachedAccessories = new Map<string, PlatformAccessory>();

  /**
   * Track registered accessory UUIDs to detect removed accessories.
   */
  private readonly registeredUUIDs = new Set<string>();

  private readonly config: InteoSomfyBlindsConfig;

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    // Cast to our config type (validation happens in discoverDevices)
    this.config = config as InteoSomfyBlindsConfig;

    this.log.debug('Finished initializing platform:', this.config.name);

    // Homebridge fires this event when it has finished restoring cached accessories
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  /**
   * Called by Homebridge for each cached accessory restored from disk.
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.cachedAccessories.set(accessory.UUID, accessory);
  }

  /**
   * Discover and register accessories from configuration.
   */
  private discoverDevices(): void {
    // Validate configuration
    if (!this.validateConfig()) {
      return;
    }

    const baseUrl = this.config.baseUrl ?? DEFAULT_BASE_URL;
    const advancedConfig = {
      ...DEFAULT_ADVANCED_CONFIG,
      ...this.config.advanced,
    };

    // Create shared HTTP client for all blinds
    // Why shared: All blinds use same hub, so same base URL and auth
    const client = new NeocontrolClient(
      baseUrl,
      this.config.hubMac,
      advancedConfig.retryAttempts,
      advancedConfig.requestTimeout,
      this.log,
    );

    // Register each blind from config
    for (const blindConfig of this.config.blinds) {
      this.registerBlind(blindConfig, client);
    }

    // Remove accessories that are no longer in config
    this.removeStaleAccessories();
  }

  /**
   * Validate configuration and log helpful error messages.
   */
  private validateConfig(): boolean {
    if (!this.config.hubMac) {
      this.log.error('Configuration error: hubMac is required');
      return false;
    }

    if (!Array.isArray(this.config.blinds)) {
      this.log.error('Configuration error: blinds array is required');
      return false;
    }

    if (this.config.blinds.length === 0) {
      this.log.warn('No blinds configured');
      return false;
    }

    // Validate each blind config
    for (let i = 0; i < this.config.blinds.length; i++) {
      const blind = this.config.blinds[i];
      if (!blind) {
        this.log.error(`Configuration error: blind at index ${String(i)} is undefined`);
        return false;
      }
      if (!blind.name) {
        this.log.error(`Configuration error: blind at index ${String(i)} is missing name`);
        return false;
      }
      if (typeof blind.openScene !== 'number') {
        this.log.error(`Configuration error: blind "${blind.name}" is missing openScene`);
        return false;
      }
      if (typeof blind.closeScene !== 'number') {
        this.log.error(`Configuration error: blind "${blind.name}" is missing closeScene`);
        return false;
      }
    }

    return true;
  }

  /**
   * Register a single blind as a HomeKit accessory.
   */
  private registerBlind(blindConfig: BlindConfig, client: NeocontrolClient): void {
    // Generate unique ID from hub MAC + blind name
    // This ensures UUID is stable across restarts and unique per blind
    const uuid = this.api.hap.uuid.generate(`${this.config.hubMac}-${blindConfig.name}`);
    this.registeredUUIDs.add(uuid);

    // Check if accessory already exists in cache
    const existingAccessory = this.cachedAccessories.get(uuid);

    if (existingAccessory) {
      // Restore from cache
      this.log.info('Restoring existing accessory from cache:', blindConfig.name);
      new BlindAccessory(this, existingAccessory, blindConfig, client, this.log);
    } else {
      // Create new accessory
      this.log.info('Adding new accessory:', blindConfig.name);
      const accessory = new this.api.platformAccessory(blindConfig.name, uuid);

      // Store blind config in context for potential future use
      accessory.context = { blindConfig };

      new BlindAccessory(this, accessory, blindConfig, client, this.log);

      // Register with Homebridge
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  /**
   * Remove accessories that were previously registered but are no longer in config.
   *
   * Why: If user removes a blind from config, it should disappear from HomeKit.
   */
  private removeStaleAccessories(): void {
    for (const [uuid, accessory] of this.cachedAccessories) {
      if (!this.registeredUUIDs.has(uuid)) {
        this.log.info('Removing stale accessory:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
