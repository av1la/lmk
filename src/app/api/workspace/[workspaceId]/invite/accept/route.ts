import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger } from '@/shared/logger';
import { WorkspaceId, WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';
import { UserId } from '@/domains/user/UserDomain';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { createUserService } from '@/domains/user/UserService';

const logger = createLogger('workspace-invite-accept-api');

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

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

    // Get user
    const user = await userService.findByClerkId(userId);
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Get workspace
    const workspace = await workspaceService.findById(new WorkspaceId(workspaceId));
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace não encontrado' },
        { status: 404 }
      );
    }

    // Find invite by token
    const inviteIndex = workspace.invites.findIndex(inv => inv.token === token);
    
    if (inviteIndex === -1) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      );
    }

    const invite = workspace.invites[inviteIndex];

    // Validate invite
    if (invite.accepted) {
      return NextResponse.json(
        { error: 'Convite já foi aceito' },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Convite expirado' },
        { status: 400 }
      );
    }

    // Check if user email matches invite email
    if (user.email !== invite.email) {
      return NextResponse.json(
        { error: 'Email do usuário não confere com o convite' },
        { status: 400 }
      );
    }

    // Check if user is already a member using Clerk ID
    const isMember = workspace.members.some(m => m.userId.value === userId) ||
                    workspace.ownerId.value === user.id?.value; // Owner still uses internal ID
    
    if (isMember) {
      return NextResponse.json(
        { error: 'Usuário já é membro deste workspace' },
        { status: 400 }
      );
    }

    try {
      logger.info('Attempting to add member to workspace', {
        workspaceId,
        userInternalId: user.id?.value,
        userClerkId: userId,
        userEmail: user.email,
        inviteEmail: invite.email,
        role: invite.role,
        invitedByClerkId: invite.invitedByClerkId
      });

      // Add user as member using Clerk ID directly
      const updatedWorkspace = await workspaceService.addMemberByClerkId(
        new WorkspaceId(workspaceId),
        userId, // Clerk ID of the user accepting the invite
        invite.role as WorkspaceRole,
        invite.invitedByClerkId // Clerk ID of the inviter
      );

      if (!updatedWorkspace) {
        return NextResponse.json(
          { error: 'Erro ao adicionar membro' },
          { status: 500 }
        );
      }

      logger.info('Member added successfully', {
        workspaceId,
        userId: user.id?.value,
        updatedWorkspaceMembers: updatedWorkspace?.members.length
      });

      // Now mark invite as accepted and save (only after member was added successfully)
      const updatedInvite = {
        ...invite,
        accepted: true,
        acceptedAt: new Date(),
        acceptedByClerkId: userId // Store who accepted the invite
      };

      // Get fresh workspace data and update the specific invite
      const freshWorkspace = await workspaceService.findById(new WorkspaceId(workspaceId));
      if (!freshWorkspace) {
        logger.error('Workspace not found after adding member', { workspaceId });
        return NextResponse.json(
          { error: 'Erro interno - workspace não encontrado' },
          { status: 500 }
        );
      }

      // Update the specific invite in the fresh workspace data
      const freshInviteIndex = freshWorkspace.invites.findIndex(inv => inv.token === token);
      if (freshInviteIndex !== -1) {
        freshWorkspace.invites[freshInviteIndex] = updatedInvite;
        await workspaceService.updateInvites(new WorkspaceId(workspaceId), freshWorkspace.invites);
      } else {
        logger.warn('Invite not found in fresh workspace data', { token, workspaceId });
      }

      logger.info('User accepted workspace invite', {
        userId: user.id.value,
        workspaceId,
        role: invite.role,
        inviteToken: token
      });

      return NextResponse.json({
        success: true,
        message: 'Convite aceito com sucesso',
        workspace: {
          id: workspaceId,
          name: workspace.name,
          role: invite.role
        }
      });

    } catch (error) {
      logger.error('Error accepting invite', {
        userId: user.id.value,
        workspaceId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorDetails: error
      });

      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Erro ao aceitar convite' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error processing invite acceptance', { error });
    
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