const ASSET_PATTERN =
  /\/(assets|static)\/|\.(js|css|png|jpg|jpeg|svg|ico|gif|webp|woff2?|ttf|eot|map|json)$/i;

export function isAssetPath(pathname: string): boolean {
  return ASSET_PATTERN.test(pathname);
}

export function shouldSkipReactMount(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return isAssetPath(window.location.pathname);
}
