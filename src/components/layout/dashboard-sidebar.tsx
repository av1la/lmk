"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FolderOpen,
  Users,
  Settings,
  ChevronDown,
  Home,
  Sparkles
} from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog"
import { useWorkspaceContext } from "@/contexts/WorkspaceContext"

const navigation = [
  { name: "Início", href: "/dashboard", icon: Home },
  { name: "Projetos", href: "/dashboard/projects", icon: FolderOpen },
  { name: "Equipe", href: "/dashboard/members", icon: Users },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { workspace, workspaces, switchWorkspace } = useWorkspaceContext()

  return (
    <div className="w-72 h-screen bg-white/90 backdrop-blur-xl border-r border-gray-200/50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">LMK</h1>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        
        {/* Workspace Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50/70 hover:bg-gray-100/70 rounded-lg border border-gray-200/50 transition-all duration-200 flex items-center justify-between">
              <span className="truncate">{workspace?.name || 'Carregando...'}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="w-64 bg-white/95 backdrop-blur-xl border-gray-200/50" 
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {workspaces.map((ws) => (
              <DropdownMenuItem 
                key={ws.id} 
                className={`cursor-pointer ${ws.id === workspace?.id ? 'bg-blue-50' : ''}`}
                onClick={() => switchWorkspace(ws.id)}
              >
                <FolderOpen className={`mr-2 h-4 w-4 ${ws.id === workspace?.id ? 'text-blue-600' : ''}`} />
                <div className="flex-1">
                  <div className={`font-medium ${ws.id === workspace?.id ? 'text-blue-900' : ''}`}>
                    {ws.name}
                  </div>
                  {ws.description && (
                    <div className="text-xs text-gray-500 truncate">
                      {ws.description}
                    </div>
                  )}
                </div>
                {ws.id === workspace?.id && (
                  <div className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </DropdownMenuItem>
            ))}
            {workspaces.length > 0 && <div className="h-px bg-gray-200/50 my-1" />}
            <CreateWorkspaceDialog />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/dashboard")
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/50"
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 transition-colors ${
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  }`} />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

    </div>
  )
}