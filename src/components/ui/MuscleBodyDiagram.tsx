'use client'
import { useState } from 'react'
import Body from 'react-muscle-highlighter'
import type { ExtendedBodyPart } from 'react-muscle-highlighter'

type Slug = 'abs' | 'adductors' | 'ankles' | 'biceps' | 'calves' | 'chest' | 'deltoids' | 'feet' | 'forearm' | 'gluteal' | 'hamstring' | 'hands' | 'hair' | 'head' | 'knees' | 'lower-back' | 'neck' | 'obliques' | 'quadriceps' | 'tibialis' | 'trapezius' | 'triceps' | 'upper-back'

interface Props {
  muscleHits: Record<string, number>
  sex: 'male' | 'female'
}

const MUSCLE_SLUG_MAP: Record<string, Slug[]> = {
  chest: ['chest'],
  'upper chest': ['chest'],
  back: ['upper-back'],
  'upper back': ['upper-back'],
  lats: ['upper-back'],
  traps: ['trapezius'],
  'lower back': ['lower-back'],
  shoulders: ['deltoids'],
  'lateral delts': ['deltoids'],
  'front delts': ['deltoids'],
  'rear delts': ['deltoids'],
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
  adductors: ['adductors'],
  abductors: ['adductors'],
  cardiovascular: [],
}

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
    .map(([slug, hits]) => {
      const part: ExtendedBodyPart = {
        slug: slug as Slug,
        intensity: Math.min(hits, 3) as 1 | 2 | 3,
      }
      return part
    })
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

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Body
          data={bodyData}
          gender={sex}
          side={side}
          colors={INTENSITY_COLORS}
          scale={1.4}
        />
      </div>

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
