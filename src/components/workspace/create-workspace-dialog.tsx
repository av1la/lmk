"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, AlertCircle, Check, X } from "lucide-react"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"
import { useRouter } from "next/navigation"

export function CreateWorkspaceDialog() {
  const router = useRouter();
  const { createWorkspace, loading } = useWorkspaceContext();
  const [open, setOpen] = useState(false)
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

  const resetForm = () => {
    setFormData({ name: '', description: '', slug: '' });
    setError(null);
    setSlugStatus('idle');
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
      // Close modal and reset form
      setOpen(false);
      resetForm();
      // The context automatically updates workspaces state and switches to the new workspace
    } else {
      setError(result.error || 'Erro ao criar workspace');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Criar Workspace
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Workspace</DialogTitle>
          <DialogDescription>
            Crie um novo workspace para organizar seus projetos e colaborar com sua equipe.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="modal-name" variant="required">Nome do Workspace</Label>
              <Input
                id="modal-name"
                type="text"
                placeholder="Ex: Minha Empresa, Agência Digital..."
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                variant="default"
                required
              />
              <p className="text-xs text-gray-500">
                Este será o nome principal do seu workspace
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="modal-slug">URL do Workspace</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  lmk.com/
                </span>
                <div className="relative flex-1">
                  <Input
                    id="modal-slug"
                    type="text"
                    placeholder="minha-empresa"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    variant={slugStatus === 'taken' ? 'error' : slugStatus === 'available' ? 'success' : 'default'}
                    className="rounded-l-none pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                    {slugStatus === 'checking' && (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                    )}
                    {slugStatus === 'available' && (
                      <Check className="h-3 w-3 text-green-500" />
                    )}
                    {slugStatus === 'taken' && (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs">
                {slugStatus === 'available' && (
                  <p className="text-green-600 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    URL disponível
                  </p>
                )}
                {slugStatus === 'taken' && (
                  <p className="text-red-600 flex items-center">
                    <X className="h-3 w-3 mr-1" />
                    Esta URL já está em uso
                  </p>
                )}
                {slugStatus === 'checking' && (
                  <p className="text-gray-500 flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Verificando disponibilidade...
                  </p>
                )}
                {slugStatus === 'idle' && (
                  <p className="text-gray-500">
                    URL personalizada para acessar seu workspace
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="modal-description">Descrição (opcional)</Label>
              <Textarea
                id="modal-description"
                placeholder="Descreva seu workspace, equipe ou propósito..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                variant="default"
                rows={2}
              />
              <p className="text-xs text-gray-500">
                Ajude sua equipe a entender o propósito deste workspace
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={loading || !formData.name.trim() || slugStatus === 'taken' || slugStatus === 'checking'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Workspace'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}