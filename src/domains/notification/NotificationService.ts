import { 
  Notification,
  NotificationId,
  NotificationRepository,
  NotificationService as INotificationService,
  EmailProvider,
  EmailData,
  NotificationType,
  NotificationStatus
} from './NotificationDomain';
import { createLogger } from '@/shared/logger';
import { MongoNotificationRepository } from '@/adapters/mongodb/repositories/MongoNotificationRepository';
import { ResendEmailProvider } from '@/adapters/email/ResendEmailProvider';

const logger = createLogger('notification-service');

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly emailProvider: EmailProvider
  ) {}

  async sendEmail(emailData: EmailData): Promise<{
    success: boolean;
    notificationId?: NotificationId;
    error?: string;
  }> {
    try {
      logger.info('Sending email', { 
        to: emailData.to, 
        template: emailData.template,
        subject: emailData.subject 
      });

      // Create notification record
      const notification = new Notification({
        type: NotificationType.EMAIL,
        status: NotificationStatus.PENDING,
        recipient: emailData.to[0], // Primary recipient
        subject: emailData.subject,
        content: emailData.template ? `Template: ${emailData.template}` : 'Custom content',
        templateId: emailData.template,
        templateData: emailData.templateData,
        metadata: {
          recipients: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          attachments: emailData.attachments?.length || 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Save to database
      const savedNotification = await this.notificationRepository.save(notification);
      logger.info('Notification created', { notificationId: savedNotification.id?.getValue() });

      // Send email
      const sendResult = await this.emailProvider.sendEmail(emailData);

      if (sendResult.success) {
        // Mark as sent
        savedNotification.markAsSent();
        savedNotification.metadata = {
          ...savedNotification.metadata,
          messageId: sendResult.messageId
        };
        
        await this.notificationRepository.update(savedNotification.id!, savedNotification);
        
        logger.info('Email sent successfully', { 
          notificationId: savedNotification.id?.getValue(),
          messageId: sendResult.messageId 
        });

        return {
          success: true,
          notificationId: savedNotification.id
        };
      } else {
        // Mark as failed
        savedNotification.markAsFailed(sendResult.error || 'Unknown error');
        await this.notificationRepository.update(savedNotification.id!, savedNotification);
        
        logger.error('Email sending failed', { 
          notificationId: savedNotification.id?.getValue(),
          error: sendResult.error 
        });

        return {
          success: false,
          notificationId: savedNotification.id,
          error: sendResult.error
        };
      }

    } catch (error) {
      logger.error('Error in sendEmail', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async scheduleEmail(emailData: EmailData, scheduledAt: Date): Promise<{
    success: boolean;
    notificationId?: NotificationId;
    error?: string;
  }> {
    try {
      logger.info('Scheduling email', { 
        to: emailData.to, 
        template: emailData.template,
        scheduledAt: scheduledAt.toISOString()
      });

      // Create scheduled notification
      const notification = new Notification({
        type: NotificationType.EMAIL,
        status: NotificationStatus.PENDING,
        recipient: emailData.to[0],
        subject: emailData.subject,
        content: emailData.template ? `Template: ${emailData.template}` : 'Custom content',
        templateId: emailData.template,
        templateData: emailData.templateData,
        metadata: {
          recipients: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          emailData: emailData // Store full email data for later sending
        },
        scheduledAt,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedNotification = await this.notificationRepository.save(notification);
      
      logger.info('Email scheduled successfully', { 
        notificationId: savedNotification.id?.getValue(),
        scheduledAt: scheduledAt.toISOString()
      });

      return {
        success: true,
        notificationId: savedNotification.id
      };

    } catch (error) {
      logger.error('Error in scheduleEmail', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async resendNotification(notificationId: NotificationId): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info('Resending notification', { notificationId: notificationId.getValue() });

      const notification = await this.notificationRepository.findById(notificationId);
      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      if (notification.type !== NotificationType.EMAIL) {
        return {
          success: false,
          error: 'Only email notifications can be resent'
        };
      }

      // Reconstruct email data from notification
      const emailData: EmailData = {
        to: notification.metadata?.recipients || [notification.recipient],
        cc: notification.metadata?.cc,
        bcc: notification.metadata?.bcc,
        subject: notification.subject || '',
        template: notification.templateId!,
        templateData: notification.templateData || {}
      };

      // Reset status and increment retry count
      notification.status = NotificationStatus.PENDING;
      notification.retryCount++;
      notification.updatedAt = new Date();
      
      await this.notificationRepository.update(notificationId, notification);

      // Resend email
      const sendResult = await this.emailProvider.sendEmail(emailData);

      if (sendResult.success) {
        notification.markAsSent();
        notification.metadata = {
          ...notification.metadata,
          messageId: sendResult.messageId,
          resentAt: new Date()
        };
        
        await this.notificationRepository.update(notificationId, notification);
        
        logger.info('Notification resent successfully', { 
          notificationId: notificationId.getValue(),
          messageId: sendResult.messageId 
        });

        return { success: true };
      } else {
        notification.markAsFailed(sendResult.error || 'Resend failed');
        await this.notificationRepository.update(notificationId, notification);
        
        return {
          success: false,
          error: sendResult.error
        };
      }

    } catch (error) {
      logger.error('Error in resendNotification', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getNotificationHistory(recipient: string, limit: number = 50): Promise<Notification[]> {
    try {
      return await this.notificationRepository.findByRecipient(recipient, limit);
    } catch (error) {
      logger.error('Error getting notification history', { recipient, error });
      return [];
    }
  }

  async processRetries(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      logger.info('Processing notification retries');
      
      const failedNotifications = await this.notificationRepository.findForRetry(50);
      let successful = 0;
      let failed = 0;

      for (const notification of failedNotifications) {
        if (!notification.canRetry()) {
          continue;
        }

        try {
          const result = await this.resendNotification(notification.id!);
          if (result.success) {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          logger.error('Error retrying notification', { 
            notificationId: notification.id?.getValue(), 
            error 
          });
          failed++;
        }
      }

      logger.info('Retry processing completed', { 
        processed: failedNotifications.length,
        successful,
        failed 
      });

      return {
        processed: failedNotifications.length,
        successful,
        failed
      };

    } catch (error) {
      logger.error('Error processing retries', { error });
      return { processed: 0, successful: 0, failed: 0 };
    }
  }

  async processPendingNotifications(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      logger.info('Processing pending notifications');
      
      const pendingNotifications = await this.notificationRepository.findPending(100);
      let successful = 0;
      let failed = 0;

      for (const notification of pendingNotifications) {
        if (notification.type !== NotificationType.EMAIL) {
          continue;
        }

        try {
          // Reconstruct email data from stored metadata
          const emailData: EmailData = notification.metadata?.emailData || {
            to: [notification.recipient],
            subject: notification.subject || '',
            template: notification.templateId!,
            templateData: notification.templateData || {}
          };

          const sendResult = await this.emailProvider.sendEmail(emailData);

          if (sendResult.success) {
            notification.markAsSent();
            notification.metadata = {
              ...notification.metadata,
              messageId: sendResult.messageId
            };
            successful++;
          } else {
            notification.markAsFailed(sendResult.error || 'Unknown error');
            failed++;
          }

          await this.notificationRepository.update(notification.id!, notification);

        } catch (error) {
          logger.error('Error processing pending notification', { 
            notificationId: notification.id?.getValue(), 
            error 
          });
          
          notification.markAsFailed(error instanceof Error ? error.message : 'Processing error');
          await this.notificationRepository.update(notification.id!, notification);
          failed++;
        }
      }

      logger.info('Pending notifications processing completed', { 
        processed: pendingNotifications.length,
        successful,
        failed 
      });

      return {
        processed: pendingNotifications.length,
        successful,
        failed
      };

    } catch (error) {
      logger.error('Error processing pending notifications', { error });
      return { processed: 0, successful: 0, failed: 0 };
    }
  }

  async getDeliveryStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }> {
    try {
      return await this.notificationRepository.getStats(startDate, endDate);
    } catch (error) {
      logger.error('Error getting delivery stats', { error });
      return { total: 0, sent: 0, delivered: 0, failed: 0, bounced: 0 };
    }
  }
}

// Factory function
export function createNotificationService(): NotificationService {
  const notificationRepository = new MongoNotificationRepository();
  const emailProvider = new ResendEmailProvider();
  return new NotificationService(notificationRepository, emailProvider);
}