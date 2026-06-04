import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementGeminiUsage } from '@/lib/gemini-usage'
import type { WorkoutRecommendation } from '@/types'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('goal, training_days_per_week, weight_kg, available_equipment')
    .eq('user_id', user.id)
    .single()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentSessions } = await supabase
    .from('workout_sessions')
    .select(`*, session_exercises(*, exercises(name, muscle_groups))`)
    .eq('user_id', user.id)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  const recentMuscles: string[] = []
  recentSessions?.forEach(session => {
    session.session_exercises?.forEach((se: { exercises?: { muscle_groups?: string[] } }) => {
      se.exercises?.muscle_groups?.forEach((m: string) => recentMuscles.push(m))
    })
  })

  const equipment = profile?.available_equipment?.length
    ? profile.available_equipment.join(', ')
    : 'full gym (barbell, dumbbells, cables, machines)'

  const { targetMuscles } = await req.json().catch(() => ({ targetMuscles: null }))

  const prompt = `You are an expert strength and conditioning coach. Generate a workout recommendation for a beginner focusing on ${profile?.goal === 'bulk' ? 'muscle gain and progressive overload' : 'general fitness'}.

User stats:
- Goal: ${profile?.goal ?? 'bulk'}
- Training days/week: ${profile?.training_days_per_week ?? 4}
- Experience level: beginner (less than 1 year)
- Available equipment: ${equipment}

IMPORTANT: Only suggest exercises that can be performed with the available equipment listed above. Do not suggest exercises requiring equipment not on that list.

Recently trained muscle groups (last 7 days, avoid overtraining these): ${recentMuscles.length ? [...new Set(recentMuscles)].join(', ') : 'none — full body is fine'}
${targetMuscles ? `Specifically requested muscle focus: ${targetMuscles}` : ''}

Generate a single workout session. Respond ONLY with valid JSON (no markdown):
{
  "name": "session name e.g. Push Day A",
  "rationale": "1-2 sentence explanation of why these muscles/exercises",
  "estimated_duration_minutes": 45,
  "target_muscles": ["muscle1", "muscle2"],
  "exercises": [
    {
      "name": "exercise name",
      "muscle_groups": ["primary muscle"],
      "sets": 3,
      "reps": "8-12",
      "rest_seconds": 90,
      "notes": "form tip or beginner note"
    }
  ]
}

Include 5-7 exercises. For beginners, favour compound movements, sensible rep ranges (8-15), and include at least one warm-up note.`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    const recommendation: WorkoutRecommendation = JSON.parse(text)
    return NextResponse.json({ data: recommendation, usage: { used: usage.used, limit: usage.limit } })
  } catch (err) {
    console.error('Gemini workout-recommendation error:', err)
    return NextResponse.json({ error: 'Failed to generate recommendation.' }, { status: 500 })
  }
}
