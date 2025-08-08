"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Nome do projeto é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE')
});

export type CreateProjectData = z.infer<typeof createProjectSchema>;

export function useCreateProject() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (data: CreateProjectData): boolean => {
    try {
      createProjectSchema.parse(data);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const createProject = async (data: CreateProjectData, workspaceId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    // Validar dados
    if (!validateForm(data)) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/workspace/${workspaceId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Não autorizado. Faça login novamente.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar projeto');
      }

      const result = await response.json();
      
      // Redirecionar para a página do projeto criado
      router.push(`/dashboard/projects/${result.project.id}`);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    setValidationErrors({});
  };

  return {
    createProject,
    loading,
    error,
    validationErrors,
    clearError
  };
}