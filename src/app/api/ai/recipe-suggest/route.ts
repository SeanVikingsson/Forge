import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementGeminiUsage } from '@/lib/gemini-usage'
import type { RecipeSuggestion } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const usage = await checkAndIncrementGeminiUsage(user.id)
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `Daily AI limit reached (${usage.limit} requests/day).` },
      { status: 429 }
    )
  }

  const { remainingCalories, remainingProtein, preferences, ingredients } = await req.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('dietary_restrictions, cuisine_preferences, disliked_foods, goal')
    .eq('user_id', user.id)
    .single()

  const dietaryContext = [
    ...(profile?.dietary_restrictions ?? []),
    ...(profile?.disliked_foods?.map((f: string) => `no ${f}`) ?? []),
  ].join(', ')

  const cuisineContext = profile?.cuisine_preferences?.length
    ? `Preferred cuisines: ${profile.cuisine_preferences.join(', ')}`
    : ''

  const prompt = `You are a nutritionist and chef specialising in high-protein meals for muscle gain.

User context:
- Goal: ${profile?.goal ?? 'bulk'} (muscle gain)
- Remaining calories for the day: ~${remainingCalories ?? 'flexible'} kcal
- Remaining protein needed: ~${remainingProtein ?? 40}g
${dietaryContext ? `- Dietary restrictions: ${dietaryContext}` : ''}
${cuisineContext}
${ingredients ? `- Has these ingredients available: ${ingredients}` : ''}
${preferences ? `- Additional preferences: ${preferences}` : ''}

Generate 3 recipe/meal suggestions that would fit well. Prioritise high protein, whole foods, and practical preparation.
Respond ONLY with valid JSON (no markdown):
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "1 sentence description",
      "prep_time_minutes": 10,
      "cook_time_minutes": 20,
      "servings": 1,
      "macros_per_serving": {
        "calories": 500,
        "protein_g": 40,
        "carbs_g": 45,
        "fat_g": 15
      },
      "ingredients": [
        { "item": "chicken breast", "quantity": "200g" }
      ],
      "method": [
        "Step 1...",
        "Step 2..."
      ],
      "tags": ["high-protein", "quick", "meal-prep"]
    }
  ]
}`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(text)
    const recipes: RecipeSuggestion[] = parsed.recipes
    return NextResponse.json({ data: recipes, usage: { used: usage.used, limit: usage.limit } })
  } catch (err) {
    console.error('Gemini recipe-suggest error:', err)
    return NextResponse.json({ error: 'Failed to generate recipes.' }, { status: 500 })
  }
}
