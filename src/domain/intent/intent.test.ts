import {
  isValidIntentCode,
  normalizeIntentCode,
  isIntentSupported,
  isIntentPlanned,
  validateIntent,
  SUPPORTED_INTENT_CODES,
  PLANNED_INTENT_CODES,
  UNSUPPORTED_INTENT_CODES,
  PROFESSIONAL_CONTEXT_CODE,
  INTENT_I18N_KEYS,
  type Intent,
  type IntentCode,
} from "./types";

describe("intent domain model (KT-024)", () => {
  describe("isValidIntentCode", () => {
    test("accepts all supported intent codes", () => {
      expect(isValidIntentCode("build")).toBe(true);
      expect(isValidIntentCode("understand_parcel")).toBe(true);
    });

    test("accepts planned/placeholder codes", () => {
      expect(isValidIntentCode("pre_purchase")).toBe(true);
      expect(isValidIntentCode("existing_building_modification")).toBe(true);
    });

    test("accepts professional context marker", () => {
      expect(isValidIntentCode("professional")).toBe(true);
    });

    test("rejects arbitrary strings", () => {
      expect(isValidIntentCode("unknown")).toBe(false);
      expect(isValidIntentCode("")).toBe(false);
      expect(isValidIntentCode("build_new")).toBe(false);
    });

    test("rejects non-strings", () => {
      expect(isValidIntentCode(123)).toBe(false);
      expect(isValidIntentCode(null)).toBe(false);
      expect(isValidIntentCode(undefined)).toBe(false);
    });

    test("is type guard narrowing to IntentCode", () => {
      const raw: unknown = "build";
      if (isValidIntentCode(raw)) {
        const code: IntentCode = raw;
        expect(code).toBe("build");
      }
    });
  });

  describe("normalizeIntentCode", () => {
    test("normalizes hyphenated input to underscore", () => {
      expect(normalizeIntentCode("pre-purchase")).toBe("pre_purchase");
    });

    test("normalizes spaced input to underscore", () => {
      expect(normalizeIntentCode("pre purchase")).toBe("pre_purchase");
    });

    test("normalizes mixed separators", () => {
      expect(normalizeIntentCode("understand-parcel")).toBe("understand_parcel");
      expect(normalizeIntentCode("understand parcel")).toBe("understand_parcel");
    });

    test("preserves already-normalized codes", () => {
      expect(normalizeIntentCode("build")).toBe("build");
      expect(normalizeIntentCode("understand_parcel")).toBe("understand_parcel");
    });

    test("preserves camelCase-style codes that are valid", () => {
      expect(normalizeIntentCode("understand_parcel")).toBe("understand_parcel");
    });

    test("trims whitespace before normalizing", () => {
      expect(normalizeIntentCode("  build  ")).toBe("build");
      expect(normalizeIntentCode("  pre-purchase  ")).toBe("pre_purchase");
    });

    test("normalizes case to lowercase", () => {
      expect(normalizeIntentCode("Build")).toBe("build");
      expect(normalizeIntentCode("BUILD")).toBe("build");
      expect(normalizeIntentCode("Understand_Parcel")).toBe("understand_parcel");
    });

    test("returns undefined for unsupported input", () => {
      expect(normalizeIntentCode("factory")).toBeUndefined();
      expect(normalizeIntentCode("renovate")).toBeUndefined();
      expect(normalizeIntentCode("")).toBeUndefined();
    });
  });

  describe("SUPPORTED_INTENT_CODES", () => {
    test("includes only fully supported intent codes", () => {
      expect(SUPPORTED_INTENT_CODES.has("build")).toBe(true);
      expect(SUPPORTED_INTENT_CODES.has("understand_parcel")).toBe(true);
    });

    test("does not include planned codes", () => {
      expect(SUPPORTED_INTENT_CODES.has("pre_purchase")).toBe(false);
      expect(SUPPORTED_INTENT_CODES.has("existing_building_modification")).toBe(false);
    });

    test("does not include professional context marker", () => {
      expect(SUPPORTED_INTENT_CODES.has("professional")).toBe(false);
    });

    test("has exactly the supported codes", () => {
      expect(SUPPORTED_INTENT_CODES.size).toBe(2);
    });
  });

  describe("PLANNED_INTENT_CODES", () => {
    test("includes pre_purchase as planned (recognized but not yet implemented)", () => {
      expect(PLANNED_INTENT_CODES.has("pre_purchase")).toBe(true);
    });

    test("includes existing_building_modification as placeholder", () => {
      expect(PLANNED_INTENT_CODES.has("existing_building_modification")).toBe(true);
    });

    test("does not include supported codes", () => {
      expect(PLANNED_INTENT_CODES.has("build")).toBe(false);
      expect(PLANNED_INTENT_CODES.has("understand_parcel")).toBe(false);
    });

    test("does not include professional context marker", () => {
      expect(PLANNED_INTENT_CODES.has("professional")).toBe(false);
    });

    test("has exactly the planned codes", () => {
      expect(PLANNED_INTENT_CODES.size).toBe(2);
    });
  });

  describe("UNSUPPORTED_INTENT_CODES", () => {
    test("includes pre_purchase (recognized but not supported)", () => {
      expect(UNSUPPORTED_INTENT_CODES.has("pre_purchase")).toBe(true);
    });

    test("includes existing_building_modification", () => {
      expect(UNSUPPORTED_INTENT_CODES.has("existing_building_modification")).toBe(true);
    });

    test("does not include supported codes", () => {
      expect(UNSUPPORTED_INTENT_CODES.has("build")).toBe(false);
      expect(UNSUPPORTED_INTENT_CODES.has("understand_parcel")).toBe(false);
    });

    test("does not include professional context marker", () => {
      expect(UNSUPPORTED_INTENT_CODES.has("professional")).toBe(false);
    });

    test("equals PLANNED_INTENT_CODES contents", () => {
      expect(UNSUPPORTED_INTENT_CODES.size).toBe(PLANNED_INTENT_CODES.size);
      for (const code of PLANNED_INTENT_CODES) {
        expect(UNSUPPORTED_INTENT_CODES.has(code)).toBe(true);
      }
    });
  });

  describe("PROFESSIONAL_CONTEXT_CODE", () => {
    test("is professional", () => {
      expect(PROFESSIONAL_CONTEXT_CODE).toBe("professional");
    });
  });

  describe("INTENT_I18N_KEYS", () => {
    test("maps every intent code to an i18n key", () => {
      const allCodes: IntentCode[] = [
        "build",
        "pre_purchase",
        "understand_parcel",
        "existing_building_modification",
        "professional",
      ];
      for (const code of allCodes) {
        expect(INTENT_I18N_KEYS[code]).toBeDefined();
        expect(INTENT_I18N_KEYS[code].length).toBeGreaterThan(0);
      }
    });

    test("keys use intent. prefix", () => {
      const allCodes: IntentCode[] = [
        "build",
        "pre_purchase",
        "understand_parcel",
        "existing_building_modification",
        "professional",
      ];
      for (const code of allCodes) {
        expect(INTENT_I18N_KEYS[code]).toMatch(/^intent\./);
      }
    });

    test("build maps to intent.build", () => {
      expect(INTENT_I18N_KEYS.build).toBe("intent.build");
    });

    test("pre_purchase maps to intent.prePurchase", () => {
      expect(INTENT_I18N_KEYS.pre_purchase).toBe("intent.prePurchase");
    });

    test("understand_parcel maps to intent.understandParcel", () => {
      expect(INTENT_I18N_KEYS.understand_parcel).toBe("intent.understandParcel");
    });

    test("existing_building_modification maps to intent.existingBuildingModification", () => {
      expect(INTENT_I18N_KEYS.existing_building_modification).toBe(
        "intent.existingBuildingModification"
      );
    });

    test("professional maps to intent.professional", () => {
      expect(INTENT_I18N_KEYS.professional).toBe("intent.professional");
    });
  });

  describe("isIntentSupported", () => {
    test("returns true for supported codes", () => {
      expect(isIntentSupported("build")).toBe(true);
      expect(isIntentSupported("understand_parcel")).toBe(true);
    });

    test("returns false for planned codes (pre_purchase is not yet implemented)", () => {
      expect(isIntentSupported("pre_purchase")).toBe(false);
    });

    test("returns false for unsupported placeholder codes", () => {
      expect(isIntentSupported("existing_building_modification")).toBe(false);
    });

    test("returns false for professional context marker", () => {
      expect(isIntentSupported("professional")).toBe(false);
    });
  });

  describe("isIntentPlanned", () => {
    test("returns true for planned codes", () => {
      expect(isIntentPlanned("pre_purchase")).toBe(true);
      expect(isIntentPlanned("existing_building_modification")).toBe(true);
    });

    test("returns false for supported codes", () => {
      expect(isIntentPlanned("build")).toBe(false);
      expect(isIntentPlanned("understand_parcel")).toBe(false);
    });

    test("returns false for professional context marker", () => {
      expect(isIntentPlanned("professional")).toBe(false);
    });
  });

  describe("validateIntent", () => {
    const makeValidIntent = (overrides: Partial<Intent> = {}): Intent => ({
      code: "build",
      createdAt: "2026-08-15T00:00:00Z",
      ...overrides,
    });

    test("returns valid for a complete intent", () => {
      const result = validateIntent(makeValidIntent());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns valid for intent with updatedAt", () => {
      const result = validateIntent(makeValidIntent({ updatedAt: "2026-08-16T12:00:00Z" }));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("returns valid for all supported codes", () => {
      for (const code of SUPPORTED_INTENT_CODES) {
        const result = validateIntent(makeValidIntent({ code }));
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    test("returns valid for planned codes (recognized, not supported)", () => {
      for (const code of PLANNED_INTENT_CODES) {
        const result = validateIntent(makeValidIntent({ code }));
        expect(result.valid).toBe(true);
      }
    });

    test("returns valid for professional context code", () => {
      const result = validateIntent(makeValidIntent({ code: "professional" }));
      expect(result.valid).toBe(true);
    });

    test("rejects null input", () => {
      const result = validateIntent(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("intent");
    });

    test("rejects undefined input", () => {
      const result = validateIntent(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("intent");
    });

    test("rejects non-object input (number)", () => {
      const result = validateIntent(123);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("intent");
    });

    test("rejects non-object input (string)", () => {
      const result = validateIntent("build");
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("intent");
    });

    test("rejects array input", () => {
      const result = validateIntent([{ code: "build" }]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("intent");
    });

    test("rejects empty object (missing code)", () => {
      const result = validateIntent({});
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
    });

    test("rejects non-string code at runtime", () => {
      const result = validateIntent({ code: 123, createdAt: "2026-08-15T00:00:00Z" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
    });

    test("rejects non-string createdAt at runtime", () => {
      const result = validateIntent({ code: "build", createdAt: 1234567890 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("rejects non-string updatedAt at runtime", () => {
      const result = validateIntent({
        code: "build",
        createdAt: "2026-08-15T00:00:00Z",
        updatedAt: 1234567890,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "updatedAt")).toBe(true);
    });

    test("requires code", () => {
      const result = validateIntent(makeValidIntent({ code: "" as unknown as Intent["code"] }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
    });

    test("rejects invalid code", () => {
      const result = validateIntent(
        makeValidIntent({ code: "unknown" as unknown as Intent["code"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
    });

    test("requires createdAt", () => {
      const result = validateIntent(makeValidIntent({ createdAt: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("rejects invalid createdAt timestamp", () => {
      const result = validateIntent(makeValidIntent({ createdAt: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("rejects invalid updatedAt timestamp", () => {
      const result = validateIntent(makeValidIntent({ updatedAt: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "updatedAt")).toBe(true);
    });

    test("accepts valid updatedAt timestamp", () => {
      const result = validateIntent(makeValidIntent({ updatedAt: "2026-08-16T12:00:00Z" }));
      expect(result.valid).toBe(true);
    });

    test("code error message lists all valid codes", () => {
      const result = validateIntent(
        makeValidIntent({ code: "invalid_code" as unknown as Intent["code"] })
      );
      expect(result.errors.some((e) => e.field === "code")).toBe(true);
      const codeError = result.errors.find((e) => e.field === "code")!;
      expect(codeError.message).toContain("build");
      expect(codeError.message).toContain("pre_purchase");
      expect(codeError.message).toContain("understand_parcel");
      expect(codeError.message).toContain("existing_building_modification");
      expect(codeError.message).toContain("professional");
    });

    test("empty createdAt string produces error", () => {
      const result = validateIntent(makeValidIntent({ createdAt: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("createdAt");
    });
  });
});
