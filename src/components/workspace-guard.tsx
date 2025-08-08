"use client"

import { useWorkspaceContext } from "@/contexts/WorkspaceContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2, Building2 } from "lucide-react"

interface WorkspaceGuardProps {
  children: React.ReactNode
}

export function WorkspaceGuard({ children }: WorkspaceGuardProps) {
  const { hasWorkspace, loading, error, initialLoad, workspaces } = useWorkspaceContext()
  const router = useRouter()

  useEffect(() => {
    console.log('🛡️  WorkspaceGuard - State check:', {
      initialLoad,
      loading,
      hasWorkspace,
      workspacesCount: workspaces.length,
      error
    });
    
    // Only redirect after initial load is complete and we know the user doesn't have any workspaces
    if (!initialLoad && !loading && !error && hasWorkspace === false && workspaces.length === 0) {
      console.log('🔄 WorkspaceGuard - Redirecting to onboarding');
      router.replace('/onboarding/workspace')
    }
  }, [hasWorkspace, loading, initialLoad, workspaces, router, error])

  // Show loading while checking workspace status OR during initial load
  if (loading || initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando workspace...</h2>
          <p className="text-gray-600">Verificando suas configurações</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <Building2 className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar workspace</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // If user doesn't have any workspaces, show loading until redirect
  if (!initialLoad && !error && hasWorkspace === false && workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Configurando workspace...</h2>
          <p className="text-gray-600">Redirecionando para configuração</p>
        </div>
      </div>
    )
  }

  // User has workspace, render children
  return <>{children}</>
}