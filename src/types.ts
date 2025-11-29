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
  /** Number of retry attempts on failure (default: 3) */
  retryAttempts: number;
  /** HTTP request timeout in milliseconds (default: 5000) */
  requestTimeout: number;
}

/**
 * Full platform configuration as stored in Homebridge config.json.
 */
export interface InteoSomfyBlindsConfig extends PlatformConfig {
  platform: 'InteoSomfyBlinds';
  /** Hub MAC address (with or without colons, e.g., "44:D5:F2:C1:03:AC" or "44D5F2C103AC") */
  hubMac: string;
  /** Base URL for Neocontrol API (default: "http://iOS.neocontrolglobal.com:9151") */
  baseUrl?: string;
  /** Array of blind configurations */
  blinds: BlindConfig[];
  /** Optional advanced settings */
  advanced?: Partial<AdvancedConfig>;
}

/**
 * Default values for advanced configuration.
 *
 * Why these values:
 * - 3 retries: Balances reliability with not waiting too long on persistent failures
 * - 5000ms timeout: The PRD specifies <5s response time as a requirement
 */
export const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  retryAttempts: 3,
  requestTimeout: 5000,
};

/**
 * Default base URL for the Neocontrol cloud API.
 */
export const DEFAULT_BASE_URL = 'http://iOS.neocontrolglobal.com:9151';

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
