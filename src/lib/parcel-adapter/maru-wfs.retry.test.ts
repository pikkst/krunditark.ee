import { describe, test, expect } from "vitest";
import { withRetry, RetryableError } from "./retry";

describe("retry policy (KT-033)", () => {
  test("retries transient AbortError then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async (_signal) => {
        calls++;
        if (calls === 1) {
          const err = new Error("aborted");
          err.name = "AbortError";
          throw err;
        }
        return "success";
      },
      {
        maxAttempts: 2,
        retryableStatuses: new Set(),
        timeoutMs: 1000,
      }
    );

    expect(result).toBe("success");
    expect(calls).toBe(2);
  });

  test("retries transient RetryableError then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async (_signal) => {
        calls++;
        if (calls === 1) {
          throw new RetryableError(502, "bad gateway");
        }
        return "success";
      },
      {
        maxAttempts: 2,
        retryableStatuses: new Set([502]),
        timeoutMs: 1000,
      }
    );

    expect(result).toBe("success");
    expect(calls).toBe(2);
  });

  test("exhausts retries and throws", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async (_signal) => {
          calls++;
          throw new RetryableError(502, "bad gateway");
        },
        {
          maxAttempts: 2,
          retryableStatuses: new Set([502]),
          timeoutMs: 1000,
        }
      )
    ).rejects.toThrow();

    expect(calls).toBe(2);
  });

  test("does not retry non-retryable error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async (_signal) => {
          calls++;
          throw new Error("bad-request");
        },
        {
          maxAttempts: 3,
          retryableStatuses: new Set([502]),
          timeoutMs: 1000,
        }
      )
    ).rejects.toThrow("bad-request");

    expect(calls).toBe(1);
  });

  test("passes AbortSignal to wrapped function", async () => {
    let receivedSignal: AbortSignal | undefined;
    const result = await withRetry(
      async (signal) => {
        receivedSignal = signal;
        return "ok";
      },
      {
        maxAttempts: 1,
        retryableStatuses: new Set(),
        timeoutMs: 1000,
      }
    );

    expect(result).toBe("ok");
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal?.aborted).toBe(false);
  });

  test("aborts wrapped function on timeout", async () => {
    let aborted = false;
    await expect(
      withRetry(
        async (signal) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 2000);
            signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new Error("aborted"));
            });
          });
          return "too late";
        },
        {
          maxAttempts: 1,
          retryableStatuses: new Set(),
          timeoutMs: 100,
        }
      )
    ).rejects.toThrow();

    expect(aborted).toBe(true);
  });
});
