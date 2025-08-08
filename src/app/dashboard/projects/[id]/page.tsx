"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Settings, Eye, Edit, MoreVertical, Calendar, Users as UsersIcon, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useProject } from "@/hooks/useProject"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"
import { use } from "react"


interface PageProps {
  params: Promise<{
    id: string
  }>
}

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return <Badge className="bg-green-100 text-green-800">Publicado</Badge>
    case "DRAFT":
      return <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>
    case "REVIEW":
      return <Badge className="bg-blue-100 text-blue-800">Em revisão</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const getRoleBadge = (role: string) => {
  switch (role.toUpperCase()) {
    case "OWNER":
      return <Badge>Proprietário</Badge>
    case "EDITOR":
      return <Badge variant="secondary">Editor</Badge>
    case "VIEWER":
      return <Badge variant="outline">Visualizador</Badge>
    default:
      return <Badge variant="outline">{role}</Badge>
  }
}

export default function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { workspace } = useWorkspaceContext();
  const { project, loading, error } = useProject(resolvedParams.id, workspace.id);

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Carregando projeto...</p>
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
      {/* Cabeçalho do Projeto */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Link href="/dashboard/projects">
                <Button variant="navigation" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            </div>
            <p className="text-gray-600 mt-2">{project.description || 'Sem descrição'}</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(project.status)}
            <Link href={`/dashboard/projects/${resolvedParams.id}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center">
            <UsersIcon className="mr-1 h-4 w-4" />
            {project.members.length} membros
          </div>
          <div>
            {project.pages.length} páginas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Páginas */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Páginas</h2>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Página
                </Button>
              </div>
            </div>
            
            {project.pages.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Plus className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma página encontrada</h3>
                <p className="text-gray-600 mb-4">Crie a primeira página do seu projeto</p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Página
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {project.pages.map((page) => (
                  <div key={page.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{page.name}</h3>
                          {page.isHomepage && (
                            <Badge variant="outline">Página inicial</Badge>
                          )}
                          {getStatusBadge(page.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{page.path}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Atualizado em {new Date(page.updatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Membros */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Membros</h2>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Convidar
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Estatísticas</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Visualizações</span>
                <span className="text-sm font-medium text-gray-900">{project.stats.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Conversões</span>
                <span className="text-sm font-medium text-gray-900">{project.stats.conversions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taxa de conversão</span>
                <span className="text-sm font-medium text-gray-900">{project.stats.conversionRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}