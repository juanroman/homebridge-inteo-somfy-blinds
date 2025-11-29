import type { CharacteristicValue, Logger, PlatformAccessory, Service } from 'homebridge';

import type { INeocontrolClient } from './neocontrolClient.js';
import type { InteoSomfyBlindsPlatform } from './platform.js';
import type { BlindConfig } from './types.js';
import { Position } from './types.js';

/**
 * Accessory handler for a single Somfy RTS blind.
 *
 * Implements binary control (open/closed/unknown) since Somfy RTS motors
 * have no position feedback. Commands are idempotent - sending "open" to
 * an already-open blind is safe (motor ignores it).
 */
export class BlindAccessory {
  private readonly service: Service;

  /**
   * Current known position of the blind.
   *
   * Why start at 50 (unknown): We can't query the actual position from
   * Somfy RTS motors. Starting at 50% honestly represents uncertainty
   * rather than falsely claiming 0% or 100%.
   */
  private currentPosition: number = Position.UNKNOWN;
  private targetPosition: number = Position.UNKNOWN;

  /**
   * Prevents concurrent command execution.
   *
   * Why: Sending multiple commands simultaneously could cause race conditions
   * in state updates and confuse the motor with rapid command sequences.
   */
  private isExecuting = false;

  constructor(
    private readonly platform: InteoSomfyBlindsPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly blindConfig: BlindConfig,
    private readonly client: INeocontrolClient,
    private readonly log: Logger,
  ) {
    // Set accessory information
    const infoService = this.accessory.getService(this.platform.Service.AccessoryInformation);
    if (infoService) {
      infoService
        .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Somfy')
        .setCharacteristic(this.platform.Characteristic.Model, 'RTS Blind')
        .setCharacteristic(
          this.platform.Characteristic.SerialNumber,
          `${String(blindConfig.openScene)}-${String(blindConfig.closeScene)}`,
        );
    }

    // Get or create WindowCovering service
    this.service =
      this.accessory.getService(this.platform.Service.WindowCovering) ??
      this.accessory.addService(this.platform.Service.WindowCovering);

    this.service.setCharacteristic(this.platform.Characteristic.Name, blindConfig.name);

    // Register characteristic handlers
    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .onGet(this.getCurrentPosition.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetPosition)
      .onGet(this.getTargetPosition.bind(this))
      .onSet(this.setTargetPosition.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.PositionState)
      .onGet(this.getPositionState.bind(this));
  }

  /**
   * Returns current position (0, 50, or 100).
   */
  getCurrentPosition(): CharacteristicValue {
    return this.currentPosition;
  }

  /**
   * Returns target position (0, 50, or 100).
   */
  getTargetPosition(): CharacteristicValue {
    return this.targetPosition;
  }

  /**
   * Position state is always STOPPED since we don't track movement.
   *
   * Why: Somfy RTS has no feedback, so we can't know if blind is moving.
   * Reporting STOPPED is honest - we don't animate fake movement.
   */
  getPositionState(): CharacteristicValue {
    return this.platform.Characteristic.PositionState.STOPPED;
  }

  /**
   * Handle HomeKit requests to set blind position.
   *
   * Binary control logic (per PRD):
   * - target > 50 → execute open scene → position becomes 100
   * - target < 50 → execute close scene → position becomes 0
   * - target === 50 → do nothing (can't command "unknown")
   *
   * On failure, position reverts to 50 (unknown) since we can't verify
   * whether the command partially executed.
   */
  async setTargetPosition(value: CharacteristicValue): Promise<void> {
    const target = value as number;

    // Ignore requests to set position to 50 (unknown state)
    // This can happen if user drags slider to middle
    if (target === Position.UNKNOWN) {
      this.log.debug(`${this.blindConfig.name}: Ignoring target position 50 (unknown)`);
      return;
    }

    // Prevent concurrent commands
    if (this.isExecuting) {
      this.log.debug(`${this.blindConfig.name}: Command already in progress, ignoring`);
      return;
    }

    this.isExecuting = true;
    this.targetPosition = target;

    try {
      if (target > Position.UNKNOWN) {
        // Open the blind
        this.log.info(
          `${this.blindConfig.name}: Opening (scene ${String(this.blindConfig.openScene)})`,
        );
        await this.client.executeScene(this.blindConfig.openScene);
        this.currentPosition = Position.OPEN;
        this.targetPosition = Position.OPEN;
      } else {
        // Close the blind
        this.log.info(
          `${this.blindConfig.name}: Closing (scene ${String(this.blindConfig.closeScene)})`,
        );
        await this.client.executeScene(this.blindConfig.closeScene);
        this.currentPosition = Position.CLOSED;
        this.targetPosition = Position.CLOSED;
      }

      this.log.debug(
        `${this.blindConfig.name}: Command succeeded, position now ${String(this.currentPosition)}%`,
      );
    } catch (error) {
      // Revert to unknown state on failure
      // Why: We can't know if command partially executed or not
      this.currentPosition = Position.UNKNOWN;
      this.targetPosition = Position.UNKNOWN;

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log.error(
        `${this.blindConfig.name}: Command failed, reverting to unknown: ${errorMessage}`,
      );

      // Throw HAP error so HomeKit shows "No Response" briefly
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    } finally {
      this.isExecuting = false;
      this.updateCharacteristics();
    }
  }

  /**
   * Push updated values to HomeKit.
   */
  private updateCharacteristics(): void {
    this.service.updateCharacteristic(
      this.platform.Characteristic.CurrentPosition,
      this.currentPosition,
    );
    this.service.updateCharacteristic(
      this.platform.Characteristic.TargetPosition,
      this.targetPosition,
    );
  }

  /**
   * Expose service for testing purposes.
   */
  getService(): Service {
    return this.service;
  }
}
