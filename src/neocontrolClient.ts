import type { Logger } from 'homebridge';

/**
 * Interface for Neocontrol hub communication.
 *
 * Why an interface: Enables mocking in tests and future implementations
 * (e.g., UDP local control in v2.0 roadmap) without changing consumers.
 */
export interface INeocontrolClient {
  executeScene(sceneId: number): Promise<void>;
}

/**
 * HTTP client for communicating with Neocontrol hub via cloud API.
 *
 * URL Format: {baseUrl}/mqtt/command/{hubMacNoColons}/{sceneId}
 * Example: http://iOS.neocontrolglobal.com:9151/mqtt/command/44D5F2C103AC/1
 */
export class NeocontrolClient implements INeocontrolClient {
  private readonly hubMacNoColons: string;

  constructor(
    private readonly baseUrl: string,
    hubMac: string,
    private readonly retryAttempts: number,
    private readonly requestTimeout: number,
    private readonly log: Logger,
  ) {
    // Strip colons from MAC for URL construction
    // Config accepts "44:D5:F2:C1:03:AC" for readability but API needs "44D5F2C103AC"
    this.hubMacNoColons = hubMac.replace(/:/g, '');
  }

  /**
   * Execute a scene on the Neocontrol hub.
   *
   * Implements retry with exponential backoff:
   * - Attempt 1: immediate
   * - Attempt 2: after 1s
   * - Attempt 3: after 2s
   * - Attempt 4: after 4s (if configured for 4 retries)
   *
   * @throws Error if all retry attempts fail
   */
  async executeScene(sceneId: number): Promise<void> {
    const url = `${this.baseUrl}/mqtt/command/${this.hubMacNoColons}/${String(sceneId)}`;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.fetchWithTimeout(url);
        this.log.debug(
          `Scene ${String(sceneId)} executed successfully on attempt ${String(attempt)}`,
        );
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log.warn(
          `Scene ${String(sceneId)} execution failed (attempt ${String(attempt)}/${String(this.retryAttempts)}): ${lastError.message}`,
        );

        // Don't wait after the last attempt
        if (attempt < this.retryAttempts) {
          const backoffMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
          await this.sleep(backoffMs);
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to execute scene ${String(sceneId)} after ${String(this.retryAttempts)} attempts: ${lastError?.message ?? 'unknown error'}`,
    );
  }

  /**
   * Fetch with timeout using AbortController.
   *
   * Why native fetch: Available in Node 18+, avoids axios dependency (400KB),
   * and the request is simple enough not to need a library.
   */
  private async fetchWithTimeout(url: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.requestTimeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${String(this.requestTimeout)}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
