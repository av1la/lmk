import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProjectService } from '@/domains/project/ProjectService';
import { createLogger } from '@/shared/logger';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';

const logger = createLogger('workspace-project-detail-api');

interface RouteContext {
  params: Promise<{
    workspaceId: string;
    projectId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    logger.info('Starting workspace project detail API request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in project detail request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await context.params;
    logger.info('Workspace project detail request', { workspaceId, projectId, userId });

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { userId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    const result = await projectService.getProject(projectId, userId);

    if (!result.success) {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                         result.error?.code === 'ACCESS_DENIED' ? 403 :
                         result.error?.code === 'INTERNAL_ERROR' ? 500 : 400;
      return NextResponse.json({ error: result.error?.message }, { status: statusCode });
    }

    // Verificar se o projeto pertence ao workspace correto
    if (result.data?.workspaceId.getValue() !== workspaceId) {
      logger.warn('Project does not belong to workspace', { projectId, workspaceId, projectWorkspaceId: result.data?.workspaceId.getValue() });
      return NextResponse.json({ error: 'Projeto não encontrado neste workspace' }, { status: 404 });
    }

    // Converter para formato da API
    const projectData = {
      id: result.data?.id?.getValue(),
      name: result.data?.name,
      slug: result.data?.slug,
      description: result.data?.description,
      status: result.data?.status,
      visibility: result.data?.visibility,
      workspaceId: result.data?.workspaceId.getValue(),
      createdBy: result.data?.createdBy.getValue(),
      createdAt: result.data?.createdAt,
      updatedAt: result.data?.updatedAt,
      publishedAt: result.data?.publishedAt,
      // Mock data para agora - em produção seria carregado do banco
      members: [
        {
          id: 'member_1',
          name: 'Você',
          role: 'OWNER',
          avatar: null
        }
      ],
      pages: [],
      stats: {
        views: 0,
        conversions: 0,
        conversionRate: 0
      }
    };

    return NextResponse.json({ project: projectData });
  } catch (error) {
    logger.error('Error fetching workspace project detail', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    logger.info('Starting workspace project update API request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in project update request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await context.params;
    const body = await request.json();
    
    logger.info('Workspace project update request', { workspaceId, projectId, userId, body });

    const projectService = createProjectService();
    
    // Verificar se o projeto existe e pertence ao workspace
    const getResult = await projectService.getProject(projectId, userId);
    if (!getResult.success) {
      const statusCode = getResult.error?.code === 'NOT_FOUND' ? 404 : 403;
      return NextResponse.json({ error: getResult.error?.message }, { status: statusCode });
    }

    if (getResult.data?.workspaceId.getValue() !== workspaceId) {
      return NextResponse.json({ error: 'Projeto não encontrado neste workspace' }, { status: 404 });
    }

    const result = await projectService.updateProject(projectId, userId, body);

    if (!result.success) {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                         result.error?.code === 'ACCESS_DENIED' ? 403 :
                         result.error?.code === 'SLUG_EXISTS' ? 409 :
                         result.error?.code === 'VALIDATION_ERROR' ? 400 :
                         result.error?.code === 'INTERNAL_ERROR' ? 500 : 400;
      return NextResponse.json({ error: result.error?.message }, { status: statusCode });
    }

    // Retornar projeto atualizado
    const updatedProjectData = {
      id: result.data?.id?.getValue(),
      name: result.data?.name,
      slug: result.data?.slug,
      description: result.data?.description,
      status: result.data?.status,
      visibility: result.data?.visibility,
      workspaceId: result.data?.workspaceId.getValue(),
      createdBy: result.data?.createdBy.getValue(),
      createdAt: result.data?.createdAt,
      updatedAt: result.data?.updatedAt,
      publishedAt: result.data?.publishedAt,
      members: [
        {
          id: 'member_1',
          name: 'Você',
          role: 'OWNER',
          avatar: null
        }
      ],
      pages: [],
      stats: {
        views: 0,
        conversions: 0,
        conversionRate: 0
      }
    };

    return NextResponse.json({ project: updatedProjectData });
  } catch (error) {
    logger.error('Error updating workspace project', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    logger.info('Starting workspace project delete API request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in project delete request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await context.params;
    
    logger.info('Workspace project delete request', { workspaceId, projectId, userId });

    const projectService = createProjectService();
    
    // Verificar se o projeto existe e pertence ao workspace
    const getResult = await projectService.getProject(projectId, userId);
    if (!getResult.success) {
      const statusCode = getResult.error?.code === 'NOT_FOUND' ? 404 : 403;
      return NextResponse.json({ error: getResult.error?.message }, { status: statusCode });
    }

    if (getResult.data?.workspaceId.getValue() !== workspaceId) {
      return NextResponse.json({ error: 'Projeto não encontrado neste workspace' }, { status: 404 });
    }

    const result = await projectService.deleteProject(projectId, userId);

    if (!result.success) {
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                         result.error?.code === 'ACCESS_DENIED' ? 403 :
                         result.error?.code === 'INTERNAL_ERROR' ? 500 : 400;
      return NextResponse.json({ error: result.error?.message }, { status: statusCode });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting workspace project', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}