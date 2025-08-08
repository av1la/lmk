'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface InviteData {
  workspaceName: string;
  inviterName: string;
  role: string;
  email: string;
  token: string;
  expired: boolean;
  accepted: boolean;
}

interface Context {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspaceInvitePage({ params }: Context) {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  
  const token = searchParams.get('token');

  // Set body background color
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const originalBodyColor = document.body.style.backgroundColor;
      const originalHtmlColor = document.documentElement.style.backgroundColor;
      
      document.body.style.backgroundColor = '#f9fafb'; // gray-50
      document.documentElement.style.backgroundColor = '#f9fafb';
      
      // Cleanup on unmount
      return () => {
        document.body.style.backgroundColor = originalBodyColor;
        document.documentElement.style.backgroundColor = originalHtmlColor;
      };
    }
  }, []);

  useEffect(() => {
    async function getWorkspaceId() {
      const resolvedParams = await params;
      setWorkspaceId(resolvedParams.workspaceId);
    }
    getWorkspaceId();
  }, [params]);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }
    
    if (!token) {
      setError('Link de convite inválido. Token não encontrado.');
      setLoading(false);
      return;
    }
    
    async function validateInvite() {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/workspace/${workspaceId}/invite/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error || 'Convite inválido');
          return;
        }

        setInviteData(data.invite);
      } catch (err) {
        setError('Erro ao validar convite');
      } finally {
        setLoading(false);
      }
    }

    validateInvite();
  }, [workspaceId, token]);

  const handleAcceptInvite = async () => {
    if (!isSignedIn || !token) return;

    try {
      setAccepting(true);
      const response = await fetch(`/api/workspace/${workspaceId}/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao aceitar convite');
        return;
      }

      setSuccess(true);
      
      // Set workspace as current before redirect and force refresh
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentWorkspaceId', workspaceId);
        // Clear workspace cache to force refresh
        localStorage.removeItem('workspacesCache');
        sessionStorage.clear();
      }
      
      setTimeout(() => {
        // Use router.replace to avoid back button issues
        router.replace('/dashboard');
      }, 1500);

    } catch (err) {
      setError('Erro ao aceitar convite');
    } finally {
      setAccepting(false);
    }
  };

  // Check for pending invite after user logs in
  useEffect(() => {
    if (isSignedIn && typeof window !== 'undefined') {
      const pendingInvite = sessionStorage.getItem('pendingInvite');
      if (pendingInvite) {
        try {
          const invite = JSON.parse(pendingInvite);
          // Clear the stored invite
          sessionStorage.removeItem('pendingInvite');
          // If current page matches the stored invite, continue with validation
          if (invite.workspaceId === workspaceId && invite.token === token) {
            // The useEffect for validation will handle this
            return;
          }
          // If different, redirect to the correct invite
          if (invite.inviteUrl) {
            router.push(invite.inviteUrl);
            return;
          }
        } catch (error) {
          console.error('Error parsing pending invite:', error);
          sessionStorage.removeItem('pendingInvite');
        }
      }
    }
  }, [isSignedIn, workspaceId, token, router]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-700">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-red-500 mb-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xl font-bold text-gray-900">Erro</span>
            </div>
          </div>
          <div>
            <p className="text-gray-700 mb-6 leading-relaxed">{error}</p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Ir para Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-green-500 mb-3">
              <CheckCircle className="h-5 w-5" />
              <span className="text-xl font-bold text-gray-900">Sucesso!</span>
            </div>
          </div>
          <div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Convite aceito com sucesso! Redirecionando para o workspace...
            </p>
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-500">Redirecionando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-gray-700">Validando convite...</span>
        </div>
      </div>
    );
  }

  if (inviteData.expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-amber-500 mb-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xl font-bold text-gray-900">Convite Expirado</span>
            </div>
          </div>
          <div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Este convite para o workspace <strong>{inviteData.workspaceName}</strong> expirou.
            </p>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Entre em contato com {inviteData.inviterName} para solicitar um novo convite.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Ir para Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (inviteData.accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-blue-500 mb-3">
              <CheckCircle className="h-5 w-5" />
              <span className="text-xl font-bold text-gray-900">Convite Já Aceito</span>
            </div>
          </div>
          <div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Você já aceitou este convite para o workspace <strong>{inviteData.workspaceName}</strong>.
            </p>
            <Button onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('currentWorkspaceId', workspaceId);
                localStorage.removeItem('workspacesCache');
              }
              router.push('/dashboard');
            }} className="w-full">
              Acessar Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user email matches invite email
  if (isSignedIn && user && inviteData && user.emailAddresses[0]?.emailAddress !== inviteData.email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-red-500 mb-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xl font-bold text-gray-900">Email Inválido</span>
            </div>
          </div>
          <div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              Este convite foi enviado para <strong>{inviteData.email}</strong>, mas você está logado como <strong>{user.emailAddresses[0]?.emailAddress}</strong>.
            </p>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Por favor, faça login com a conta correta ou peça um novo convite para seu email atual.
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/sign-out')} className="w-full">
                Sair e Fazer Login com Outro Email
              </Button>
              <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full">
                Ir para Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    // Save invite data for after login
    if (typeof window !== 'undefined' && token && workspaceId) {
      sessionStorage.setItem('pendingInvite', JSON.stringify({
        workspaceId,
        token,
        inviteUrl: window.location.href
      }));
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 p-6">
          <div className="mb-4">
            <div className="text-2xl font-bold text-gray-900 mb-3">Convite para Workspace</div>
            <p className="text-gray-700 leading-relaxed">
              {inviteData.inviterName} convidou você para participar do workspace{' '}
              <strong>{inviteData.workspaceName}</strong> como {inviteData.role.toLowerCase()}.
            </p>
          </div>
          <div>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Detalhes do Convite:</h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li><strong>Workspace:</strong> {inviteData.workspaceName}</li>
                  <li><strong>Função:</strong> {inviteData.role}</li>
                  <li><strong>Email:</strong> {inviteData.email}</li>
                  <li><strong>Convidado por:</strong> {inviteData.inviterName}</li>
                </ul>
              </div>
              
              <p className="text-sm text-gray-700 mb-6">
                Para aceitar este convite, você precisa fazer login ou criar uma conta.
              </p>
              
              <div className="space-y-2">
                <Button onClick={() => {
                  const redirectUrl = encodeURIComponent(window.location.href);
                  router.push(`/sign-in?redirect_url=${redirectUrl}`);
                }} className="w-full">
                  Fazer Login
                </Button>
                <Button onClick={() => {
                  const redirectUrl = encodeURIComponent(window.location.href);
                  router.push(`/sign-up?redirect_url=${redirectUrl}`);
                }} variant="outline" className="w-full">
                  Criar Conta
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg border p-6">
        <div className="mb-4">
          <div className="text-2xl font-bold text-gray-900 mb-3">Aceitar Convite</div>
          <p className="text-gray-700 leading-relaxed">
            {inviteData.inviterName} convidou você para participar do workspace{' '}
            <strong>{inviteData.workspaceName}</strong> como {inviteData.role.toLowerCase()}.
          </p>
        </div>
        <div>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Detalhes do Convite:</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong>Workspace:</strong> {inviteData.workspaceName}</li>
                <li><strong>Função:</strong> {inviteData.role}</li>
                <li><strong>Email:</strong> {inviteData.email}</li>
                <li><strong>Convidado por:</strong> {inviteData.inviterName}</li>
              </ul>
            </div>
            
            <Button 
              onClick={handleAcceptInvite} 
              disabled={accepting}
              className="w-full"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aceitando...
                </>
              ) : (
                'Aceitar Convite'
              )}
            </Button>
            
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="outline" 
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}