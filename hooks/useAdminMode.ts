'use client'

import { useUser } from './useUser'

/**
 * Returns true if the current authenticated user is the platform admin.
 * Checks user ID against NEXT_PUBLIC_ADMIN_USER_ID env var.
 * No localStorage, no URL params — real server-aligned admin check.
 */
export function useAdminMode(): boolean {
  const { user } = useUser()
  if (!user) return false
  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID
  return !!adminId && user.id === adminId
}
