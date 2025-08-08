import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { WorkspaceId } from '@/domains/workspace/WorkspaceDomain';
import { createLogger } from '@/shared/logger';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';
import { createUserService } from '@/domains/user/UserService';

const logger = createLogger('workspace-members-api');

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    logger.info('Starting workspace members API request');
    
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('No userId found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await context.params;
    logger.info('Members request for workspace', { userId, workspaceId });

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      logger.warn('User does not have access to workspace', { userId, workspaceId });
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const workspaceService = createWorkspaceService();
    const workspaceIdObj = new WorkspaceId(workspaceId);
    
    logger.info('Fetching workspace with members', { workspaceId: workspaceIdObj.getValue() });
    // Buscar workspace com membros
    const workspace = await workspaceService.findById(workspaceIdObj);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    
    logger.info('Found workspace members', { count: workspace.members.length });
    
    // Fetch user data from our database
    const userService = createUserService();
    const allMemberIds = [...workspace.members.map(m => m.userId.getValue())];
    
    // Add owner if not already in members array
    const ownerInMembers = workspace.members.find(m => m.userId.value === workspace.ownerId.value);
    if (!ownerInMembers) {
      allMemberIds.unshift(workspace.ownerId.getValue());
    }
    
    // Fetch user information from our database
    const userDataMap = new Map();
    for (const clerkId of allMemberIds) {
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
    
    // Map workspace members with real user data
    const membersData = workspace.members.map(member => {
      const userData = userDataMap.get(member.userId.getValue());
      return {
        id: member.userId.getValue(),
        userId: member.userId.getValue(),
        workspaceId: workspaceId,
        role: member.role,
        status: 'ACTIVE', // All workspace members are active for now
        name: userData?.name || `Usuário ${member.userId.getValue().substring(0, 8)}`,
        email: userData?.email || `user-${member.userId.getValue().substring(0, 8)}@example.com`,
        avatar: userData?.avatar,
        joinedAt: member.joinedAt,
        invitedAt: member.invitedAt,
        lastActiveAt: member.joinedAt, // Placeholder - could be enhanced later
        permissions: [], // TODO: Define permissions based on role
        createdAt: member.joinedAt,
        updatedAt: member.joinedAt
      };
    });

    // Add owner if not already in members array
    if (!ownerInMembers) {
      const ownerUserData = userDataMap.get(workspace.ownerId.getValue());
      membersData.unshift({
        id: workspace.ownerId.getValue(),
        userId: workspace.ownerId.getValue(),
        workspaceId: workspaceId,
        role: 'OWNER',
        status: 'ACTIVE',
        name: ownerUserData?.name || `Owner ${workspace.ownerId.getValue().substring(0, 8)}`,
        email: ownerUserData?.email || `owner-${workspace.ownerId.getValue().substring(0, 8)}@example.com`,
        avatar: ownerUserData?.avatar,
        joinedAt: workspace.createdAt || new Date(),
        invitedAt: undefined,
        lastActiveAt: workspace.createdAt || new Date(),
        permissions: [],
        createdAt: workspace.createdAt || new Date(),
        updatedAt: workspace.updatedAt || new Date()
      });
    }

    // Get member statistics
    const stats = await workspaceService.getMemberStats(workspaceIdObj);

    return NextResponse.json({ members: membersData, stats });
  } catch (error) {
    logger.error('Error fetching workspace members', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}