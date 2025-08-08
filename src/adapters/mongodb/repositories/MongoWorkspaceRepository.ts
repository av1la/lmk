import { Collection, ObjectId, WithId } from 'mongodb';
import { 
  Workspace, 
  WorkspaceId, 
  WorkspaceRepository, 
  WorkspaceRole, 
  WorkspaceMember, 
  WorkspaceInvite,
  WorkspaceSettings
} from '@/domains/workspace/WorkspaceDomain';
import { UserId } from '@/domains/user/UserDomain';
import { MongoClientProviderImpl } from '@/adapters/mongodb/provider/MongoClientProvider';

interface MongoWorkspaceMember {
  userId: string;
  role: string;
  invitedBy?: string;
  joinedAt: Date;
  invitedAt?: Date;
}

interface MongoWorkspaceInvite {
  id: string;
  email: string;
  role: string;
  invitedByClerkId: string; // Changed from invitedBy
  token: string;
  expiresAt: Date;
  createdAt: Date;
  accepted?: boolean;
  acceptedAt?: Date;
  acceptedByClerkId?: string; // Added new field
}

interface MongoWorkspaceSettings {
  allowPublicProjects: boolean;
  defaultProjectVisibility: string;
  customDomain?: string;
  subdomain?: string;
}

interface MongoWorkspace {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  ownerId: string;
  plan: string;
  status: string;
  members: MongoWorkspaceMember[];
  invites: MongoWorkspaceInvite[];
  settings: MongoWorkspaceSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MongoWorkspaceRepository implements WorkspaceRepository {
  private collection?: Collection<MongoWorkspace>;
  private readonly collectionName = 'workspaces';
  private readonly mongoProvider: MongoClientProviderImpl;
  private initialized = false;

  constructor() {
    this.mongoProvider = new MongoClientProviderImpl();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.collection) return;
    
    await this.mongoProvider.waitForConnection();
    const db = this.mongoProvider.getDb();
    this.collection = db.collection<MongoWorkspace>(this.collectionName);
    this.initialized = true;
    await this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;
    try {
      await this.collection.createIndex({ slug: 1 }, { unique: true });
      await this.collection.createIndex({ ownerId: 1 });
      await this.collection.createIndex({ 'members.userId': 1 });
      await this.collection.createIndex({ 'invites.token': 1 });
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  async findAll(): Promise<Workspace[]> {
    await this.ensureInitialized();
    const workspaces = await this.collection!.find().toArray();
    return workspaces.map(doc => this.mapMongoToDomain(doc));
  }

  async findById(id: WorkspaceId): Promise<Workspace | null> {
    await this.ensureInitialized();
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const workspace = await this.collection!.findOne({ _id: new ObjectId(idValue) });
    return workspace ? this.mapMongoToDomain(workspace) : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    await this.ensureInitialized();
    const workspace = await this.collection!.findOne({ slug });
    return workspace ? this.mapMongoToDomain(workspace) : null;
  }

  async findByUserId(userId: UserId): Promise<Workspace[]> {
    const userIdValue = userId.getValue();
    await this.ensureInitialized();
    const workspaces = await this.collection!.find({
      $or: [
        { ownerId: userIdValue },
        { 'members.userId': userIdValue }
      ]
    }).toArray();
    
    return workspaces.map(doc => this.mapMongoToDomain(doc));
  }

  async findByOwnerId(ownerId: UserId): Promise<Workspace | null> {
    await this.ensureInitialized();
    const workspace = await this.collection!.findOne({ ownerId: ownerId.getValue() });
    return workspace ? this.mapMongoToDomain(workspace) : null;
  }

  async findAllByOwnerId(ownerId: UserId): Promise<Workspace[]> {
    await this.ensureInitialized();
    const workspaces = await this.collection!.find({ ownerId: ownerId.getValue() }).toArray();
    return workspaces.map(doc => this.mapMongoToDomain(doc));
  }

  async save(workspace: Workspace): Promise<Workspace> {
    if (workspace.id) {
      // Update existing workspace
      const result = await this.update(workspace.id, workspace);
      return result || workspace;
    } else {
      // Create new workspace
      return this.create(workspace);
    }
  }

  async create(workspace: Workspace): Promise<Workspace> {
    const now = new Date();
    const mongoWorkspace: Omit<MongoWorkspace, '_id'> = {
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logo: workspace.logo,
      ownerId: workspace.ownerId.getValue(),
      plan: workspace.plan,
      status: workspace.status,
      members: workspace.members.map(member => ({
        userId: member.userId.getValue(),
        role: member.role,
        invitedBy: member.invitedBy?.getValue(), // Keep for members - they use internal IDs
        joinedAt: member.joinedAt,
        invitedAt: member.invitedAt
      })),
      invites: workspace.invites.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedByClerkId: invite.invitedByClerkId, // Changed from invitedBy.getValue()
        token: invite.token,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        accepted: invite.accepted,
        acceptedAt: invite.acceptedAt,
        acceptedByClerkId: invite.acceptedByClerkId // Added new field
      })),
      settings: {
        allowPublicProjects: workspace.settings.allowPublicProjects,
        defaultProjectVisibility: workspace.settings.defaultProjectVisibility,
        customDomain: workspace.settings.customDomain,
        subdomain: workspace.settings.subdomain
      },
      createdAt: workspace.createdAt || now,
      updatedAt: workspace.updatedAt || now
    };

