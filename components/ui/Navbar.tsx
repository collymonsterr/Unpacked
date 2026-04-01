'use client'

import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import NavSearchBar from '@/components/ui/NavSearchBar'

interface NavbarProps {
  /** Show the search bar — hidden on homepage where the hero search exists */
  showSearch?: boolean
}

/**
 * Shared navbar used across all pages.
 * Includes logo, nav links, search bar (optional), and user menu.
 */
export default function Navbar({ showSearch = true }: NavbarProps) {
  return (
    <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto gap-3">
      <Logo size="md" />

      <div className="flex items-center gap-3">
        {showSearch && <NavSearchBar />}
        <a
          href="/about"
          className="text-sm font-medium no-underline hidden sm:block"
          style={{ color: 'var(--text-secondary)' }}
        >
          About
        </a>
        <a
          href="/creators"
          className="text-sm font-medium no-underline hidden sm:block"
          style={{ color: 'var(--text-secondary)' }}
        >
          Creators
        </a>
        <UserMenu />
      </div>
    </nav>
  )
}
