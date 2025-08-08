import { BaseId } from '@/shared/util/BaseId';
import { UserId } from '@/domains/user/UserDomain';

export class WorkspaceId extends BaseId {
  toString(): string {
    return `WORKSPACE-ID-${this.value}`;
  }
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export enum WorkspacePlan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

export enum WorkspaceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}

export interface WorkspaceMember {
  userId: UserId; // Keep as UserId for internal use
  role: WorkspaceRole;
  invitedBy?: UserId; // Keep as UserId for internal use
  joinedAt: Date;
  invitedAt?: Date;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  invitedByClerkId: string; // Clerk ID of the person who sent the invite
  token: string;
  expiresAt: Date;
  createdAt: Date;
  accepted?: boolean;
  acceptedAt?: Date;
  acceptedByClerkId?: string; // Clerk ID of the person who accepted
}

export interface WorkspaceSettings {
  allowPublicProjects: boolean;
  defaultProjectVisibility: 'PUBLIC' | 'PRIVATE';
  customDomain?: string;
  subdomain?: string;
}

export interface WorkspaceData {
  id?: WorkspaceId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: UserId; // Keep as UserId for internal use
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  members?: WorkspaceMember[];
  invites?: WorkspaceInvite[];
  settings?: WorkspaceSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Workspace implements WorkspaceData {
  id?: WorkspaceId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: UserId; // Keep as UserId for internal use
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  settings: WorkspaceSettings;
  createdAt?: Date;
  updatedAt?: Date;

  constructor(data: WorkspaceData) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.description = data.description;
    this.logo = data.logo;
    this.ownerId = data.ownerId;
    this.plan = data.plan;
    this.status = data.status;
    this.members = data.members || [];
    this.invites = data.invites || [];
    this.settings = data.settings || {
      allowPublicProjects: true,
      defaultProjectVisibility: 'PRIVATE'
    };
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  isOwner(userId: UserId): boolean {
    return this.ownerId.value === userId.value;
  }

  canInviteMembers(userId: UserId): boolean {
    return this.isOwner(userId) || this.getMemberRole(userId) === WorkspaceRole.ADMIN;
  }

  canDeleteMembers(userId: UserId): boolean {
    return this.isOwner(userId) || this.getMemberRole(userId) === WorkspaceRole.ADMIN;
  }

  getMemberRole(userId: UserId): WorkspaceRole | null {
    if (this.isOwner(userId)) return WorkspaceRole.OWNER;
    
    const member = this.members.find(m => m.userId.value === userId.value);
    return member ? member.role : null;
  }

  isActive(): boolean {
    return this.status === WorkspaceStatus.ACTIVE;
  }
}

export interface WorkspaceService {
  findAll(): Promise<Workspace[]>;
  findById(id: WorkspaceId): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByUserId(userId: UserId): Promise<Workspace[]>;
  create(workspaceData: Workspace): Promise<Workspace>;
  update(id: WorkspaceId, workspaceData: Partial<Workspace>): Promise<Workspace | null>;
  delete(id: WorkspaceId): Promise<boolean>;
  addMember(workspaceId: WorkspaceId, userId: UserId, role: WorkspaceRole, invitedBy?: UserId): Promise<Workspace | null>;
  removeMember(workspaceId: WorkspaceId, userId: UserId): Promise<Workspace | null>;
  updateMemberRole(workspaceId: WorkspaceId, userId: UserId, role: WorkspaceRole): Promise<Workspace | null>;
  getMemberStats(workspaceId: WorkspaceId): Promise<{ total: number; owners: number; admins: number; editors: number; viewers: number; }>;
  inviteMember(workspaceId: WorkspaceId, email: string, role: WorkspaceRole, invitedBy: UserId): Promise<WorkspaceInvite>;
  acceptInvite(token: string, userId: UserId): Promise<Workspace | null>;
  revokeInvite(workspaceId: WorkspaceId, inviteId: string): Promise<boolean>;
  getUserRole(workspaceId: WorkspaceId, userId: UserId): Promise<WorkspaceRole | null>;
  hasPermission(workspaceId: WorkspaceId, userId: UserId, permission: string): Promise<boolean>;
}

export interface WorkspaceRepository {
  findAll(): Promise<Workspace[]>;
  findById(id: WorkspaceId): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByOwnerId(ownerId: UserId): Promise<Workspace | null>;
  findAllByOwnerId(ownerId: UserId): Promise<Workspace[]>;
  findByUserId(userId: UserId): Promise<Workspace[]>;
  save(workspace: Workspace): Promise<Workspace>;
  update(id: WorkspaceId, workspace: Partial<Workspace>): Promise<Workspace | null>;
  delete(id: WorkspaceId): Promise<boolean>;
  findInviteByToken(token: string): Promise<WorkspaceInvite | null>;
}