import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiUsage } from '@/lib/gemini-usage'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const usage = await getGeminiUsage(user.id)
  return NextResponse.json(usage)
}
