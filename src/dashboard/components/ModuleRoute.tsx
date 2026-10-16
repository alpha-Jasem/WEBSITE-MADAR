import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import type { ModuleId } from '@/dashboard/modules'

/**
 * Renders a dashboard page only if the company has its module; otherwise sends the user to
 * the dashboard home. Waits for the account to load so a module isn't judged against the
 * placeholder preset used before the company row arrives.
 */
export function ModuleRoute({ module, children }: { module: ModuleId; children: ReactNode }) {
  const { canOpen, accountLoading, isDemo } = useWorkspace()
  if (accountLoading || canOpen(module)) return <>{children}</>
  return <Navigate to={isDemo ? '/demo-review' : '/dashboard'} replace />
}

/** Like ModuleRoute, for pages gated by a single permission rather than an industry module. */
export function PermissionRoute({ permission, children }: { permission: string; children: ReactNode }) {
  const { can, accountLoading, isDemo } = useWorkspace()
  if (accountLoading || can(permission)) return <>{children}</>
  return <Navigate to={isDemo ? '/demo-review' : '/dashboard'} replace />
}
