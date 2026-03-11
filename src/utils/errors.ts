export class FusemomoError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'FusemomoError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends FusemomoError {
  constructor(message = 'Invalid API key', originalError?: unknown) {
    super(message, 'authentication_error', 401, originalError);
    this.name = 'AuthenticationError';
  }
}

export class PaymentRequiredError extends FusemomoError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'payment_required', 402, originalError);
    this.name = 'PaymentRequiredError';
  }
}

export class ValidationError extends FusemomoError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'validation_error', 400, originalError);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends FusemomoError {
  constructor(resource = 'Resource', originalError?: unknown) {
    super(`${resource} not found`, 'not_found', 404, originalError);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends FusemomoError {
  constructor(message = 'Rate limit exceeded', originalError?: unknown) {
    super(message, 'rate_limit_exceeded', 429, originalError);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends FusemomoError {
  constructor(timeoutMs: number, originalError?: unknown) {
    super(`Request timed out after ${timeoutMs}ms`, 'timeout', 0, originalError);
    this.name = 'TimeoutError';
  }
}

export class ServerError extends FusemomoError {
  constructor(message: string, statusCode = 500, originalError?: unknown) {
    super(`Fusemomo API error: ${message}`, 'server_error', statusCode, originalError);
    this.name = 'ServerError';
  }
}

//  HTTP Status → Error 

export function createErrorFromStatus(status: number, body: string): FusemomoError {
  let parsed: { message?: string; error?: string } = {};
  try {
    parsed = JSON.parse(body) as { message?: string; error?: string };
  } catch {
    // ignored — body may not be JSON
  }

  const msg = parsed.message ?? parsed.error ?? body;

  switch (status) {
    case 400:
      return new ValidationError(msg);
    case 401:
      return new AuthenticationError(msg);
    case 402:
      return new PaymentRequiredError(msg);
    case 404:
      return new NotFoundError(msg);
    case 429:
      return new RateLimitError(msg);
    default:
      if (status >= 500) return new ServerError(msg, status);
      return new FusemomoError(msg, 'http_error', status);
  }
}

//  MCP Error Response 

export interface MCPErrorResponse {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
}

export function translateErrorForMCP(error: unknown): MCPErrorResponse {
  const mkResp = (text: string): MCPErrorResponse => ({
    isError: true,
    content: [{ type: 'text', text }],
  });

  if (error instanceof AuthenticationError) {
    return mkResp(
      'Authentication failed. Please check your Fusemomo_API_KEY environment variable.',
    );
  }

  if (error instanceof PaymentRequiredError) {
    return mkResp(
      `Plan upgrade required: ${error.message}. Upgrade at https://Fusemomo.com/upgrade`,
    );
  }

  if (error instanceof RateLimitError) {
    return mkResp(`Rate limit exceeded. ${error.message}. Try again on the next billing cycle.`);
  }

  if (error instanceof ValidationError) {
    return mkResp(`Validation error: ${error.message}`);
  }

  if (error instanceof NotFoundError) {
    return mkResp(`Not found: ${error.message}`);
  }

  if (error instanceof TimeoutError) {
    return mkResp(
      `${error.message}. The Fusemomo API is slow or unreachable. Try again later.`,
    );
  }

  if (error instanceof ServerError) {
    return mkResp(
      `${error.message}. This is a server-side issue. Try again later.`,
    );
  }

  if (error instanceof Error) {
    return mkResp(`Unexpected error: ${error.message}`);
  }

  return mkResp('An unexpected error occurred. Please try again.');
}
