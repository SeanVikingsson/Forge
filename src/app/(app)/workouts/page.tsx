import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkoutsClient from '@/components/workouts/WorkoutsClient'

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  const [sessionsRes, exercisesRes, todaySessionRes] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select('*, session_exercises(*, exercises(name, muscle_groups, equipment, category))')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20),
    supabase.from('exercises').select('*').order('name'),
    supabase
      .from('workout_sessions')
      .select('*, session_exercises(*, exercises(name, muscle_groups, equipment, category))')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
  ])

  return (
    <WorkoutsClient
      sessions={sessionsRes.data ?? []}
      exercises={exercisesRes.data ?? []}
      todaySession={todaySessionRes.data}
      today={today}
    />
  )
}
