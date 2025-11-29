import type { API } from 'homebridge';

import { InteoSomfyBlindsPlatform } from './platform.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

/**
 * Plugin entry point called by Homebridge during startup.
 *
 * Registers our platform with Homebridge so it can instantiate it
 * when the user has configured the plugin.
 */
export default (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, InteoSomfyBlindsPlatform);
};

// Re-export for consumers who might import directly
export { InteoSomfyBlindsPlatform } from './platform.js';
export type { InteoSomfyBlindsConfig, BlindConfig } from './types.js';
