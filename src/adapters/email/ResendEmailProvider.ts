import { EmailProvider, EmailData } from '@/domains/notification/NotificationDomain';
import { EmailTemplateRenderer } from '@/domains/notification/EmailTemplates';

interface ResendEmailData {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    content_type?: string;
    path?: string;
  }>;
}

interface ResendResponse {
  id: string;
}

interface ResendError {
  message: string;
  name: string;
}

export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly baseUrl = 'https://api.resend.com';

  constructor(apiKey?: string, fromEmail?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromEmail = fromEmail || process.env.RESEND_FROM_EMAIL || 'noreply@lmk.com';

    if (!this.apiKey) {
      throw new Error('RESEND_API_KEY is required');
    }

    if (!this.fromEmail) {
      throw new Error('RESEND_FROM_EMAIL is required');
    }
  }

  async sendEmail(emailData: EmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Render template if provided
      let subject = emailData.subject;
      let html = '';
      let text = '';

      if (emailData.template && emailData.templateData) {
        const rendered = EmailTemplateRenderer.render(emailData.template, emailData.templateData);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
      }

      // Prepare Resend payload
      const resendData: ResendEmailData = {
        from: this.fromEmail,
        to: emailData.to,
        subject,
        html,
        text
      };

      // Add optional fields
      if (emailData.cc && emailData.cc.length > 0) {
        resendData.cc = emailData.cc;
      }

      if (emailData.bcc && emailData.bcc.length > 0) {
        resendData.bcc = emailData.bcc;
      }

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        resendData.attachments = emailData.attachments.map(attachment => ({
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
          path: attachment.path
        }));
      }

      // Send email via Resend API
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendData)
      });

      if (!response.ok) {
        const error: ResendError = await response.json();
        console.error('Resend API error:', error);
        return {
          success: false,
          error: error.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const result: ResendResponse = await response.json();
      
      console.log('Email sent successfully via Resend:', {
        messageId: result.id,
        to: emailData.to,
        subject: subject
      });

      return {
        success: true,
        messageId: result.id
      };

    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Test API key validity by making a simple request
      const response = await fetch(`${this.baseUrl}/domains`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Resend health check failed:', error);
      return false;
    }
  }

  // Get sending statistics (if supported by Resend)
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
  } | null> {
    try {
      // Note: This is a placeholder - check Resend API docs for actual stats endpoint
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('start_date', startDate.toISOString());
      }
      
      if (endDate) {
        params.append('end_date', endDate.toISOString());
      }

      const response = await fetch(`${this.baseUrl}/stats?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get Resend stats:', error);
      return null;
    }
  }
}