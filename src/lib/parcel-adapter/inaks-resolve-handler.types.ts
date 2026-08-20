export type InAksResolveStatus = "resolved" | "not_found" | "invalid_source";

export interface InAksResolveResolved {
  status: "resolved";
  wfsFilter: string;
  count: number;
}

export interface InAksResolveNotFound {
  status: "not_found";
}

export interface InAksResolveInvalidSource {
  status: "invalid_source";
  error: string;
}

export type InAksResolveResult =
  InAksResolveResolved | InAksResolveNotFound | InAksResolveInvalidSource;
