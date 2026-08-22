import { useState } from "react";
import { getSupabaseClient } from "./client";
import type { User } from "@supabase/supabase-js";

export interface GuestProject {
  id: string;
  user_id: string;
  name: string;
  cadastral_id: string;
  current_parcel_snapshot_id: string | null;
  intent_code: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateGuestProjectInput {
  name?: string;
  cadastralId: string;
  intentCode?: string;
  parcelSnapshotId?: string | null;
}

export interface UseGuestProjectResult {
  project: GuestProject | null;
  projects: GuestProject[];
  isLoading: boolean;
  error: Error | null;
  createProject: (input: CreateGuestProjectInput) => Promise<GuestProject>;
  loadProject: (projectId: string) => Promise<GuestProject | null>;
  loadProjects: () => Promise<GuestProject[]>;
  getActiveProject: () => Promise<GuestProject | null>;
  updateProject: (
    projectId: string,
    updates: Partial<CreateGuestProjectInput>
  ) => Promise<GuestProject>;
  archiveProject: (projectId: string) => Promise<void>;
}

export async function createGuestProject(
  user: User,
  input: CreateGuestProjectInput
): Promise<GuestProject> {
  const existing = await getActiveProjectForUser(user);
  if (existing) {
    const updates: Record<string, unknown> = {};
    if (input.cadastralId && existing.cadastral_id !== input.cadastralId) {
      updates.cadastral_id = input.cadastralId;
    }
    if (input.intentCode !== undefined && existing.intent_code !== input.intentCode) {
      updates.intent_code = input.intentCode;
    }
    if (
      input.parcelSnapshotId !== undefined &&
      existing.current_parcel_snapshot_id !== input.parcelSnapshotId
    ) {
      updates.current_parcel_snapshot_id = input.parcelSnapshotId;
    }
    if (Object.keys(updates).length > 0) {
      const { data: updated, error: updateError } = await getSupabaseClient()
        .from("projects")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updated) {
        throw new Error("Failed to update guest project: no data returned");
      }

      return updated as unknown as GuestProject;
    }

    return existing;
  }

  const { data, error: insertError } = await getSupabaseClient()
    .from("projects")
    .insert({
      user_id: user.id,
      name: input.name ?? "Uus projekt",
      cadastral_id: input.cadastralId,
      intent_code: input.intentCode ?? null,
      current_parcel_snapshot_id: input.parcelSnapshotId ?? null,
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  if (!data) {
    throw new Error("Failed to create guest project: no data returned");
  }

  return data as unknown as GuestProject;
}

async function getActiveProjectForUser(user: User): Promise<GuestProject | null> {
  const { data, error: fetchError } = await getSupabaseClient()
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!data) {
    return null;
  }

  return data as unknown as GuestProject;
}

export function useGuestProject(user: User | null): UseGuestProjectResult {
  const [project, setProject] = useState<GuestProject | null>(null);
  const [projects, setProjects] = useState<GuestProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function getActiveProject(): Promise<GuestProject | null> {
    if (!user) {
      return null;
    }

    setError(null);
    setIsLoading(true);

    try {
      return await getActiveProjectForUser(user);
    } finally {
      setIsLoading(false);
    }
  }

  async function createProject(input: CreateGuestProjectInput): Promise<GuestProject> {
    if (!user) {
      throw new Error("Anonymous Auth session is required to create a guest project");
    }

    setError(null);
    setIsLoading(true);

    try {
      const project = await createGuestProject(user, input);
      setProject(project);
      setProjects((prev) => [project, ...prev]);
      return project;
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProject(projectId: string): Promise<GuestProject | null> {
    if (!user) {
      throw new Error("Anonymous Auth session is required to load a guest project");
    }

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await getSupabaseClient()
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          return null;
        }
        throw fetchError;
      }

      if (!data) {
        return null;
      }

      const loadedProject = data as unknown as GuestProject;
      setProject(loadedProject);
      return loadedProject;
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProjects(): Promise<GuestProject[]> {
    if (!user) {
      return [];
    }

    setError(null);
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await getSupabaseClient()
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const loadedProjects = (data ?? []) as unknown as GuestProject[];
      setProjects(loadedProjects);
      return loadedProjects;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateProject(
    projectId: string,
    updates: Partial<CreateGuestProjectInput>
  ): Promise<GuestProject> {
    if (!user) {
      throw new Error("Anonymous Auth session is required to update a guest project");
    }

    setError(null);
    setIsLoading(true);

    try {
      const patch: Record<string, unknown> = {};

      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.cadastralId !== undefined) patch.cadastral_id = updates.cadastralId;
      if (updates.intentCode !== undefined) patch.intent_code = updates.intentCode;
      if (updates.parcelSnapshotId !== undefined) {
        patch.current_parcel_snapshot_id = updates.parcelSnapshotId;
      }

      const { data, error: updateError } = await getSupabaseClient()
        .from("projects")
        .update(patch)
        .eq("id", projectId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!data) {
        throw new Error("Failed to update guest project: no data returned");
      }

      const updatedProject = data as unknown as GuestProject;
      setProject(updatedProject);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updatedProject : p)));
      return updatedProject;
    } finally {
      setIsLoading(false);
    }
  }

  async function archiveProject(projectId: string): Promise<void> {
    if (!user) {
      throw new Error("Anonymous Auth session is required to archive a guest project");
    }

    setError(null);
    setIsLoading(true);

    try {
      const { error: updateError } = await getSupabaseClient()
        .from("projects")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", projectId);

      if (updateError) {
        throw updateError;
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (project?.id === projectId) {
        setProject(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return {
    project,
    projects,
    isLoading,
    error,
    createProject,
    loadProject,
    loadProjects,
    getActiveProject,
    updateProject,
    archiveProject,
  };
}
