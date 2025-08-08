import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validateWorkspaceAccess } from '@/lib/workspace-validation';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';
import { WorkspaceId, WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';
import { UserId } from '@/domains/user/UserDomain';

interface Context {
  params: Promise<{ workspaceId: string; memberId: string }>;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { workspaceId, memberId } = await context.params;
    const body = await request.json();
    const { role } = body;

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Nova função é obrigatória' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(WorkspaceRole).includes(role as WorkspaceRole)) {
      return NextResponse.json(
        { error: 'Função inválida' },
        { status: 400 }
      );
    }

    const workspaceService = createWorkspaceService();
    const workspaceIdObj = new WorkspaceId(workspaceId);
    const memberUserIdObj = new UserId(memberId);

    await workspaceService.updateMemberRole(
      workspaceIdObj, 
      memberUserIdObj, 
      role as WorkspaceRole
    );

    return NextResponse.json({ 
      success: true,
      message: 'Função atualizada com sucesso' 
    });

  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { workspaceId, memberId } = await context.params;

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 403 }
      );
    }

    const workspaceService = createWorkspaceService();
    const workspaceIdObj = new WorkspaceId(workspaceId);
    const memberUserIdObj = new UserId(memberId);

    await workspaceService.removeMember(workspaceIdObj, memberUserIdObj);

    return NextResponse.json({ 
      success: true,
      message: 'Membro removido com sucesso' 
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}