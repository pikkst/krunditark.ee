export type InAksResolveStatus = "resolved" | "not_found" | "invalid_source";

export interface InAksResolveResolvedExact {
  status: "resolved";
  mode: "exact_cadastral";
  expectedCadastralId: string;
  wfsFilter: string;
  count: 1;
}

export interface InAksResolveResolvedSpatial {
  status: "resolved";
  mode: "spatial";
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
  | InAksResolveResolvedExact
  | InAksResolveResolvedSpatial
  | InAksResolveNotFound
  | InAksResolveInvalidSource;
