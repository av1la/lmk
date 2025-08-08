import { EmailTemplate } from './NotificationDomain';

export interface EmailTemplateData {
  subject: string;
  html: string;
  text: string;
}

export interface WorkspaceInvitationData {
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  recipientEmail: string;
}

export interface ProjectInvitationData {
  inviterName: string;
  projectName: string;
  workspaceName: string;
  inviteUrl: string;
  recipientEmail: string;
}

export interface WelcomeData {
  userName: string;
  workspaceName?: string;
  loginUrl: string;
}

export interface ProjectSharedData {
  sharedBy: string;
  projectName: string;
  projectUrl: string;
  recipientName: string;
}

export interface PasswordResetData {
  userName: string;
  resetUrl: string;
  expiryTime: string;
}

export interface EmailVerificationData {
  userName: string;
  verificationUrl: string;
  expiryTime: string;
}

export class EmailTemplateRenderer {
  private static templates: Record<EmailTemplate, (data: any) => EmailTemplateData> = {
    [EmailTemplate.WORKSPACE_INVITATION]: (data: WorkspaceInvitationData) => ({
      subject: `Convite para o workspace ${data.workspaceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Convite para Workspace</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Você foi convidado!</h1>
            </div>
            <div class="content">
              <p>Olá!</p>
              <p><strong>${data.inviterName}</strong> convidou você para participar do workspace <strong>${data.workspaceName}</strong>.</p>
              <p>Clique no botão abaixo para aceitar o convite e começar a colaborar:</p>
              <a href="${data.inviteUrl}" class="button">Aceitar Convite</a>
              <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #667eea;">${data.inviteUrl}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">Este convite foi enviado para ${data.recipientEmail}. Se você não esperava este convite, pode ignorar este email.</p>
            </div>
            <div class="footer">
              <p>© 2024 LMK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá!

        ${data.inviterName} convidou você para participar do workspace ${data.workspaceName}.

        Clique no link abaixo para aceitar o convite:
        ${data.inviteUrl}

        Este convite foi enviado para ${data.recipientEmail}. Se você não esperava este convite, pode ignorar este email.

        © 2024 LMK. Todos os direitos reservados.
      `
    }),

    [EmailTemplate.PROJECT_INVITATION]: (data: ProjectInvitationData) => ({
      subject: `Convite para o projeto ${data.projectName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Convite para Projeto</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #4facfe; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📁 Convite para Projeto</h1>
            </div>
            <div class="content">
              <p>Olá!</p>
              <p><strong>${data.inviterName}</strong> convidou você para colaborar no projeto <strong>${data.projectName}</strong> do workspace <strong>${data.workspaceName}</strong>.</p>
              <p>Clique no botão abaixo para aceitar o convite:</p>
              <a href="${data.inviteUrl}" class="button">Aceitar Convite</a>
              <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #4facfe;">${data.inviteUrl}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">Este convite foi enviado para ${data.recipientEmail}.</p>
            </div>
            <div class="footer">
              <p>© 2024 LMK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá!

        ${data.inviterName} convidou você para colaborar no projeto ${data.projectName} do workspace ${data.workspaceName}.

        Clique no link abaixo para aceitar o convite:
        ${data.inviteUrl}

        Este convite foi enviado para ${data.recipientEmail}.

        © 2024 LMK. Todos os direitos reservados.
      `
    }),

    [EmailTemplate.WELCOME]: (data: WelcomeData) => ({
      subject: `Bem-vindo ao LMK, ${data.userName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bem-vindo ao LMK</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Bem-vindo ao LMK!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.userName}</strong>!</p>
              <p>Seja bem-vindo ao LMK! Estamos muito felizes em tê-lo conosco.</p>
              ${data.workspaceName ? `<p>Você agora faz parte do workspace <strong>${data.workspaceName}</strong>.</p>` : ''}
              <p>Para começar a usar a plataforma, clique no botão abaixo:</p>
              <a href="${data.loginUrl}" class="button">Acessar Plataforma</a>
              <h3>🎯 Próximos passos:</h3>
              <ul>
                <li>Complete seu perfil</li>
                <li>Explore os recursos disponíveis</li>
                <li>Crie seu primeiro projeto</li>
                <li>Convide sua equipe</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2024 LMK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá ${data.userName}!

        Seja bem-vindo ao LMK! Estamos muito felizes em tê-lo conosco.

        ${data.workspaceName ? `Você agora faz parte do workspace ${data.workspaceName}.` : ''}

        Para começar a usar a plataforma, acesse: ${data.loginUrl}

        Próximos passos:
        - Complete seu perfil
        - Explore os recursos disponíveis
        - Crie seu primeiro projeto
        - Convide sua equipe

        © 2024 LMK. Todos os direitos reservados.
      `
    }),

    [EmailTemplate.PROJECT_SHARED]: (data: ProjectSharedData) => ({
      subject: `${data.sharedBy} compartilhou o projeto "${data.projectName}" com você`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Projeto Compartilhado</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #fa709a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Projeto Compartilhado</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.recipientName}</strong>!</p>
              <p><strong>${data.sharedBy}</strong> compartilhou o projeto <strong>${data.projectName}</strong> com você.</p>
              <p>Clique no botão abaixo para visualizar:</p>
              <a href="${data.projectUrl}" class="button">Ver Projeto</a>
              <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #fa709a;">${data.projectUrl}</p>
            </div>
            <div class="footer">
              <p>© 2024 LMK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá ${data.recipientName}!

        ${data.sharedBy} compartilhou o projeto ${data.projectName} com você.

        Acesse: ${data.projectUrl}

        © 2024 LMK. Todos os direitos reservados.
      `
    }),

    [EmailTemplate.PASSWORD_RESET]: (data: PasswordResetData) => ({
      subject: 'Redefinir sua senha - LMK',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Redefinir Senha</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Redefinir Senha</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.userName}</strong>!</p>
              <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:</p>
              <a href="${data.resetUrl}" class="button">Redefinir Senha</a>
              <div class="warning">
                <p><strong>⚠️ Importante:</strong> Este link expira em <strong>${data.expiryTime}</strong>.</p>
              </div>
              <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #ff6b6b;">${data.resetUrl}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.</p>
            </div>
            <div class="footer">
              <p>© 2024 LMK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá ${data.userName}!

        Você solicitou a redefinição da sua senha.

        Clique no link abaixo para criar uma nova senha:
        ${data.resetUrl}

        ⚠️ IMPORTANTE: Este link expira em ${data.expiryTime}.

        Se você não solicitou esta redefinição, ignore este email.

        © 2024 LMK. Todos os direitos reservados.
      `
    }),

    [EmailTemplate.EMAIL_VERIFICATION]: (data: EmailVerificationData) => ({
      subject: 'Verificar seu email - LMK',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verificar Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00c851 0%, #00ff88 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #00c851; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Verificar Email</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${data.userName}</strong>!</p>
              <p>Para completar seu cadastro, precisamos verificar seu endereço de email. Clique no botão abaixo:</p>
              <a href="${data.verificationUrl}" class="button">Verificar Email</a>
              <div class="warning">
                <p><strong>ℹ️ Informação:</strong> Este link expira em <strong>${data.expiryTime}</strong>.</p>
              </div>
              <p>Se você não conseguir clicar no botão, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #00c851;">${data.verificationUrl}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 14px; color: #666;">Se você não criou uma conta no LMK, ignore este email.</p>
            </div>
            <div class="footer">
              <p>© 2024 LMK. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá ${data.userName}!

        Para completar seu cadastro, precisamos verificar seu endereço de email.

        Clique no link abaixo:
        ${data.verificationUrl}

        ℹ️ Este link expira em ${data.expiryTime}.

        Se você não criou uma conta no LMK, ignore este email.

        © 2024 LMK. Todos os direitos reservados.
      `
    })
  };

  static render(template: EmailTemplate, data: any): EmailTemplateData {
    const renderer = this.templates[template];
    if (!renderer) {
      throw new Error(`Template ${template} not found`);
    }
    return renderer(data);
  }

  static getAvailableTemplates(): EmailTemplate[] {
    return Object.keys(this.templates) as EmailTemplate[];
  }
}