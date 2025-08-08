import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';

export async function GET() {
  try {
    console.log('🔍 API workspace/list - Starting request');
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ API workspace/list - No userId found');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    console.log('✅ API workspace/list - User authenticated:', userId);

    const workspaceService = createWorkspaceService();
    const workspaces = await workspaceService.getUserWorkspaces(userId);

    console.log('📊 API workspace/list - Found workspaces:', workspaces.length);
    console.log('📋 API workspace/list - Workspace IDs:', workspaces.map(w => w.id?.value));

    const response = {
      workspaces: workspaces.map(workspace => ({
        id: workspace.id?.value || '',
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        ownerId: workspace.ownerId?.value,
        plan: workspace.plan,
        status: workspace.status,
        createdAt: workspace.createdAt?.toISOString(),
        updatedAt: workspace.updatedAt?.toISOString()
      })),
      count: workspaces.length
    };

    console.log('🎯 API workspace/list - Returning response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('💥 Error listing workspaces:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}