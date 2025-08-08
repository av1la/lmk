import { describe, beforeEach, test, expect } from '@jest/globals';
import { container } from 'tsyringe';
import { MongoUserRepository } from '@/adapters/mongodb/repositories/MongoUserRepository';
import { User, UserId, UserRole } from '@/domains/user/UserDomain';
import { TestHelpers } from '../../../shared/test-helpers';
import { setupRepositoryTest } from '../../../shared/repository-test-setup';

describe('MongoUserRepository', () => {
  let userRepository: MongoUserRepository;

  beforeEach(async () => {
    // Setup test environment
    await setupRepositoryTest();
    
    // Register and resolve repository
    container.registerSingleton('UserRepository', MongoUserRepository);
    userRepository = container.resolve(MongoUserRepository);
    
    // Clear database before each test
    await TestHelpers.clearDatabase();
  });

  describe('create', () => {
    test('should create a new user successfully', async () => {
      const userData = TestHelpers.createTestUser();

      const createdUser = await userRepository.create(userData);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeInstanceOf(UserId);
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.clerkId).toBe(userData.clerkId);
      expect(createdUser.roles).toEqual(userData.roles);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);
    });

    test('should create user with profile information', async () => {
      const userData = TestHelpers.createTestUser({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          avatar: 'https://example.com/avatar.jpg',
          timezone: 'America/New_York',
          language: 'en'
        }
      });

      const createdUser = await userRepository.create(userData);

      expect(createdUser.profile).toBeDefined();
      expect(createdUser.profile?.firstName).toBe('John');
      expect(createdUser.profile?.lastName).toBe('Doe');
      expect(createdUser.profile?.avatar).toBe('https://example.com/avatar.jpg');
      expect(createdUser.profile?.timezone).toBe('America/New_York');
      expect(createdUser.profile?.language).toBe('en');
    });

    test('should throw error when creating user with duplicate email', async () => {
      const userData = TestHelpers.createTestUser({ email: 'duplicate@test.com' });
      
      await userRepository.create(userData);

      const duplicateUser = TestHelpers.createTestUser({ 
        email: 'duplicate@test.com',
        clerkId: 'different_clerk_id'
      });

      await expect(userRepository.create(duplicateUser)).rejects.toThrow();
    });

    test('should throw error when creating user with duplicate clerkId', async () => {
      const userData = TestHelpers.createTestUser({ clerkId: 'duplicate_clerk_id' });
      
      await userRepository.create(userData);

      const duplicateUser = TestHelpers.createTestUser({ 
        clerkId: 'duplicate_clerk_id',
        email: 'different@test.com'
      });

      await expect(userRepository.create(duplicateUser)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    test('should find user by valid ID', async () => {
      const userData = TestHelpers.createTestUser();
      const createdUser = await userRepository.create(userData);

      const foundUser = await userRepository.findById(createdUser.id!);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id?.getValue()).toBe(createdUser.id!.getValue());
      expect(foundUser?.name).toBe(userData.name);
      expect(foundUser?.email).toBe(userData.email);
    });

    test('should return null for non-existent ID', async () => {
      const nonExistentId = new UserId(TestHelpers.generateId());

      const foundUser = await userRepository.findById(nonExistentId);

      expect(foundUser).toBeNull();
    });

    test('should return null for invalid ID format', async () => {
      const invalidId = new UserId('invalid-id');

      const foundUser = await userRepository.findById(invalidId);

      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail', () => {
    test('should find user by email', async () => {
      const userData = TestHelpers.createTestUser({ email: 'test@example.com' });
      await userRepository.create(userData);

      const foundUser = await userRepository.findByEmail('test@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
      expect(foundUser?.name).toBe(userData.name);
    });

    test('should return null for non-existent email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');

      expect(foundUser).toBeNull();
    });
  });

  describe('findByClerkId', () => {
    test('should find user by clerk ID', async () => {
      const userData = TestHelpers.createTestUser({ clerkId: 'test_clerk_123' });
      await userRepository.create(userData);

      const foundUser = await userRepository.findByClerkId('test_clerk_123');

      expect(foundUser).toBeDefined();
      expect(foundUser?.clerkId).toBe('test_clerk_123');
      expect(foundUser?.name).toBe(userData.name);
    });

    test('should return null for non-existent clerk ID', async () => {
      const foundUser = await userRepository.findByClerkId('nonexistent_clerk_id');

      expect(foundUser).toBeNull();
    });
  });

  describe('update', () => {
    test('should update user successfully', async () => {
      const userData = TestHelpers.createTestUser();
      const createdUser = await userRepository.create(userData);

      const updateData: Partial<User> = {
        name: 'Updated Name',
        image: 'https://example.com/new-avatar.jpg'
      };

      const updatedUser = await userRepository.update(createdUser.id!, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.image).toBe('https://example.com/new-avatar.jpg');
      expect(updatedUser?.email).toBe(userData.email); // Should remain unchanged
      expect(updatedUser?.updatedAt).toBeInstanceOf(Date);
    });

    test('should update user profile', async () => {
      const userData = TestHelpers.createTestUser();
      const createdUser = await userRepository.create(userData);

      const updateData: Partial<User> = {
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          timezone: 'Europe/London'
        }
      };

      const updatedUser = await userRepository.update(createdUser.id!, updateData);

      expect(updatedUser?.profile?.firstName).toBe('Jane');
      expect(updatedUser?.profile?.lastName).toBe('Smith');
      expect(updatedUser?.profile?.timezone).toBe('Europe/London');
    });

    test('should return null when updating non-existent user', async () => {
      const nonExistentId = new UserId(TestHelpers.generateId());
      
      const updatedUser = await userRepository.update(nonExistentId, { name: 'New Name' });

      expect(updatedUser).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete user successfully', async () => {
      const userData = TestHelpers.createTestUser();
      const createdUser = await userRepository.create(userData);

      const deleteResult = await userRepository.delete(createdUser.id!);

      expect(deleteResult).toBe(true);

      // Verify user is deleted
      const foundUser = await userRepository.findById(createdUser.id!);
      expect(foundUser).toBeNull();
    });

    test('should return false when deleting non-existent user', async () => {
      const nonExistentId = new UserId(TestHelpers.generateId());

      const deleteResult = await userRepository.delete(nonExistentId);

      expect(deleteResult).toBe(false);
    });
  });

  describe('findAll', () => {
    test('should return all users', async () => {
      const user1 = TestHelpers.createTestUser({ email: 'user1@test.com' });
      const user2 = TestHelpers.createTestUser({ email: 'user2@test.com' });

      await userRepository.create(user1);
      await userRepository.create(user2);

      const allUsers = await userRepository.findAll();

      expect(allUsers).toHaveLength(2);
      expect(allUsers.some(u => u.email === 'user1@test.com')).toBe(true);
      expect(allUsers.some(u => u.email === 'user2@test.com')).toBe(true);
    });

    test('should return empty array when no users exist', async () => {
      const allUsers = await userRepository.findAll();

      expect(allUsers).toHaveLength(0);
    });
  });
});