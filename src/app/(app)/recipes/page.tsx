import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecipesClient from '@/components/recipes/RecipesClient'

export default async function RecipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = new Date().toISOString().split('T')[0]

  const [mealsRes, profileRes] = await Promise.all([
    supabase.from('meal_logs').select('calories, protein_g').eq('user_id', user.id).eq('date', today),
    supabase.from('profiles').select('calorie_target, protein_target_g, dietary_restrictions, cuisine_preferences').eq('user_id', user.id).single(),
  ])

  const mealsToday = mealsRes.data ?? []
  const calConsumed = mealsToday.reduce((a, m) => a + m.calories, 0)
  const protConsumed = mealsToday.reduce((a, m) => a + m.protein_g, 0)

  return (
    <RecipesClient
      remainingCalories={Math.max(0, (profileRes.data?.calorie_target ?? 2500) - calConsumed)}
      remainingProtein={Math.max(0, (profileRes.data?.protein_target_g ?? 180) - protConsumed)}
    />
  )
}
