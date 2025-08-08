import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug é obrigatório' },
        { status: 400 }
      );
    }

    // Validate slug format
    if (slug.length < 3) {
      return NextResponse.json({
        available: false,
        error: 'Slug deve ter pelo menos 3 caracteres'
      });
    }

    // Check if slug contains only valid characters
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json({
        available: false,
        error: 'Slug deve conter apenas letras minúsculas, números e hífens'
      });
    }

    // Check if slug starts or ends with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return NextResponse.json({
        available: false,
        error: 'Slug não pode começar ou terminar com hífen'
      });
    }

    const workspaceService = createWorkspaceService();
    const existingWorkspace = await workspaceService.findBySlug(slug);

    return NextResponse.json({
      available: !existingWorkspace,
      slug: slug
    });

  } catch (error) {
    console.error('Error checking slug availability:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}