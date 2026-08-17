import {
  isValidIntentCode,
  normalizeIntentCode,
  isIntentSupported,
  validateIntent,
  SUPPORTED_INTENT_CODES,
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
      expect(isValidIntentCode("pre_purchase")).toBe(true);
      expect(isValidIntentCode("understand_parcel")).toBe(true);
    });

    test("accepts unsupported/placeholder codes", () => {
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

    test("returns undefined for unsupported input", () => {
      expect(normalizeIntentCode("factory")).toBeUndefined();
      expect(normalizeIntentCode("renovate")).toBeUndefined();
      expect(normalizeIntentCode("")).toBeUndefined();
    });

    test("returns undefined for case variations that do not match", () => {
      expect(normalizeIntentCode("Build")).toBe("build");
      expect(normalizeIntentCode("BUILD")).toBe("build");
    });
  });

  describe("SUPPORTED_INTENT_CODES", () => {
    test("includes all fully supported intent codes", () => {
      expect(SUPPORTED_INTENT_CODES.has("build")).toBe(true);
      expect(SUPPORTED_INTENT_CODES.has("pre_purchase")).toBe(true);
      expect(SUPPORTED_INTENT_CODES.has("understand_parcel")).toBe(true);
    });

    test("does not include unsupported codes", () => {
      expect(SUPPORTED_INTENT_CODES.has("existing_building_modification")).toBe(false);
      expect(SUPPORTED_INTENT_CODES.has("professional")).toBe(false);
    });

    test("has exactly the supported codes", () => {
      expect(SUPPORTED_INTENT_CODES.size).toBe(3);
    });
  });

  describe("UNSUPPORTED_INTENT_CODES", () => {
    test("includes existing_building_modification as placeholder", () => {
      expect(UNSUPPORTED_INTENT_CODES.has("existing_building_modification")).toBe(true);
    });

    test("does not include professional (context marker, not unsupported)", () => {
      expect(UNSUPPORTED_INTENT_CODES.has("professional")).toBe(false);
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
      expect(isIntentSupported("pre_purchase")).toBe(true);
      expect(isIntentSupported("understand_parcel")).toBe(true);
    });

    test("returns false for unsupported placeholder codes", () => {
      expect(isIntentSupported("existing_building_modification")).toBe(false);
    });

    test("returns false for professional context marker", () => {
      expect(isIntentSupported("professional")).toBe(false);
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

    test("returns valid for unsupported placeholder code", () => {
      const result = validateIntent(makeValidIntent({ code: "existing_building_modification" }));
      expect(result.valid).toBe(true);
    });

    test("returns valid for professional context code", () => {
      const result = validateIntent(makeValidIntent({ code: "professional" }));
      expect(result.valid).toBe(true);
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
