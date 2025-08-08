import { 
  Workspace, 
  WorkspaceId, 
  WorkspaceData,
  WorkspacePlan,
  WorkspaceStatus,
  WorkspaceRepository,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceInvite
} from './WorkspaceDomain';
import { UserId } from '@/domains/user/UserDomain';
import { MongoWorkspaceRepository } from '@/adapters/mongodb/repositories/MongoWorkspaceRepository';

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  slug: string;
  ownerId: string;
}

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  slug?: string;
  plan?: WorkspacePlan;
  status?: WorkspaceStatus;
}

export class WorkspaceService {
  constructor(
    private workspaceRepository: WorkspaceRepository
  ) {}

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    // Check if slug is already taken
    const existingSlug = await this.workspaceRepository.findBySlug(data.slug);
    if (existingSlug) {
      throw new Error('Este slug já está em uso');
    }

    const workspaceData: WorkspaceData = {
      name: data.name,
      description: data.description || '',
      slug: data.slug,
      ownerId: new UserId(data.ownerId),
      plan: WorkspacePlan.FREE,
      status: WorkspaceStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const workspace = new Workspace(workspaceData);
    const savedWorkspace = await this.workspaceRepository.save(workspace);

    // Add the creator as the first member (OWNER) in the workspace members array
    if (savedWorkspace.id) {
      const ownerMember: WorkspaceMember = {
        userId: new UserId(data.ownerId),
        role: WorkspaceRole.OWNER,
        joinedAt: new Date()
      };
      
      savedWorkspace.members.push(ownerMember);
      await this.workspaceRepository.update(savedWorkspace.id, {
        members: savedWorkspace.members,
        updatedAt: new Date()
      });
    }

    return savedWorkspace;
  }

