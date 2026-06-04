'use client'
import { useState } from 'react'

interface Props {
  muscleHits: Record<string, number>
  sex: 'male' | 'female'
}

// Map muscle group keys to SVG path IDs
const MUSCLE_MAP: Record<string, string[]> = {
  chest: ['front-chest-l', 'front-chest-r'],
  'upper chest': ['front-chest-l', 'front-chest-r'],
  shoulders: ['front-shoulder-l', 'front-shoulder-r', 'back-shoulder-l', 'back-shoulder-r'],
  'lateral delts': ['front-shoulder-l', 'front-shoulder-r'],
  'front delts': ['front-shoulder-l', 'front-shoulder-r'],
  'rear delts': ['back-shoulder-l', 'back-shoulder-r'],
  biceps: ['front-bicep-l', 'front-bicep-r'],
  triceps: ['back-tricep-l', 'back-tricep-r'],
  forearms: ['front-forearm-l', 'front-forearm-r', 'back-forearm-l', 'back-forearm-r'],
  core: ['front-abs'],
  abs: ['front-abs'],
  back: ['back-upper-l', 'back-upper-r'],
  lats: ['back-lat-l', 'back-lat-r'],
  traps: ['back-trap-l', 'back-trap-r'],
  'lower back': ['back-lower'],
  glutes: ['back-glute-l', 'back-glute-r'],
  quadriceps: ['front-quad-l', 'front-quad-r'],
  hamstrings: ['back-hamstring-l', 'back-hamstring-r'],
  calves: ['front-calf-l', 'front-calf-r', 'back-calf-l', 'back-calf-r'],
  cardiovascular: [],
}

function getMuscleColor(hits: number): string {
  if (hits === 0) return 'var(--surface-3)'
  if (hits === 1) return '#3b5bdb'
  if (hits === 2) return '#7048e8'
  return '#e03131'
}

function getMuscleOpacity(hits: number): number {
  if (hits === 0) return 1
  return 0.85
}

// Build a lookup: pathId -> hit count
function buildPathHits(muscleHits: Record<string, number>): Record<string, number> {
  const pathHits: Record<string, number> = {}
  Object.entries(muscleHits).forEach(([muscle, hits]) => {
    const paths = MUSCLE_MAP[muscle.toLowerCase()] ?? []
    paths.forEach(pathId => {
      pathHits[pathId] = Math.max(pathHits[pathId] ?? 0, hits)
    })
  })
  return pathHits
}

