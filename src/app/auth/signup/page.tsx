'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', background: 'var(--accent)',
            borderRadius: '16px', fontSize: '28px', marginBottom: '16px',
          }}>⚡</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700' }}>Forge</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Start your journey</p>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '32px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Create account</h2>

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Your name', value: name, set: setName, type: 'text' },
              { label: 'Email', value: email, set: setEmail, type: 'email' },
              { label: 'Password', value: password, set: setPassword, type: 'password' },
            ].map(({ label, value, set, type }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={e => set(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
                  }}
                />
              </div>
            ))}

            {error && (
              <p style={{ fontSize: '13px', color: 'var(--danger)', background: 'var(--danger-subtle)', padding: '10px 12px', borderRadius: '8px' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? 'var(--surface-3)' : 'var(--accent)',
                border: 'none', borderRadius: '8px',
                color: 'white', fontSize: '14px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
