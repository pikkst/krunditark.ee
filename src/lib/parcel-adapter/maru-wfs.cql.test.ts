import { describe, test, expect } from "vitest";
import { toProviderCadastralRef } from "./maru-wfs.utils";

describe("CQL filter construction (KT-033)", () => {
  test("preserves colon-separated format for valid 12-digit ID", () => {
    const normalized = "784011013143";
    const providerRef = toProviderCadastralRef(normalized);
    expect(providerRef).toBe("78401:101:3143");
    expect(providerRef).not.toBe("784011013143");
  });

  test("handles leading zeros correctly", () => {
    const normalized = "260010010640";
    const providerRef = toProviderCadastralRef(normalized);
    expect(providerRef).toBe("26001:001:0640");
  });
});
