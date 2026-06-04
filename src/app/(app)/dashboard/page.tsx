import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  // Fetch all dashboard data in parallel
  const [profileRes, todayMealsRes, todayWorkoutRes, weightRes, recentWorkoutsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', today),
    supabase.from('workout_sessions')
      .select('*, session_exercises(*, exercises(name, muscle_groups))')
      .eq('user_id', user.id).eq('date', today).maybeSingle(),
    supabase.from('weight_logs').select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).limit(14),
    supabase.from('workout_sessions')
      .select('date, name, session_exercises(exercises(muscle_groups))')
      .eq('user_id', user.id)
      .order('date', { ascending: false }).limit(7),
  ])

  const profile = profileRes.data
  if (profile && !profile.onboarding_complete) {
    redirect('/profile?onboarding=true')
  }

  return (
    <DashboardClient
      profile={profile}
      todayMeals={todayMealsRes.data ?? []}
      todayWorkout={todayWorkoutRes.data}
      weightLogs={weightRes.data ?? []}
      recentWorkouts={recentWorkoutsRes.data ?? []}
      today={today}
    />
  )
}
