import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { createLogger } from '@/shared/logger';

const logger = createLogger('workspace-api');

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, slug } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome do workspace é obrigatório' },
        { status: 400 }
      );
    }

    const workspaceService = createWorkspaceService();
    
    const workspace = await workspaceService.createWorkspace({
      name: name.trim(),
      description: description?.trim() || '',
      slug: slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      ownerId: userId
    });

    logger.info('Workspace created successfully', {
      workspaceId: workspace.id,
      userId,
      name: workspace.name
    });

    return NextResponse.json({
      workspace: {
        id: workspace.id?.value,
        name: workspace.name,
        description: workspace.description,
        slug: workspace.slug,
        ownerId: workspace.ownerId?.value,
        plan: workspace.plan,
        status: workspace.status,
        createdAt: workspace.createdAt?.toISOString(),
        updatedAt: workspace.updatedAt?.toISOString()
      }
    });
  } catch (error) {
    logger.error('Error creating workspace', { error });
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, slug } = body;

    const workspaceService = createWorkspaceService();
    
    // Get current workspace to verify ownership
    const currentWorkspace = await workspaceService.getUserWorkspace(userId);
    
    if (!currentWorkspace) {
      return NextResponse.json(
        { error: 'Workspace não encontrado' },
        { status: 404 }
      );
    }

    if (currentWorkspace.ownerId?.value !== userId) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar este workspace' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (slug !== undefined) updateData.slug = slug.trim();

    const updatedWorkspace = await workspaceService.updateWorkspace(
      currentWorkspace.id!,
      updateData
    );

    if (!updatedWorkspace) {
      return NextResponse.json(
        { error: 'Erro ao atualizar workspace' },
        { status: 500 }
      );
    }

    logger.info('Workspace updated successfully', {
      workspaceId: updatedWorkspace.id,
      userId
    });

    return NextResponse.json({
      workspace: {
        id: updatedWorkspace.id?.value,
        name: updatedWorkspace.name,
        description: updatedWorkspace.description,
        slug: updatedWorkspace.slug,
        ownerId: updatedWorkspace.ownerId?.value,
        plan: updatedWorkspace.plan,
        status: updatedWorkspace.status,
        createdAt: updatedWorkspace.createdAt?.toISOString(),
        updatedAt: updatedWorkspace.updatedAt?.toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating workspace', { error });
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}