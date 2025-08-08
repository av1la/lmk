"use client"

import { useState, useEffect } from 'react';

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  visibility: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export function useProjects(workspaceId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!workspaceId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/workspace/${workspaceId}/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        }
        throw new Error('Erro ao carregar projetos');
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects
  };
}