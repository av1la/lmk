import { container } from 'tsyringe';
import { MongoClientProvider } from '@/adapters/mongodb/provider/MongoClientProvider';
import { User, UserId, UserRole } from '@/domains/user/UserDomain';
import { Workspace, WorkspaceId, WorkspaceRole, WorkspaceSettings } from '@/domains/workspace/WorkspaceDomain';
import { Project, ProjectId, ProjectStatus, ProjectVisibility, ProjectSettings } from '@/domains/project/ProjectDomain';
import { Page, PageId, PageStatus, PageType, PageSEO, GrapesJSData } from '@/domains/page/PageDomain';

export class TestHelpers {
  static async clearDatabase(): Promise<void> {
    const mongoProvider = container.resolve<MongoClientProvider>('MongoClientProvider');
    await mongoProvider.waitForConnection();
    const db = mongoProvider.getDb();
    
    const collections = await db.listCollections().toArray();
    await Promise.all(
      collections.map(collection => db.collection(collection.name).deleteMany({}))
    );
  }

  static createTestUser(overrides: Partial<User> = {}): User {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return {
      clerkId: `test_clerk_${timestamp}_${random}`,
      name: 'Test User',
      email: `test${timestamp}_${random}@example.com`,
      roles: [UserRole.USER],
      profile: {
        firstName: 'Test',
        lastName: 'User',
        timezone: 'UTC',
        language: 'en'
      },
      ...overrides
    };
  }

  static createTestWorkspace(ownerId: UserId, overrides: Partial<Workspace> = {}): Workspace {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return {
      name: 'Test Workspace',
      slug: `test-workspace-${timestamp}-${random}`,
      description: 'A test workspace',
      ownerId,
      members: [],
      invites: [],
      settings: {
        allowPublicProjects: true,
        defaultProjectVisibility: 'PRIVATE'
      } as WorkspaceSettings,
      ...overrides
    };
  }

  static createTestProject(workspaceId: WorkspaceId, createdBy: UserId, overrides: Partial<Project> = {}): Project {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return {
      name: 'Test Project',
      slug: `test-project-${timestamp}-${random}`,
      description: 'A test project',
      workspaceId,
      createdBy,
      status: ProjectStatus.DRAFT,
      visibility: ProjectVisibility.PRIVATE,
      deployments: [],
      settings: {
        seoTitle: 'Test Project',
        seoDescription: 'A test project description'
      } as ProjectSettings,
      ...overrides
    };
  }

  static createTestPage(projectId: ProjectId, createdBy: UserId, overrides: Partial<Page> = {}): Page {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return {
      name: 'Test Page',
      slug: `test-page-${timestamp}-${random}`,
      path: `/test-page-${timestamp}-${random}`,
      type: PageType.LANDING,
      projectId,
      createdBy,
      status: PageStatus.DRAFT,
      data: {
        html: '<div>Test HTML</div>',
        css: 'body { margin: 0; }',
        components: [],
        styles: [],
        assets: [],
        pages: []
      } as GrapesJSData,
      versions: [],
      seo: {
        title: 'Test Page',
        description: 'A test page'
      } as PageSEO,
      isHomepage: false,
      order: 1,
      ...overrides
    };
  }

  static generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}