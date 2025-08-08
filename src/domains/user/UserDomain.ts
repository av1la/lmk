import { BaseId } from '@/shared/util/BaseId';

export class UserId extends BaseId {
  toString(): string {
    return `USER-ID-${this.value}`;
  }
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  id?: UserId;
  clerkId: string;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  roles: UserRole[];
  profile?: UserProfile;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserService {
  findAll(): Promise<User[]>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  create(userData: User): Promise<User>;
  update(id: UserId, userData: Partial<User>): Promise<User | null>;
  delete(id: UserId): Promise<boolean>;
  updateProfile(id: UserId, profileData: Partial<UserProfile>): Promise<User | null>;
  getProfile(id: UserId): Promise<UserProfile | null>;
  syncFromClerk(clerkUser: any): Promise<User>;
}

export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByClerkId(clerkId: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: UserId, user: Partial<User>): Promise<User | null>;
  delete(id: UserId): Promise<boolean>;
}