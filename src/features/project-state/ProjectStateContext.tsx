import { createContext, useContext } from "react";
import type { ProjectStateContextValue } from "./types";

export const ProjectStateContext = createContext<ProjectStateContextValue | null>(null);

export function useProjectState(): ProjectStateContextValue {
  const context = useContext(ProjectStateContext);

  if (!context) {
    throw new Error("useProjectState must be used within a ProjectStateProvider");
  }

  return context;
}
