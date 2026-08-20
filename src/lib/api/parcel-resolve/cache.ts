export function getCacheControl(status: string): string {
  if (status === "resolved" || status === "ambiguous") {
    return "public, max-age=86400, s-maxage=86400";
  }
  return "no-store, max-age=0";
}
