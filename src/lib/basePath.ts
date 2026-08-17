export function getBasePath(): string {
  const raw = import.meta.env.VITE_BASE_PATH;
  const base = typeof raw === "string" ? raw : undefined;
  if (!base || base === "/") {
    return "/";
  }
  return base.endsWith("/") ? base : `${base}/`;
}

export function stripBasePath(pathname: string): string {
  const base = getBasePath();
  if (base === "/") {
    return pathname;
  }
  const baseWithoutTrailing = base.endsWith("/") ? base.slice(0, -1) : base;
  if (pathname.startsWith(baseWithoutTrailing)) {
    return pathname.slice(baseWithoutTrailing.length) || "/";
  }
  return pathname;
}
