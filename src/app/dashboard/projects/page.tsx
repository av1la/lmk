"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, MoreVertical, Calendar, Users as UsersIcon, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useProjects } from "@/hooks/useProjects"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"

const getStatusBadge = (status: string) => {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded"
    case "DRAFT":
      return "px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded"
    case "REVIEW":
      return "px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
    default:
      return "px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
  }
}

const getStatusText = (status: string) => {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "Publicado"
    case "DRAFT":
      return "Rascunho"
    case "REVIEW":
      return "Em revisão"
    default:
      return status
  }
}

export default function ProjectsPage() {
  const { workspace } = useWorkspaceContext();
  const { projects, loading, error } = useProjects(workspace.id);
  const [searchTerm, setSearchTerm] = useState("");
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projetos</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os projetos do workspace <span className="font-medium">{workspace.name}</span>
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
          <Input 
            placeholder="Pesquisar projetos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="search"
          />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Todos os Projetos</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-600 mt-2">Carregando projetos...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-2">Erro ao carregar projetos</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
            <p className="text-gray-600 mb-4">Crie seu primeiro projeto para começar</p>
            <Link href="/dashboard/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Projeto
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects
              .filter(project => 
                project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Link href={`/dashboard/projects/${project.id}`}>
                          <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                            {project.name}
                          </h3>
                        </Link>
                        <span className={getStatusBadge(project.status)}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">{project.description || 'Sem descrição'}</p>
                      
                      <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          Atualizado em {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center">
                          <UsersIcon className="mr-1 h-4 w-4" />
                          1 membro
                        </div>
                        <div>
                          0 páginas
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <Button variant="secondary" size="sm">
                          Ver Projeto
                        </Button>
                      </Link>
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
  )
}