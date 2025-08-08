import { describe, beforeEach, test, expect } from '@jest/globals';
import { container } from 'tsyringe';
import { MongoWorkspaceRepository } from '@/adapters/mongodb/repositories/MongoWorkspaceRepository';
import { MongoUserRepository } from '@/adapters/mongodb/repositories/MongoUserRepository';
import { Workspace, WorkspaceId, WorkspaceRole, WorkspaceInvite } from '@/domains/workspace/WorkspaceDomain';
import { User, UserId } from '@/domains/user/UserDomain';
import { TestHelpers } from '../../../shared/test-helpers';
import { setupRepositoryTest } from '../../../shared/repository-test-setup';

describe('MongoWorkspaceRepository', () => {
  let workspaceRepository: MongoWorkspaceRepository;
  let userRepository: MongoUserRepository;
  let testUser: User;

  beforeEach(async () => {
    // Setup test environment
    await setupRepositoryTest();
    
    // Register repositories
    container.registerSingleton('WorkspaceRepository', MongoWorkspaceRepository);
    container.registerSingleton('UserRepository', MongoUserRepository);
    
    workspaceRepository = container.resolve(MongoWorkspaceRepository);
    userRepository = container.resolve(MongoUserRepository);
    
    // Clear database before each test
    await TestHelpers.clearDatabase();
    
    // Create a test user for workspace ownership
    testUser = await userRepository.create(TestHelpers.createTestUser());
  });

  describe('create', () => {
    test('should create a new workspace successfully', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!);

      const createdWorkspace = await workspaceRepository.create(workspaceData);

      expect(createdWorkspace).toBeDefined();
      expect(createdWorkspace.id).toBeInstanceOf(WorkspaceId);
      expect(createdWorkspace.name).toBe(workspaceData.name);
      expect(createdWorkspace.slug).toBe(workspaceData.slug);
      expect(createdWorkspace.ownerId.getValue()).toBe(testUser.id!.getValue());
      expect(createdWorkspace.createdAt).toBeInstanceOf(Date);
      expect(createdWorkspace.updatedAt).toBeInstanceOf(Date);
    });

    test('should create workspace with default settings', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!);

      const createdWorkspace = await workspaceRepository.create(workspaceData);

      expect(createdWorkspace.settings).toBeDefined();
      expect(createdWorkspace.settings.allowPublicProjects).toBe(true);
      expect(createdWorkspace.settings.defaultProjectVisibility).toBe('PRIVATE');
    });

    test('should throw error when creating workspace with duplicate slug', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!, { slug: 'duplicate-slug' });
      
      await workspaceRepository.create(workspaceData);

      const duplicateWorkspace = TestHelpers.createTestWorkspace(testUser.id!, { 
        slug: 'duplicate-slug',
        name: 'Different Name'
      });

      await expect(workspaceRepository.create(duplicateWorkspace)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    test('should find workspace by valid ID', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!);
      const createdWorkspace = await workspaceRepository.create(workspaceData);

      const foundWorkspace = await workspaceRepository.findById(createdWorkspace.id!);

      expect(foundWorkspace).toBeDefined();
      expect(foundWorkspace?.id?.getValue()).toBe(createdWorkspace.id!.getValue());
      expect(foundWorkspace?.name).toBe(workspaceData.name);
      expect(foundWorkspace?.slug).toBe(workspaceData.slug);
    });

    test('should return null for non-existent ID', async () => {
      const nonExistentId = new WorkspaceId(TestHelpers.generateId());

      const foundWorkspace = await workspaceRepository.findById(nonExistentId);

      expect(foundWorkspace).toBeNull();
    });
  });

  describe('findBySlug', () => {
    test('should find workspace by slug', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!, { slug: 'test-workspace' });
      await workspaceRepository.create(workspaceData);

      const foundWorkspace = await workspaceRepository.findBySlug('test-workspace');

      expect(foundWorkspace).toBeDefined();
      expect(foundWorkspace?.slug).toBe('test-workspace');
      expect(foundWorkspace?.name).toBe(workspaceData.name);
    });

    test('should return null for non-existent slug', async () => {
      const foundWorkspace = await workspaceRepository.findBySlug('nonexistent-slug');

      expect(foundWorkspace).toBeNull();
    });
  });

  describe('findByUserId', () => {
    test('should find workspaces where user is owner', async () => {
      const workspace1 = TestHelpers.createTestWorkspace(testUser.id!, { name: 'Workspace 1' });
      const workspace2 = TestHelpers.createTestWorkspace(testUser.id!, { name: 'Workspace 2' });

      await workspaceRepository.create(workspace1);
      await workspaceRepository.create(workspace2);

      const userWorkspaces = await workspaceRepository.findByUserId(testUser.id!);

      expect(userWorkspaces).toHaveLength(2);
      expect(userWorkspaces.some(w => w.name === 'Workspace 1')).toBe(true);
      expect(userWorkspaces.some(w => w.name === 'Workspace 2')).toBe(true);
    });

    test('should find workspaces where user is member', async () => {
      const anotherUser = await userRepository.create(TestHelpers.createTestUser({ email: 'member@test.com' }));
      
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!, {
        members: [{
          userId: anotherUser.id!,
          role: WorkspaceRole.EDITOR,
          joinedAt: new Date(),
          invitedBy: testUser.id!
        }]
      });

      await workspaceRepository.create(workspaceData);

      const memberWorkspaces = await workspaceRepository.findByUserId(anotherUser.id!);

      expect(memberWorkspaces).toHaveLength(1);
      expect(memberWorkspaces[0].members).toHaveLength(1);
      expect(memberWorkspaces[0].members[0].userId.getValue()).toBe(anotherUser.id!.getValue());
    });

    test('should return empty array when user has no workspaces', async () => {
      const anotherUser = await userRepository.create(TestHelpers.createTestUser({ email: 'noworkspace@test.com' }));

      const userWorkspaces = await workspaceRepository.findByUserId(anotherUser.id!);

      expect(userWorkspaces).toHaveLength(0);
    });
  });

  describe('update', () => {
    test('should update workspace successfully', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!);
      const createdWorkspace = await workspaceRepository.create(workspaceData);

      const updateData: Partial<Workspace> = {
        name: 'Updated Workspace',
        description: 'Updated description',
        settings: {
          allowPublicProjects: false,
          defaultProjectVisibility: 'PUBLIC'
        }
      };

      const updatedWorkspace = await workspaceRepository.update(createdWorkspace.id!, updateData);

      expect(updatedWorkspace).toBeDefined();
      expect(updatedWorkspace?.name).toBe('Updated Workspace');
      expect(updatedWorkspace?.description).toBe('Updated description');
      expect(updatedWorkspace?.settings.allowPublicProjects).toBe(false);
      expect(updatedWorkspace?.settings.defaultProjectVisibility).toBe('PUBLIC');
      expect(updatedWorkspace?.updatedAt).toBeInstanceOf(Date);
    });

    test('should update workspace members', async () => {
      const newMember = await userRepository.create(TestHelpers.createTestUser({ email: 'newmember@test.com' }));
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!);
      const createdWorkspace = await workspaceRepository.create(workspaceData);

      const updateData: Partial<Workspace> = {
        members: [{
          userId: newMember.id!,
          role: WorkspaceRole.ADMIN,
          joinedAt: new Date(),
          invitedBy: testUser.id!
        }]
      };

      const updatedWorkspace = await workspaceRepository.update(createdWorkspace.id!, updateData);

      expect(updatedWorkspace?.members).toHaveLength(1);
      expect(updatedWorkspace?.members[0].userId.getValue()).toBe(newMember.id!.getValue());
      expect(updatedWorkspace?.members[0].role).toBe(WorkspaceRole.ADMIN);
    });

    test('should return null when updating non-existent workspace', async () => {
      const nonExistentId = new WorkspaceId(TestHelpers.generateId());
      
      const updatedWorkspace = await workspaceRepository.update(nonExistentId, { name: 'New Name' });

      expect(updatedWorkspace).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete workspace successfully', async () => {
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!);
      const createdWorkspace = await workspaceRepository.create(workspaceData);

      const deleteResult = await workspaceRepository.delete(createdWorkspace.id!);

      expect(deleteResult).toBe(true);

      // Verify workspace is deleted
      const foundWorkspace = await workspaceRepository.findById(createdWorkspace.id!);
      expect(foundWorkspace).toBeNull();
    });

    test('should return false when deleting non-existent workspace', async () => {
      const nonExistentId = new WorkspaceId(TestHelpers.generateId());

      const deleteResult = await workspaceRepository.delete(nonExistentId);

      expect(deleteResult).toBe(false);
    });
  });

  describe('findInviteByToken', () => {
    test('should find invite by token', async () => {
      const inviteToken = 'test-invite-token';
      const workspaceData = TestHelpers.createTestWorkspace(testUser.id!, {
        invites: [{
          id: 'invite-1',
          email: 'invited@test.com',
          role: WorkspaceRole.EDITOR,
          invitedBy: testUser.id!,
          token: inviteToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdAt: new Date()
        }]
      });

      await workspaceRepository.create(workspaceData);

      const foundInvite = await workspaceRepository.findInviteByToken(inviteToken);

      expect(foundInvite).toBeDefined();
      expect(foundInvite?.token).toBe(inviteToken);
      expect(foundInvite?.email).toBe('invited@test.com');
      expect(foundInvite?.role).toBe(WorkspaceRole.EDITOR);
    });

    test('should return null for non-existent token', async () => {
      const foundInvite = await workspaceRepository.findInviteByToken('nonexistent-token');

      expect(foundInvite).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return all workspaces', async () => {
      const workspace1 = TestHelpers.createTestWorkspace(testUser.id!, { name: 'Workspace 1' });
      const workspace2 = TestHelpers.createTestWorkspace(testUser.id!, { name: 'Workspace 2' });

      await workspaceRepository.create(workspace1);
      await workspaceRepository.create(workspace2);

      const allWorkspaces = await workspaceRepository.findAll();

      expect(allWorkspaces).toHaveLength(2);
      expect(allWorkspaces.some(w => w.name === 'Workspace 1')).toBe(true);
      expect(allWorkspaces.some(w => w.name === 'Workspace 2')).toBe(true);
    });

    test('should return empty array when no workspaces exist', async () => {
      const allWorkspaces = await workspaceRepository.findAll();

      expect(allWorkspaces).toHaveLength(0);
    });
  });
});