import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProjectService } from '@/domains/project/ProjectService';
import { WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';
import { createLogger } from '@/shared/logger';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';
import { createUserService } from '@/domains/user/UserService';

const logger = createLogger('project-members-api');

interface Context {
  params: Promise<{ workspaceId: string; projectId: string }>;
}

// GET /api/workspace/[workspaceId]/projects/[projectId]/members
export async function GET(request: NextRequest, context: Context) {
  try {
    logger.info('Starting project members GET request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await context.params;
    logger.info('Project members request', { userId, workspaceId, projectId });

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { userId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    
    // Get effective members (stored for private, inherited for public)
    const result = await projectService.getEffectiveMembers(projectId);
    
    if (!result.success) {
      logger.warn('Failed to get project members', { projectId, error: result.error });
      return NextResponse.json({ error: result.error?.message || 'Failed to get project members' }, { status: result.error?.code === 'NOT_FOUND' ? 404 : 500 });
    }

    const members = result.data || [];
    logger.info('Found project members', { count: members.length });

    // Fetch user data from our database
    const memberIds = members.map(member => member.userId.getValue());
    const userService = createUserService();
    const userDataMap = new Map();
    
    for (const clerkId of memberIds) {
      try {
        const user = await userService.findByClerkId(clerkId);
        if (user) {
          userDataMap.set(clerkId, {
            name: user.name,
            email: user.email,
            avatar: user.image
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch user data', { clerkId, error });
      }
    }

    // Map members with real user data
    const membersData = members.map(member => {
      const userData = userDataMap.get(member.userId.getValue());
      return {
        id: member.userId.getValue(),
        userId: member.userId.getValue(),
        role: member.role,
        name: userData?.name || `Usuário ${member.userId.getValue().substring(0, 8)}`,
        email: userData?.email || `user-${member.userId.getValue().substring(0, 8)}@example.com`,
        avatar: userData?.avatar,
        addedAt: member.addedAt,
        addedBy: member.addedBy.getValue()
      };
    });

    return NextResponse.json({ members: membersData });
  } catch (error) {
    logger.error('Error fetching project members', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/workspace/[workspaceId]/projects/[projectId]/members
export async function POST(request: NextRequest, context: Context) {
  try {
    logger.info('Starting project members POST request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await context.params;
    const body = await request.json();
    const { memberId, role } = body;

    logger.info('Add project member request', { userId, workspaceId, projectId, memberId, role });

    // Validate inputs
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (!role || !Object.values(WorkspaceRole).includes(role as WorkspaceRole)) {
      return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { userId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const projectService = createProjectService();
    
    // Add member to project
    const result = await projectService.addMemberToProject(projectId, memberId, role as WorkspaceRole, userId);
    
    if (!result.success) {
      logger.warn('Failed to add member to project', { projectId, memberId, error: result.error });
      const statusCode = result.error?.code === 'NOT_FOUND' ? 404 : 
                        result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
      return NextResponse.json({ error: result.error?.message || 'Failed to add member to project' }, { status: statusCode });
    }

    logger.info('Member added to project successfully', { projectId, memberId });

    return NextResponse.json({ 
      success: true,
      message: 'Member added to project successfully' 
    });
  } catch (error) {
    logger.error('Error adding member to project', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}