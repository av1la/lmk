import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { UserButton } from "@clerk/nextjs"

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-2">Gerencie suas preferências e configurações da conta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Perfil */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Perfil</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" placeholder="Seu nome" variant="subtle" />
                </div>
                <div>
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input id="lastName" placeholder="Seu sobrenome" variant="subtle" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" variant="subtle" />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Conte um pouco sobre você..." variant="subtle" />
              </div>
              <Button>Salvar Alterações</Button>
            </div>
          </div>

          {/* Workspace */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Workspace Atual</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspaceName">Nome do Workspace</Label>
                <Input id="workspaceName" defaultValue="Workspace Principal" variant="subtle" readOnly />
              </div>
              <div>
                <Label htmlFor="workspaceDescription">Descrição</Label>
                <Input id="workspaceDescription" placeholder="Descrição do workspace..." variant="subtle" readOnly />
              </div>
              <div>
                <Label htmlFor="workspaceSlug">Slug</Label>
                <Input id="workspaceSlug" defaultValue="workspace-principal" variant="subtle" readOnly />
                <p className="text-sm text-gray-500 mt-1">
                  Usado para URLs: lmk.com/w/workspace-principal
                </p>
              </div>
              <Button>Atualizar Workspace</Button>
            </div>
          </div>

          {/* Preferências */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferências</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="timezone">Fuso Horário</Label>
                <select 
                  id="timezone"
                  defaultValue="America/Sao_Paulo"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="America/Sao_Paulo">América/São Paulo (UTC-3)</option>
                  <option value="America/New_York">América/Nova York (UTC-5)</option>
                  <option value="Europe/London">Europa/Londres (UTC+0)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="language">Idioma</Label>  
                <select 
                  id="language"
                  defaultValue="pt-BR"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </div>
              <Button>Salvar Preferências</Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Conta Clerk */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conta</h3>
            <p className="text-gray-600 mb-4">Gerencie sua conta e autenticação</p>
            <div className="flex justify-center">
              <UserButton 
                afterSignOutUrl="/" 
                userProfileMode="navigation"
                userProfileUrl="/user-profile"
              />
            </div>
          </div>

          {/* Plano */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Plano Atual</h3>
            <div className="text-center">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mb-3">
                Gratuito
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Você está no plano gratuito
              </p>
              <Button variant="outline-primary" className="w-full">
                Fazer Upgrade
              </Button>
            </div>
          </div>

          {/* Armazenamento */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Armazenamento</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Usado</span>
                <span className="font-medium">2.4 GB de 10 GB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{width: '24%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}