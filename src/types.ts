import type { PlatformConfig } from 'homebridge';

/**
 * Configuration for a single blind.
 *
 * Scene numbers are 0-indexed based on creation order in the Inteo app,
 * NOT the alphabetical display order. This is a common source of confusion.
 */
export interface BlindConfig {
  /** Display name in HomeKit (e.g., "Living Room Blinds") */
  name: string;
  /** Scene number that opens this blind (0-indexed by creation order) */
  openScene: number;
  /** Scene number that closes this blind (0-indexed by creation order) */
  closeScene: number;
}

/**
 * Advanced configuration options with sensible defaults.
 */
export interface AdvancedConfig {
  /** Number of retry attempts on failure (default: 4) */
  retryAttempts: number;
  /** Command timeout in milliseconds (default: 500) */
  requestTimeout: number;
}

/**
 * Full platform configuration as stored in Homebridge config.json.
 */
export interface InteoSomfyBlindsConfig extends PlatformConfig {
  platform: 'InteoSomfyBlinds';
  /** Hub MAC address (with or without colons, e.g., "44:D5:F2:C1:03:AC" or "44D5F2C103AC") */
  hubMac: string;
  /** Array of blind configurations */
  blinds: BlindConfig[];
  /** Optional advanced settings */
  advanced?: Partial<AdvancedConfig>;
}

/**
 * Default values for advanced configuration.
 *
 * Why these values:
 * - 4 retries: UDP on local LAN is fast; more retries cover occasional hub radio gaps
 * - 500ms timeout: Hub ACKs arrive in <100ms on LAN; 500ms is generous without feeling slow
 */
export const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  retryAttempts: 4,
  requestTimeout: 500,
};

/**
 * Position constants for the binary control model.
 *
 * Why 50 for unknown: HomeKit sliders show 0-100. Using 50% honestly represents
 * that we don't know the actual position (after restart, error, or first launch).
 * This avoids the lie of claiming 0% or 100% when we can't verify it.
 */
export const Position = {
  CLOSED: 0,
  UNKNOWN: 50,
  OPEN: 100,
} as const;

export type PositionValue = (typeof Position)[keyof typeof Position];
