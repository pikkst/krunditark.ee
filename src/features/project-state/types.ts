import type { Parcel } from "../../domain/parcel/types";
import type { IntentCode } from "../../domain/intent/types";
import type { GuestProject } from "../../lib/supabase/guest-project";

export interface ProjectDraft {
  structureType: string;
  intendedUse?: string;
  widthM: number;
  lengthM: number;
  heightM?: number;
  storeys?: number;
  orientationDeg?: number;
  footprint: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface ProjectState {
  selectedParcel: Parcel | null;
  selectedIntent: IntentCode | null;
  project: GuestProject | null;
  draft: ProjectDraft | null;
}

export interface ProjectStateContextValue extends ProjectState {
  setSelectedParcel: (parcel: Parcel | null) => void;
  setSelectedIntent: (intent: IntentCode | null) => void;
  setProject: (project: GuestProject | null) => void;
  setDraft: (draft: ProjectDraft | null) => void;
  clearProject: () => void;
  ensureProject: (parcel: Parcel, intent: IntentCode) => Promise<GuestProject>;
  isBootstrapping: boolean;
  bootstrapError: Error | null;
  isAnonymous: boolean;
  guestError: Error | null;
  projectLoading: boolean;
  authLoading: boolean;
}
