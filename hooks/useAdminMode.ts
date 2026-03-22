'use client'

import { useUser } from './useUser'

/**
 * Returns true if the current authenticated user is the platform admin.
 * Checks user ID against NEXT_PUBLIC_ADMIN_USER_ID or
 * user email against NEXT_PUBLIC_ADMIN_EMAIL.
 * No localStorage, no URL params — real server-aligned admin check.
 */
export function useAdminMode(): boolean {
  const { user } = useUser()
  if (!user) return false

  const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID
  if (adminId && user.id === adminId) return true

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (adminEmail && user.email && user.email.toLowerCase() === adminEmail.toLowerCase()) return true

  return false
}
