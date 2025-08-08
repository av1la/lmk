import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { WorkspaceGuard } from "@/components/workspace-guard"
import { WorkspaceProvider } from "@/contexts/WorkspaceContext"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <WorkspaceGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </WorkspaceGuard>
    </WorkspaceProvider>
  )
}