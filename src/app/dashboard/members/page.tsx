"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmailChipInput } from "@/components/ui/email-chip-input"
import { Plus, Search, Mail, Calendar, Loader2, X, AlertTriangle, UserPlus, Check } from "lucide-react"
import { useState } from "react"
import { useMembers } from "@/hooks/useMembers"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"
import { WorkspaceRole } from "@/domains/workspace/WorkspaceDomain"


const getRoleBadge = (role: WorkspaceRole) => {
  switch (role) {
    case WorkspaceRole.OWNER:
      return <Badge>Proprietário</Badge>
    case WorkspaceRole.ADMIN:
      return <Badge variant="secondary">Administrador</Badge>
    case WorkspaceRole.EDITOR:
      return <Badge variant="secondary">Editor</Badge>
    case WorkspaceRole.VIEWER:
      return <Badge variant="outline">Visualizador</Badge>
    default:
      return <Badge variant="outline">{role}</Badge>
  }
}

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-800">Ativo</Badge>
    case "PENDING":
      return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
    case "INACTIVE":
      return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function MembersPage() {
  const { workspace } = useWorkspaceContext();
  const { members, stats, loading, error, refetch } = useMembers(workspace.id);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    emails: [] as string[],
    role: WorkspaceRole.VIEWER as WorkspaceRole
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResults, setInviteResults] = useState<{
    success: string[];
    failed: { email: string; error: string }[];
  } | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInviteMembers = async () => {
    if (inviteData.emails.length === 0) return;
    
    setInviteLoading(true);
    setInviteError(null);
    setInviteResults(null);
    
    const validEmails = inviteData.emails.filter(validateEmail);
    const invalidEmails = inviteData.emails.filter(email => !validateEmail(email));
    
    if (invalidEmails.length > 0) {
      setInviteError(`Remova os emails inválidos antes de continuar`);
      setInviteLoading(false);
      return;
    }

    if (validEmails.length === 0) {
      setInviteError('Adicione pelo menos um email válido');
      setInviteLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/workspace/${workspace.id}/members/invite-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails: validEmails,
          role: inviteData.role
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar convites');
      }

      const results = await response.json();
      setInviteResults(results);
      
      // If all succeeded, close modal after showing results
      if (results.failed.length === 0) {
        setTimeout(() => {
          setInviteData({ emails: [], role: WorkspaceRole.VIEWER });
          setShowInviteModal(false);
          setInviteResults(null);
          refetch(); // Refresh members list
        }, 2000);
      }
      
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const confirmMessage = `Tem certeza que deseja remover ${memberName} da equipe?`;
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/workspace/${workspace.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao remover membro');
      }

      refetch(); // Refresh members list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao remover membro');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/workspace/${workspace.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar função');
      }

      refetch(); // Refresh members list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar função');
    }
  };


  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membros</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os membros do workspace <span className="font-medium">{workspace.name}</span>
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar Membros
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
          <Input 
            placeholder="Pesquisar membros..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="search"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
          <p className="text-sm font-medium text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
          <p className="text-sm font-medium text-gray-600">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
          <p className="text-sm font-medium text-blue-600">Proprietários</p>
          <p className="text-2xl font-bold text-blue-800">{stats.owners}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
          <p className="text-sm font-medium text-purple-600">Admins</p>
          <p className="text-2xl font-bold text-purple-800">{stats.admins}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
          <p className="text-sm font-medium text-green-600">Editores</p>
          <p className="text-2xl font-bold text-green-800">{stats.editors}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200/50">
          <p className="text-sm font-medium text-gray-600">Visualizadores</p>
          <p className="text-2xl font-bold text-gray-800">{stats.viewers}</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Todos os Membros</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Carregando membros...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-2">Erro ao carregar membros</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum membro encontrado</h3>
            <p className="text-gray-600 mb-4">Convide o primeiro membro para sua equipe</p>
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Primeiros Membros
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {members
              .filter(member => 
                member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((member) => (
            <div key={member.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-600">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
                      {getRoleBadge(member.role)}
                      {getStatusBadge(member.status)}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Mail className="mr-1 h-4 w-4" />
                        {member.email}
                      </div>
                      {member.joinedAt && (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          Entrou em {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {member.lastActiveAt && (
                        <div>
                          Último acesso: {new Date(member.lastActiveAt).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Select
                    value={member.role}
                    onValueChange={(newRole) => handleUpdateRole(member.id, newRole)}
                  >
                    <SelectTrigger variant="ghost" size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WorkspaceRole.OWNER}>Proprietário</SelectItem>
                      <SelectItem value={WorkspaceRole.ADMIN}>Administrador</SelectItem>
                      <SelectItem value={WorkspaceRole.EDITOR}>Editor</SelectItem>
                      <SelectItem value={WorkspaceRole.VIEWER}>Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {member.role !== WorkspaceRole.OWNER && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
              ))}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Convidar Membros</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                  setInviteResults(null);
                  setInviteData({ emails: [], role: WorkspaceRole.VIEWER });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{inviteError}</p>
              </div>
            )}

            {inviteResults && (
              <div className="mb-4 space-y-3">
                {inviteResults.success.length > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <h4 className="font-medium text-green-900">Convites enviados com sucesso</h4>
                    </div>
                    <div className="text-sm text-green-700">
                      {inviteResults.success.map((email, index) => (
                        <div key={index} className="flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          {email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {inviteResults.failed.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <h4 className="font-medium text-red-900">Falhas no envio</h4>
                    </div>
                    <div className="text-sm text-red-700 space-y-1">
                      {inviteResults.failed.map((fail, index) => (
                        <div key={index}>
                          <strong>{fail.email}:</strong> {fail.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="inviteEmails" variant="required">Emails</Label>
                <EmailChipInput
                  emails={inviteData.emails}
                  onChange={(emails) => setInviteData(prev => ({ ...prev, emails }))}
                  placeholder="Digite um email e pressione Enter..."
                  disabled={inviteLoading}
                />
              </div>

              <div>
                <Label htmlFor="inviteRole">Função</Label>
                <Select
                  value={inviteData.role}
                  onValueChange={(role) => setInviteData(prev => ({ ...prev, role: role as WorkspaceRole }))}
                >
                  <SelectTrigger variant="default">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WorkspaceRole.VIEWER}>Visualizador - Apenas visualizar</SelectItem>
                    <SelectItem value={WorkspaceRole.EDITOR}>Editor - Criar e editar projetos</SelectItem>
                    <SelectItem value={WorkspaceRole.ADMIN}>Administrador - Gerenciar membros e projetos</SelectItem>
                    <SelectItem value={WorkspaceRole.OWNER}>Proprietário - Acesso total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError(null);
                  setInviteResults(null);
                  setInviteData({ emails: [], role: WorkspaceRole.VIEWER });
                }}
                disabled={inviteLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleInviteMembers}
                disabled={inviteData.emails.length === 0 || inviteLoading}
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando Convites...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Convites
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}