import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger } from '@/shared/logger';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';
import { WorkspaceRole, WorkspaceId, WorkspaceInvite } from '@/domains/workspace/WorkspaceDomain';
import { UserId } from '@/domains/user/UserDomain';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { createUserService } from '@/domains/user/UserService';
import { createNotificationService } from '@/domains/notification/NotificationService';
import { EmailTemplate } from '@/domains/notification/NotificationDomain';
import { WorkspaceInvitationData } from '@/domains/notification/EmailTemplates';

const logger = createLogger('workspace-members-invite-multiple-api');

// Generate unique invite token
function generateInviteToken(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

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
    const { emails, role } = body;

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Lista de emails é obrigatória' },
        { status: 400 }
      );
    }

    if (!role || !Object.values(WorkspaceRole).includes(role as WorkspaceRole)) {
      return NextResponse.json(
        { error: 'Função é obrigatória e deve ser válida' },
        { status: 400 }
      );
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter((email: string) => emailRegex.test(email));
    const invalidEmails = emails.filter((email: string) => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Emails inválidos: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    // Get workspace and user info
    const workspaceService = createWorkspaceService();
    const userService = createUserService();
    const notificationService = createNotificationService();
    
    const workspace = await workspaceService.findById(new WorkspaceId(workspaceId));
    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace não encontrado' },
        { status: 404 }
      );
    }

    const inviter = await userService.findByClerkId(userId);
    const inviterName = inviter?.name || 'Membro da equipe';

    const results = {
      success: [] as string[],
      failed: [] as Array<{ email: string; error: string }>
    };

    const invitesToCreate: WorkspaceInvite[] = [];

    // Process each email
    for (const email of validEmails) {
      try {
        // Check if user already exists and is already a member
        const existingUser = await userService.findByEmail(email);
        if (existingUser) {
          const isMember = workspace.members.some(m => m.userId.value === existingUser.id?.value) ||
                          workspace.ownerId.value === existingUser.id?.value;
          
          if (isMember) {
            results.failed.push({
              email,
              error: 'Usuário já é membro deste workspace'
            });
            continue;
          }
        }

        // Check if there's already a pending invite for this email
        const existingInvite = workspace.invites.find(invite => 
          invite.email === email && 
          !invite.accepted && 
          invite.expiresAt > new Date()
        );
        
        if (existingInvite) {
          results.failed.push({
            email,
            error: 'Convite pendente já existe para este email'
          });
          continue;
        }

        // Create invite for all users (existing or new)
        const token = generateInviteToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
        
        const invite: WorkspaceInvite = {
          id: generateInviteToken(),
          email,
          role: role as WorkspaceRole,
          invitedByClerkId: userId, // Use Clerk ID directly
          token,
          expiresAt,
          createdAt: new Date(),
          accepted: false
        };
        
        invitesToCreate.push(invite);

        // Send invitation email
        const templateData: WorkspaceInvitationData = {
          inviterName,
          workspaceName: workspace.name,
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/workspace/${workspaceId}?token=${token}`,
          recipientEmail: email
        };

        const emailResult = await notificationService.sendEmail({
          to: [email],
          subject: `Convite para o workspace ${workspace.name}`,
          template: EmailTemplate.WORKSPACE_INVITATION,
          templateData
        });

        if (emailResult.success) {
          results.success.push(email);
          logger.info('Invitation email sent', { 
            email, 
            workspaceId, 
            notificationId: emailResult.notificationId?.getValue() 
          });
        } else {
          results.failed.push({
            email,
            error: emailResult.error || 'Falha ao enviar email'
          });
          logger.error('Failed to send invitation email', { 
            email, 
            workspaceId, 
            error: emailResult.error 
          });
        }

      } catch (error) {
        results.failed.push({
          email,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        logger.error('Error processing invitation', { email, workspaceId, error });
      }
    }

    // Store all invites (both for existing and new users)
    if (invitesToCreate.length > 0) {
      try {
        // Update workspace with new invites
        const updatedInvites = [...workspace.invites, ...invitesToCreate];
        await workspaceService.updateInvites(new WorkspaceId(workspaceId), updatedInvites);
        logger.info('Stored invites for users', {
          workspaceId,
          inviteCount: invitesToCreate.length
        });
      } catch (error) {
        logger.error('Failed to store invites', {
          workspaceId,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          invitesToCreate: invitesToCreate.length
        });
        // Mark failed emails
        for (const invite of invitesToCreate) {
          if (results.success.includes(invite.email)) {
            results.success = results.success.filter(email => email !== invite.email);
            results.failed.push({
              email: invite.email,
              error: 'Falha ao salvar convite'
            });
          }
        }
      }
    }

    logger.info('Multiple member invites processed for workspace', {
      userId,
      workspaceId,
      totalEmails: emails.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      role
    });

    return NextResponse.json(results);
  } catch (error) {
    logger.error('Error processing multiple member invites for workspace', { error });
    
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