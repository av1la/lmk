import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { UserService } from '@/domains/user/UserService';
import { User, UserId, UserRole, UserRepository, UserProfile } from '@/domains/user/UserDomain';
import { TestHelpers } from '../../shared/test-helpers';

// Mock repository
const mockUserRepository: jest.Mocked<UserRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByClerkId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    // Clear all mock implementations
    jest.clearAllMocks();
    
    // Create service with mocked repository
    userService = new UserService(mockUserRepository);
  });

  describe('create', () => {
    test('should create user successfully with valid data', async () => {
      const userData = TestHelpers.createTestUser();
      const expectedUser = { ...userData, id: new UserId('test-id') };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      const result = await userService.create(userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith(userData.clerkId);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(expectedUser);
    });

    test('should throw error when name is missing', async () => {
      const userData = TestHelpers.createTestUser({ name: '' });

      await expect(userService.create(userData)).rejects.toThrow('Name, email, and clerkId are required');
    });

    test('should throw error when email is missing', async () => {
      const userData = TestHelpers.createTestUser({ email: '' });

      await expect(userService.create(userData)).rejects.toThrow('Name, email, and clerkId are required');
    });

    test('should throw error when clerkId is missing', async () => {
      const userData = TestHelpers.createTestUser({ clerkId: '' });

      await expect(userService.create(userData)).rejects.toThrow('Name, email, and clerkId are required');
    });

    test('should throw error when email format is invalid', async () => {
      const userData = TestHelpers.createTestUser({ email: 'invalid-email' });

      await expect(userService.create(userData)).rejects.toThrow('Invalid email format');
    });

    test('should throw error when user with email already exists', async () => {
      const userData = TestHelpers.createTestUser();
      const existingUser = TestHelpers.createTestUser({ id: new UserId('existing-id') });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.create(userData)).rejects.toThrow('User with this email already exists');
    });

    test('should throw error when user with clerkId already exists', async () => {
      const userData = TestHelpers.createTestUser();
      const existingUser = TestHelpers.createTestUser({ id: new UserId('existing-id') });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);

      await expect(userService.create(userData)).rejects.toThrow('User with this Clerk ID already exists');
    });
  });

  describe('findByEmail', () => {
    test('should find user by valid email', async () => {
      const email = 'test@example.com';
      const expectedUser = TestHelpers.createTestUser({ email, id: new UserId('test-id') });

      mockUserRepository.findByEmail.mockResolvedValue(expectedUser);

      const result = await userService.findByEmail(email);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(result).toEqual(expectedUser);
    });

    test('should throw error for invalid email format', async () => {
      await expect(userService.findByEmail('invalid-email')).rejects.toThrow('Invalid email format');
    });
  });

  describe('findByClerkId', () => {
    test('should find user by valid clerkId', async () => {
      const clerkId = 'clerk_123';
      const expectedUser = TestHelpers.createTestUser({ clerkId, id: new UserId('test-id') });

      mockUserRepository.findByClerkId.mockResolvedValue(expectedUser);

      const result = await userService.findByClerkId(clerkId);

      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith(clerkId);
      expect(result).toEqual(expectedUser);
    });

    test('should throw error for empty clerkId', async () => {
      await expect(userService.findByClerkId('')).rejects.toThrow('Clerk ID is required');
    });
  });

  describe('update', () => {
    test('should update user successfully', async () => {
      const userId = new UserId('test-id');
      const existingUser = TestHelpers.createTestUser({ id: userId });
      const updateData = { name: 'Updated Name' };
      const expectedUser = { ...existingUser, ...updateData };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(expectedUser);

      const result = await userService.update(userId, updateData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(expectedUser);
    });

    test('should throw error when user not found', async () => {
      const userId = new UserId('non-existent-id');

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.update(userId, { name: 'New Name' })).rejects.toThrow('User not found');
    });

    test('should throw error when updating to invalid email format', async () => {
      const userId = new UserId('test-id');
      const existingUser = TestHelpers.createTestUser({ id: userId });

      mockUserRepository.findById.mockResolvedValue(existingUser);

      await expect(userService.update(userId, { email: 'invalid-email' })).rejects.toThrow('Invalid email format');
    });

    test('should throw error when updating to existing email', async () => {
      const userId = new UserId('test-id');
      const existingUser = TestHelpers.createTestUser({ id: userId, email: 'old@example.com' });
      const anotherUser = TestHelpers.createTestUser({ email: 'new@example.com' });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.findByEmail.mockResolvedValue(anotherUser);

      await expect(userService.update(userId, { email: 'new@example.com' })).rejects.toThrow('Another user with this email already exists');
    });
  });

  describe('delete', () => {
    test('should delete user successfully', async () => {
      const userId = new UserId('test-id');
      const existingUser = TestHelpers.createTestUser({ id: userId });

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.delete(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.delete).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    test('should throw error when user not found', async () => {
      const userId = new UserId('non-existent-id');

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.delete(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    test('should update user profile successfully', async () => {
      const userId = new UserId('test-id');
      const existingUser = TestHelpers.createTestUser({ 
        id: userId,
        profile: { firstName: 'John', lastName: 'Doe' }
      });
      const profileUpdate = { timezone: 'America/New_York' };
      const expectedProfile = {
        ...existingUser.profile,
        ...profileUpdate,
        updatedAt: expect.any(Date)
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, profile: expectedProfile });

      const result = await userService.updateProfile(userId, profileUpdate);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, { profile: expectedProfile });
      expect(result?.profile?.timezone).toBe('America/New_York');
    });

    test('should throw error when user not found', async () => {
      const userId = new UserId('non-existent-id');

      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateProfile(userId, { timezone: 'UTC' })).rejects.toThrow('User not found');
    });
  });

  describe('syncFromClerk', () => {
    test('should create new user from Clerk data', async () => {
      const clerkUser = {
        id: 'clerk_123',
        first_name: 'John',
        last_name: 'Doe',
        email_addresses: [{
          email_address: 'john@example.com',
          verification: { status: 'verified' }
        }],
        image_url: 'https://example.com/avatar.jpg'
      };

      const expectedUser = {
        clerkId: 'clerk_123',
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: expect.any(Date),
        image: 'https://example.com/avatar.jpg',
        roles: ['USER'],
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          avatar: 'https://example.com/avatar.jpg'
        }
      };

      mockUserRepository.findByClerkId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ ...expectedUser, id: new UserId('test-id') });

      const result = await userService.syncFromClerk(clerkUser);

      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith('clerk_123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(expectedUser);
      expect(result.name).toBe('John Doe');
    });

    test('should update existing user from Clerk data', async () => {
      const clerkUser = {
        id: 'clerk_123',
        first_name: 'Jane',
        last_name: 'Smith',
        email_addresses: [{ email_address: 'jane@example.com' }],
        image_url: 'https://example.com/new-avatar.jpg'
      };

      const existingUser = TestHelpers.createTestUser({ 
        id: new UserId('existing-id'),
        clerkId: 'clerk_123',
        roles: [UserRole.ADMIN] 
      });

      mockUserRepository.findByClerkId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({ ...existingUser, name: 'Jane Smith' });

      const result = await userService.syncFromClerk(clerkUser);

      expect(mockUserRepository.findByClerkId).toHaveBeenCalledWith('clerk_123');
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        existingUser.id,
        expect.objectContaining({
          name: 'Jane Smith',
          email: 'jane@example.com',
          roles: [UserRole.ADMIN] // Should preserve existing roles
        })
      );
    });

    test('should throw error when Clerk user ID is missing', async () => {
      const clerkUser = { email_addresses: [{ email_address: 'test@example.com' }] };

      await expect(userService.syncFromClerk(clerkUser)).rejects.toThrow('Clerk user ID is required');
    });
  });
});