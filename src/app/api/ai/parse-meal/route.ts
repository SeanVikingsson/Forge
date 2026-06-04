import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementGeminiUsage } from '@/lib/gemini-usage'
import type { ParsedMeal } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const usage = await checkAndIncrementGeminiUsage(user.id)
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `Daily AI limit reached (${usage.limit} requests/day). Resets at midnight.` },
      { status: 429 }
    )
  }

  const { input, meal_type } = await req.json()
  if (!input?.trim()) return NextResponse.json({ error: 'No input provided' }, { status: 400 })

  // Fetch user dietary preferences for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('dietary_restrictions, disliked_foods')
    .eq('user_id', user.id)
    .single()

  const dietaryContext = profile?.dietary_restrictions?.length
    ? `Note: this user has the following dietary restrictions/preferences: ${profile.dietary_restrictions.join(', ')}.`
    : ''

  const prompt = `You are a precise nutritionist AI. Parse the following meal description into structured nutritional data.
${dietaryContext}

Meal description: "${input}"
Meal type hint: ${meal_type || 'unspecified'}

Respond ONLY with a valid JSON object (no markdown, no backticks) in this exact shape:
{
  "name": "short descriptive meal name",
  "meal_type": "breakfast|lunch|dinner|snack",
  "items": [
    {
      "name": "food item name",
      "quantity": "amount with unit e.g. 2 large, 150g, 1 cup",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0
    }
  ],
  "totals": {
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0,
    "fibre_g": 0
  },
  "confidence": "high|medium|low",
  "notes": "optional note about assumptions made"
}

Use standard UK/international food nutritional values. Be precise. If quantities are ambiguous, use typical serving sizes and note it.`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    const parsed: ParsedMeal = JSON.parse(text)
    return NextResponse.json({ data: parsed, usage: { used: usage.used, limit: usage.limit } })
  } catch (err) {
    console.error('Gemini parse-meal error:', err)
    return NextResponse.json({ error: 'Failed to parse meal. Please try again.' }, { status: 500 })
  }
}
