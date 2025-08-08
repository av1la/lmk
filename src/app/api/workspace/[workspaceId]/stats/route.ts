import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { workspaceId } = await context.params;

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    // TODO: Implementar busca real de estatísticas do workspace
    // Por enquanto, retornando dados mock baseados no workspaceId
    const mockStats = {
      projects: Math.floor(Math.random() * 10) + 1,
      members: Math.floor(Math.random() * 5) + 1,
      pages: Math.floor(Math.random() * 20) + 5,
      views: Math.floor(Math.random() * 5000) + 100
    };

    const mockTopPages = [
      { id: '1', name: 'Landing Principal', views: mockStats.views, percentage: 100 },
      { id: '2', name: 'Página de Produto', views: Math.floor(mockStats.views * 0.8), percentage: 80 },
      { id: '3', name: 'Página de Contato', views: Math.floor(mockStats.views * 0.6), percentage: 60 },
      { id: '4', name: 'Sobre Nós', views: Math.floor(mockStats.views * 0.4), percentage: 40 },
    ];

    const mockRecentActivity = [
      {
        id: '1',
        type: 'project_created',
        title: 'Novo projeto criado',
        description: 'Landing Page v2.0',
        timestamp: new Date().toISOString(),
        user: 'Usuário'
      }
    ];

    return NextResponse.json({
      stats: mockStats,
      topPages: mockTopPages,
      recentActivity: mockRecentActivity
    });

  } catch (error) {
    console.error('Error fetching workspace stats:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}