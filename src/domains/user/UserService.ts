import { User, UserId, UserRepository, UserService as IUserService, UserProfile } from './UserDomain';
import { MongoUserRepository } from '@/adapters/mongodb/repositories/MongoUserRepository';

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findById(id: UserId): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }
    return this.userRepository.findByEmail(email);
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    if (!clerkId) {
      throw new Error('Clerk ID is required');
    }
    return this.userRepository.findByClerkId(clerkId);
  }

  async create(userData: User): Promise<User> {
    // Validate required fields
    if (!userData.name || !userData.email || !userData.clerkId) {
      throw new Error('Name, email, and clerkId are required');
    }

    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
    if (existingUserByEmail) {
      throw new Error('User with this email already exists');
    }

    const existingUserByClerkId = await this.userRepository.findByClerkId(userData.clerkId);
    if (existingUserByClerkId) {
      throw new Error('User with this Clerk ID already exists');
    }

    return this.userRepository.create(userData);
  }

  async update(id: UserId, userData: Partial<User>): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Validate email if being updated
    if (userData.email && !this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Check for email conflicts if email is being changed
    if (userData.email && userData.email !== existingUser.email) {
      const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
      if (existingUserByEmail) {
        throw new Error('Another user with this email already exists');
      }
    }

    return this.userRepository.update(id, userData);
  }

  async delete(id: UserId): Promise<boolean> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    return this.userRepository.delete(id);
  }

  async updateProfile(id: UserId, profileData: Partial<UserProfile>): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    const updatedProfile = {
      ...existingUser.profile,
      ...profileData,
      updatedAt: new Date()
    };

    return this.userRepository.update(id, { profile: updatedProfile });
  }

  async getProfile(id: UserId): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(id);
    return user?.profile || null;
  }

  async syncFromClerk(clerkUser: any): Promise<User> {
    if (!clerkUser.id) {
      throw new Error('Clerk user ID is required');
    }

    const existingUser = await this.userRepository.findByClerkId(clerkUser.id);
    
    const userData: User = {
      clerkId: clerkUser.id,
      name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || clerkUser.username || 'User',
      email: clerkUser.email_addresses[0]?.email_address || '',
      emailVerified: clerkUser.email_addresses[0]?.verification?.status === 'verified' ? new Date() : undefined,
      image: clerkUser.image_url,
      roles: existingUser?.roles || ['USER'],
      profile: {
        firstName: clerkUser.first_name,
        lastName: clerkUser.last_name,
        avatar: clerkUser.image_url,
        ...existingUser?.profile
      }
    };

    if (existingUser) {
      return this.userRepository.update(existingUser.id!, userData) as Promise<User>;
    } else {
      return this.userRepository.create(userData);
    }
  }

  async updateByClerkId(clerkId: string, userData: Partial<User>): Promise<User | null> {
    const existingUser = await this.userRepository.findByClerkId(clerkId);
    if (!existingUser) {
      return null;
    }

    if (userData.email && !this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    return this.userRepository.update(existingUser.id!, { ...userData, updatedAt: new Date() });
  }

  async deleteByClerkId(clerkId: string): Promise<boolean> {
    const existingUser = await this.userRepository.findByClerkId(clerkId);
    if (!existingUser) {
      return false;
    }

    return this.userRepository.delete(existingUser.id!);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Factory function
export function createUserService(): UserService {
  const userRepository = new MongoUserRepository();
  return new UserService(userRepository);
}