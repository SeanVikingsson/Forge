'use client'
import { useState } from 'react'
import type { RecipeSuggestion } from '@/types'

interface Props {
  remainingCalories: number
  remainingProtein: number
}

export default function RecipesClient({ remainingCalories, remainingProtein }: Props) {
  const [loading, setLoading] = useState(false)
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [ingredients, setIngredients] = useState('')
  const [preferences, setPreferences] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  async function getRecipes() {
    setLoading(true)
    setError('')
    setRecipes([])
    try {
      const res = await fetch('/api/ai/recipe-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remainingCalories, remainingProtein, ingredients, preferences }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setRecipes(data.data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Recipe Suggestions</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          AI-generated high-protein recipes tailored to your remaining macros
        </p>
      </div>

      {/* Remaining macros context */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {[
          { label: 'Calories remaining', value: `${Math.round(remainingCalories)} kcal`, color: 'var(--accent)' },
          { label: 'Protein remaining', value: `${Math.round(remainingProtein)}g`, color: 'var(--protein-color)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: s.color, marginTop: '4px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Generate recipes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            placeholder="Ingredients you have (optional) — e.g. chicken, rice, broccoli, eggs"
            style={{ padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
          />
          <input
            value={preferences}
            onChange={e => setPreferences(e.target.value)}
            placeholder="Any preferences? — e.g. quick, meal prep, high fibre, no dairy"
            style={{ padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
          />
          <button
            onClick={getRecipes}
            disabled={loading}
            style={{
              padding: '11px 24px', background: loading ? 'var(--surface-3)' : 'var(--accent)',
              border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer', alignSelf: 'flex-start',
            }}
          >
            {loading ? '⏳ Generating recipes...' : '✨ Get recipe ideas'}
          </button>
        </div>
        {error && <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--danger)', background: 'var(--danger-subtle)', padding: '10px', borderRadius: '8px' }}>{error}</p>}
      </div>

      {/* Recipe cards */}
      {recipes.map((recipe, i) => (
        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{ padding: '20px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{recipe.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{recipe.description}</p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>⏱ Prep: {recipe.prep_time_minutes}min</span>
                  <span>🔥 Cook: {recipe.cook_time_minutes}min</span>
                  <span>🍽 Serves: {recipe.servings}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                <div style={{ fontSize: '20px', fontWeight: '700' }}>{recipe.macros_per_serving.calories} kcal</div>
                <div style={{ fontSize: '12px', color: 'var(--protein-color)', fontWeight: '500' }}>{recipe.macros_per_serving.protein_g}g protein</div>
              </div>
            </div>

            {/* Macro pills */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {[
                { label: `P: ${recipe.macros_per_serving.protein_g}g`, color: 'var(--protein-color)' },
                { label: `C: ${recipe.macros_per_serving.carbs_g}g`, color: 'var(--carbs-color)' },
                { label: `F: ${recipe.macros_per_serving.fat_g}g`, color: 'var(--fat-color)' },
                ...recipe.tags.slice(0, 3).map(t => ({ label: t, color: 'var(--text-secondary)' })),
              ].map((p, pi) => (
                <span key={pi} style={{ padding: '3px 10px', borderRadius: '12px', background: `${p.color}20`, color: p.color, fontSize: '12px', fontWeight: '500' }}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>

          {expanded === i && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingredients</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recipe.ingredients.map((ing, ii) => (
                      <div key={ii} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>{ing.item}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{ing.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recipe.method.map((step, si) => (
                      <div key={si} style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: '600', minWidth: '18px' }}>{si + 1}.</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
