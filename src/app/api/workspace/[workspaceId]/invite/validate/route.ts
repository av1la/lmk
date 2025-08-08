import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/shared/logger';
import { WorkspaceId } from '@/domains/workspace/WorkspaceDomain';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { createUserService } from '@/domains/user/UserService';

const logger = createLogger('workspace-invite-validate-api');

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { workspaceId } = await context.params;
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      );
    }

    const workspaceService = createWorkspaceService();
    const userService = createUserService();

    // Get workspace
    const workspace = await workspaceService.findById(new WorkspaceId(workspaceId));
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace não encontrado' },
        { status: 404 }
      );
    }

    // Find invite by token
    const invite = workspace.invites.find(inv => inv.token === token);

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    // Check if invite is expired
    const expired = invite.expiresAt < new Date();

    // Get inviter name using Clerk ID
    const inviter = await userService.findByClerkId(invite.invitedByClerkId);
    const inviterName = inviter?.name || 'Usuário';

    const inviteData = {
      workspaceName: workspace.name,
      inviterName,
      role: invite.role,
      email: invite.email,
      token: invite.token,
      expired,
      accepted: invite.accepted || false
    };

    logger.info('Invite validation completed', {
      workspaceId,
      email: invite.email,
      expired,
      accepted: invite.accepted
    });

    return NextResponse.json({ invite: inviteData });

  } catch (error) {
    logger.error('Error validating invite', { error });
    
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