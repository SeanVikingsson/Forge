'use client'
import { useState } from 'react'
import Body from 'react-muscle-highlighter'
import type { ExtendedBodyPart } from 'react-muscle-highlighter'

interface Props {
  muscleHits: Record<string, number>
  sex: 'male' | 'female'
}

// Map our internal muscle keys to react-muscle-highlighter slugs
const MUSCLE_SLUG_MAP: Record<string, string[]> = {
  chest: ['chest'],
  'upper chest': ['chest'],
  back: ['upper-back'],
  'upper back': ['upper-back'],
  lats: ['lats'],
  traps: ['trapezius'],
  'lower back': ['lower-back'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  'lateral delts': ['front-deltoids', 'back-deltoids'],
  'front delts': ['front-deltoids'],
  'rear delts': ['back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  core: ['abs'],
  abs: ['abs'],
  obliques: ['obliques'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  adductors: ['adductor'],
  abductors: ['abductors'],
  cardiovascular: [],
}

// Intensity colours: light → dark red matching the reference image style
const INTENSITY_COLORS = ['#ffb3b3', '#ff6666', '#cc0000']

function buildBodyData(muscleHits: Record<string, number>): ExtendedBodyPart[] {
  const slugHits: Record<string, number> = {}

  Object.entries(muscleHits).forEach(([muscle, hits]) => {
    const slugs = MUSCLE_SLUG_MAP[muscle.toLowerCase()] ?? []
    slugs.forEach(slug => {
      slugHits[slug] = Math.max(slugHits[slug] ?? 0, hits)
    })
  })

  return Object.entries(slugHits)
    .filter(([, hits]) => hits > 0)
    .map(([slug, hits]) => ({
      slug,
      intensity: Math.min(hits, 3) as 1 | 2 | 3,
    }))
}

export default function MuscleBodyDiagram({ muscleHits, sex }: Props) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const bodyData = buildBodyData(muscleHits)

  const legend = [
    { color: '#ffb3b3', label: 'Trained once' },
    { color: '#ff6666', label: 'Trained twice' },
    { color: '#cc0000', label: 'Trained 3+ times' },
  ]

  return (
    <div>
      {/* Front / Back toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['front', 'back'] as const).map(v => (
          <button key={v} onClick={() => setSide(v)} style={{
            padding: '5px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
            background: side === v ? 'var(--accent-subtle)' : 'transparent',
            border: side === v ? '1px solid var(--accent)' : '1px solid var(--border)',
            color: side === v ? 'var(--accent)' : 'var(--text-secondary)',
            textTransform: 'capitalize',
          }}>{v}</button>
        ))}
      </div>

      {/* Body diagram */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Body
          data={bodyData}
          gender={sex}
          side={side}
          colors={INTENSITY_COLORS}
          scale={1.4}
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--surface-3)', border: '1px solid var(--border)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Not trained</span>
        </div>
        {legend.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
