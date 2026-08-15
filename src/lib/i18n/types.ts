export type AppLocale = "et" | "ru" | "en";

export const APP_LOCALES = ["et", "ru", "en"] as const;

export const DEFAULT_LOCALE: AppLocale = "et";

export function isValidAppLocale(value: string | undefined): value is AppLocale {
  return value === "et" || value === "ru" || value === "en";
}
