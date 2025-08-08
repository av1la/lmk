"use client"

import { DashboardSidebar } from "./dashboard-sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-white">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto bg-gray-50/30">
        {children}
      </main>
    </div>
  )
}