import { Collection, ObjectId, WithId } from 'mongodb';
import { 
  Project, 
  ProjectId, 
  ProjectRepository, 
  ProjectStatus,
  ProjectVisibility,
  ProjectDeployment,
  ProjectSettings
} from '@/domains/project/ProjectDomain';
import { UserId } from '@/domains/user/UserDomain';
import { WorkspaceId, WorkspaceRole } from '@/domains/workspace/WorkspaceDomain';
import { MongoClientProviderImpl } from '@/adapters/mongodb/provider/MongoClientProvider';

interface MongoProjectDeployment {
  id: string;
  url: string;
  customDomain?: string;
  deployedAt: Date;
  status: string;
  provider: string;
  buildId?: string;
  errorMessage?: string;
}

interface MongoProjectSettings {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  favicon?: string;
  customCSS?: string;
  customJS?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

interface MongoProjectMember {
  userId: string;
  role: string;
  addedAt: Date;
  addedBy: string;
}

interface MongoProject {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  workspaceId: string;
  createdBy: string;
  status: string;
  visibility: string;
  members?: MongoProjectMember[]; // Only for PRIVATE projects
  deployments: MongoProjectDeployment[];
  settings: MongoProjectSettings;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
}

export class MongoProjectRepository implements ProjectRepository {
  private collection?: Collection<MongoProject>;
  private readonly collectionName = 'projects';
  private initialized = false;
  private readonly mongoProvider: MongoClientProviderImpl;

  constructor() {
    this.mongoProvider = new MongoClientProviderImpl();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.collection) return;
    
    await this.mongoProvider.waitForConnection();
    const db = this.mongoProvider.getDb();
    this.collection = db.collection<MongoProject>(this.collectionName);
    
