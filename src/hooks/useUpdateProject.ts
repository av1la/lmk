"use client"

import { useState } from 'react';

export interface UpdateProjectData {
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  customDomain?: string;
}

export interface UpdateProjectResponse {
  success: boolean;
  project?: Record<string, unknown>;
  error?: string;
}

export function useUpdateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProject = async (projectId: string, workspaceId: string, data: UpdateProjectData): Promise<UpdateProjectResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspace/${workspaceId}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        }
        if (response.status === 404) {
          throw new Error('Projeto não encontrado.');
        }
        if (response.status === 403) {
          throw new Error('Você não tem permissão para editar este projeto.');
        }
        if (response.status === 409) {
          throw new Error('Já existe um projeto com este slug.');
        }
        throw new Error('Erro ao atualizar projeto');
      }

      const result = await response.json();
      return { success: true, project: result.project };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId: string, workspaceId: string): Promise<UpdateProjectResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspace/${workspaceId}/projects/${projectId}`, {
        method: 'DELETE',
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
          throw new Error('Você não tem permissão para excluir este projeto.');
        }
        throw new Error('Erro ao excluir projeto');
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    updateProject,
    deleteProject,
    loading,
    error,
    clearError
  };
}