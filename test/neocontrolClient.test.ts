import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NeocontrolClient } from '../src/neocontrolClient.js';
import { createMockLogger } from './mocks/homebridge.mock.js';
import { createMockServer, type MockNeocontrolServer } from './mocks/neocontrolServer.mock.js';

describe('NeocontrolClient', () => {
  let server: MockNeocontrolServer;
  let client: NeocontrolClient;
  const mockLogger = createMockLogger();

  beforeEach(async () => {
    server = await createMockServer();
    client = new NeocontrolClient(
      server.baseUrl,
      '44:D5:F2:C1:03:AC', // MAC with colons
      3, // retryAttempts
      2000, // requestTimeout
      mockLogger as any,
    );
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('executeScene', () => {
    it('should execute scene successfully', async () => {
      server.setResponse({ statusCode: 200, body: 'OK' });

      await expect(client.executeScene(1)).resolves.toBeUndefined();

      expect(server.requestCount).toBe(1);
      const request = server.getLastRequest();
      expect(request?.url).toBe('/mqtt/command/44D5F2C103AC/1');
      expect(request?.method).toBe('GET');
    });

    it('should strip colons from MAC address in URL', async () => {
      await client.executeScene(5);

      const request = server.getLastRequest();
      // MAC should be without colons in URL
      expect(request?.url).toBe('/mqtt/command/44D5F2C103AC/5');
      expect(request?.url).not.toContain(':');
    });

    it('should include Content-Type header', async () => {
      await client.executeScene(0);

      const request = server.getLastRequest();
      expect(request?.headers['content-type']).toBe('application/json');
    });

    it('should retry on server error (5xx)', async () => {
      // Configure server to return 500 error
      server.setResponse({ statusCode: 500 });

      await expect(client.executeScene(1)).rejects.toThrow(
        'Failed to execute scene 1 after 3 attempts',
      );

      // Should have made 3 attempts
      expect(server.requestCount).toBe(3);
    });

    it('should throw after all retry attempts exhausted', async () => {
      server.setResponse({ statusCode: 500, body: 'Server Error' });

      await expect(client.executeScene(1)).rejects.toThrow(
        'Failed to execute scene 1 after 3 attempts',
      );

      expect(server.requestCount).toBe(3);
    });

    it('should handle timeout errors', async () => {
      // Set delay longer than client timeout
      server.setResponse({ delay: 5000 });

      await expect(client.executeScene(1)).rejects.toThrow('after 3 attempts');

      // Should have attempted retries
      expect(server.requestCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle network errors', async () => {
      server.setResponse({ networkError: true });

      await expect(client.executeScene(1)).rejects.toThrow('after 3 attempts');
    });

    it('should use exponential backoff between retries', async () => {
      server.setResponse({ statusCode: 500 });

      const startTime = Date.now();
      await expect(client.executeScene(1)).rejects.toThrow();
      const totalTime = Date.now() - startTime;

      // With 3 attempts and backoff of 1s, 2s, total should be at least ~3s
      // But first attempt is immediate, so: 0 + 1000 + 2000 = 3000ms minimum
      // Allow some tolerance
      expect(totalTime).toBeGreaterThanOrEqual(2500);
    });

    it('should log debug message on success', async () => {
      await client.executeScene(1);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Scene 1 executed successfully'),
      );
    });

    it('should log warning on retry', async () => {
      // Configure server to fail so we can test warning logs
      server.setResponse({ statusCode: 500 });

      await expect(client.executeScene(1)).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('URL construction', () => {
    it('should handle MAC without colons', async () => {
      const clientWithoutColons = new NeocontrolClient(
        server.baseUrl,
        '44D5F2C103AC', // MAC without colons
        1,
        2000,
        mockLogger as any,
      );

      await clientWithoutColons.executeScene(3);

      const request = server.getLastRequest();
      expect(request?.url).toBe('/mqtt/command/44D5F2C103AC/3');
    });

    it('should handle various scene numbers', async () => {
      await client.executeScene(0);
      expect(server.getLastRequest()?.url).toBe('/mqtt/command/44D5F2C103AC/0');

      server.clearRequests();
      await client.executeScene(99);
      expect(server.getLastRequest()?.url).toBe('/mqtt/command/44D5F2C103AC/99');
    });
  });
});
