"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useCreateProject, CreateProjectData } from "@/hooks/useCreateProject"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"

export default function NewProjectPage() {
  const { workspace } = useWorkspaceContext()
  const { createProject, loading, error, validationErrors, clearError } = useCreateProject()
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    visibility: 'PRIVATE'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await createProject(formData, workspace.id)
  }

  const handleChange = (field: keyof CreateProjectData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro de validação do campo quando o usuário começar a digitar
    if (validationErrors[field]) {
      clearError()
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/dashboard/projects" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Projetos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Novo Projeto</h1>
        <p className="text-gray-600 mt-2">Crie um novo projeto de landing page</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" variant="required">
                Nome do Projeto
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Landing Page Principal"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                variant={validationErrors.name ? 'error' : 'ghost'}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">
                Descrição
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo deste projeto..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                variant={validationErrors.description ? 'error' : 'ghost'}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <Label htmlFor="visibility">
                Visibilidade
              </Label>
              <Select value={formData.visibility} onValueChange={(value) => handleChange('visibility', value)}>
                <SelectTrigger variant={validationErrors.visibility ? 'error' : 'ghost'}>
                  <SelectValue placeholder="Selecione a visibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">Privado - Apenas membros específicos</SelectItem>
                  <SelectItem value="PUBLIC">Público - Todos do workspace</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Controla quem pode visualizar e editar este projeto dentro do seu workspace
              </p>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Link href="/dashboard/projects">
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={loading || !formData.name.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Projeto'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}