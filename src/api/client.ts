import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  createErrorFromStatus,
  ServerError,
  TimeoutError,
} from '../utils/errors.js';

const USER_AGENT = 'fusemomo-mcp-server/1.0.0';
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000];

//  Retry helpers 

function isRetryable(status: number): boolean {
  return status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//  Core request 

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(path, config.apiUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    'User-Agent': USER_AGENT,
  };

  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

  logger.debug(`API Request: ${method} ${path}`, {
    url: url.toString(),
    body: body !== undefined ? '[body present]' : undefined,
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const startMs = Date.now();

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        ...(bodyStr !== undefined && { body: bodyStr }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startMs;
      logger.debug(`API Response: ${response.status}`, { time_ms: elapsed, path });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const error = createErrorFromStatus(response.status, text);

        // 4xx errors are permanent — never retry
        if (!isRetryable(response.status)) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS_MS[attempt] ?? 2000;
          logger.warn(`Retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`, {
            status: response.status,
            path,
          });
          lastError = error;
          await sleep(delay);
          continue;
        }

        throw error;
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // AbortController fired → timeout
      if (
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.includes('abort'))
      ) {
        throw new TimeoutError(config.timeout, err);
      }

      // Already a FusemomoError coming from createErrorFromStatus — re-throw
      if (
        err instanceof Error &&
        err.constructor.name !== 'TypeError' &&
        err.constructor.name !== 'FetchError'
      ) {
        // Check if it's already typed (non-network) before re-throwing
        const isTypedError =
          'statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number';

        if (isTypedError && !(err as { statusCode: number }).statusCode.toString().startsWith('5')) {
          throw err;
        }
        if (isTypedError) {
          lastError = err;
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS_MS[attempt] ?? 2000;
            await sleep(delay);
            continue;
          }
          throw err;
        }
        throw err;
      }

      // Network error (TypeError: fetch failed, etc.) — retry
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 2000;
        logger.warn(`Network error, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`, {
          path,
        });
        await sleep(delay);
        continue;
      }

      throw new ServerError('Failed to connect to Fusemomo API', 0, err);
    }
  }

  throw lastError ?? new ServerError('Request failed after retries');
}

//  Public API 

export const apiClient = {
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>('GET', path, undefined, params);
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  del<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
