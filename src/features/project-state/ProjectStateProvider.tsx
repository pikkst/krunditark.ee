import { useState, useCallback, useMemo } from "react";
import { ProjectStateContext } from "./ProjectStateContext";
import type { ProjectStateContextValue } from "./types";
import type { Parcel } from "../../domain/parcel/types";
import type { IntentCode } from "../../domain/intent/types";
import type { GuestProject } from "../../lib/supabase/guest-project";

export interface ProjectStateProviderProps {
  children: React.ReactNode;
  initialParcel?: Parcel | null;
  initialIntent?: IntentCode | null;
}

export function ProjectStateProvider({
  children,
  initialParcel = null,
  initialIntent = null,
}: ProjectStateProviderProps) {
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(initialParcel);
  const [selectedIntent, setSelectedIntent] = useState<IntentCode | null>(initialIntent);
  const [project, setProject] = useState<GuestProject | null>(null);
  const [draft, setDraft] = useState<ProjectStateContextValue["draft"]>(null);

  const clearProject = useCallback(() => {
    setProject(null);
    setDraft(null);
    setSelectedIntent(null);
    setSelectedParcel(null);
  }, []);

  const value = useMemo<ProjectStateContextValue>(
    () => ({
      selectedParcel,
      selectedIntent,
      project,
      draft,
      setSelectedParcel,
      setSelectedIntent,
      setProject,
      setDraft,
      clearProject,
    }),
    [selectedParcel, selectedIntent, project, draft, clearProject]
  );

  return <ProjectStateContext.Provider value={value}>{children}</ProjectStateContext.Provider>;
}
