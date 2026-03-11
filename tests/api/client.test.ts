import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../../src/api/client.js';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  TimeoutError,
} from '../../src/utils/errors.js';

// Mock config so we can run without real env vars
vi.mock('../../src/config.js', () => ({
  config: {
    apiUrl: 'https://api.fusemomo.com',
    apiKey: 'sk_test_mock_key_for_tests',
    timeout: 5000,
    logLevel: 'error',
    nodeEnv: 'production',
  },
}));

// Mock logger to silence output in tests
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('post()', () => {
    it('returns parsed JSON on 200', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ entity_id: 'abc-123', display_name: 'Test' }),
        text: async () => '',
      } as unknown as Response);

      const result = await apiClient.post<{ entity_id: string }>('/v1/entities/resolve', {
        identifiers: { email: 'test@example.com' },
      });

      expect(result.entity_id).toBe('abc-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws AuthenticationError on 401', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Invalid API key' }),
        json: async () => ({ message: 'Invalid API key' }),
      } as unknown as Response);

      await expect(
        apiClient.post('/v1/entities/resolve', { identifiers: { email: 'x@y.com' } }),
      ).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('throws NotFoundError on 404 without retry', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: 'Entity not found' }),
        json: async () => ({ message: 'Entity not found' }),
      } as unknown as Response);

      await expect(apiClient.get('/v1/entities/fake-uuid')).rejects.toBeInstanceOf(NotFoundError);
      // Should NOT have retried — only called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws RateLimitError on 429', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ message: 'Rate limit exceeded' }),
        json: async () => ({ message: 'Rate limit exceeded' }),
      } as unknown as Response);

      await expect(
        apiClient.post('/v1/entities/resolve', {}),
      ).rejects.toBeInstanceOf(RateLimitError);
    });

    it('retries on 500 and eventually throws ServerError', async () => {
      const mockFetch = vi.mocked(global.fetch);
      const serverResp = {
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ message: 'Internal server error' }),
        json: async () => ({ message: 'Internal server error' }),
      } as unknown as Response;

      // 3 failures = initial + 2 retries
      mockFetch
        .mockResolvedValueOnce(serverResp)
        .mockResolvedValueOnce(serverResp)
        .mockResolvedValueOnce(serverResp);

      await expect(
        apiClient.post('/v1/entities/resolve', {}),
      ).rejects.toBeInstanceOf(ServerError);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000); // Extended timeout for retry delays

    it('throws TimeoutError when AbortController fires', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('AbortError'), { name: 'AbortError' }));

      await expect(
        apiClient.post('/v1/entities/resolve', {}),
      ).rejects.toBeInstanceOf(TimeoutError);
    });
  });

  describe('get()', () => {
    it('correctly appends query params to URL', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'test' }),
        text: async () => '',
      } as unknown as Response);

      await apiClient.get('/v1/entities', { limit: '10', offset: '0' });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('offset=0');
    });
  });

  describe('patch()', () => {
    it('calls PATCH with correct method', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ was_followed: true, outcome: 'success' }),
        text: async () => '',
      } as unknown as Response);

      await apiClient.patch('/v1/recommends/abc/outcomes', { was_followed: true });

      const call = mockFetch.mock.calls[0];
      expect(call?.[1]?.method).toBe('PATCH');
    });
  });
});
