import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

/**
 * Configuration for the mock server's response behavior.
 */
export interface MockServerConfig {
  /** HTTP status code to return (default: 200) */
  statusCode?: number;
  /** Response body (default: 'OK') */
  body?: string;
  /** Delay in ms before responding (for timeout testing) */
  delay?: number;
  /** Simulate network error instead of responding */
  networkError?: boolean;
}

/**
 * Recorded request information for assertions.
 */
export interface RecordedRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  timestamp: Date;
}

/**
 * Mock Neocontrol HTTP server for testing.
 *
 * Simulates the real API at /mqtt/command/{mac}/{scene}
 * with configurable responses for testing various scenarios.
 */
export class MockNeocontrolServer {
  private server: Server | null = null;
  private config: MockServerConfig = { statusCode: 200, body: 'OK' };
  private requests: RecordedRequest[] = [];
  private _port = 0;

  /**
   * Start the mock server on a random available port.
   */
  async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', reject);

      // Listen on port 0 to get a random available port
      this.server.listen(0, '127.0.0.1', () => {
        const address = this.server?.address();
        if (address && typeof address === 'object') {
          this._port = address.port;
          resolve(this._port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });
    });
  }

  /**
   * Stop the mock server.
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the port the server is listening on.
   */
  get port(): number {
    return this._port;
  }

  /**
   * Get the base URL for the mock server.
   */
  get baseUrl(): string {
    return `http://127.0.0.1:${String(this._port)}`;
  }

  /**
   * Configure how the server should respond to requests.
   */
  setResponse(config: MockServerConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset to default successful response.
   */
  resetResponse(): void {
    this.config = { statusCode: 200, body: 'OK' };
  }

  /**
   * Get all recorded requests.
   */
  getRequests(): RecordedRequest[] {
    return [...this.requests];
  }

  /**
   * Get the last recorded request.
   */
  getLastRequest(): RecordedRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  /**
   * Clear recorded requests.
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Get the count of recorded requests.
   */
  get requestCount(): number {
    return this.requests.length;
  }

  /**
   * Handle incoming HTTP requests.
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // Record the request
    this.requests.push({
      method: req.method ?? 'GET',
      url: req.url ?? '/',
      headers: req.headers as Record<string, string | string[] | undefined>,
      timestamp: new Date(),
    });

    // Simulate network error
    if (this.config.networkError) {
      req.socket.destroy();
      return;
    }

    // Apply delay if configured
    const respond = (): void => {
      res.statusCode = this.config.statusCode ?? 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(this.config.body ?? 'OK');
    };

    if (this.config.delay && this.config.delay > 0) {
      setTimeout(respond, this.config.delay);
    } else {
      respond();
    }
  }
}

/**
 * Helper to create and start a mock server for a test.
 */
export async function createMockServer(): Promise<MockNeocontrolServer> {
  const server = new MockNeocontrolServer();
  await server.start();
  return server;
}
