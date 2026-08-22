import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { ProjectStateContext } from "./ProjectStateContext";
import type { ProjectStateContextValue } from "./types";
import type { Parcel } from "../../domain/parcel/types";
import type { IntentCode } from "../../domain/intent/types";
import type { GuestProject } from "../../lib/supabase/guest-project";
import { useAnonymousAuth } from "../../lib/supabase/anonymous-auth";
import { useGuestProject } from "../../lib/supabase/guest-project";

const STORAGE_KEY = "krunditark_project_state";

interface StoredState {
  projectId?: string;
  parcel?: Parcel;
  intent?: IntentCode;
}

function loadStoredState(): StoredState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredState;
  } catch {
    return null;
  }
}

function saveStoredState(state: StoredState | null) {
  if (typeof sessionStorage === "undefined") return;
  if (state === null || state.projectId === undefined) {
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export interface ProjectStateProviderProps {
  children: React.ReactNode;
}

export function ProjectStateProvider({ children }: ProjectStateProviderProps) {
  const { user, isLoading: authLoading, signInAnonymously, isAnonymous } = useAnonymousAuth();
  const {
    createProject,
    loadProject,
    isLoading: projectLoading,
    error: guestError,
  } = useGuestProject(user);

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<IntentCode | null>(null);
  const [project, setProject] = useState<GuestProject | null>(null);
  const [draft, setDraft] = useState<ProjectStateContextValue["draft"]>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);

  const rehydrated = useRef(false);

  useEffect(() => {
    if (rehydrated.current) return;
    if (authLoading) return;
    if (!user) return;

    rehydrated.current = true;

    async function rehydrate() {
      const stored = loadStoredState();
      if (!stored?.projectId) return;

      try {
        const loaded = await loadProject(stored.projectId);
        if (!loaded) return;

        setProject(loaded);
        if (stored.intent) {
          setSelectedIntent(stored.intent);
        }
        if (stored.parcel) {
          setSelectedParcel(stored.parcel);
        }
      } catch {
        saveStoredState(null);
      }
    }

    rehydrate();
  }, [user, authLoading, loadProject]);

  const ensureProject = useCallback(
    async (parcel: Parcel, intent: IntentCode): Promise<GuestProject> => {
      setBootstrapError(null);
      setIsBootstrapping(true);

      try {
        let currentUser = user;
        if (!currentUser) {
          currentUser = await signInAnonymously();
        }

        const newProject = await createProject({
          cadastralId: parcel.cadastralId,
          intentCode: intent,
        });

        setProject(newProject);
        setSelectedParcel(parcel);
        setSelectedIntent(intent);
        saveStoredState({ projectId: newProject.id, parcel, intent });

        return newProject;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setBootstrapError(error);
        throw error;
      } finally {
        setIsBootstrapping(false);
      }
    },
    [user, signInAnonymously, createProject]
  );

  const clearProject = useCallback(() => {
    setProject(null);
    setDraft(null);
    setSelectedIntent(null);
    setSelectedParcel(null);
    saveStoredState(null);
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
      ensureProject,
      isBootstrapping,
      bootstrapError,
      isAnonymous,
      guestError,
      projectLoading,
      authLoading,
    }),
    [
      selectedParcel,
      selectedIntent,
      project,
      draft,
      clearProject,
      ensureProject,
      isBootstrapping,
      bootstrapError,
      isAnonymous,
      guestError,
      projectLoading,
      authLoading,
    ]
  );

  return <ProjectStateContext.Provider value={value}>{children}</ProjectStateContext.Provider>;
}
