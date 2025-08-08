import { Collection, ObjectId, WithId } from 'mongodb';
import { 
  Notification, 
  NotificationId, 
  NotificationRepository, 
  NotificationType,
  NotificationStatus,
  EmailTemplate
} from '@/domains/notification/NotificationDomain';
import { MongoClientProviderImpl } from '@/adapters/mongodb/provider/MongoClientProvider';

interface MongoNotification {
  _id?: ObjectId;
  type: string;
  status: string;
  recipient: string;
  subject?: string;
  content: string;
  templateId?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MongoNotificationRepository implements NotificationRepository {
  private collection?: Collection<MongoNotification>;
  private readonly collectionName = 'notifications';
  private initialized = false;
  private readonly mongoProvider: MongoClientProviderImpl;

  constructor() {
    this.mongoProvider = new MongoClientProviderImpl();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized && this.collection) return;
    
    await this.mongoProvider.waitForConnection();
    const db = this.mongoProvider.getDb();
    this.collection = db.collection<MongoNotification>(this.collectionName);
    this.initialized = true;
    await this.createIndexes();
  }

  private async createIndexes(): Promise<void> {
    if (!this.collection) return;
    try {
      await this.collection.createIndex({ recipient: 1 });
      await this.collection.createIndex({ status: 1 });
      await this.collection.createIndex({ type: 1 });
      await this.collection.createIndex({ scheduledAt: 1 });
      await this.collection.createIndex({ createdAt: -1 });
      await this.collection.createIndex({ status: 1, retryCount: 1, maxRetries: 1 });
    } catch (error) {
      console.warn('Index creation warning:', error);
    }
  }

  async save(notification: Notification): Promise<Notification> {
    if (notification.id) {
      // Update existing notification
      const result = await this.update(notification.id, notification);
      return result || notification;
    } else {
      // Create new notification
      return this.create(notification);
    }
  }

  async create(notification: Notification): Promise<Notification> {
    await this.ensureInitialized();
    
    const now = new Date();
    const mongoNotification: Omit<MongoNotification, '_id'> = {
      type: notification.type,
      status: notification.status,
      recipient: notification.recipient,
      subject: notification.subject,
      content: notification.content,
      templateId: notification.templateId,
      templateData: notification.templateData,
      metadata: notification.metadata,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      failedAt: notification.failedAt,
      failureReason: notification.failureReason,
      retryCount: notification.retryCount,
      maxRetries: notification.maxRetries,
      createdAt: notification.createdAt || now,
      updatedAt: notification.updatedAt || now
    };

    const result = await this.collection!.insertOne(mongoNotification);

    return new Notification({
      ...notification,
      id: new NotificationId(result.insertedId.toString()),
      createdAt: mongoNotification.createdAt,
      updatedAt: mongoNotification.updatedAt
    });
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    await this.ensureInitialized();
    
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const notification = await this.collection!.findOne({ _id: new ObjectId(idValue) });
    return notification ? this.mapMongoToDomain(notification) : null;
  }

  async findByRecipient(recipient: string, limit: number = 50): Promise<Notification[]> {
    await this.ensureInitialized();
    
    const notifications = await this.collection!
      .find({ recipient })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    return notifications.map(doc => this.mapMongoToDomain(doc));
  }

  async findPending(limit: number = 100): Promise<Notification[]> {
    await this.ensureInitialized();
    
    const notifications = await this.collection!
      .find({ 
        status: NotificationStatus.PENDING,
        $or: [
          { scheduledAt: { $exists: false } },
          { scheduledAt: { $lte: new Date() } }
        ]
      })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
    
    return notifications.map(doc => this.mapMongoToDomain(doc));
  }

  async findForRetry(limit: number = 50): Promise<Notification[]> {
    await this.ensureInitialized();
    
    const notifications = await this.collection!
      .find({ 
        status: NotificationStatus.FAILED,
        $expr: { $lt: ['$retryCount', '$maxRetries'] }
      })
      .sort({ failedAt: 1 })
      .limit(limit)
      .toArray();
    
    return notifications.map(doc => this.mapMongoToDomain(doc));
  }

  async update(id: NotificationId, data: Partial<Notification>): Promise<Notification | null> {
    await this.ensureInitialized();
    
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return null;
    }

    const now = new Date();
    const updateData: any = {
      ...data,
      updatedAt: now,
    };

    // Convert domain objects to mongo format
    if (data.id) {
      delete updateData.id;
    }

    const result: WithId<MongoNotification> | null = await this.collection!.findOneAndUpdate(
      { _id: new ObjectId(idValue) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result ? this.mapMongoToDomain(result) : null;
  }

  async delete(id: NotificationId): Promise<boolean> {
    await this.ensureInitialized();
    
    const idValue = id.getValue();
    if (!ObjectId.isValid(idValue)) {
      return false;
    }

    const result = await this.collection!.deleteOne({ _id: new ObjectId(idValue) });
    return result.deletedCount > 0;
  }

  async getStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }> {
    await this.ensureInitialized();
    
    const matchCondition = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: {
            $sum: {
              $cond: [{ $eq: ['$status', NotificationStatus.SENT] }, 1, 0]
            }
          },
          delivered: {
            $sum: {
              $cond: [{ $eq: ['$status', NotificationStatus.DELIVERED] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$status', NotificationStatus.FAILED] }, 1, 0]
            }
          },
          bounced: {
            $sum: {
              $cond: [{ $eq: ['$status', NotificationStatus.BOUNCED] }, 1, 0]
            }
          }
        }
      }
    ];

    const result = await this.collection!.aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return { total: 0, sent: 0, delivered: 0, failed: 0, bounced: 0 };
    }

    const stats = result[0];
    return {
      total: stats.total || 0,
      sent: stats.sent || 0,
      delivered: stats.delivered || 0,
      failed: stats.failed || 0,
      bounced: stats.bounced || 0
    };
  }

  private mapMongoToDomain(doc: MongoNotification): Notification {
    if (!doc._id) {
      throw new Error('Document must have an _id');
    }

    return new Notification({
      id: new NotificationId(doc._id.toString()),
      type: doc.type as NotificationType,
      status: doc.status as NotificationStatus,
      recipient: doc.recipient,
      subject: doc.subject,
      content: doc.content,
      templateId: doc.templateId as EmailTemplate,
      templateData: doc.templateData,
      metadata: doc.metadata,
      scheduledAt: doc.scheduledAt,
      sentAt: doc.sentAt,
      deliveredAt: doc.deliveredAt,
      failedAt: doc.failedAt,
      failureReason: doc.failureReason,
      retryCount: doc.retryCount,
      maxRetries: doc.maxRetries,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    });
  }
}