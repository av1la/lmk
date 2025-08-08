"use client"

import { useState, useEffect } from 'react';

import { WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';

export interface ProjectMember {
  id: string;
  name: string;
  role: WorkspaceRole;
  avatar?: string;
}

export interface ProjectPage {
  id: string;
  name: string;
  path: string;
  status: 'PUBLISHED' | 'DRAFT' | 'REVIEW';
  updatedAt: string;
  isHomepage: boolean;
}

export interface ProjectStats {
  views: number;
  conversions: number;
  conversionRate: number;
}

export interface ProjectDetail {
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
  members: ProjectMember[];
  pages: ProjectPage[];
  stats: ProjectStats;
}

export function useProject(projectId: string, workspaceId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    if (!projectId || !workspaceId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/workspace/${workspaceId}/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        }
        if (response.status === 404) {
          throw new Error('Projeto não encontrado.');
        }
        if (response.status === 403) {
          throw new Error('Você não tem acesso a este projeto.');
        }
        throw new Error('Erro ao carregar projeto');
      }
      
      const data = await response.json();
      setProject(data.project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId, workspaceId]);

  return {
    project,
    loading,
    error,
    refetch: fetchProject
  };
}