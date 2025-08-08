import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Eye, Edit, MoreVertical, Globe, Settings } from "lucide-react"
import Link from "next/link"
import { use } from "react"

const mockPages = [
  {
    id: "1",
    name: "Página Principal",
    path: "/",
    status: "published",
    updatedAt: "2024-01-15",
    isHomepage: true,
    views: 2547,
    conversions: 142
  },
  {
    id: "2",
    name: "Obrigado",
    path: "/obrigado", 
    status: "published",
    updatedAt: "2024-01-14",
    isHomepage: false,
    views: 89,
    conversions: 89
  },
  {
    id: "3",
    name: "Política de Privacidade",
    path: "/privacidade",
    status: "draft",
    updatedAt: "2024-01-12", 
    isHomepage: false,
    views: 0,
    conversions: 0
  },
  {
    id: "4",
    name: "Termos de Uso",
    path: "/termos",
    status: "review",
    updatedAt: "2024-01-13",
    isHomepage: false,
    views: 15,
    conversions: 0
  }
]

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "published":
      return <Badge className="bg-green-100 text-green-800">Publicado</Badge>
    case "draft":
      return <Badge className="bg-yellow-100 text-yellow-800">Rascunho</Badge>
    case "review":
      return <Badge className="bg-blue-100 text-blue-800">Em revisão</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ProjectPagesPage({ params }: PageProps) {
  const resolvedParams = use(params);
  
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/projects" className="hover:text-gray-700">Projetos</Link>
            <span>/</span>
            <Link href={`/dashboard/projects/${resolvedParams.id}`} className="hover:text-gray-700">
              Landing Page Produto X
            </Link>
            <span>/</span>
            <span className="text-gray-900">Páginas</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Páginas</h1>
          <p className="text-gray-600 mt-2">Gerencie todas as páginas do projeto</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary">
            <Settings className="mr-2 h-4 w-4" />
            Configurar Domínio
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Página
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="Pesquisar páginas..." variant="search" />
        </div>
        <Button variant="secondary">Filtros</Button>
        <Button variant="secondary">
          <Globe className="mr-2 h-4 w-4" />
          Visualizar Site
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total de Páginas</p>
          <p className="text-2xl font-bold text-gray-900">{mockPages.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Publicadas</p>
          <p className="text-2xl font-bold text-green-600">
            {mockPages.filter(p => p.status === 'published').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total de Visualizações</p>
          <p className="text-2xl font-bold text-blue-600">
            {mockPages.reduce((sum, page) => sum + page.views, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Conversões</p>
          <p className="text-2xl font-bold text-purple-600">
            {mockPages.reduce((sum, page) => sum + page.conversions, 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Todas as Páginas</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {mockPages.map((page) => (
            <div key={page.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{page.name}</h3>
                    {page.isHomepage && (
                      <Badge variant="outline">Página inicial</Badge>
                    )}
                    {getStatusBadge(page.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{page.path}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Visualizações:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {page.views.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Conversões:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {page.conversions}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Atualizado:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(page.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" title="Visualizar">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" title="Editar">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="primary" size="sm">
                    Editar no GrapesJS
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}