  async updateWorkspace(id: WorkspaceId, data: UpdateWorkspaceData): Promise<Workspace | null> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new Error('Workspace não encontrado');
    }

    // Check if new slug is already taken (if provided)
    if (data.slug && data.slug !== workspace.slug) {
      const existingSlug = await this.workspaceRepository.findBySlug(data.slug);
      if (existingSlug && existingSlug.id?.value !== id.value) {
        throw new Error('Este slug já está em uso');
      }
    }

    return await this.workspaceRepository.update(id, {
      ...data,
      updatedAt: new Date()
    });
  }

  async getUserWorkspace(userId: string): Promise<Workspace | null> {
    return await this.workspaceRepository.findByOwnerId(new UserId(userId));
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    // findByUserId already includes both owned and member workspaces
    return await this.workspaceRepository.findByUserId(new UserId(userId));
  }

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    return await this.workspaceRepository.findById(id);
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    return await this.workspaceRepository.findBySlug(slug);
  }

  async validateUserAccess(workspaceId: string, clerkId: string): Promise<boolean> {
    const workspace = await this.workspaceRepository.findById(new WorkspaceId(workspaceId));
    if (!workspace) {
      return false;
    }

    // Check if user is the owner (owner still uses internal ID, need to lookup)
    // For now, assume owner was also created with Clerk ID
    const isOwner = workspace.ownerId?.value === clerkId;
    
    // Check if user is a member (members now use Clerk ID as userId.value)
    const isMember = workspace.members.some(m => m.userId.value === clerkId);
    
    return isOwner || isMember;
  }

  async deleteWorkspace(id: WorkspaceId, userId: string): Promise<boolean> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) {
      throw new Error('Workspace não encontrado');
    }

    if (workspace.ownerId?.value !== userId) {
      throw new Error('Sem permissão para deletar este workspace');
    }

    return await this.workspaceRepository.delete(id);
  }

  // Member management methods
  async addMember(workspaceId: WorkspaceId, userId: UserId, role: WorkspaceRole, invitedBy?: UserId): Promise<Workspace | null> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace não encontrado');
    }

    // Check if member already exists
    const existingMember = workspace.members.find(m => m.userId.value === userId.value);
    if (existingMember) {
      throw new Error('Usuário já é membro deste workspace');
    }

    const newMember: WorkspaceMember = {
      userId,
      role,
      joinedAt: new Date(),
      invitedBy,
      invitedAt: invitedBy ? new Date() : undefined
    };

    workspace.members.push(newMember);
    return await this.workspaceRepository.update(workspaceId, {
      members: workspace.members,
      updatedAt: new Date()
    });
  }

  async removeMember(workspaceId: WorkspaceId, userId: UserId): Promise<Workspace | null> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace não encontrado');
    }

    // Don't allow removing the owner
    if (workspace.ownerId.value === userId.value) {
      throw new Error('Não é possível remover o proprietário do workspace');
    }

    workspace.members = workspace.members.filter(m => m.userId.value !== userId.value);
    return await this.workspaceRepository.update(workspaceId, {
      members: workspace.members,
      updatedAt: new Date()
    });
  }

  async updateMemberRole(workspaceId: WorkspaceId, userId: UserId, role: WorkspaceRole): Promise<Workspace | null> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace não encontrado');
    }

    // Don't allow changing owner role
    if (workspace.ownerId.value === userId.value) {
      throw new Error('Não é possível alterar o papel do proprietário');
    }

    const memberIndex = workspace.members.findIndex(m => m.userId.value === userId.value);
    if (memberIndex === -1) {
      throw new Error('Membro não encontrado');
    }

    workspace.members[memberIndex].role = role;
    return await this.workspaceRepository.update(workspaceId, {
      members: workspace.members,
      updatedAt: new Date()
    });
  }

  async getMemberStats(workspaceId: WorkspaceId): Promise<{
    total: number;
    owners: number;
    admins: number;
    editors: number;
    viewers: number;
  }> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      return { total: 0, owners: 0, admins: 0, editors: 0, viewers: 0 };
    }

    const allMembers = [...workspace.members];
    // Add owner to members for counting if not already there
    const ownerInMembers = allMembers.find(m => m.userId.value === workspace.ownerId.value);
    if (!ownerInMembers) {
      allMembers.push({
        userId: workspace.ownerId,
        role: WorkspaceRole.OWNER,
        joinedAt: workspace.createdAt || new Date()
      });
    }

    return {
      total: allMembers.length,
      owners: allMembers.filter(m => m.role === WorkspaceRole.OWNER).length,
      admins: allMembers.filter(m => m.role === WorkspaceRole.ADMIN).length,
      editors: allMembers.filter(m => m.role === WorkspaceRole.EDITOR).length,
      viewers: allMembers.filter(m => m.role === WorkspaceRole.VIEWER).length
    };
  }

  async updateInvites(workspaceId: WorkspaceId, invites: WorkspaceInvite[]): Promise<Workspace | null> {
    return await this.workspaceRepository.update(workspaceId, {
      invites,
      updatedAt: new Date()
    });
  }

  async addMemberByClerkId(workspaceId: WorkspaceId, clerkId: string, role: WorkspaceRole, invitedByClerkId?: string): Promise<Workspace | null> {
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace não encontrado');
    }

    // Check if member already exists by comparing Clerk IDs
    const existingMember = workspace.members.find(m => {
      // We need a way to check if this member's UserId corresponds to the Clerk ID
      // For now, we'll create a UserId from a clerk ID (this is a temporary solution)
      return m.userId.value === clerkId; // Assuming internal ID matches Clerk ID temporarily
    });
    
    if (existingMember) {
      throw new Error('Usuário já é membro deste workspace');
    }

    // Create UserId from Clerk ID (temporary solution - should use lookup)
    const userId = new UserId(clerkId);
    let invitedByUserId: UserId | undefined;
    
    if (invitedByClerkId) {
      invitedByUserId = new UserId(invitedByClerkId);
    }

    const newMember: WorkspaceMember = {
      userId,
      role,
      joinedAt: new Date(),
      invitedBy: invitedByUserId,
      invitedAt: invitedByUserId ? new Date() : undefined
    };

    workspace.members.push(newMember);
    return await this.workspaceRepository.update(workspaceId, {
      members: workspace.members,
      updatedAt: new Date()
    });
  }
}

// Factory function
export function createWorkspaceService(): WorkspaceService {
  const workspaceRepository = new MongoWorkspaceRepository();
  return new WorkspaceService(workspaceRepository);
}