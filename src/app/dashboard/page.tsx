"use client"

import { Button } from "@/components/ui/button"
import { FolderOpen, Users, FileText, Building2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"
import { useWorkspaceStats } from "@/hooks/useWorkspaceStats"

export default function DashboardPage() {
  const { workspace } = useWorkspaceContext()
  const { stats, topPages, loading: statsLoading } = useWorkspaceStats()
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{workspace?.name || 'Carregando...'}</h1>
            <p className="text-gray-600 mt-1">{workspace?.description || 'Gerencie seus projetos e equipe'}</p>
          </div>
        </div>
        
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Sparkles className="w-3 h-3 mr-1" />
          Plano {workspace?.plan || 'FREE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Projetos</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.projects}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Páginas</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.pages}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Membros</p>
              <p className="text-2xl font-bold text-gray-900">
                {statsLoading ? '...' : stats.members}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="space-y-3">
            <Link href="/dashboard/projects/new">
              <Button variant="ghost" className="w-full justify-start h-10">
                <FolderOpen className="h-4 w-4 mr-3" />
                Novo Projeto
              </Button>
            </Link>
            
            <Link href="/dashboard/members">
              <Button variant="ghost" className="w-full justify-start h-10">
                <Users className="h-4 w-4 mr-3" />
                Convidar Membro
              </Button>
            </Link>
            
            <Button variant="ghost" className="w-full justify-start h-10 text-gray-700 hover:text-gray-900 hover:bg-gray-50">
              <FileText className="h-4 w-4 mr-3" />
              Ver Relatórios
            </Button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Páginas Mais Acessadas</h2>
          <div className="space-y-3">
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded-full animate-pulse"></div>
                ))}
              </div>
            ) : topPages.length > 0 ? (
              topPages.map((page) => (
                <div key={page.id} className="relative">
                  <div className="w-full bg-gray-100 rounded-full h-8 flex items-center">
                    <div 
                      className="bg-gradient-to-r from-blue-400/60 via-blue-500/80 to-blue-600 h-8 rounded-full transition-all duration-500 flex items-center justify-between px-4 text-white" 
                      style={{width: `${page.percentage}%`}}
                    >
                      <span className="text-sm font-medium truncate">{page.name}</span>
                      <span className="text-xs font-semibold ml-2">{page.views.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhuma página encontrada</p>
                <p className="text-xs text-gray-400 mt-1">Crie seu primeiro projeto para ver estatísticas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}