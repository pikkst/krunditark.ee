export function normalizeCadastralId(raw: string): string {
  return raw.trim().replace(/[:\-.\s]/g, "");
}

export function isValidEstonianCadastralId(raw: string): boolean {
  const normalized = normalizeCadastralId(raw);
  if (normalized.length === 0) return false;
  return /^\d{12}$/.test(normalized);
}

export function toProviderCadastralRef(normalized: string): string {
  return `${normalized.slice(0, 5)}:${normalized.slice(5, 8)}:${normalized.slice(8, 12)}`;
}
