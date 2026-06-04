'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { href: '/meals', icon: '🍽️', label: 'Meals' },
  { href: '/workouts', icon: '💪', label: 'Workouts' },
  { href: '/recipes', icon: '👨‍🍳', label: 'Recipes' },
  { href: '/progress', icon: '📈', label: 'Progress' },
  { href: '/profile', icon: '⚙️', label: 'Profile' },
]

interface AppShellProps {
  children: React.ReactNode
  profile: { display_name: string; onboarding_complete: boolean; goal: string } | null
  user: { email?: string }
}

export default function AppShell({ children, profile }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const sidebarContent = (
    <div style={{
      width: '220px', minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: '8px 12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '36px', height: '36px',
            background: 'var(--accent)', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>⚡</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>Forge</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {profile?.goal ?? 'fitness'} mode
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : 'transparent',
                textDecoration: 'none', fontSize: '14px', fontWeight: active ? '500' : '400',
                transition: 'all 0.15s',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{
        borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px',
      }}>
        <div style={{ padding: '8px 12px', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500' }}>{profile?.display_name ?? 'You'}</div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '9px 12px',
            background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', fontSize: '14px',
            cursor: 'pointer', textAlign: 'left', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}
        >
          <span>🚪</span> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ display: 'none' }}>
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 49,
          }}
        />
      )}
      {mobileOpen && sidebarContent}

      {/* Main */}
      <main style={{
        flex: 1,
        marginLeft: 0,
        minHeight: '100vh',
        background: 'var(--background)',
      }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{
          display: 'none',
          padding: '12px 16px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky', top: 0, zIndex: 40,
        }}>
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' }}
          >☰</button>
          <span style={{ fontWeight: '700', fontSize: '16px' }}>⚡ Forge</span>
        </div>

        <div style={{ padding: '32px', maxWidth: '1200px' }}>
          {children}
        </div>
      </main>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          main { margin-left: 220px !important; }
        }
        @media (max-width: 767px) {
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
