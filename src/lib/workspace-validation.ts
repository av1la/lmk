import { createWorkspaceService } from '@/domains/workspace/WorkspaceService';

export async function validateWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  try {
    const workspaceService = createWorkspaceService();
    return await workspaceService.validateUserAccess(workspaceId, userId);
  } catch (error) {
    return false;
  }
}