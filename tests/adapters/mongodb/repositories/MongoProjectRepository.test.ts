import { describe, beforeEach, test, expect } from '@jest/globals';
import { container } from 'tsyringe';
import { MongoProjectRepository } from '@/adapters/mongodb/repositories/MongoProjectRepository';
import { MongoUserRepository } from '@/adapters/mongodb/repositories/MongoUserRepository';
import { MongoWorkspaceRepository } from '@/adapters/mongodb/repositories/MongoWorkspaceRepository';
import { Project, ProjectId, ProjectStatus, ProjectVisibility } from '@/domains/project/ProjectDomain';
import { User, UserId } from '@/domains/user/UserDomain';
import { Workspace, WorkspaceId } from '@/domains/workspace/WorkspaceDomain';
import { TestHelpers } from '../../../shared/test-helpers';
import { setupRepositoryTest } from '../../../shared/repository-test-setup';

describe('MongoProjectRepository', () => {
  let projectRepository: MongoProjectRepository;
  let userRepository: MongoUserRepository;
  let workspaceRepository: MongoWorkspaceRepository;
  let testUser: User;
  let testWorkspace: Workspace;

  beforeEach(async () => {
    // Setup test environment
    await setupRepositoryTest();
    
    // Register repositories
    container.registerSingleton('ProjectRepository', MongoProjectRepository);
    container.registerSingleton('UserRepository', MongoUserRepository);
    container.registerSingleton('WorkspaceRepository', MongoWorkspaceRepository);
    
    projectRepository = container.resolve(MongoProjectRepository);
    userRepository = container.resolve(MongoUserRepository);
    workspaceRepository = container.resolve(MongoWorkspaceRepository);
    
    // Clear database before each test
    await TestHelpers.clearDatabase();
    
    // Create test user and workspace
    testUser = await userRepository.create(TestHelpers.createTestUser());
    testWorkspace = await workspaceRepository.create(TestHelpers.createTestWorkspace(testUser.id!));
  });

  describe('create', () => {
    test('should create a new project successfully', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!);

      const createdProject = await projectRepository.create(projectData);

      expect(createdProject).toBeDefined();
      expect(createdProject.id).toBeInstanceOf(ProjectId);
      expect(createdProject.name).toBe(projectData.name);
      expect(createdProject.slug).toBe(projectData.slug);
      expect(createdProject.workspaceId.getValue()).toBe(testWorkspace.id!.getValue());
      expect(createdProject.createdBy.getValue()).toBe(testUser.id!.getValue());
      expect(createdProject.status).toBe(ProjectStatus.DRAFT);
      expect(createdProject.visibility).toBe(ProjectVisibility.PRIVATE);
      expect(createdProject.createdAt).toBeInstanceOf(Date);
      expect(createdProject.updatedAt).toBeInstanceOf(Date);
    });

    test('should create project with settings', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, {
        settings: {
          seoTitle: 'Custom SEO Title',
          seoDescription: 'Custom SEO Description',
          seoKeywords: ['landing', 'page', 'builder'],
          googleAnalyticsId: 'GA-123456'
        }
      });

      const createdProject = await projectRepository.create(projectData);

      expect(createdProject.settings.seoTitle).toBe('Custom SEO Title');
      expect(createdProject.settings.seoDescription).toBe('Custom SEO Description');
      expect(createdProject.settings.seoKeywords).toEqual(['landing', 'page', 'builder']);
      expect(createdProject.settings.googleAnalyticsId).toBe('GA-123456');
    });

    test('should throw error when creating project with duplicate slug in same workspace', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { slug: 'duplicate-slug' });
      
      await projectRepository.create(projectData);

      const duplicateProject = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { 
        slug: 'duplicate-slug',
        name: 'Different Name'
      });

      await expect(projectRepository.create(duplicateProject)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    test('should find project by valid ID', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!);
      const createdProject = await projectRepository.create(projectData);

      const foundProject = await projectRepository.findById(createdProject.id!);

      expect(foundProject).toBeDefined();
      expect(foundProject?.id?.getValue()).toBe(createdProject.id!.getValue());
      expect(foundProject?.name).toBe(projectData.name);
      expect(foundProject?.slug).toBe(projectData.slug);
    });

    test('should return null for non-existent ID', async () => {
      const nonExistentId = new ProjectId(TestHelpers.generateId());

      const foundProject = await projectRepository.findById(nonExistentId);

      expect(foundProject).toBeNull();
    });
  });

  describe('findBySlug', () => {
    test('should find project by slug within workspace', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { slug: 'test-project' });
      await projectRepository.create(projectData);

      const foundProject = await projectRepository.findBySlug('test-project', testWorkspace.id!);

      expect(foundProject).toBeDefined();
      expect(foundProject?.slug).toBe('test-project');
      expect(foundProject?.name).toBe(projectData.name);
    });

    test('should return null for same slug in different workspace', async () => {
      const anotherWorkspace = await workspaceRepository.create(
        TestHelpers.createTestWorkspace(testUser.id!, { name: 'Another Workspace' })
      );
      
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { slug: 'test-project' });
      await projectRepository.create(projectData);

      const foundProject = await projectRepository.findBySlug('test-project', anotherWorkspace.id!);

      expect(foundProject).toBeNull();
    });
  });

  describe('findByWorkspaceId', () => {
    test('should find all projects in workspace', async () => {
      const project1 = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { name: 'Project 1' });
      const project2 = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { name: 'Project 2' });

      await projectRepository.create(project1);
      await projectRepository.create(project2);

      const workspaceProjects = await projectRepository.findByWorkspaceId(testWorkspace.id!);

      expect(workspaceProjects).toHaveLength(2);
      expect(workspaceProjects.some(p => p.name === 'Project 1')).toBe(true);
      expect(workspaceProjects.some(p => p.name === 'Project 2')).toBe(true);
    });

    test('should return empty array for workspace with no projects', async () => {
      const emptyWorkspace = await workspaceRepository.create(
        TestHelpers.createTestWorkspace(testUser.id!, { name: 'Empty Workspace' })
      );

      const workspaceProjects = await projectRepository.findByWorkspaceId(emptyWorkspace.id!);

      expect(workspaceProjects).toHaveLength(0);
    });
  });

  describe('findByUserId', () => {
    test('should find all projects created by user', async () => {
      const project1 = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { name: 'User Project 1' });
      const project2 = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { name: 'User Project 2' });

      await projectRepository.create(project1);
      await projectRepository.create(project2);

      const userProjects = await projectRepository.findByUserId(testUser.id!);

      expect(userProjects).toHaveLength(2);
      expect(userProjects.some(p => p.name === 'User Project 1')).toBe(true);
      expect(userProjects.some(p => p.name === 'User Project 2')).toBe(true);
    });

    test('should return empty array for user with no projects', async () => {
      const anotherUser = await userRepository.create(TestHelpers.createTestUser({ email: 'another@test.com' }));

      const userProjects = await projectRepository.findByUserId(anotherUser.id!);

      expect(userProjects).toHaveLength(0);
    });
  });

  describe('update', () => {
    test('should update project successfully', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!);
      const createdProject = await projectRepository.create(projectData);

      const updateData: Partial<Project> = {
        name: 'Updated Project',
        description: 'Updated description',
        status: ProjectStatus.PUBLISHED,
        publishedAt: new Date()
      };

      const updatedProject = await projectRepository.update(createdProject.id!, updateData);

      expect(updatedProject).toBeDefined();
      expect(updatedProject?.name).toBe('Updated Project');
      expect(updatedProject?.description).toBe('Updated description');
      expect(updatedProject?.status).toBe(ProjectStatus.PUBLISHED);
      expect(updatedProject?.publishedAt).toBeInstanceOf(Date);
      expect(updatedProject?.updatedAt).toBeInstanceOf(Date);
    });

    test('should update project settings', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!);
      const createdProject = await projectRepository.create(projectData);

      const updateData: Partial<Project> = {
        settings: {
          seoTitle: 'New SEO Title',
          customCSS: 'body { background: red; }',
          facebookPixelId: 'FB-987654'
        }
      };

      const updatedProject = await projectRepository.update(createdProject.id!, updateData);

      expect(updatedProject?.settings.seoTitle).toBe('New SEO Title');
      expect(updatedProject?.settings.customCSS).toBe('body { background: red; }');
      expect(updatedProject?.settings.facebookPixelId).toBe('FB-987654');
    });

    test('should return null when updating non-existent project', async () => {
      const nonExistentId = new ProjectId(TestHelpers.generateId());
      
      const updatedProject = await projectRepository.update(nonExistentId, { name: 'New Name' });

      expect(updatedProject).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete project successfully', async () => {
      const projectData = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!);
      const createdProject = await projectRepository.create(projectData);

      const deleteResult = await projectRepository.delete(createdProject.id!);

      expect(deleteResult).toBe(true);

      // Verify project is deleted
      const foundProject = await projectRepository.findById(createdProject.id!);
      expect(foundProject).toBeNull();
    });

    test('should return false when deleting non-existent project', async () => {
      const nonExistentId = new ProjectId(TestHelpers.generateId());

      const deleteResult = await projectRepository.delete(nonExistentId);

      expect(deleteResult).toBe(false);
    });
  });

  describe('findAll', () => {
    test('should return all projects', async () => {
      const project1 = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { name: 'Project 1' });
      const project2 = TestHelpers.createTestProject(testWorkspace.id!, testUser.id!, { name: 'Project 2' });

      await projectRepository.create(project1);
      await projectRepository.create(project2);

      const allProjects = await projectRepository.findAll();

      expect(allProjects).toHaveLength(2);
      expect(allProjects.some(p => p.name === 'Project 1')).toBe(true);
      expect(allProjects.some(p => p.name === 'Project 2')).toBe(true);
    });

    test('should return empty array when no projects exist', async () => {
      const allProjects = await projectRepository.findAll();

      expect(allProjects).toHaveLength(0);
    });
  });
});