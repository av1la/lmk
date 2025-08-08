import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProjectService } from '@/domains/project/ProjectService';
import { WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';
import { createLogger } from '@/shared/logger';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';

const logger = createLogger('project-member-api');

interface Context {
  params: Promise<{ workspaceId: string; projectId: string; userId: string }>;
}

// PATCH /api/workspace/[workspaceId]/projects/[projectId]/members/[userId]
export async function PATCH(request: NextRequest, context: Context) {
  try {
    logger.info('Starting project member PATCH request');
    
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      logger.warn('No userId found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId, userId: memberUserId } = await context.params;
    const body = await request.json();
    const { role } = body;

    logger.info('Update project member role request', { currentUserId, workspaceId, projectId, memberUserId, role });

    // Validate inputs
    if (!role || !Object.values(WorkspaceRole).includes(role as WorkspaceRole)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, currentUserId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { currentUserId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    
    // Update member role
    const result = await projectService.updateProjectMemberRole(projectId, memberUserId, role as WorkspaceRole);
    
    if (!result.success) {
      logger.warn('Failed to update project member role', { projectId, memberUserId, role, error: result.error });
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      return NextResponse.json({ error: result.error?.message || 'Failed to update member role' }, { status: statusCode });
    }

    logger.info('Project member role updated successfully', { projectId, memberUserId, role });

    return NextResponse.json({ 
      success: true,
      message: 'Member role updated successfully' 
    });
  } catch (error) {
    logger.error('Error updating project member role', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/workspace/[workspaceId]/projects/[projectId]/members/[userId]
export async function DELETE(request: NextRequest, context: Context) {
  try {
    logger.info('Starting project member DELETE request');
    
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      logger.warn('No userId found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId, userId: memberUserId } = await context.params;

    logger.info('Remove project member request', { currentUserId, workspaceId, projectId, memberUserId });

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, currentUserId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { currentUserId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    
    // Remove member from project
    const result = await projectService.removeMemberFromProject(projectId, memberUserId);
    
    if (!result.success) {
      logger.warn('Failed to remove member from project', { projectId, memberUserId, error: result.error });
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      return NextResponse.json({ error: result.error?.message || 'Failed to remove member from project' }, { status: statusCode });
    }

    logger.info('Member removed from project successfully', { projectId, memberUserId });

    return NextResponse.json({ 
      success: true,
      message: 'Member removed from project successfully' 
    });
  } catch (error) {
    logger.error('Error removing member from project', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}