    await this.ensureInitialized();
    const result = await this.collection!.insertOne(mongoWorkspace);

    return {
      ...workspace,
      id: new WorkspaceId(result.insertedId.toString()),
      createdAt: mongoWorkspace.createdAt,
      updatedAt: mongoWorkspace.updatedAt
    };
  }

  async update(id: WorkspaceId, workspace: Partial<Workspace>): Promise<Workspace | null> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const now = new Date();
    const updateData: any = {
      ...workspace,
      updatedAt: now,
    };

    if (workspace.ownerId) {
      updateData.ownerId = workspace.ownerId.getValue();
    }

    if (workspace.members) {
      updateData.members = workspace.members.map(member => ({
        userId: member.userId.getValue(),
        role: member.role,
        invitedBy: member.invitedBy?.getValue(), // Keep for members - they use internal IDs
        joinedAt: member.joinedAt,
        invitedAt: member.invitedAt
      }));
    }

    if (workspace.invites) {
      updateData.invites = workspace.invites.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedByClerkId: invite.invitedByClerkId, // Changed from invitedBy.getValue()
        token: invite.token,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        accepted: invite.accepted,
        acceptedAt: invite.acceptedAt,
        acceptedByClerkId: invite.acceptedByClerkId // Added new field
      }));
    }

    if (workspace.settings) {
      updateData.settings = {
        allowPublicProjects: workspace.settings.allowPublicProjects,
        defaultProjectVisibility: workspace.settings.defaultProjectVisibility,
        customDomain: workspace.settings.customDomain,
        subdomain: workspace.settings.subdomain
      };
    }

    await this.ensureInitialized();
    const result: WithId<MongoWorkspace> | null = await this.collection!.findOneAndUpdate(
      { _id: new ObjectId(idValue) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? this.mapMongoToDomain(result) : null;
  }

  async delete(id: WorkspaceId): Promise<boolean> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return false;
    }

    await this.ensureInitialized();
    const result = await this.collection!.deleteOne({ _id: new ObjectId(idValue) });
    return result.deletedCount > 0;
  }

  async findInviteByToken(token: string): Promise<WorkspaceInvite | null> {
    await this.ensureInitialized();
    const workspace = await this.collection!.findOne({ 'invites.token': token });
    if (!workspace) return null;

    const invite = workspace.invites.find(inv => inv.token === token);
    if (!invite) return null;

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role as WorkspaceRole,
      invitedByClerkId: invite.invitedByClerkId, // Changed from UserId conversion
      token: invite.token,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      accepted: invite.accepted,
      acceptedAt: invite.acceptedAt,
      acceptedByClerkId: invite.acceptedByClerkId // Added new field
    };
  }

  private mapMongoToDomain(doc: MongoWorkspace): Workspace {
    if (!doc._id) {
      throw new Error('Document must have an _id');
    }

    return new Workspace({
      id: new WorkspaceId(doc._id.toString()),
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      logo: doc.logo,
      ownerId: new UserId(doc.ownerId),
      plan: doc.plan as any,
      status: doc.status as any,
      members: doc.members.map(member => ({
        userId: new UserId(member.userId),
        role: member.role as WorkspaceRole,
        invitedBy: member.invitedBy ? new UserId(member.invitedBy) : undefined,
        joinedAt: member.joinedAt,
        invitedAt: member.invitedAt
      })),
      invites: doc.invites.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role as WorkspaceRole,
        invitedByClerkId: invite.invitedByClerkId, // Changed from UserId conversion
        token: invite.token,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
        accepted: invite.accepted,
        acceptedAt: invite.acceptedAt,
        acceptedByClerkId: invite.acceptedByClerkId // Added new field
      })),
      settings: {
        allowPublicProjects: doc.settings.allowPublicProjects,
        defaultProjectVisibility: doc.settings.defaultProjectVisibility as 'PUBLIC' | 'PRIVATE',
        customDomain: doc.settings.customDomain,
        subdomain: doc.settings.subdomain
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }
}