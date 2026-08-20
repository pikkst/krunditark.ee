export interface RetryOptions {
  maxAttempts: number;
  retryableStatuses: Set<number>;
  timeoutMs: number;
}

export class RetryableError extends Error {
  constructor(
    public status: number,
    message?: string
  ) {
    super(message ?? `Retryable error with status ${status}`);
    this.name = "RetryableError";
  }
}

export class NonRetryableError extends Error {
  constructor(
    public status: number,
    message?: string
  ) {
    super(message ?? `Non-retryable error with status ${status}`);
    this.name = "NonRetryableError";
  }
}

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, retryableStatuses, timeoutMs } = options;

  async function attempt(attemptNumber: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        if (attemptNumber < maxAttempts) {
          return attempt(attemptNumber + 1);
        }
        throw err;
      }

      if (err instanceof RetryableError && retryableStatuses.has(err.status)) {
        if (attemptNumber < maxAttempts) {
          return attempt(attemptNumber + 1);
        }
        throw new NonRetryableError(err.status, err.message);
      }

      throw err;
    }
  }

  return attempt(1);
}
