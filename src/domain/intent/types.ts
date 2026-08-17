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

export const SUPPORTED_INTENT_CODES = new Set<IntentCode>(["build", "understand_parcel"]);

export const PLANNED_INTENT_CODES = new Set<IntentCode>([
  "pre_purchase",
  "existing_building_modification",
]);

export const UNSUPPORTED_INTENT_CODES = new Set<IntentCode>(PLANNED_INTENT_CODES);

export const PROFESSIONAL_CONTEXT_CODE: IntentCode = "professional";

export const INTENT_I18N_KEYS: Record<IntentCode, string> = {
  build: "intent.build",
  pre_purchase: "intent.prePurchase",
  understand_parcel: "intent.understandParcel",
  existing_building_modification: "intent.existingBuildingModification",
  professional: "intent.professional",
};

const VALID_INTENT_CODES = new Set<IntentCode>([
  ...SUPPORTED_INTENT_CODES,
  ...PLANNED_INTENT_CODES,
  PROFESSIONAL_CONTEXT_CODE,
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

export function isIntentPlanned(code: IntentCode): boolean {
  return PLANNED_INTENT_CODES.has(code);
}

function isIsoTimestamp(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

export function validateIntent(intent: unknown): IntentValidationResult {
  const errors: IntentValidationError[] = [];

  if (intent === null || intent === undefined) {
    errors.push({ field: "intent", message: "intent is required" });
    return { valid: false, errors };
  }

  if (typeof intent !== "object" || Array.isArray(intent)) {
    errors.push({ field: "intent", message: "intent must be an object" });
    return { valid: false, errors };
  }

  const obj = intent as Record<string, unknown>;

  if (!obj.code) {
    errors.push({ field: "code", message: "code is required" });
  } else if (!isValidIntentCode(obj.code)) {
    errors.push({
      field: "code",
      message: `code must be one of: ${Array.from(VALID_INTENT_CODES).join(", ")}`,
    });
  }

  if (!obj.createdAt) {
    errors.push({ field: "createdAt", message: "createdAt is required" });
  } else if (!isIsoTimestamp(obj.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "createdAt must be a valid ISO timestamp",
    });
  }

  if (obj.updatedAt !== undefined) {
    if (!isIsoTimestamp(obj.updatedAt)) {
      errors.push({
        field: "updatedAt",
        message: "updatedAt must be a valid ISO timestamp",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
