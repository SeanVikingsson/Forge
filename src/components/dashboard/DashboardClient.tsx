'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, MealLog, WorkoutSession, WeightLog } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  profile: Profile | null
  todayMeals: MealLog[]
  todayWorkout: WorkoutSession | null
  weightLogs: WeightLog[]
  recentWorkouts: { date: string; name?: string; session_exercises: { exercises?: { muscle_groups?: string[] } }[] }[]
  today: string
}

const ALL_MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest', color: 'var(--muscle-chest)' },
  { key: 'back', label: 'Back', color: 'var(--muscle-back)' },
  { key: 'lats', label: 'Lats', color: 'var(--muscle-back)' },
  { key: 'shoulders', label: 'Shoulders', color: 'var(--muscle-shoulders)' },
  { key: 'lateral delts', label: 'Side Delts', color: 'var(--muscle-shoulders)' },
  { key: 'biceps', label: 'Biceps', color: 'var(--muscle-arms)' },
  { key: 'triceps', label: 'Triceps', color: 'var(--muscle-arms)' },
  { key: 'quadriceps', label: 'Quads', color: 'var(--muscle-legs)' },
  { key: 'hamstrings', label: 'Hamstrings', color: 'var(--muscle-legs)' },
  { key: 'glutes', label: 'Glutes', color: 'var(--muscle-legs)' },
  { key: 'core', label: 'Core', color: 'var(--muscle-core)' },
  { key: 'calves', label: 'Calves', color: 'var(--muscle-legs)' },
]

function MacroRing({ value, target, color, label }: { value: number; target: number; color: string; label: string }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0
  const r = 24, c = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={c - c * pct}
          strokeLinecap="round" transform="rotate(-90 32 32)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="32" y="36" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">
          {Math.round(value)}
        </text>
      </svg>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ {target}g</div>
    </div>
  )
}

export default function DashboardClient({ profile, todayMeals, todayWorkout, weightLogs, recentWorkouts, today }: Props) {
  const router = useRouter()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiWorkout, setAiWorkout] = useState<{ name: string; rationale: string; exercises: { name: string; sets: number; reps: string }[] } | null>(null)

  // Macro totals
  const totals = todayMeals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein_g: acc.protein_g + m.protein_g,
    carbs_g: acc.carbs_g + m.carbs_g,
    fat_g: acc.fat_g + m.fat_g,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })

  const calTarget = profile?.calorie_target ?? 2500
  const calPct = Math.min(totals.calories / calTarget, 1)

  // Muscle heatmap - count recent sessions per muscle
  const muscleHits: Record<string, number> = {}
  recentWorkouts.forEach(w => {
    w.session_exercises?.forEach(se => {
      se.exercises?.muscle_groups?.forEach(mg => {
        const key = mg.toLowerCase()
        muscleHits[key] = (muscleHits[key] ?? 0) + 1
      })
    })
  })

  // Weight chart data
  const weightData = [...weightLogs].reverse().map(w => ({
    date: w.date.slice(5), // MM-DD
    weight: w.weight_kg,
  }))

  async function getAiWorkout() {
    setAiLoading(true)
    setAiWorkout(null)
    try {
      const res = await fetch('/api/ai/workout-recommendation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const data = await res.json()
      if (data.data) setAiWorkout(data.data)
    } catch {}
    setAiLoading(false)
  }

  const StatCard = ({ label, value, sub, color, onClick }: { label: string; value: string; sub?: string; color?: string; onClick?: () => void }) => (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '20px', cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: color ?? 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.display_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          {new Date(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard
          label="Calories today"
          value={`${Math.round(totals.calories)}`}
          sub={`of ${calTarget} kcal target`}
          color={calPct > 1 ? 'var(--danger)' : calPct > 0.85 ? 'var(--warning)' : 'var(--success)'}
          onClick={() => router.push('/meals')}
        />
        <StatCard
          label="Protein"
          value={`${Math.round(totals.protein_g)}g`}
          sub={`of ${profile?.protein_target_g ?? 180}g target`}
          color="var(--protein-color)"
          onClick={() => router.push('/meals')}
        />
        <StatCard
          label="Today's workout"
          value={todayWorkout ? '✅ Logged' : '—'}
          sub={todayWorkout?.name ?? 'No session logged yet'}
          onClick={() => router.push('/workouts')}
        />
        <StatCard
          label="Current weight"
          value={weightLogs[0] ? `${weightLogs[0].weight_kg}kg` : '—'}
          sub={weightLogs[0] ? weightLogs[0].date : 'Not logged'}
          onClick={() => router.push('/progress')}
        />
      </div>

      {/* Macros + weight chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Macro rings */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Today&apos;s macros</h2>
            <button
              onClick={() => router.push('/meals')}
              style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              + Log meal
            </button>
          </div>

          {/* Calorie bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Calories</span>
              <span style={{ fontWeight: '600' }}>{Math.round(totals.calories)} / {calTarget} kcal</span>
            </div>
            <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                width: `${calPct * 100}%`,
                background: calPct > 1 ? 'var(--danger)' : 'var(--accent)',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <MacroRing value={totals.protein_g} target={profile?.protein_target_g ?? 180} color="var(--protein-color)" label="Protein" />
            <MacroRing value={totals.carbs_g} target={profile?.carbs_target_g ?? 280} color="var(--carbs-color)" label="Carbs" />
            <MacroRing value={totals.fat_g} target={profile?.fat_target_g ?? 70} color="var(--fat-color)" label="Fat" />
          </div>
        </div>

        {/* Weight trend */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Weight trend</h2>
            <button
              onClick={() => router.push('/progress')}
              style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              + Log weight
            </button>
          </div>
          {weightData.length > 1 ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Log weight entries to see your trend
            </div>
          )}
        </div>
      </div>

      {/* Muscle heatmap */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Muscle group activity — last 7 days</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ALL_MUSCLE_GROUPS.map(({ key, label, color }) => {
            const hits = muscleHits[key] ?? 0
            const opacity = hits === 0 ? 0.15 : Math.min(0.3 + hits * 0.25, 1)
            return (
              <div
                key={key}
                style={{
                  padding: '6px 14px', borderRadius: '20px',
                  background: `${color}`,
                  opacity,
                  fontSize: '12px', fontWeight: '500',
                  color: 'white',
                  transition: 'opacity 0.3s',
                }}
              >
                {label} {hits > 0 ? `×${hits}` : ''}
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Faded = not trained recently. Bright = trained this week.
        </p>
      </div>

      {/* AI Workout suggestion */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>AI Workout of the Day</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Gemini recommends based on your recent training history
            </p>
          </div>
          <button
            onClick={getAiWorkout}
            disabled={aiLoading}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              background: aiLoading ? 'var(--surface-3)' : 'var(--accent)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: '500',
              cursor: aiLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {aiLoading ? 'Generating...' : '✨ Get recommendation'}
          </button>
        </div>

        {aiWorkout && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{aiWorkout.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{aiWorkout.rationale}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aiWorkout.exercises.map((ex, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{ex.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ex.sets} × {ex.reps}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push('/workouts?from=ai')}
              style={{
                marginTop: '16px', padding: '10px 20px',
                background: 'var(--success-subtle)', border: '1px solid var(--success)',
                color: 'var(--success)', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Start this workout →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
