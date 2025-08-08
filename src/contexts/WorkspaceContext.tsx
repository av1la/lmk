"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  hasWorkspace: boolean | null;
  initialLoad: boolean;
  refreshWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (data: { name: string; description?: string; slug?: string }) => Promise<{
    success: boolean;
    workspace?: Workspace;
    error?: string;
  }>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWorkspace, setHasWorkspace] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      console.log('🚀 WorkspaceContext - Starting fetchWorkspaces');
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/workspace/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 WorkspaceContext - API response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('🔒 WorkspaceContext - Unauthorized response');
          throw new Error('Não autorizado. Faça login novamente.');
        }
        console.log('❌ WorkspaceContext - API error:', response.status);
        throw new Error('Erro ao carregar workspaces');
      }
      
      const data = await response.json();
      console.log('📦 WorkspaceContext - Received data:', data);
      
      setWorkspaces(data.workspaces || []);
      
      if (data.workspaces && data.workspaces.length > 0) {
        console.log('✅ WorkspaceContext - Found workspaces:', data.workspaces.length);
        
        // Set the first workspace as current or get from localStorage
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        console.log('💾 WorkspaceContext - Saved workspace ID:', savedWorkspaceId);
        
        const currentWorkspace = savedWorkspaceId 
          ? data.workspaces.find((w: Workspace) => w.id === savedWorkspaceId) || data.workspaces[0]
          : data.workspaces[0];
          
        console.log('🎯 WorkspaceContext - Selected workspace:', currentWorkspace?.name, currentWorkspace?.id);
        
        setWorkspace(currentWorkspace);
        setHasWorkspace(true);
        
        // Save current workspace
        localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
      } else {
        console.log('⚠️  WorkspaceContext - No workspaces found');
        setWorkspace(null);
        setHasWorkspace(false);
      }
    } catch (err) {
      console.error('💥 WorkspaceContext - Error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setWorkspace(null);
      setWorkspaces([]);
      setHasWorkspace(false);
    } finally {
      setLoading(false);
      setInitialLoad(false);
      console.log('🏁 WorkspaceContext - fetchWorkspaces completed');
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const targetWorkspace = workspaces.find(w => w.id === workspaceId);
    if (targetWorkspace) {
      setWorkspace(targetWorkspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
    }
  };

  const createWorkspace = async (data: { name: string; description?: string; slug?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar workspace');
      }

      const result = await response.json();
      
      // Add the new workspace to the list
      setWorkspaces(prev => [...prev, result.workspace]);
      setWorkspace(result.workspace);
      setHasWorkspace(true);
      
      // Save as current workspace
      localStorage.setItem('currentWorkspaceId', result.workspace.id);
      
      return { success: true, workspace: result.workspace };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const value: WorkspaceContextType = {
    workspace,
    workspaces,
    loading,
    error,
    hasWorkspace,
    initialLoad,
    refreshWorkspaces: fetchWorkspaces,
    switchWorkspace,
    createWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
}