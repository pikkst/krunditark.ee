export function formatCadastralId(id: string): string {
  return `${id.slice(0, 5)}:${id.slice(5, 8)}:${id.slice(8, 12)}`;
}

export function formatArea(value: number, locale?: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }
  return value.toLocaleString(locale);
}
