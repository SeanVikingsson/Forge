'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateTargets } from '@/lib/tdee'
import type { Profile } from '@/types'
import { useSearchParams, useRouter } from 'next/navigation'

interface Props {
  profile: Profile | null
  userEmail: string
}

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { value: 'lightly_active', label: 'Lightly active', desc: '1–3 days/week light exercise' },
  { value: 'moderately_active', label: 'Moderately active', desc: '3–5 days/week moderate exercise' },
  { value: 'very_active', label: 'Very active', desc: '6–7 days/week hard exercise' },
  { value: 'extremely_active', label: 'Extremely active', desc: 'Physical job + daily training' },
]

const GOAL_OPTIONS = [
  { value: 'bulk', label: '💪 Bulk', desc: 'Gain muscle (+300 kcal surplus)' },
  { value: 'cut', label: '🔥 Cut', desc: 'Lose fat (−500 kcal deficit)' },
  { value: 'recomp', label: '⚖️ Recomp', desc: 'Build muscle, lose fat (maintenance)' },
  { value: 'maintenance', label: '🎯 Maintain', desc: 'Stay at current weight' },
]

export default function ProfileClient({ profile, userEmail }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true' || !profile?.onboarding_complete

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    height_cm: profile?.height_cm?.toString() ?? '',
    weight_kg: profile?.weight_kg?.toString() ?? '',
    age: profile?.age?.toString() ?? '',
    sex: profile?.sex ?? 'male' as 'male' | 'female',
    goal: profile?.goal ?? 'bulk',
    activity_level: profile?.activity_level ?? 'moderately_active',
    training_days_per_week: profile?.training_days_per_week?.toString() ?? '4',
    dietary_restrictions: profile?.dietary_restrictions?.join(', ') ?? '',
    cuisine_preferences: profile?.cuisine_preferences?.join(', ') ?? '',
    disliked_foods: profile?.disliked_foods?.join(', ') ?? '',
    // Override targets
    calorie_target: profile?.calorie_target?.toString() ?? '',
    protein_target_g: profile?.protein_target_g?.toString() ?? '',
    carbs_target_g: profile?.carbs_target_g?.toString() ?? '',
    fat_target_g: profile?.fat_target_g?.toString() ?? '',
  })

  const [calculatedTargets, setCalculatedTargets] = useState<ReturnType<typeof calculateTargets>>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [useCustomTargets, setUseCustomTargets] = useState(false)

  useEffect(() => {
    const t = calculateTargets({
      weight_kg: parseFloat(form.weight_kg) || undefined,
      height_cm: parseFloat(form.height_cm) || undefined,
      age: parseInt(form.age) || undefined,
      sex: form.sex,
      activity_level: form.activity_level as Profile['activity_level'],
      goal: form.goal as Profile['goal'],
    })
    setCalculatedTargets(t)
    if (t && !useCustomTargets) {
      setForm(prev => ({
        ...prev,
        calorie_target: t.calorie_target.toString(),
        protein_target_g: t.protein_target_g.toString(),
        carbs_target_g: t.carbs_target_g.toString(),
        fat_target_g: t.fat_target_g.toString(),
      }))
    }
  }, [form.weight_kg, form.height_cm, form.age, form.sex, form.activity_level, form.goal, useCustomTargets])

  async function save() {
    setSaving(true)
    setSaved(false)

    const targets = useCustomTargets ? {
      calorie_target: parseInt(form.calorie_target) || null,
      protein_target_g: parseInt(form.protein_target_g) || null,
      carbs_target_g: parseInt(form.carbs_target_g) || null,
      fat_target_g: parseInt(form.fat_target_g) || null,
    } : calculatedTargets ? {
      calorie_target: calculatedTargets.calorie_target,
      protein_target_g: calculatedTargets.protein_target_g,
      carbs_target_g: calculatedTargets.carbs_target_g,
      fat_target_g: calculatedTargets.fat_target_g,
    } : {}

    await supabase.from('profiles').update({
      display_name: form.display_name,
      height_cm: parseFloat(form.height_cm) || null,
      weight_kg: parseFloat(form.weight_kg) || null,
      age: parseInt(form.age) || null,
      sex: form.sex,
      goal: form.goal,
      activity_level: form.activity_level,
      training_days_per_week: parseInt(form.training_days_per_week) || 4,
      tdee: calculatedTargets?.tdee ?? null,
      dietary_restrictions: form.dietary_restrictions ? form.dietary_restrictions.split(',').map(s => s.trim()).filter(Boolean) : [],
      cuisine_preferences: form.cuisine_preferences ? form.cuisine_preferences.split(',').map(s => s.trim()).filter(Boolean) : [],
      disliked_foods: form.disliked_foods ? form.disliked_foods.split(',').map(s => s.trim()).filter(Boolean) : [],
      onboarding_complete: true,
      ...targets,
    }).eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')

    setSaving(false)
    setSaved(true)
    if (isOnboarding) router.push('/dashboard')
  }

  const F = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</p>}
    </div>
  )

  const Input = ({ field, type = 'text', placeholder }: { field: keyof typeof form; type?: string; placeholder?: string }) => (
    <input
      type={type}
      value={form[field]}
      onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
      placeholder={placeholder}
      style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
    />
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '700px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{isOnboarding ? '👋 Welcome to Forge — set up your profile' : 'Profile & Settings'}</h1>
        {isOnboarding && <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>Fill in your details to get personalised targets and AI recommendations.</p>}
      </div>

      <Section title="Personal details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <F label="Display name"><Input field="display_name" placeholder="Your name" /></F>
          <F label="Email"><input value={userEmail} disabled style={{ width: '100%', padding: '10px 14px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px' }} /></F>
          <F label="Age"><Input field="age" type="number" placeholder="e.g. 28" /></F>
          <F label="Sex">
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['male', 'female'] as const).map(s => (
                <button key={s} onClick={() => setForm(p => ({ ...p, sex: s }))} style={{
                  flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  background: form.sex === s ? 'var(--accent-subtle)' : 'transparent',
                  border: form.sex === s ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: form.sex === s ? 'var(--accent)' : 'var(--text-secondary)',
                  textTransform: 'capitalize',
                }}>{s}</button>
              ))}
            </div>
          </F>
          <F label="Height (cm)"><Input field="height_cm" type="number" placeholder="e.g. 178" /></F>
          <F label="Current weight (kg)"><Input field="weight_kg" type="number" placeholder="e.g. 80" /></F>
        </div>
      </Section>

      <Section title="Goal & training">
        <F label="Goal">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {GOAL_OPTIONS.map(g => (
              <button key={g.value} onClick={() => setForm(p => ({ ...p, goal: g.value }))} style={{
                padding: '12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                background: form.goal === g.value ? 'var(--accent-subtle)' : 'var(--surface-2)',
                border: form.goal === g.value ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{g.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{g.desc}</div>
              </button>
            ))}
          </div>
        </F>
        <F label="Training days per week"><Input field="training_days_per_week" type="number" placeholder="e.g. 4" /></F>
        <F label="Activity level">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setForm(p => ({ ...p, activity_level: a.value }))} style={{
                padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: form.activity_level === a.value ? 'var(--accent-subtle)' : 'transparent',
                border: form.activity_level === a.value ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '14px', fontWeight: form.activity_level === a.value ? '500' : '400' }}>{a.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.desc}</span>
              </button>
            ))}
          </div>
        </F>
      </Section>

      {/* TDEE & targets */}
      <Section title="Calorie & macro targets">
        {calculatedTargets && (
          <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '500', marginBottom: '8px' }}>
              ✨ Calculated from your stats
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
              <span>TDEE: <strong>{calculatedTargets.tdee} kcal</strong></span>
              <span>Target: <strong>{calculatedTargets.calorie_target} kcal</strong></span>
              <span>Protein: <strong>{calculatedTargets.protein_target_g}g</strong></span>
              <span>Carbs: <strong>{calculatedTargets.carbs_target_g}g</strong></span>
              <span>Fat: <strong>{calculatedTargets.fat_target_g}g</strong></span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" id="custom" checked={useCustomTargets} onChange={e => setUseCustomTargets(e.target.checked)} />
          <label htmlFor="custom" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Override with custom targets</label>
        </div>

        {useCustomTargets && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <F label="Calorie target (kcal)"><Input field="calorie_target" type="number" /></F>
            <F label="Protein (g)"><Input field="protein_target_g" type="number" /></F>
            <F label="Carbs (g)"><Input field="carbs_target_g" type="number" /></F>
            <F label="Fat (g)"><Input field="fat_target_g" type="number" /></F>
          </div>
        )}
      </Section>

      <Section title="Dietary preferences (used by AI)">
        <F label="Dietary restrictions" hint="Comma separated — e.g. vegetarian, no dairy, gluten-free">
          <Input field="dietary_restrictions" placeholder="e.g. no shellfish, lactose intolerant" />
        </F>
        <F label="Cuisine preferences" hint="Comma separated — influences recipe suggestions">
          <Input field="cuisine_preferences" placeholder="e.g. Mediterranean, Asian, Irish" />
        </F>
        <F label="Disliked foods" hint="Gemini will avoid these in suggestions">
          <Input field="disliked_foods" placeholder="e.g. Brussels sprouts, liver" />
        </F>
      </Section>

      {saved && (
        <div style={{ padding: '14px', background: 'var(--success-subtle)', border: '1px solid var(--success)', borderRadius: '10px', color: 'var(--success)', fontSize: '14px' }}>
          ✅ Profile saved successfully
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: '14px', background: saving ? 'var(--surface-3)' : 'var(--accent)',
          border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : isOnboarding ? '🚀 Save & go to dashboard' : 'Save changes'}
      </button>
    </div>
  )
}
