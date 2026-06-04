export interface Profile {
  id: string
  user_id: string
  display_name: string
  avatar_url?: string
  // Stats
  height_cm: number
  weight_kg: number
  age: number
  sex: 'male' | 'female'
  // Goals
  goal: 'bulk' | 'cut' | 'recomp' | 'maintenance'
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  training_days_per_week: number
  // Calculated targets (can be overridden)
  tdee: number
  calorie_target: number
  protein_target_g: number
  carbs_target_g: number
  fat_target_g: number
  // Dietary preferences (passed to Gemini)
  dietary_restrictions: string[]   // e.g. ['vegetarian', 'no shellfish']
  cuisine_preferences: string[]    // e.g. ['Mediterranean', 'Asian']
  disliked_foods: string[]
  // Onboarding
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_kg: number
  notes?: string
  created_at: string
}

export interface MealLog {
  id: string
  user_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  raw_input: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g?: number
  items: MealItem[]
  created_at: string
}

export interface MealItem {
  name: string
  quantity: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Exercise {
  id: string
  name: string
  muscle_groups: string[]
  secondary_muscles: string[]
  equipment: string
  category: 'compound' | 'isolation' | 'cardio' | 'stretching'
  instructions?: string
  created_at: string
}

export interface WorkoutSession {
  id: string
  user_id: string
  date: string
  name?: string
  notes?: string
  duration_minutes?: number
  session_exercises: SessionExercise[]
  created_at: string
}

export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string
  exercise?: Exercise
  sets: WorkoutSet[]
  order_index: number
  notes?: string
}

export interface WorkoutSet {
  set_number: number
  weight_kg: number | null
  reps: number | null
  duration_seconds?: number
  rpe?: number // Rate of Perceived Exertion 1-10
  completed: boolean
}

export interface BodyMeasurement {
  id: string
  user_id: string
  date: string
  chest_cm?: number
  waist_cm?: number
  hips_cm?: number
  left_arm_cm?: number
  right_arm_cm?: number
  left_thigh_cm?: number
  right_thigh_cm?: number
  body_fat_pct?: number
  notes?: string
  created_at: string
}

export interface GeminiUsage {
  id: string
  user_id: string
  date: string
  request_count: number
  created_at: string
}

// Daily summary (derived / computed)
export interface DailySummary {
  date: string
  calories_consumed: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meals: MealLog[]
  workout?: WorkoutSession
  weight?: WeightLog
}

export interface PersonalBest {
  exercise_id: string
  exercise_name: string
  weight_kg: number
  reps: number
  date: string
}

// Gemini AI response shapes
export interface ParsedMeal {
  name: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  items: MealItem[]
  totals: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fibre_g: number
  }
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export interface WorkoutRecommendation {
  name: string
  rationale: string
  estimated_duration_minutes: number
  target_muscles: string[]
  exercises: RecommendedExercise[]
}

export interface RecommendedExercise {
  name: string
  muscle_groups: string[]
  sets: number
  reps: string  // e.g. "8-12" or "failure"
  rest_seconds: number
  notes?: string
}

export interface RecipeSuggestion {
  name: string
  description: string
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  macros_per_serving: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
  ingredients: { item: string; quantity: string }[]
  method: string[]
  tags: string[]
}
