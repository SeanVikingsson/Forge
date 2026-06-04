import { createServiceClient } from '@/lib/supabase/server'

const DAILY_LIMIT = parseInt(process.env.GEMINI_DAILY_LIMIT ?? '50')

export async function checkAndIncrementGeminiUsage(userId: string): Promise<{
  allowed: boolean
  used: number
  limit: number
}> {
  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('gemini_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const current = data?.request_count ?? 0

  if (current >= DAILY_LIMIT) {
    return { allowed: false, used: current, limit: DAILY_LIMIT }
  }

  await supabase
    .from('gemini_usage')
    .upsert(
      { user_id: userId, date: today, request_count: current + 1 },
      { onConflict: 'user_id,date' }
    )

  return { allowed: true, used: current + 1, limit: DAILY_LIMIT }
}

export async function getGeminiUsage(userId: string): Promise<{ used: number; limit: number }> {
  const supabase = await createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('gemini_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  return { used: data?.request_count ?? 0, limit: DAILY_LIMIT }
}
