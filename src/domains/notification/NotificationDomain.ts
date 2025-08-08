import { BaseId } from '@/shared/util/BaseId';

export class NotificationId extends BaseId {
  toString(): string {
    return `NOTIFICATION-ID-${this.value}`;
  }
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED'
}

export enum EmailTemplate {
  WORKSPACE_INVITATION = 'WORKSPACE_INVITATION',
  PROJECT_INVITATION = 'PROJECT_INVITATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  WELCOME = 'WELCOME',
  PROJECT_SHARED = 'PROJECT_SHARED'
}

export interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: EmailTemplate;
  templateData: Record<string, any>;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  path?: string;
}

export interface NotificationData {
  id?: NotificationId;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  subject?: string;
  content: string;
  templateId?: EmailTemplate;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount?: number;
  maxRetries?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Notification implements NotificationData {
  id?: NotificationId;
  type: NotificationType;
  status: NotificationStatus;
  recipient: string;
  subject?: string;
  content: string;
  templateId?: EmailTemplate;
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

  constructor(data: NotificationData) {
    this.id = data.id;
    this.type = data.type;
    this.status = data.status;
    this.recipient = data.recipient;
    this.subject = data.subject;
    this.content = data.content;
    this.templateId = data.templateId;
    this.templateData = data.templateData;
    this.metadata = data.metadata;
    this.scheduledAt = data.scheduledAt;
    this.sentAt = data.sentAt;
    this.deliveredAt = data.deliveredAt;
    this.failedAt = data.failedAt;
    this.failureReason = data.failureReason;
    this.retryCount = data.retryCount || 0;
    this.maxRetries = data.maxRetries || 3;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  canRetry(): boolean {
    return this.status === NotificationStatus.FAILED && 
           this.retryCount < this.maxRetries;
  }

  markAsSent(): void {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    this.updatedAt = new Date();
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  markAsFailed(reason: string): void {
    this.status = NotificationStatus.FAILED;
    this.failedAt = new Date();
    this.failureReason = reason;
    this.retryCount++;
    this.updatedAt = new Date();
  }
}

export interface EmailProvider {
  sendEmail(emailData: EmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export interface NotificationRepository {
  save(notification: Notification): Promise<Notification>;
  findById(id: NotificationId): Promise<Notification | null>;
  findByRecipient(recipient: string, limit?: number): Promise<Notification[]>;
  findPending(limit?: number): Promise<Notification[]>;
  findForRetry(limit?: number): Promise<Notification[]>;
  update(id: NotificationId, data: Partial<Notification>): Promise<Notification | null>;
  delete(id: NotificationId): Promise<boolean>;
  getStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }>;
}

export interface NotificationService {
  sendEmail(emailData: EmailData): Promise<{
    success: boolean;
    notificationId?: NotificationId;
    error?: string;
  }>;
  
  scheduleEmail(emailData: EmailData, scheduledAt: Date): Promise<{
    success: boolean;
    notificationId?: NotificationId;
    error?: string;
  }>;
  
  resendNotification(notificationId: NotificationId): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  getNotificationHistory(recipient: string, limit?: number): Promise<Notification[]>;
  
  processRetries(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }>;
  
  getDeliveryStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }>;
}