function FrontBody({ pathHits, sex }: { pathHits: Record<string, number>; sex: 'male' | 'female' }) {
  const c = (id: string) => getMuscleColor(pathHits[id] ?? 0)
  const o = (id: string) => getMuscleOpacity(pathHits[id] ?? 0)
  const isFemale = sex === 'female'

  return (
    <svg viewBox="0 0 160 340" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '140px' }}>
      {/* Head */}
      <ellipse cx="80" cy="22" rx={isFemale ? '16' : '15'} ry="18" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      {/* Neck */}
      <rect x="73" y="38" width="14" height="12" rx="3" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />

      {/* Torso */}
      {isFemale ? (
        <path d="M55 50 Q50 52 48 60 L46 100 Q46 108 55 112 L65 114 L65 130 L95 130 L95 114 L105 112 Q114 108 114 100 L112 60 Q110 52 105 50 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      ) : (
        <path d="M52 50 Q47 52 45 62 L43 102 Q43 110 53 114 L65 116 L65 132 L95 132 L95 116 L107 114 Q117 110 117 102 L115 62 Q113 52 108 50 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      )}

      {/* Chest L */}
      <path id="front-chest-l"
        d={isFemale ? "M65 55 Q60 58 58 66 Q62 74 70 76 L78 76 L78 56 Z" : "M65 54 Q58 57 56 66 Q60 76 70 78 L78 78 L78 54 Z"}
        fill={c('front-chest-l')} opacity={o('front-chest-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Chest R */}
      <path id="front-chest-r"
        d={isFemale ? "M95 55 Q100 58 102 66 Q98 74 90 76 L82 76 L82 56 Z" : "M95 54 Q102 57 104 66 Q100 76 90 78 L82 78 L82 54 Z"}
        fill={c('front-chest-r')} opacity={o('front-chest-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Abs */}
      <path id="front-abs"
        d={isFemale ? "M68 78 L92 78 L92 128 L68 128 Z" : "M70 80 L90 80 L90 130 L70 130 Z"}
        fill={c('front-abs')} opacity={o('front-abs')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Abs segments lines */}
      <line x1={isFemale ? '68' : '70'} y1="95" x2={isFemale ? '92' : '90'} y2="95" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
      <line x1={isFemale ? '68' : '70'} y1="110" x2={isFemale ? '92' : '90'} y2="110" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />
      <line x1="80" y1="80" x2="80" y2="130" stroke="var(--border)" strokeWidth="0.5" opacity="0.4" />

      {/* Shoulder L */}
      <ellipse id="front-shoulder-l" cx={isFemale ? '44' : '41'} cy="62" rx="10" ry="14"
        fill={c('front-shoulder-l')} opacity={o('front-shoulder-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Shoulder R */}
      <ellipse id="front-shoulder-r" cx={isFemale ? '116' : '119'} cy="62" rx="10" ry="14"
        fill={c('front-shoulder-r')} opacity={o('front-shoulder-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Upper arm L (bicep) */}
      <path id="front-bicep-l"
        d={isFemale ? "M36 74 Q30 80 29 96 Q33 104 40 104 Q46 104 47 96 L46 76 Z" : "M33 74 Q27 80 26 98 Q30 108 37 108 Q44 108 45 98 L43 76 Z"}
        fill={c('front-bicep-l')} opacity={o('front-bicep-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Upper arm R (bicep) */}
      <path id="front-bicep-r"
        d={isFemale ? "M124 74 Q130 80 131 96 Q127 104 120 104 Q114 104 113 96 L114 76 Z" : "M127 74 Q133 80 134 98 Q130 108 123 108 Q116 108 115 98 L117 76 Z"}
        fill={c('front-bicep-r')} opacity={o('front-bicep-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Forearm L */}
      <path id="front-forearm-l"
        d={isFemale ? "M30 106 Q27 114 28 128 Q32 136 38 136 Q44 134 44 126 L42 106 Z" : "M27 110 Q24 118 25 134 Q29 142 36 142 Q42 140 42 130 L40 110 Z"}
        fill={c('front-forearm-l')} opacity={o('front-forearm-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Forearm R */}
      <path id="front-forearm-r"
        d={isFemale ? "M130 106 Q133 114 132 128 Q128 136 122 136 Q116 134 116 126 L118 106 Z" : "M133 110 Q136 118 135 134 Q131 142 124 142 Q118 140 118 130 L120 110 Z"}
        fill={c('front-forearm-r')} opacity={o('front-forearm-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Hips/pelvis */}
      {isFemale ? (
        <path d="M55 128 Q46 132 44 148 L48 164 L112 164 L116 148 Q114 132 105 128 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      ) : (
        <path d="M58 130 Q50 134 48 148 L52 162 L108 162 L112 148 Q110 134 102 130 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      )}

      {/* Quad L */}
      <path id="front-quad-l"
        d={isFemale ? "M50 162 Q44 170 44 196 Q46 214 55 218 Q64 220 66 210 L68 162 Z" : "M53 160 Q46 168 46 196 Q48 216 57 220 Q66 222 68 210 L70 160 Z"}
        fill={c('front-quad-l')} opacity={o('front-quad-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Quad R */}
      <path id="front-quad-r"
        d={isFemale ? "M110 162 Q116 170 116 196 Q114 214 105 218 Q96 220 94 210 L92 162 Z" : "M107 160 Q114 168 114 196 Q112 216 103 220 Q94 222 92 210 L90 160 Z"}
        fill={c('front-quad-r')} opacity={o('front-quad-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Knee L */}
      <ellipse cx={isFemale ? '58' : '59'} cy={isFemale ? '222' : '224'} rx="10" ry="8"
        fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
      {/* Knee R */}
      <ellipse cx={isFemale ? '102' : '101'} cy={isFemale ? '222' : '224'} rx="10" ry="8"
        fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />

      {/* Calf L */}
      <path id="front-calf-l"
        d={isFemale ? "M50 228 Q46 240 48 260 Q50 272 58 274 Q66 274 67 262 L66 228 Z" : "M51 230 Q47 242 49 264 Q51 276 59 278 Q67 278 68 264 L67 230 Z"}
        fill={c('front-calf-l')} opacity={o('front-calf-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Calf R */}
      <path id="front-calf-r"
        d={isFemale ? "M110 228 Q114 240 112 260 Q110 272 102 274 Q94 274 93 262 L94 228 Z" : "M109 230 Q113 242 111 264 Q109 276 101 278 Q93 278 92 264 L93 230 Z"}
        fill={c('front-calf-r')} opacity={o('front-calf-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Feet */}
      <ellipse cx={isFemale ? '57' : '58'} cy="280" rx="12" ry="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
      <ellipse cx={isFemale ? '103' : '102'} cy="280" rx="12" ry="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
    </svg>
  )
}

function BackBody({ pathHits, sex }: { pathHits: Record<string, number>; sex: 'male' | 'female' }) {
  const c = (id: string) => getMuscleColor(pathHits[id] ?? 0)
  const o = (id: string) => getMuscleOpacity(pathHits[id] ?? 0)
  const isFemale = sex === 'female'

  return (
    <svg viewBox="0 0 160 340" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '140px' }}>
      {/* Head */}
      <ellipse cx="80" cy="22" rx={isFemale ? '16' : '15'} ry="18" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      {/* Neck */}
      <rect x="73" y="38" width="14" height="12" rx="3" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />

      {/* Torso back */}
      {isFemale ? (
        <path d="M55 50 Q50 52 48 60 L46 100 Q46 108 55 112 L65 114 L65 130 L95 130 L95 114 L105 112 Q114 108 114 100 L112 60 Q110 52 105 50 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      ) : (
        <path d="M52 50 Q47 52 45 62 L43 102 Q43 110 53 114 L65 116 L65 132 L95 132 L95 116 L107 114 Q117 110 117 102 L115 62 Q113 52 108 50 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      )}

      {/* Traps L */}
      <path id="back-trap-l"
        d="M67 50 Q72 46 80 48 L80 64 L66 68 Z"
        fill={c('back-trap-l')} opacity={o('back-trap-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Traps R */}
      <path id="back-trap-r"
        d="M93 50 Q88 46 80 48 L80 64 L94 68 Z"
        fill={c('back-trap-r')} opacity={o('back-trap-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Upper back L */}
      <path id="back-upper-l"
        d={isFemale ? "M66 68 L80 66 L80 96 L66 100 Q58 96 58 86 Z" : "M66 68 L80 66 L80 98 L64 102 Q56 98 56 86 Z"}
        fill={c('back-upper-l')} opacity={o('back-upper-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Upper back R */}
      <path id="back-upper-r"
        d={isFemale ? "M94 68 L80 66 L80 96 L94 100 Q102 96 102 86 Z" : "M94 68 L80 66 L80 98 L96 102 Q104 98 104 86 Z"}
        fill={c('back-upper-r')} opacity={o('back-upper-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Lats L */}
      <path id="back-lat-l"
        d={isFemale ? "M58 86 L66 100 L66 118 Q58 114 54 102 Z" : "M56 86 L64 102 L64 120 Q55 116 51 102 Z"}
        fill={c('back-lat-l')} opacity={o('back-lat-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Lats R */}
      <path id="back-lat-r"
        d={isFemale ? "M102 86 L94 100 L94 118 Q102 114 106 102 Z" : "M104 86 L96 102 L96 120 Q105 116 109 102 Z"}
        fill={c('back-lat-r')} opacity={o('back-lat-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Lower back */}
      <path id="back-lower"
        d={isFemale ? "M66 100 L94 100 L94 128 L66 128 Z" : "M64 102 L96 102 L96 130 L64 130 Z"}
        fill={c('back-lower')} opacity={o('back-lower')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Shoulder L */}
      <ellipse id="back-shoulder-l" cx={isFemale ? '44' : '41'} cy="62" rx="10" ry="14"
        fill={c('back-shoulder-l')} opacity={o('back-shoulder-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Shoulder R */}
      <ellipse id="back-shoulder-r" cx={isFemale ? '116' : '119'} cy="62" rx="10" ry="14"
        fill={c('back-shoulder-r')} opacity={o('back-shoulder-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Tricep L */}
      <path id="back-tricep-l"
        d={isFemale ? "M36 74 Q30 80 29 96 Q33 104 40 104 Q46 104 47 96 L46 76 Z" : "M33 74 Q27 80 26 98 Q30 108 37 108 Q44 108 45 98 L43 76 Z"}
        fill={c('back-tricep-l')} opacity={o('back-tricep-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Tricep R */}
      <path id="back-tricep-r"
        d={isFemale ? "M124 74 Q130 80 131 96 Q127 104 120 104 Q114 104 113 96 L114 76 Z" : "M127 74 Q133 80 134 98 Q130 108 123 108 Q116 108 115 98 L117 76 Z"}
        fill={c('back-tricep-r')} opacity={o('back-tricep-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Forearm L back */}
      <path id="back-forearm-l"
        d={isFemale ? "M30 106 Q27 114 28 128 Q32 136 38 136 Q44 134 44 126 L42 106 Z" : "M27 110 Q24 118 25 134 Q29 142 36 142 Q42 140 42 130 L40 110 Z"}
        fill={c('back-forearm-l')} opacity={o('back-forearm-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Forearm R back */}
      <path id="back-forearm-r"
        d={isFemale ? "M130 106 Q133 114 132 128 Q128 136 122 136 Q116 134 116 126 L118 106 Z" : "M133 110 Q136 118 135 134 Q131 142 124 142 Q118 140 118 130 L120 110 Z"}
        fill={c('back-forearm-r')} opacity={o('back-forearm-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Hips/pelvis back */}
      {isFemale ? (
        <path d="M55 128 Q46 132 44 148 L48 164 L112 164 L116 148 Q114 132 105 128 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      ) : (
        <path d="M58 130 Q50 134 48 148 L52 162 L108 162 L112 148 Q110 134 102 130 Z"
          fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" />
      )}

      {/* Glute L */}
      <path id="back-glute-l"
        d={isFemale ? "M48 148 Q46 158 50 168 Q56 176 66 174 L68 162 Z" : "M52 148 Q50 158 52 166 Q58 174 68 172 L70 160 Z"}
        fill={c('back-glute-l')} opacity={o('back-glute-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Glute R */}
      <path id="back-glute-r"
        d={isFemale ? "M112 148 Q114 158 110 168 Q104 176 94 174 L92 162 Z" : "M108 148 Q110 158 108 166 Q102 174 92 172 L90 160 Z"}
        fill={c('back-glute-r')} opacity={o('back-glute-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Hamstring L */}
      <path id="back-hamstring-l"
        d={isFemale ? "M50 168 Q44 178 44 200 Q46 216 56 220 Q65 222 67 210 L66 172 Z" : "M52 166 Q46 178 46 202 Q48 218 58 222 Q67 224 68 212 L67 170 Z"}
        fill={c('back-hamstring-l')} opacity={o('back-hamstring-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Hamstring R */}
      <path id="back-hamstring-r"
        d={isFemale ? "M110 168 Q116 178 116 200 Q114 216 104 220 Q95 222 93 210 L94 172 Z" : "M108 166 Q114 178 114 202 Q112 218 102 222 Q93 224 92 212 L93 170 Z"}
        fill={c('back-hamstring-r')} opacity={o('back-hamstring-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Knee L back */}
      <ellipse cx={isFemale ? '58' : '59'} cy={isFemale ? '224' : '226'} rx="10" ry="8"
        fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
      {/* Knee R back */}
      <ellipse cx={isFemale ? '102' : '101'} cy={isFemale ? '224' : '226'} rx="10" ry="8"
        fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />

      {/* Calf L back */}
      <path id="back-calf-l"
        d={isFemale ? "M50 230 Q46 242 48 262 Q50 274 58 276 Q66 276 67 262 L66 230 Z" : "M51 232 Q47 244 49 266 Q51 278 59 280 Q67 280 68 266 L67 232 Z"}
        fill={c('back-calf-l')} opacity={o('back-calf-l')} stroke="var(--border)" strokeWidth="0.5" />
      {/* Calf R back */}
      <path id="back-calf-r"
        d={isFemale ? "M110 230 Q114 242 112 262 Q110 274 102 276 Q94 276 93 262 L94 230 Z" : "M109 232 Q113 244 111 266 Q109 278 101 280 Q93 280 92 266 L93 232 Z"}
        fill={c('back-calf-r')} opacity={o('back-calf-r')} stroke="var(--border)" strokeWidth="0.5" />

      {/* Feet */}
      <ellipse cx={isFemale ? '57' : '58'} cy="282" rx="12" ry="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
      <ellipse cx={isFemale ? '103' : '102'} cy="282" rx="12" ry="6" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="0.5" />
    </svg>
  )
}

export default function MuscleBodyDiagram({ muscleHits, sex }: Props) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const pathHits = buildPathHits(muscleHits)

  const legend = [
    { color: 'var(--surface-3)', label: 'Not trained' },
    { color: '#3b5bdb', label: 'Trained once' },
    { color: '#7048e8', label: 'Trained twice' },
    { color: '#e03131', label: 'Trained 3+' },
  ]

  return (
    <div>
      {/* Front/Back toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['front', 'back'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
            background: view === v ? 'var(--accent-subtle)' : 'transparent',
            border: view === v ? '1px solid var(--accent)' : '1px solid var(--border)',
            color: view === v ? 'var(--accent)' : 'var(--text-secondary)',
            textTransform: 'capitalize',
          }}>{v}</button>
        ))}
      </div>

      {/* Body diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        {view === 'front'
          ? <FrontBody pathHits={pathHits} sex={sex} />
          : <BackBody pathHits={pathHits} sex={sex} />
        }
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
        {legend.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.color, border: '1px solid var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
