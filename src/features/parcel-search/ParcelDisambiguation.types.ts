import type { Parcel } from "../../domain/parcel/types";

export interface ParcelDisambiguationProps {
  candidates: Parcel[];
  onSelect: (parcel: Parcel) => void;
}
