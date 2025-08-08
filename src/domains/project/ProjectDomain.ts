import { BaseId } from '@/shared/util/BaseId';
import { UserId } from '@/domains/user/UserDomain';
import { WorkspaceId, WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';

export class ProjectId extends BaseId {
  toString(): string {
    return `PROJECT-ID-${this.value}`;
  }
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export interface ProjectDeployment {
  id: string;
  url: string;
  customDomain?: string;
  deployedAt: Date;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  provider: 'VERCEL' | 'CLOUDFLARE' | 'NETLIFY';
  buildId?: string;
  errorMessage?: string;
}

export interface ProjectMember {
  userId: UserId;
  role: WorkspaceRole;
  addedAt: Date;
  addedBy: UserId;
}

export interface ProjectSettings {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  favicon?: string;
  customCSS?: string;
  customJS?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

export interface ProjectData {
  id?: ProjectId;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  workspaceId: WorkspaceId;
  createdBy: UserId;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  members?: ProjectMember[]; // Only for PRIVATE projects
  deployments?: ProjectDeployment[];
  settings?: ProjectSettings;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

export class Project implements ProjectData {
  id?: ProjectId;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  workspaceId: WorkspaceId;
  createdBy: UserId;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  members?: ProjectMember[]; // Only for PRIVATE projects
  deployments: ProjectDeployment[];
  settings: ProjectSettings;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;

  constructor(data: ProjectData) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.description = data.description;
    this.thumbnail = data.thumbnail;
    this.workspaceId = data.workspaceId;
    this.createdBy = data.createdBy;
    this.status = data.status as ProjectStatus;
    this.visibility = data.visibility as ProjectVisibility;
    
    // Only set members for PRIVATE projects
    if (this.visibility === ProjectVisibility.PRIVATE) {
      this.members = data.members || [];
    }
    
    this.deployments = data.deployments || [];
    this.settings = data.settings || {};
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.publishedAt = data.publishedAt;
  }

  // Member management methods (only for PRIVATE projects)
  isPrivate(): boolean {
    return this.visibility === ProjectVisibility.PRIVATE;
  }

  hasMember(userId: UserId): boolean {
    if (!this.isPrivate() || !this.members) return false;
    return this.members.some(member => member.userId.value === userId.value);
  }

  getMemberRole(userId: UserId): WorkspaceRole | null {
    if (!this.isPrivate() || !this.members) return null;
    const member = this.members.find(member => member.userId.value === userId.value);
    return member ? member.role : null;
  }

  addMember(userId: UserId, role: WorkspaceRole, addedBy: UserId): void {
    if (!this.isPrivate()) {
      throw new Error('Cannot add members to public projects');
    }
    
    if (!this.members) {
      this.members = [];
    }

    // Check if member already exists
    if (this.hasMember(userId)) {
      throw new Error('User is already a member of this project');
    }

    this.members.push({
      userId,
      role,
      addedAt: new Date(),
      addedBy
    });
  }

  removeMember(userId: UserId): void {
    if (!this.isPrivate() || !this.members) {
      throw new Error('Cannot remove members from public projects');
    }

    this.members = this.members.filter(member => member.userId.value !== userId.value);
  }

  updateMemberRole(userId: UserId, role: WorkspaceRole): void {
    if (!this.isPrivate() || !this.members) {
      throw new Error('Cannot update member roles in public projects');
    }

    const memberIndex = this.members.findIndex(member => member.userId.value === userId.value);
    if (memberIndex === -1) {
      throw new Error('Member not found in project');
    }

    this.members[memberIndex].role = role;
  }
}

export interface ProjectService {
  findAll(): Promise<Project[]>;
  findById(id: ProjectId): Promise<Project | null>;
  findBySlug(slug: string, workspaceId: WorkspaceId): Promise<Project | null>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<Project[]>;
  findByUserId(userId: UserId): Promise<Project[]>;
  create(projectData: Project): Promise<Project>;
  update(id: ProjectId, projectData: Partial<Project>): Promise<Project | null>;
  delete(id: ProjectId): Promise<boolean>;
  publish(id: ProjectId): Promise<Project | null>;
  unpublish(id: ProjectId): Promise<Project | null>;
  archive(id: ProjectId): Promise<Project | null>;
  duplicate(id: ProjectId, newName: string, createdBy: UserId): Promise<Project>;
  deploy(id: ProjectId, provider: 'VERCEL' | 'CLOUDFLRE' | 'NETLIFY'): Promise<ProjectDeployment>;
  getDeployments(id: ProjectId): Promise<ProjectDeployment[]>;
  updateSettings(id: ProjectId, settings: Partial<ProjectSettings>): Promise<Project | null>;
  
  // Member management methods
  getEffectiveMembers(id: ProjectId): Promise<ProjectMember[]>;
  addMemberToProject(id: ProjectId, userId: UserId, role: WorkspaceRole, addedBy: UserId): Promise<Project | null>;
  removeMemberFromProject(id: ProjectId, userId: UserId): Promise<Project | null>;
  updateProjectMemberRole(id: ProjectId, userId: UserId, role: WorkspaceRole): Promise<Project | null>;
}

export interface ProjectRepository {
  findAll(): Promise<Project[]>;
  findById(id: ProjectId): Promise<Project | null>;
  findBySlug(slug: string, workspaceId: WorkspaceId): Promise<Project | null>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<Project[]>;
  findByUserId(userId: UserId): Promise<Project[]>;
  save(project: Project): Promise<Project>;
  update(id: ProjectId, project: Partial<Project>): Promise<Project | null>;
  delete(id: ProjectId): Promise<boolean>;
}