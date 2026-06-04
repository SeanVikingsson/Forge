'use client'
import { useState, useEffect, useCallback } from 'react'
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

function cmToFeetInches(cm: number) {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { feet, inches }
}

function feetInchesToCm(feet: number, inches: number) {
  return Math.round((feet * 12 + inches) * 2.54)
}

function kgToLbs(kg: number) {
  return Math.round(kg * 2.20462 * 10) / 10
}

function lbsToKg(lbs: number) {
  return Math.round((lbs / 2.20462) * 10) / 10
}

const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</p>}
    </div>
  )
}

function UnitToggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: '4px 10px', borderRadius: '4px', fontSize: '12px', border: 'none', cursor: 'pointer',
          background: value === o ? 'var(--accent)' : 'transparent',
          color: value === o ? 'white' : 'var(--text-muted)',
          fontWeight: value === o ? '600' : '400',
        }}>{o}</button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </div>
  )
}

function SimpleInput({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  )
}

export default function ProfileClient({ profile, userEmail }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true' || !profile?.onboarding_complete

  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    height_cm: profile?.height_cm?.toString() ?? '',
    weight_kg: profile?.weight_kg?.toString() ?? '',
    weight_display: profile?.weight_kg?.toString() ?? '',
    age: profile?.age?.toString() ?? '',
    sex: profile?.sex ?? 'male' as 'male' | 'female',
    goal: profile?.goal ?? 'bulk',
    activity_level: profile?.activity_level ?? 'moderately_active',
    training_days_per_week: profile?.training_days_per_week?.toString() ?? '4',
    dietary_restrictions: profile?.dietary_restrictions?.join(', ') ?? '',
    cuisine_preferences: profile?.cuisine_preferences?.join(', ') ?? '',
    disliked_foods: profile?.disliked_foods?.join(', ') ?? '',
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
    if (profile?.height_cm) {
      const { feet, inches } = cmToFeetInches(profile.height_cm)
      setHeightFt(feet.toString())
      setHeightIn(inches.toString())
    }
  }, [profile?.height_cm])

  const recalc = useCallback(() => {
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

  useEffect(() => { recalc() }, [recalc])

  function handleHeightUnitSwitch(unit: 'cm' | 'ft') {
    if (unit === 'ft' && form.height_cm) {
      const { feet, inches } = cmToFeetInches(parseFloat(form.height_cm))
      setHeightFt(feet.toString())
      setHeightIn(inches.toString())
    }
    if (unit === 'cm' && heightFt) {
      const cm = feetInchesToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0)
      setForm(prev => ({ ...prev, height_cm: cm.toString() }))
    }
    setHeightUnit(unit)
  }

  function handleWeightUnitSwitch(unit: 'kg' | 'lbs') {
    if (unit === 'lbs' && form.weight_kg) {
      setForm(prev => ({ ...prev, weight_display: kgToLbs(parseFloat(form.weight_kg)).toString() }))
    }
    if (unit === 'kg' && form.weight_display) {
      const kg = lbsToKg(parseFloat(form.weight_display))
      setForm(prev => ({ ...prev, weight_kg: kg.toString(), weight_display: kg.toString() }))
    }
    setWeightUnit(unit)
  }

  function handleWeightChange(val: string) {
    if (weightUnit === 'kg') {
      setForm(prev => ({ ...prev, weight_kg: val, weight_display: val }))
    } else {
      const kg = lbsToKg(parseFloat(val) || 0)
      setForm(prev => ({ ...prev, weight_display: val, weight_kg: kg.toString() }))
    }
  }

  function handleHeightFtChange(ft: string) {
    setHeightFt(ft)
    const cm = feetInchesToCm(parseInt(ft) || 0, parseInt(heightIn) || 0)
    setForm(prev => ({ ...prev, height_cm: cm.toString() }))
  }

  function handleHeightInChange(inches: string) {
    setHeightIn(inches)
    const cm = feetInchesToCm(parseInt(heightFt) || 0, parseInt(inches) || 0)
    setForm(prev => ({ ...prev, height_cm: cm.toString() }))
  }

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '700px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{isOnboarding ? '👋 Welcome to Forge — set up your profile' : 'Profile & Settings'}</h1>
        {isOnboarding && <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>Fill in your details to get personalised targets and AI recommendations.</p>}
      </div>

      <Section title="Personal details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <F label="Display name">
            <SimpleInput value={form.display_name} onChange={v => setForm(p => ({ ...p, display_name: v }))} placeholder="Your name" />
          </F>
          <F label="Email">
            <input value={userEmail} disabled style={{ ...inputStyle, background: 'var(--surface-3)', color: 'var(--text-muted)' }} />
          </F>
          <F label="Age">
            <SimpleInput value={form.age} onChange={v => setForm(p => ({ ...p, age: v }))} type="number" placeholder="e.g. 28" />
          </F>
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

          <F label="Height">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={v => handleHeightUnitSwitch(v as 'cm' | 'ft')} />
              </div>
              {heightUnit === 'cm' ? (
                <SimpleInput value={form.height_cm} onChange={v => setForm(p => ({ ...p, height_cm: v }))} type="number" placeholder="e.g. 178" />
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" value={heightFt} onChange={e => handleHeightFtChange(e.target.value)} placeholder="ft" style={{ ...inputStyle, flex: 1 }} />
                  <input type="number" value={heightIn} onChange={e => handleHeightInChange(e.target.value)} placeholder="in" style={{ ...inputStyle, flex: 1 }} />
                </div>
              )}
            </div>
          </F>

          <F label="Current weight">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={v => handleWeightUnitSwitch(v as 'kg' | 'lbs')} />
              </div>
              <SimpleInput value={form.weight_display} onChange={handleWeightChange} type="number" placeholder={weightUnit === 'kg' ? 'e.g. 80' : 'e.g. 176'} />
            </div>
          </F>
        </div>
      </Section>

      <Section title="Goal & training">
        <F label="Goal">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {GOAL_OPTIONS.map(g => (
              <button key={g.value} onClick={() => setForm(p => ({ ...p, goal: g.value as Profile['goal'] }))} style={{
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
        <F label="Training days per week">
          <SimpleInput value={form.training_days_per_week} onChange={v => setForm(p => ({ ...p, training_days_per_week: v }))} type="number" placeholder="e.g. 4" />
        </F>
        <F label="Activity level">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ACTIVITY_OPTIONS.map(a => (
              <button key={a.value} onClick={() => setForm(p => ({ ...p, activity_level: a.value as Profile['activity_level'] }))} style={{
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

      <Section title="Calorie & macro targets">
        {calculatedTargets && (
          <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', borderRadius: '10px', padding: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '500', marginBottom: '8px' }}>✨ Calculated from your stats</p>
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
            <F label="Calorie target (kcal)"><SimpleInput value={form.calorie_target} onChange={v => setForm(p => ({ ...p, calorie_target: v }))} type="number" /></F>
            <F label="Protein (g)"><SimpleInput value={form.protein_target_g} onChange={v => setForm(p => ({ ...p, protein_target_g: v }))} type="number" /></F>
            <F label="Carbs (g)"><SimpleInput value={form.carbs_target_g} onChange={v => setForm(p => ({ ...p, carbs_target_g: v }))} type="number" /></F>
            <F label="Fat (g)"><SimpleInput value={form.fat_target_g} onChange={v => setForm(p => ({ ...p, fat_target_g: v }))} type="number" /></F>
          </div>
        )}
      </Section>

      <Section title="Dietary preferences (used by AI)">
        <F label="Dietary restrictions" hint="Comma separated — e.g. vegetarian, no dairy, gluten-free">
          <SimpleInput value={form.dietary_restrictions} onChange={v => setForm(p => ({ ...p, dietary_restrictions: v }))} placeholder="e.g. no shellfish, lactose intolerant" />
        </F>
        <F label="Cuisine preferences" hint="Comma separated — influences recipe suggestions">
          <SimpleInput value={form.cuisine_preferences} onChange={v => setForm(p => ({ ...p, cuisine_preferences: v }))} placeholder="e.g. Mediterranean, Asian, Irish" />
        </F>
        <F label="Disliked foods" hint="Gemini will avoid these in suggestions">
          <SimpleInput value={form.disliked_foods} onChange={v => setForm(p => ({ ...p, disliked_foods: v }))} placeholder="e.g. Brussels sprouts, liver" />
        </F>
      </Section>

      {saved && (
        <div style={{ padding: '14px', background: 'var(--success-subtle)', border: '1px solid var(--success)', borderRadius: '10px', color: 'var(--success)', fontSize: '14px' }}>
          ✅ Profile saved successfully
        </div>
      )}

      <button onClick={save} disabled={saving} style={{
        padding: '14px', background: saving ? 'var(--surface-3)' : 'var(--accent)',
        border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: '600',
        cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        {saving ? 'Saving...' : isOnboarding ? '🚀 Save & go to dashboard' : 'Save changes'}
      </button>
    </div>
  )
}
