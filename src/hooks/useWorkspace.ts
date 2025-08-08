"use client"

import { useState, useEffect } from 'react';

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

export interface WorkspaceStats {
  projects: number;
  members: number;
  pages: number;
  views: number;
}

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState<WorkspaceStats>({ projects: 0, members: 0, pages: 0, views: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWorkspace, setHasWorkspace] = useState<boolean | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/workspace/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        }
        throw new Error('Erro ao carregar workspaces');
      }
      
      const data = await response.json();
      setWorkspaces(data.workspaces || []);
      
      if (data.workspaces && data.workspaces.length > 0) {
        // Set the first workspace as current or get from localStorage
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        const currentWorkspace = savedWorkspaceId 
          ? data.workspaces.find((w: Workspace) => w.id === savedWorkspaceId) || data.workspaces[0]
          : data.workspaces[0];
          
        setWorkspace(currentWorkspace);
        setHasWorkspace(true);
        
        // Fetch stats for current workspace
        await fetchWorkspaceStats(currentWorkspace.id);
      } else {
        setWorkspace(null);
        setHasWorkspace(false);
        setStats({ projects: 0, members: 0, pages: 0, views: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setWorkspace(null);
      setWorkspaces([]);
      setHasWorkspace(false);
      setStats({ projects: 0, members: 0, pages: 0, views: 0 });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const fetchWorkspaceStats = async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || { projects: 0, members: 0, pages: 0, views: 0 });
      }
    } catch (err) {
      // Ignore stats errors for now
      console.warn('Error fetching workspace stats:', err);
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

  const switchWorkspace = (workspaceId: string) => {
    const targetWorkspace = workspaces.find(w => w.id === workspaceId);
    if (targetWorkspace) {
      setWorkspace(targetWorkspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      fetchWorkspaceStats(workspaceId);
    }
  };

  const updateWorkspace = async (data: Partial<Workspace>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workspace', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar workspace');
      }

      const result = await response.json();
      setWorkspace(result.workspace);
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

  return {
    workspace,
    workspaces,
    stats,
    loading,
    error,
    hasWorkspace,
    initialLoad,
    refetch: fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    switchWorkspace
  };
}