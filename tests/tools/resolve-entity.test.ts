import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleResolveEntity } from '../../src/tools/resolve-entity.js';

// Mock config
vi.mock('../../src/config.js', () => ({
  config: {
    apiUrl: 'https://api.fusemomo.com',
    apiKey: 'sk_test_mock_key',
    timeout: 5000,
    logLevel: 'error',
    nodeEnv: 'production',
  },
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEntityResponse = {
  entity_id: 'bbbb-1111-2222-3333',
  tenant_id: 'aaaa-0000-0000-0000',
  display_name: 'Alice Test',
  entity_type: 'contact',
  total_interactions: 5,
  successful_interactions: 4,
  last_interaction_at: '2026-03-01T10:00:00Z',
  preferred_action_type: 'send_email',
  behavioral_score: 0.8,
  metadata: {},
  created_at: '2026-01-01T00:00:00Z',
  identifiers: [
    {
      id: 'id-1',
      source: 'email',
      identifier_type: 'email',
      identifier_value: 'alice@example.com',
      confidence: 1.0,
      link_strategy: 'deterministic',
      verified_at: null,
    },
  ],
};

describe('handleResolveEntity', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns entity data on valid identifiers', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockEntityResponse,
      text: async () => '',
    } as unknown as Response);

    const result = await handleResolveEntity({
      identifiers: { email: 'alice@example.com' },
    });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);

    const content = result.content[0];
    expect(content?.type).toBe('text');
    if (content?.type === 'text') {
      const parsed = JSON.parse(content.text) as { entity_id: string };
      expect(parsed.entity_id).toBe('bbbb-1111-2222-3333');
    }
  });

  it('returns validation error when identifiers is empty', async () => {
    const result = await handleResolveEntity({ identifiers: {} });

    expect((result as { isError: boolean }).isError).toBe(true);
    const content = result.content[0];
    expect(content?.type).toBe('text');
    if (content?.type === 'text') {
      expect(content.text).toContain('Validation error');
    }
  });

  it('returns validation error when identifiers is missing', async () => {
    const result = await handleResolveEntity({});

    expect((result as { isError: boolean }).isError).toBe(true);
    const content = result.content[0];
    expect(content?.type).toBe('text');
    if (content?.type === 'text') {
      expect(content.text).toContain('Validation error');
    }
  });

  it('translates 401 API response to authentication error message', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'Invalid API key' }),
      json: async () => ({ message: 'Invalid API key' }),
    } as unknown as Response);

    const result = await handleResolveEntity({
      identifiers: { email: 'alice@example.com' },
    });

    expect((result as { isError: boolean }).isError).toBe(true);
    const content = result.content[0];
    if (content?.type === 'text') {
      expect(content.text).toContain('Authentication failed');
    }
  });

  it('translates 404 API response to not found message', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ message: 'Entity not found' }),
      json: async () => ({ message: 'Entity not found' }),
    } as unknown as Response);

    const result = await handleResolveEntity({
      identifiers: { email: 'missing@example.com' },
    });

    expect((result as { isError: boolean }).isError).toBe(true);
    const content = result.content[0];
    if (content?.type === 'text') {
      expect(content.text).toContain('not found');
    }
  });

  it('translates 429 to rate limit error message', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ message: 'Rate limit exceeded' }),
      json: async () => ({ message: 'Rate limit exceeded' }),
    } as unknown as Response);

    const result = await handleResolveEntity({
      identifiers: { email: 'alice@example.com' },
    });

    expect((result as { isError: boolean }).isError).toBe(true);
    const content = result.content[0];
    if (content?.type === 'text') {
      expect(content.text.toLowerCase()).toContain('rate limit');
    }
  });

  it('passes optional entity_type and display_name to the API', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ...mockEntityResponse, entity_type: 'repository', display_name: 'My Repo' }),
      text: async () => '',
    } as unknown as Response);

    const result = await handleResolveEntity({
      identifiers: { github_repo: 'fusemomo/api' },
      entity_type: 'repository',
      display_name: 'My Repo',
    });

    expect(result.isError).toBeUndefined();
    const content = result.content[0];
    if (content?.type === 'text') {
      const parsed = JSON.parse(content.text) as { entity_type: string };
      expect(parsed.entity_type).toBe('repository');
    }
  });
});
