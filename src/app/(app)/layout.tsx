import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/ui/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, onboarding_complete, goal')
    .eq('user_id', user.id)
    .single()

  // Redirect to onboarding if not complete
  // (allow /profile path through so they can complete it)
  return <AppShell profile={profile} user={user}>{children}</AppShell>
}
