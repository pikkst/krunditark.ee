export type IntentCode =
  | "build"
  | "pre_purchase"
  | "understand_parcel"
  | "existing_building_modification"
  | "professional";

export interface IntentValidationError {
  field: string;
  message: string;
}

export interface IntentValidationResult {
  valid: boolean;
  errors: IntentValidationError[];
}

export interface Intent {
  code: IntentCode;
  createdAt: string;
  updatedAt?: string;
}

export const SUPPORTED_INTENT_CODES = new Set<IntentCode>([
  "build",
  "pre_purchase",
  "understand_parcel",
]);

export const UNSUPPORTED_INTENT_CODES = new Set<IntentCode>(["existing_building_modification"]);

export const PROFESSIONAL_CONTEXT_CODE: IntentCode = "professional";

export const INTENT_I18N_KEYS: Record<IntentCode, string> = {
  build: "intent.build",
  pre_purchase: "intent.prePurchase",
  understand_parcel: "intent.understandParcel",
  existing_building_modification: "intent.existingBuildingModification",
  professional: "intent.professional",
};

const VALID_INTENT_CODES = new Set<IntentCode>([
  "build",
  "pre_purchase",
  "understand_parcel",
  "existing_building_modification",
  "professional",
]);

export function isValidIntentCode(raw: unknown): raw is IntentCode {
  return typeof raw === "string" && VALID_INTENT_CODES.has(raw as IntentCode);
}

export function normalizeIntentCode(raw: string): IntentCode | undefined {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return isValidIntentCode(normalized) ? (normalized as IntentCode) : undefined;
}

export function isIntentSupported(code: IntentCode): boolean {
  return SUPPORTED_INTENT_CODES.has(code);
}

function isIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function validateIntent(intent: Intent): IntentValidationResult {
  const errors: IntentValidationError[] = [];

  if (!intent.code) {
    errors.push({ field: "code", message: "code is required" });
  } else if (!isValidIntentCode(intent.code)) {
    errors.push({
      field: "code",
      message: `code must be one of: ${Array.from(VALID_INTENT_CODES).join(", ")}`,
    });
  }

  if (!intent.createdAt) {
    errors.push({ field: "createdAt", message: "createdAt is required" });
  } else if (!isIsoTimestamp(intent.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "createdAt must be a valid ISO timestamp",
    });
  }

  if (intent.updatedAt && !isIsoTimestamp(intent.updatedAt)) {
    errors.push({
      field: "updatedAt",
      message: "updatedAt must be a valid ISO timestamp",
    });
  }

  return { valid: errors.length === 0, errors };
}
