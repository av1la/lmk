"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Building2, Users, Sparkles, ArrowRight, Loader2, AlertCircle, Check, X } from "lucide-react"
import { useState } from "react"
import { useWorkspace } from "@/hooks/useWorkspace"
import { useRouter } from "next/navigation"

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const { createWorkspace, loading } = useWorkspace();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Espaços viram hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
      .trim();
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    
    setSlugStatus('checking');
    
    try {
      const response = await fetch(`/api/workspace/check-slug?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      
      setSlugStatus(data.available ? 'available' : 'taken');
    } catch (error) {
      setSlugStatus('idle');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = generateSlug(value);
      setFormData(prev => ({ ...prev, slug }));
      
      // Check slug availability after generating
      if (slug.length >= 3) {
        setTimeout(() => checkSlugAvailability(slug), 500);
      }
    }
    
    // Check slug availability when manually edited
    if (field === 'slug') {
      if (value.length >= 3) {
        setTimeout(() => checkSlugAvailability(value), 500);
      } else {
        setSlugStatus('idle');
      }
    }
    
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Nome do workspace é obrigatório');
      return;
    }

    if (!formData.slug.trim()) {
      setError('URL do workspace é obrigatória');
      return;
    }

    if (slugStatus === 'taken') {
      setError('Esta URL já está em uso. Escolha outra URL.');
      return;
    }

    if (slugStatus === 'checking') {
      setError('Aguarde a verificação da URL ser concluída');
      return;
    }

    const result = await createWorkspace(formData);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Erro ao criar workspace');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao LMK! 🎉
          </h1>
          <p className="text-gray-600 text-lg">
            Vamos criar seu primeiro workspace para começar a construir landing pages incríveis
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-100">
            <Sparkles className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Projetos Ilimitados</h3>
            <p className="text-sm text-gray-600">Crie quantos projetos precisar</p>
          </div>
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-100">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Colaboração</h3>
            <p className="text-sm text-gray-600">Convide sua equipe para colaborar</p>
          </div>
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-100">
            <Building2 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">Organização</h3>
            <p className="text-sm text-gray-600">Mantenha tudo organizado</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Configure seu Workspace
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" variant="required">Nome do Workspace</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ex: Minha Empresa, Agência Digital..."
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                variant="default"
                className="mt-2"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Este será o nome principal do seu workspace
              </p>
            </div>

            <div>
              <Label htmlFor="slug">URL do Workspace</Label>
              <div className="mt-2 flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  lmk.com/
                </span>
                <div className="relative flex-1">
                  <Input
                    id="slug"
                    type="text"
                    placeholder="minha-empresa"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    variant={slugStatus === 'taken' ? 'error' : slugStatus === 'available' ? 'success' : 'default'}
                    className="rounded-l-none pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {slugStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {slugStatus === 'available' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {slugStatus === 'taken' && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-1">
                {slugStatus === 'available' && (
                  <p className="text-sm text-green-600 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    URL disponível
                  </p>
                )}
                {slugStatus === 'taken' && (
                  <p className="text-sm text-red-600 flex items-center">
                    <X className="h-3 w-3 mr-1" />
                    Esta URL já está em uso
                  </p>
                )}
                {slugStatus === 'checking' && (
                  <p className="text-sm text-gray-500 flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Verificando disponibilidade...
                  </p>
                )}
                {slugStatus === 'idle' && (
                  <p className="text-sm text-gray-500">
                    URL personalizada para acessar seu workspace
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva seu workspace, equipe ou propósito..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                variant="default"
                rows={3}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Ajude sua equipe a entender o propósito deste workspace
              </p>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading || !formData.name.trim() || slugStatus === 'taken' || slugStatus === 'checking'}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando Workspace...
                  </>
                ) : (
                  <>
                    Criar Workspace
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Após criar seu workspace, você poderá convidar membros da equipe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}