    if (!this.initialized) {
      await this.createIndexes();
      this.initialized = true;
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;
    
    try {
      await this.collection.createIndex({ workspaceId: 1, slug: 1 }, { unique: true });
      await this.collection.createIndex({ workspaceId: 1 });
      await this.collection.createIndex({ createdBy: 1 });
      await this.collection.createIndex({ status: 1 });
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  async findAll(): Promise<Project[]> {
    await this.ensureInitialized();
    const projects = await this.collection!.find().toArray();
    return projects.map(doc => this.mapMongoToDomain(doc));
  }

  async findById(id: ProjectId): Promise<Project | null> {
    await this.ensureInitialized();
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const project = await this.collection!.findOne({ _id: new ObjectId(idValue) });
    return project ? this.mapMongoToDomain(project) : null;
  }

  async findBySlug(slug: string, workspaceId: WorkspaceId): Promise<Project | null> {
    await this.ensureInitialized();
    const project = await this.collection!.findOne({ 
      slug, 
      workspaceId: workspaceId.getValue() 
    });
    return project ? this.mapMongoToDomain(project) : null;
  }

  async findByWorkspaceId(workspaceId: WorkspaceId): Promise<Project[]> {
    await this.ensureInitialized();
    const projects = await this.collection!.find({ 
      workspaceId: workspaceId.getValue() 
    }).toArray();
    return projects.map(doc => this.mapMongoToDomain(doc));
  }

  async findByUserId(userId: UserId): Promise<Project[]> {
    await this.ensureInitialized();
    const projects = await this.collection!.find({ 
      createdBy: userId.getValue() 
    }).toArray();
    return projects.map(doc => this.mapMongoToDomain(doc));
  }

  async save(project: Project): Promise<Project> {
    await this.ensureInitialized();
    const now = new Date();
    const mongoProject: Omit<MongoProject, '_id'> = {
      name: project.name,
      slug: project.slug,
      description: project.description,
      thumbnail: project.thumbnail,
      workspaceId: project.workspaceId.getValue(),
      createdBy: project.createdBy.getValue(),
      status: project.status,
      visibility: project.visibility,
      
      // Include members only for PRIVATE projects
      ...(project.members && {
        members: project.members.map(member => ({
          userId: member.userId.getValue(),
          role: member.role,
          addedAt: member.addedAt,
          addedBy: member.addedBy.getValue()
        }))
      }),
      
      deployments: project.deployments.map(deployment => ({
        id: deployment.id,
        url: deployment.url,
        customDomain: deployment.customDomain,
        deployedAt: deployment.deployedAt,
        status: deployment.status,
        provider: deployment.provider,
        buildId: deployment.buildId,
        errorMessage: deployment.errorMessage
      })),
      settings: {
        seoTitle: project.settings.seoTitle,
        seoDescription: project.settings.seoDescription,
        seoKeywords: project.settings.seoKeywords,
        favicon: project.settings.favicon,
        customCSS: project.settings.customCSS,
        customJS: project.settings.customJS,
        googleAnalyticsId: project.settings.googleAnalyticsId,
        facebookPixelId: project.settings.facebookPixelId
      },
      createdAt: project.createdAt || now,
      updatedAt: project.updatedAt || now,
      publishedAt: project.publishedAt
    };

    const result = await this.collection!.insertOne(mongoProject);

    return new Project({
      ...project,
      id: new ProjectId(result.insertedId.toString()),
      createdAt: mongoProject.createdAt,
      updatedAt: mongoProject.updatedAt
    });
  }

  async update(id: ProjectId, project: Partial<Project>): Promise<Project | null> {
    await this.ensureInitialized();
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const now = new Date();
    const updateData: Record<string, any> = {
      ...project,
      updatedAt: now,
    };

    if (project.workspaceId) {
      updateData.workspaceId = project.workspaceId.getValue();
    }

    if (project.createdBy) {
      updateData.createdBy = project.createdBy.getValue();
    }

    if (project.deployments) {
      updateData.deployments = project.deployments.map(deployment => ({
        id: deployment.id,
        url: deployment.url,
        customDomain: deployment.customDomain,
        deployedAt: deployment.deployedAt,
        status: deployment.status,
        provider: deployment.provider,
        buildId: deployment.buildId,
        errorMessage: deployment.errorMessage
      }));
    }

    if (project.settings) {
      updateData.settings = {
        seoTitle: project.settings.seoTitle,
        seoDescription: project.settings.seoDescription,
        seoKeywords: project.settings.seoKeywords,
        favicon: project.settings.favicon,
        customCSS: project.settings.customCSS,
        customJS: project.settings.customJS,
        googleAnalyticsId: project.settings.googleAnalyticsId,
        facebookPixelId: project.settings.facebookPixelId
      };
    }

    if (project.members !== undefined) {
      updateData.members = project.members.map(member => ({
        userId: member.userId.getValue(),
        role: member.role,
        addedAt: member.addedAt,
        addedBy: member.addedBy.getValue()
      }));
    }

    const result: WithId<MongoProject> | null = await this.collection!.findOneAndUpdate(
      { _id: new ObjectId(idValue) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? this.mapMongoToDomain(result) : null;
  }

  async delete(id: ProjectId): Promise<boolean> {
    await this.ensureInitialized();
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return false;
    }

    const result = await this.collection!.deleteOne({ _id: new ObjectId(idValue) });
    return result.deletedCount > 0;
  }

  private mapMongoToDomain(doc: MongoProject): Project {
    if (!doc._id) {
      throw new Error('Document must have an _id');
    }

    return new Project({
      id: new ProjectId(doc._id.toString()),
      name: doc.name,
      slug: doc.slug,
      description: doc.description,
      thumbnail: doc.thumbnail,
      workspaceId: new WorkspaceId(doc.workspaceId),
      createdBy: new UserId(doc.createdBy),
      status: doc.status as ProjectStatus,
      visibility: doc.visibility as ProjectVisibility,
      
      // Map members only if they exist (for PRIVATE projects)
      ...(doc.members && {
        members: doc.members.map(member => ({
          userId: new UserId(member.userId),
          role: member.role as WorkspaceRole,
          addedAt: member.addedAt,
          addedBy: new UserId(member.addedBy)
        }))
      }),
      
      deployments: doc.deployments.map(deployment => ({
        id: deployment.id,
        url: deployment.url,
        customDomain: deployment.customDomain,
        deployedAt: deployment.deployedAt,
        status: deployment.status as 'PENDING' | 'SUCCESS' | 'FAILED',
        provider: deployment.provider as 'VERCEL' | 'CLOUDFLARE' | 'NETLIFY',
        buildId: deployment.buildId,
        errorMessage: deployment.errorMessage
      })),
      settings: {
        seoTitle: doc.settings.seoTitle,
        seoDescription: doc.settings.seoDescription,
        seoKeywords: doc.settings.seoKeywords,
        favicon: doc.settings.favicon,
        customCSS: doc.settings.customCSS,
        customJS: doc.settings.customJS,
        googleAnalyticsId: doc.settings.googleAnalyticsId,
        facebookPixelId: doc.settings.facebookPixelId
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      publishedAt: doc.publishedAt
    });
  }
}