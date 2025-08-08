import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProjectService } from '@/domains/project/ProjectService';
import { createLogger } from '@/shared/logger';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';

const logger = createLogger('workspace-projects-api');

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    logger.info('Starting workspace projects API request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await context.params;
    logger.info('Projects request for workspace', { userId, workspaceId });

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { userId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    const result = await projectService.getWorkspaceProjects(workspaceId, userId);

    if (!result.success) {
      const statusCode = result.error?.code === 'INTERNAL_ERROR' ? 500 : 400;
      return NextResponse.json({ error: result.error?.message }, { status: statusCode });
    }

    // Converter para formato da API
    const projectsData = result.data?.map(project => ({
      id: project.id?.getValue(),
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      visibility: project.visibility,
      workspaceId: project.workspaceId.getValue(),
      createdBy: project.createdBy.getValue(),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      publishedAt: project.publishedAt
    })) || [];

    return NextResponse.json({ projects: projectsData });
  } catch (error) {
    logger.error('Error fetching workspace projects', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    logger.info('Starting create project in workspace API request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in create project request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await context.params;
    const body = await request.json();
    const { name, description, visibility } = body;

    logger.info('Creating project in workspace', { name, userId, workspaceId });

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace for project creation', { userId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    const result = await projectService.createProject({
      name,
      description,
      visibility: visibility || 'PRIVATE',
      workspaceId,
      userId
    });

    if (!result.success) {
      const statusCode = result.error?.code === 'VALIDATION_ERROR' ? 400 :
                         result.error?.code === 'INTERNAL_ERROR' ? 500 : 400;
      return NextResponse.json({ error: result.error?.message }, { status: statusCode });
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
      publishedAt: result.data?.publishedAt
    };

    return NextResponse.json({ project: projectData }, { status: 201 });
  } catch (error) {
    logger.error('Error creating project in workspace', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}