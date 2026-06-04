import type { Profile } from '@/types'

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
}

const GOAL_ADJUSTMENTS = {
  bulk: 300,        // +300 kcal surplus
  cut: -500,        // -500 kcal deficit
  recomp: 0,        // maintenance
  maintenance: 0,
}

export function calculateTDEE(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: 'male' | 'female',
  activity_level: Profile['activity_level']
): number {
  // Mifflin-St Jeor BMR
  const bmr = sex === 'male'
    ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level])
}

export function calculateTargets(profile: Partial<Profile>) {
  const { weight_kg, height_cm, age, sex, activity_level, goal } = profile

  if (!weight_kg || !height_cm || !age || !sex || !activity_level || !goal) {
    return null
  }

  const tdee = calculateTDEE(weight_kg, height_cm, age, sex, activity_level)
  const calorie_target = tdee + GOAL_ADJUSTMENTS[goal]

  // Macro split for bulking: ~35% protein, 45% carbs, 20% fat
  // For cutting: ~40% protein, 35% carbs, 25% fat
  const splits = goal === 'cut'
    ? { protein: 0.40, carbs: 0.35, fat: 0.25 }
    : { protein: 0.35, carbs: 0.45, fat: 0.20 }

  return {
    tdee,
    calorie_target,
    protein_target_g: Math.round((calorie_target * splits.protein) / 4),
    carbs_target_g: Math.round((calorie_target * splits.carbs) / 4),
    fat_target_g: Math.round((calorie_target * splits.fat) / 9),
  }
}

export function formatMacroSplit(calories: number, protein: number, carbs: number, fat: number) {
  const total = protein * 4 + carbs * 4 + fat * 9
  return {
    protein_pct: Math.round((protein * 4 / total) * 100),
    carbs_pct: Math.round((carbs * 4 / total) * 100),
    fat_pct: Math.round((fat * 9 / total) * 100),
  }
}
