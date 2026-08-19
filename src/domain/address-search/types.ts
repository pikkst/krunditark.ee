export interface AddressCoordinates {
  lat: number;
  lon: number;
}

export interface AddressCoordinatesEpsg3301 {
  x: number;
  y: number;
}

export interface AddressSearchResultSource {
  id: string;
  authority: string;
}

export interface AddressAdministrative {
  county?: string;
  municipality?: string;
  settlement?: string;
  subdistrict?: string;
}

export type AddressObjectType = "ehak" | "street" | "small_place" | "cadastral_unit" | "building";

export type AddressObjectTypeCode = "1" | "2" | "B" | "4" | "E";

export type AddressObjectStatus = "K" | "O" | "V" | "T";

export interface AddressSearchResult {
  id: string;
  addressId: string;
  label: string;
  objectType: AddressObjectType;
  objectTypeCode: AddressObjectTypeCode;
  coordinates: AddressCoordinates;
  coordinatesEpsg3301: AddressCoordinatesEpsg3301;
  source: AddressSearchResultSource;
  cadastralId?: string;
  postalCode?: string;
  administrative: AddressAdministrative;
  addressCode?: string;
  status: AddressObjectStatus;
  primary: boolean;
  provenance: {
    sourceId: string;
    sourceObjectId: string;
    normalizerVersion: string;
    retrievedAt: string;
  };
}
