'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeightLog, BodyMeasurement } from '@/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Props {
  weightLogs: WeightLog[]
  measurements: BodyMeasurement[]
  sessions: { date: string }[]
  profile: { weight_kg: number; goal: string; calorie_target: number } | null
}

export default function ProgressClient({ weightLogs, measurements, sessions, profile }: Props) {
  const supabase = createClient()
  const [weight, setWeight] = useState('')
  const [weightNote, setWeightNote] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [logs, setLogs] = useState<WeightLog[]>(weightLogs)
  const [tab, setTab] = useState<'weight' | 'measurements' | 'volume'>('weight')

  const today = new Date().toISOString().split('T')[0]

  async function logWeight() {
    if (!weight) return
    setSavingWeight(true)
    const { data } = await supabase.from('weight_logs').upsert(
      { date: today, weight_kg: parseFloat(weight), notes: weightNote || null },
      { onConflict: 'user_id,date' }
    ).select().single()
    if (data) setLogs(prev => [data, ...prev.filter(l => l.date !== today)])
    setWeight('')
    setWeightNote('')
    setSavingWeight(false)
  }

  const chartData = [...logs].reverse().slice(-30).map(l => ({
    date: l.date.slice(5),
    weight: l.weight_kg,
  }))

  const startWeight = logs[logs.length - 1]?.weight_kg
  const currentWeight = logs[0]?.weight_kg
  const change = startWeight && currentWeight ? (currentWeight - startWeight) : null

  // Weekly training volume (sessions per week)
  const weeklyVolume: Record<string, number> = {}
  sessions.forEach(s => {
    const week = getWeekStart(s.date)
    weeklyVolume[week] = (weeklyVolume[week] ?? 0) + 1
  })
  const volumeData = Object.entries(weeklyVolume).slice(-8).map(([week, count]) => ({ week: week.slice(5), sessions: count }))

  const tabStyle = (active: boolean) => ({
    padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
    background: active ? 'var(--accent)' : 'transparent',
    border: active ? 'none' : '1px solid var(--border)',
    color: active ? 'white' : 'var(--text-secondary)', cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Progress</h1>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Starting weight', value: startWeight ? `${startWeight}kg` : '—' },
          { label: 'Current weight', value: currentWeight ? `${currentWeight}kg` : '—' },
          { label: 'Change', value: change !== null ? `${change > 0 ? '+' : ''}${change.toFixed(1)}kg` : '—', color: change !== null ? (profile?.goal === 'bulk' ? (change > 0 ? 'var(--success)' : 'var(--danger)') : (change < 0 ? 'var(--success)' : 'var(--danger)')) : undefined },
          { label: 'Total sessions', value: String(sessions.length) },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color ?? 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Log weight */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Log today&apos;s weight</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="Weight in kg"
            style={{ flex: 1, minWidth: '140px', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
          />
          <input
            value={weightNote} onChange={e => setWeightNote(e.target.value)}
            placeholder="Note (optional)"
            style={{ flex: 2, minWidth: '140px', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
          />
          <button
            onClick={logWeight} disabled={!weight || savingWeight}
            style={{ padding: '10px 20px', background: !weight ? 'var(--surface-3)' : 'var(--accent)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: '500', cursor: !weight ? 'not-allowed' : 'pointer' }}
          >
            {savingWeight ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={tabStyle(tab === 'weight')} onClick={() => setTab('weight')}>Weight</button>
        <button style={tabStyle(tab === 'volume')} onClick={() => setTab('volume')}>Training volume</button>
        <button style={tabStyle(tab === 'measurements')} onClick={() => setTab('measurements')}>Measurements</button>
      </div>

      {tab === 'weight' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>Weight trend (last 30 entries)</h2>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>Log at least 2 weight entries to see your trend</p>
          )}
        </div>
      )}

      {tab === 'volume' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px' }}>Sessions per week</h2>
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="sessions" stroke="var(--success)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--success)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No sessions logged yet</p>
          )}
        </div>
      )}

      {tab === 'measurements' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Body measurements</h2>
          {measurements.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No measurements logged yet. Add them from your profile.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {['Date', 'Chest', 'Waist', 'Arms', 'Thighs', 'Body fat'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontWeight: '500' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map(m => (
                    <tr key={m.id}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{m.date}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{m.chest_cm ?? '—'}cm</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{m.waist_cm ?? '—'}cm</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{m.left_arm_cm ?? '—'}cm</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{m.left_thigh_cm ?? '—'}cm</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>{m.body_fat_pct ?? '—'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
