import { Collection, ObjectId, WithId } from 'mongodb';
import { User, UserId, UserRepository, UserRole, UserProfile } from '@/domains/user/UserDomain';
import { MongoClientProviderImpl } from '@/adapters/mongodb/provider/MongoClientProvider';

interface MongoUserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MongoUser {
  _id?: ObjectId;
  clerkId: string;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  roles: string[];
  profile?: MongoUserProfile;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MongoUserRepository implements UserRepository {
  private collection?: Collection<MongoUser>;
  private readonly collectionName = 'users';
  private initialized = false;
  private readonly mongoProvider: MongoClientProviderImpl;

  constructor() {
    this.mongoProvider = new MongoClientProviderImpl();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.collection) return;
    
    await this.mongoProvider.waitForConnection();
    const db = this.mongoProvider.getDb();
    this.collection = db.collection<MongoUser>(this.collectionName);
    this.initialized = true;
    await this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;
    try {
      await this.collection.createIndex({ email: 1 }, { unique: true });
      await this.collection.createIndex({ clerkId: 1 }, { unique: true });
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  async findAll(): Promise<User[]> {
    await this.ensureInitialized();
    const users = await this.collection!.find().toArray();
    return users.map(doc => this.mapMongoToDomain(doc));
  }

  async findById(id: UserId): Promise<User | null> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const user = await this.collection.findOne({ _id: new ObjectId(idValue) });
    return user ? this.mapMongoToDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.collection.findOne({ email });
    return user ? this.mapMongoToDomain(user) : null;
  }

  async findByClerkId(clerkId: string): Promise<User | null> {
    await this.ensureInitialized();
    const user = await this.collection!.findOne({ clerkId });
    return user ? this.mapMongoToDomain(user) : null;
  }

  async create(user: User): Promise<User> {
    await this.ensureInitialized();
    const now = new Date();
    const mongoUser: Omit<MongoUser, '_id'> = {
      clerkId: user.clerkId,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      roles: user.roles || ['USER'],
      profile: user.profile ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatar: user.profile.avatar,
        timezone: user.profile.timezone,
        language: user.profile.language,
        createdAt: user.profile.createdAt || now,
        updatedAt: user.profile.updatedAt || now
      } : undefined,
      createdAt: user.createdAt || now,
      updatedAt: user.updatedAt || now
    };

    const result = await this.collection!.insertOne(mongoUser);

    return {
      ...user,
      id: new UserId(result.insertedId.toString()),
      createdAt: mongoUser.createdAt,
      updatedAt: mongoUser.updatedAt
    };
  }

  async update(id: UserId, user: Partial<User>): Promise<User | null> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const now = new Date();
    const updateData: any = {
      ...user,
      roles: user.roles as string[] | undefined,
      updatedAt: now,
    };

    if (user.profile) {
      updateData.profile = {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatar: user.profile.avatar,
        timezone: user.profile.timezone,
        language: user.profile.language,
        createdAt: user.profile.createdAt || now,
        updatedAt: now
      };
    }

    const result: WithId<MongoUser> | null = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(idValue) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? this.mapMongoToDomain(result) : null;
  }

  async delete(id: UserId): Promise<boolean> {
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return false;
    }

    const result = await this.collection.deleteOne({ _id: new ObjectId(idValue) });
    return result.deletedCount > 0;
  }

  private mapMongoToDomain(doc: MongoUser): User {
    if (!doc._id) {
      throw new Error('Document must have an _id');
    }

    return {
      id: new UserId(doc._id.toString()),
      clerkId: doc.clerkId,
      name: doc.name,
      email: doc.email,
      emailVerified: doc.emailVerified,
      image: doc.image,
      roles: (doc.roles || []).map(role => role as UserRole),
      profile: doc.profile ? {
        firstName: doc.profile.firstName,
        lastName: doc.profile.lastName,
        avatar: doc.profile.avatar,
        timezone: doc.profile.timezone,
        language: doc.profile.language,
        createdAt: doc.profile.createdAt,
        updatedAt: doc.profile.updatedAt
      } : undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}