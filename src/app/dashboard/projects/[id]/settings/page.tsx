"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Settings, Save, Trash2, AlertTriangle, Loader2, Users, Plus, X, Mail } from "lucide-react"
import Link from "next/link"
import { useProject } from "@/hooks/useProject"
import { useUpdateProject } from "@/hooks/useUpdateProject"
import { useMembers } from "@/hooks/useMembers"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"
import { use, useState } from "react"
import { useRouter } from "next/navigation"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function ProjectSettingsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { workspace } = useWorkspaceContext();
  const { project, loading, error, refetch } = useProject(resolvedParams.id, workspace.id);
  const { updateProject, deleteProject, loading: updateLoading, error: updateError, clearError } = useUpdateProject();
  const { members: workspaceMembers } = useMembers(workspace.id);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
    slug: '',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
    customDomain: ''
  });
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showVisibilityAlert, setShowVisibilityAlert] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<'PUBLIC' | 'PRIVATE' | null>(null);

  // Initialize form when project loads
  if (project && !isFormInitialized) {
    setFormData(prev => ({
      ...prev,
      name: project.name,
      description: project.description || '',
      visibility: project.visibility,
      slug: project.slug
    }));
    setIsFormInitialized(true);
  }

  const handleInputChange = (field: string, value: string) => {
    // Special handling for visibility change
    if (field === 'visibility' && project && value !== formData.visibility) {
      if (value === 'PUBLIC' && project.members.length > 0) {
        setPendingVisibility(value as 'PUBLIC' | 'PRIVATE');
        setShowVisibilityAlert(true);
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    clearError();
  };

  const handleVisibilityConfirm = () => {
    if (pendingVisibility) {
      setFormData(prev => ({ ...prev, visibility: pendingVisibility }));
      setShowVisibilityAlert(false);
      setPendingVisibility(null);
      setSaveSuccess(false);
      clearError();
    }
  };

  const handleVisibilityCancel = () => {
    setShowVisibilityAlert(false);
    setPendingVisibility(null);
  };

  const handleAddMemberToProject = async (memberId: string) => {
    if (!project) return;
    
    setInviteLoading(true);
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar membro ao projeto');
      }

      refetch(); // Refresh project data
    } catch (error) {
      console.error('Error adding member to project:', error);
      alert('Erro ao adicionar membro ao projeto');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveFromProject = async (memberId: string) => {
    if (!project) return;
    
    const confirmMessage = 'Tem certeza que deseja remover este membro do projeto?';
    if (confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/projects/${resolvedParams.id}/members/${memberId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Erro ao remover membro do projeto');
        }

        refetch(); // Refresh project data
      } catch (error) {
        console.error('Error removing member from project:', error);
        alert('Erro ao remover membro do projeto');
      }
    }
  };

  // Filter available members (workspace members not already in project)
  const availableMembersForProject = workspaceMembers.filter(
    workspaceMember => !project.members.some(projectMember => projectMember.id === workspaceMember.id)
  );

  const handleSave = async () => {
    if (!project) return;
    
    clearError();
    const result = await updateProject(resolvedParams.id, workspace.id, {
      name: formData.name,
      description: formData.description,
      visibility: formData.visibility,
      slug: formData.slug,
      metaTitle: formData.metaTitle,
      metaDescription: formData.metaDescription,
      keywords: formData.keywords,
      customDomain: formData.customDomain
    });

    if (result.success) {
      setSaveSuccess(true);
      refetch(); // Refetch project data
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    
    const confirmMessage = `Tem certeza que deseja excluir o projeto "${project.name}"?\n\nEsta ação não pode ser desfeita e todos os dados serão perdidos permanentemente.`;
    
    if (confirm(confirmMessage)) {
      const result = await deleteProject(resolvedParams.id, workspace.id);
      
      if (result.success) {
        router.push('/dashboard/projects');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erro ao carregar projeto</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <Link href="/dashboard/projects">
              <Button variant="navigation" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos Projetos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Projeto não encontrado</p>
            <Link href="/dashboard/projects">
              <Button variant="navigation">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos Projetos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <Link href="/dashboard/projects" className="hover:text-gray-700">Projetos</Link>
          <span>/</span>
          <Link href={`/dashboard/projects/${resolvedParams.id}`} className="hover:text-gray-700">
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">Configurações</span>
        </nav>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link href={`/dashboard/projects/${resolvedParams.id}`}>
                <Button variant="navigation" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Configurações do Projeto</h1>
            </div>
            <p className="text-gray-600">Gerencie as configurações e informações do seu projeto</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleSave} disabled={updateLoading}>
              {updateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : saveSuccess ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvo!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        {/* Error/Success Messages */}
        {updateError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700">{updateError}</p>
          </div>
        )}
        
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <Save className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-green-700">Configurações salvas com sucesso!</p>
          </div>
        )}

        {/* Visibility Change Alert */}
        {showVisibilityAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Mudança de Visibilidade</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Ao alterar este projeto para <strong>público</strong>, todos os membros específicos serão removidos do projeto.
                </p>
                <p className="text-sm text-gray-600">
                  Em projetos públicos, todos os membros do workspace têm acesso automaticamente.
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <Button variant="outline" onClick={handleVisibilityCancel}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleVisibilityConfirm}>
                  Confirmar e Remover Membros
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Informações Básicas */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Settings className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Informações Básicas</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" variant="required">Nome do Projeto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Nome do seu projeto"
                    variant="default"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Este nome será exibido no dashboard e relatórios
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Descreva o objetivo deste projeto..."
                    rows={4}
                    variant="default"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Uma breve descrição do projeto e seus objetivos
                  </p>
                </div>

                <div>
                  <Label htmlFor="slug" variant="required">Slug do Projeto</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="meu-projeto"
                    variant="default"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Usado nas URLs: lmk.com/p/{formData.slug}
                  </p>
                </div>

                <div>
                  <Label htmlFor="visibility">Visibilidade</Label>
                  <Select value={formData.visibility} onValueChange={(value) => handleInputChange('visibility', value)}>
                    <SelectTrigger variant="default" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIVATE">Privado - Apenas membros específicos</SelectItem>
                      <SelectItem value="PUBLIC">Público - Todos do workspace</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Controla o acesso ao projeto dentro do seu workspace
                  </p>
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Configurações de SEO</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="metaTitle" variant="subtle">Título da Página (Meta Title)</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                    placeholder="Título que aparece no Google"
                    variant="subtle"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recomendado: 50-60 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription" variant="subtle">Descrição (Meta Description)</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                    placeholder="Descrição que aparece nos resultados de busca"
                    rows={3}
                    variant="subtle"
                    size="sm"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recomendado: 150-160 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="keywords" variant="subtle">Palavras-chave</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => handleInputChange('keywords', e.target.value)}
                    placeholder="palavra1, palavra2, palavra3"
                    variant="subtle"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Separe as palavras-chave com vírgulas
                  </p>
                </div>
              </div>
            </div>

            {/* Members Section - Only show for private projects */}
            {formData.visibility === 'PRIVATE' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <Users className="h-5 w-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Membros do Projeto</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Add Members from Workspace */}
                  {availableMembersForProject.length > 0 && (
                    <div>
                      <Label>Adicionar Membros do Workspace</Label>
                      <div className="mt-2 space-y-2">
                        {availableMembersForProject.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddMemberToProject(member.id)}
                              disabled={inviteLoading}
                            >
                              {inviteLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="mr-1 h-4 w-4" />
                                  Adicionar
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Membros do seu workspace que podem ser adicionados ao projeto
                      </p>
                    </div>
                  )}

                  {availableMembersForProject.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-2">
                        Todos os membros do workspace já estão no projeto
                      </p>
                      <Link href="/dashboard/members">
                        <Button variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Convidar Novos Membros
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Members List */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Membros Atuais ({project.members.length})
                    </h4>
                    
                    {project.members && project.members.length > 0 ? (
                      <div className="space-y-2">
                        {project.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                {member.role || 'Membro'}
                              </span>
                              {member.id !== project.ownerId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFromProject(member.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">Nenhum membro convidado ainda</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Convide membros para colaborar neste projeto
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Domain Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Domínio Personalizado</h2>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="customDomain" variant="subtle">Domínio</Label>
                  <Input
                    id="customDomain"
                    value={formData.customDomain}
                    onChange={(e) => handleInputChange('customDomain', e.target.value)}
                    placeholder="www.meusite.com"
                    variant="subtle"
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Configure um domínio personalizado para seu projeto
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Como configurar:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Adicione um registro CNAME no seu provedor de DNS</li>
                    <li>Aponte para: projects.lmk.com</li>
                    <li>Aguarde a propagação (até 24h)</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Projeto</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Criado em:</span>
                  <span className="font-medium text-gray-900">{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Última atualização:</span>
                  <span className="font-medium text-gray-900">{new Date(project.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-gray-900">{project.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Páginas:</span>
                  <span className="font-medium text-gray-900">{project.pages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Membros:</span>
                  <span className="font-medium text-gray-900">{project.members.length}</span>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Visualizações (30d)</span>
                    <span className="font-medium text-gray-900">{project.stats.views.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '70%'}}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Conversões (30d)</span>
                    <span className="font-medium text-gray-900">{project.stats.conversions}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '45%'}}></div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">Taxa de conversão</p>
                  <p className="text-2xl font-bold text-gray-900">{project.stats.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Zona de Perigo</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Excluir Projeto</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Esta ação não pode ser desfeita. Todos os dados, páginas e configurações serão perdidos permanentemente.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={updateLoading}
                    className="w-full"
                  >
                    {updateLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Projeto
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}