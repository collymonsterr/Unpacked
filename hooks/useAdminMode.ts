'use client'

import { useState, useEffect } from 'react'

export function useAdminMode(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check URL for ?admin=true and persist to localStorage
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === 'true') {
      localStorage.setItem('admin_mode', 'true')
      // Strip the param from URL
      params.delete('admin')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    } else if (params.get('admin') === 'false') {
      localStorage.removeItem('admin_mode')
      params.delete('admin')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }

    setIsAdmin(localStorage.getItem('admin_mode') === 'true')
  }, [])

  return isAdmin
}
