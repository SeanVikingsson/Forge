import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MealsClient from '@/components/meals/MealsClient'

export default async function MealsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  const [mealsRes, profileRes] = await Promise.all([
    supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
    supabase.from('profiles').select('calorie_target, protein_target_g, carbs_target_g, fat_target_g').eq('user_id', user.id).single(),
  ])

  return (
    <MealsClient
      initialMeals={mealsRes.data ?? []}
      profile={profileRes.data}
      today={today}
    />
  )
}
