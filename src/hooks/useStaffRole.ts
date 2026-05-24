import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useClientCompany } from './useClientCompany'

type StaffRole = 'owner' | 'manager' | 'staff'

interface RolePermissions {
  role: StaffRole
  canViewFinance: boolean
  canEditSettings: boolean
  canViewReports: boolean
  canOverridePrice: boolean
  canAddCar: boolean
  canUpdateStatus: boolean
  canMarkPayment: boolean
  canManageStaff: boolean
}

function buildPermissions(role: StaffRole): RolePermissions {
  const isOwnerOrManager = role === 'owner' || role === 'manager'
  return {
    role,
    canViewFinance: isOwnerOrManager,
    canEditSettings: isOwnerOrManager,
    canViewReports: isOwnerOrManager,
    canOverridePrice: isOwnerOrManager,
    canManageStaff: role === 'owner',
    canAddCar: true,
    canUpdateStatus: true,
    canMarkPayment: true,
  }
}

export function useStaffRole(): RolePermissions {
  const { companyId, loading: authLoading } = useClientCompany()
  const [role, setRole] = useState<StaffRole>('owner')

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('company_users')
        .select('role')
        .eq('company_id', companyId)
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (data?.role) {
        setRole(data.role as StaffRole)
      } else {
        // Default: owner (backwards compat for existing single-user companies)
        setRole('owner')
      }
    }
    load()
  }, [authLoading, companyId])

  return buildPermissions(role)
}
