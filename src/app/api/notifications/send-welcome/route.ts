import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createNotificationService } from '@/domains/notification/NotificationService';
import { EmailTemplate } from '@/domains/notification/NotificationDomain';
import { WelcomeData } from '@/domains/notification/EmailTemplates';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail, recipientName, workspaceName } = body;

    if (!recipientEmail || !recipientName) {
      return NextResponse.json(
        { error: 'recipientEmail and recipientName are required' },
        { status: 400 }
      );
    }

    const notificationService = createNotificationService();

    const templateData: WelcomeData = {
      userName: recipientName,
      workspaceName: workspaceName,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
    };

    const result = await notificationService.sendEmail({
      to: [recipientEmail],
      subject: `Bem-vindo ao LMK, ${recipientName}!`,
      template: EmailTemplate.WELCOME,
      templateData
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        notificationId: result.notificationId?.getValue(),
        message: 'Welcome email sent successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Example usage in documentation:
/*
POST /api/notifications/send-welcome
{
  "recipientEmail": "john@example.com",
  "recipientName": "John Doe",
  "workspaceName": "My Workspace" // optional
}
*/