'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Exercise, WorkoutSession, WorkoutSet } from '@/types'

interface Props {
  sessions: WorkoutSession[]
  exercises: Exercise[]
  todaySession: WorkoutSession | null
  today: string
}

interface DraftExercise {
  exercise: Exercise
  sets: WorkoutSet[]
}

export default function WorkoutsClient({ sessions, exercises, todaySession, today }: Props) {
  const supabase = createClient()
  const [view, setView] = useState<'log' | 'history'>('log')
  const [sessionName, setSessionName] = useState('')
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([])
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [filterMuscle, setFilterMuscle] = useState('')
  const [sessionDuration, setSessionDuration] = useState('')

  const allMuscles = [...new Set(exercises.flatMap(e => e.muscle_groups))].sort()

  const filteredExercises = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
    const matchMuscle = !filterMuscle || e.muscle_groups.some(m => m.toLowerCase().includes(filterMuscle.toLowerCase()))
    return matchSearch && matchMuscle
  })

  function addExercise(ex: Exercise) {
    if (draftExercises.find(d => d.exercise.id === ex.id)) return
    setDraftExercises(prev => [...prev, {
      exercise: ex,
      sets: [{ set_number: 1, weight_kg: null, reps: null, completed: false }],
    }])
    setExerciseSearch('')
  }

  function addSet(exIdx: number) {
    setDraftExercises(prev => prev.map((d, i) => i !== exIdx ? d : {
      ...d,
      sets: [...d.sets, { set_number: d.sets.length + 1, weight_kg: null, reps: null, completed: false }],
    }))
  }

  function updateSet(exIdx: number, setIdx: number, field: 'weight_kg' | 'reps', value: string) {
    const num = value === '' ? null : parseFloat(value)
    setDraftExercises(prev => prev.map((d, i) => i !== exIdx ? d : {
      ...d,
      sets: d.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: num }),
    }))
  }

  function toggleSet(exIdx: number, setIdx: number) {
    setDraftExercises(prev => prev.map((d, i) => i !== exIdx ? d : {
      ...d,
      sets: d.sets.map((s, si) => si !== setIdx ? s : { ...s, completed: !s.completed }),
    }))
  }

  function removeExercise(exIdx: number) {
    setDraftExercises(prev => prev.filter((_, i) => i !== exIdx))
  }

  async function saveSession() {
    if (!draftExercises.length) return
    setSaving(true)
    const { data: session } = await supabase.from('workout_sessions').insert({
      date: today,
      name: sessionName || 'Training Session',
      duration_minutes: sessionDuration ? parseInt(sessionDuration) : null,
    }).select().single()

    if (session) {
      for (let i = 0; i < draftExercises.length; i++) {
        const d = draftExercises[i]
        await supabase.from('session_exercises').insert({
          session_id: session.id,
          exercise_id: d.exercise.id,
          sets: d.sets,
          order_index: i,
        })
      }
      setSaved(true)
      setDraftExercises([])
      setSessionName('')
    }
    setSaving(false)
  }

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
    background: active ? 'var(--accent)' : 'transparent',
    border: active ? 'none' : '1px solid var(--border)',
    color: active ? 'white' : 'var(--text-secondary)',
    cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Workouts</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={tabStyle(view === 'log')} onClick={() => setView('log')}>Log session</button>
          <button style={tabStyle(view === 'history')} onClick={() => setView('history')}>History</button>
        </div>
      </div>

      {view === 'log' && (
        <>
          {saved && (
            <div style={{ padding: '14px', background: 'var(--success-subtle)', border: '1px solid var(--success)', borderRadius: '10px', color: 'var(--success)', fontSize: '14px' }}>
              ✅ Workout saved! Great session.
            </div>
          )}

          {/* Session header */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="Session name (e.g. Push Day, Leg Day)"
                style={{
                  flex: 1, minWidth: '200px', padding: '10px 14px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
                }}
              />
              <input
                value={sessionDuration}
                onChange={e => setSessionDuration(e.target.value)}
                placeholder="Duration (mins)"
                type="number"
                style={{
                  width: '160px', padding: '10px 14px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Exercise picker */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Add exercises</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                style={{
                  flex: 1, minWidth: '160px', padding: '8px 12px',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
                }}
              />
              <select
                value={filterMuscle}
                onChange={e => setFilterMuscle(e.target.value)}
                style={{
                  padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: filterMuscle ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '13px',
                }}
              >
                <option value="">All muscles</option>
                {allMuscles.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m}</option>)}
              </select>
            </div>

            {(exerciseSearch || filterMuscle) && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredExercises.slice(0, 15).map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    style={{
                      padding: '8px 12px', background: 'var(--surface-2)',
                      border: '1px solid var(--border)', borderRadius: '6px',
                      color: 'var(--text-primary)', fontSize: '13px',
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>{ex.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {ex.muscle_groups.join(', ')} · {ex.equipment}
                    </span>
                  </button>
                ))}
                {filteredExercises.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>No exercises found</p>
                )}
              </div>
            )}
          </div>

          {/* Draft exercises */}
          {draftExercises.map((d, exIdx) => (
            <div key={d.exercise.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{d.exercise.name}</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {d.exercise.muscle_groups.join(', ')} · {d.exercise.equipment}
                  </span>
                </div>
                <button onClick={() => removeExercise(exIdx)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
              </div>

              {/* Sets table */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Set</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Weight (kg)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reps</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>✓</span>
              </div>

              {d.sets.map((set, si) => (
                <div key={si} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 40px', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '4px' }}>{si + 1}</span>
                  <input
                    type="number"
                    value={set.weight_kg ?? ''}
                    onChange={e => updateSet(exIdx, si, 'weight_kg', e.target.value)}
                    placeholder="kg"
                    step="0.5"
                    style={{ padding: '7px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                  <input
                    type="number"
                    value={set.reps ?? ''}
                    onChange={e => updateSet(exIdx, si, 'reps', e.target.value)}
                    placeholder="reps"
                    style={{ padding: '7px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                  <button
                    onClick={() => toggleSet(exIdx, si)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '6px',
                      background: set.completed ? 'var(--success)' : 'var(--surface-2)',
                      border: set.completed ? 'none' : '1px solid var(--border)',
                      color: 'white', cursor: 'pointer', fontSize: '14px',
                    }}
                  >
                    {set.completed ? '✓' : ''}
                  </button>
                </div>
              ))}

              <button
                onClick={() => addSet(exIdx)}
                style={{ marginTop: '6px', padding: '6px 14px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
              >
                + Add set
              </button>
            </div>
          ))}

          {draftExercises.length > 0 && (
            <button
              onClick={saveSession}
              disabled={saving}
              style={{
                padding: '14px', background: saving ? 'var(--surface-3)' : 'var(--accent)',
                border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : `✓ Save workout (${draftExercises.length} exercise${draftExercises.length > 1 ? 's' : ''})`}
            </button>
          )}
        </>
      )}

      {view === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No sessions logged yet.</p>
          )}
          {sessions.map(session => {
            const exList = session.session_exercises ?? []
            const totalSets = exList.reduce((a: number, se: { sets: WorkoutSet[] }) => a + (se.sets?.length ?? 0), 0)
            return (
              <div key={session.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{session.name ?? 'Training Session'}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{session.date}{session.duration_minutes ? ` · ${session.duration_minutes} mins` : ''}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{exList.length} exercises · {totalSets} sets</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {exList.map((se: { exercise_id: string; exercises?: { name: string } }) => (
                    <span key={se.exercise_id} style={{ padding: '3px 10px', background: 'var(--surface-2)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {se.exercises?.name ?? '—'}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
