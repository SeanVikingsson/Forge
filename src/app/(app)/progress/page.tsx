import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProgressClient from '@/components/progress/ProgressClient'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [weightRes, measurementsRes, sessionsRes, profileRes] = await Promise.all([
    supabase.from('weight_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(60),
    supabase.from('body_measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(20),
    supabase.from('workout_sessions')
      .select('date, session_exercises(exercises(name, muscle_groups))')
      .eq('user_id', user.id)
      .order('date', { ascending: false }).limit(30),
    supabase.from('profiles').select('weight_kg, goal, calorie_target').eq('user_id', user.id).single(),
  ])

  return (
    <ProgressClient
      weightLogs={weightRes.data ?? []}
      measurements={measurementsRes.data ?? []}
      sessions={sessionsRes.data ?? []}
      profile={profileRes.data}
    />
  )
}
