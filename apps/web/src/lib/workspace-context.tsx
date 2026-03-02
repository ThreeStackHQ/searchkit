'use client';

import React, { createContext, useContext, useState } from 'react';

interface Workspace {
  id: string;
  name: string;
  plan: 'free' | 'indie' | 'pro';
}

interface WorkspaceContextValue {
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: null,
  setWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>({
    id: 'ws_default',
    name: 'My Workspace',
    plan: 'free',
  });

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
