"use client"

import { useState, useEffect } from 'react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';

export interface WorkspaceStats {
  projects: number;
  members: number;
  pages: number;
  views: number;
}

export interface RecentActivity {
  id: string;
  type: 'project_created' | 'member_added' | 'page_published';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export interface TopPage {
  id: string;
  name: string;
  views: number;
  percentage: number;
}

export function useWorkspaceStats() {
  const { workspace } = useWorkspaceContext();
  const [stats, setStats] = useState<WorkspaceStats>({ projects: 0, members: 0, pages: 0, views: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspace/${workspace.id}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }

      const data = await response.json();
      setStats(data.stats || { projects: 0, members: 0, pages: 0, views: 0 });
      setRecentActivity(data.recentActivity || []);
      setTopPages(data.topPages || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      // Set mock data for now
      setStats({ projects: 3, members: 2, pages: 8, views: 1247 });
      setTopPages([
        { id: '1', name: 'Landing Principal', views: 2547, percentage: 100 },
        { id: '2', name: 'Página de Produto', views: 1834, percentage: 86 },
        { id: '3', name: 'Página de Contato', views: 967, percentage: 69 },
        { id: '4', name: 'Página Obrigado', views: 542, percentage: 60 },
        { id: '5', name: 'Sobre Nós', views: 289, percentage: 55 },
      ]);
      setRecentActivity([
        {
          id: '1',
          type: 'project_created',
          title: 'Novo projeto criado',
          description: 'Landing Page v2.0',
          timestamp: '2024-01-15T10:30:00Z',
          user: 'João Silva'
        },
        {
          id: '2',
          type: 'member_added',
          title: 'Membro adicionado',
          description: 'Maria Santos foi adicionada à equipe',
          timestamp: '2024-01-14T15:45:00Z',
          user: 'Admin'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [workspace]);

  return {
    stats,
    recentActivity,
    topPages,
    loading,
    error,
    refetch: fetchStats
  };
}