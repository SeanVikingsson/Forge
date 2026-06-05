'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MealLog, ParsedMeal } from '@/types'

interface Props {
  initialMeals: MealLog[]
  profile: { calorie_target: number; protein_target_g: number; carbs_target_g: number; fat_target_g: number } | null
  today: string
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

interface ScannedProduct {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  serving_size?: string
}

export default function MealsClient({ initialMeals, profile, today }: Props) {
  const supabase = createClient()
  const [meals, setMeals] = useState<MealLog[]>(initialMeals)
  const [input, setInput] = useState('')
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number]>('lunch')
  const [parsing, setParsing] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<ParsedMeal | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Barcode scanner
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null)
  const [scannedQuantity, setScannedQuantity] = useState('100')
  const scannerDivRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<unknown>(null)

  // Start barcode scanner
  async function openScanner() {
    setScannerOpen(true)
    setScannerError('')
    setScannedProduct(null)
  }

  useEffect(() => {
    if (!scannerOpen || !scannerDivRef.current) return

    let html5QrCode: unknown = null

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        html5QrCode = new Html5Qrcode('barcode-scanner-div')
        scannerRef.current = html5QrCode

        await (html5QrCode as { start: (c: unknown, o: unknown, s: unknown, e: unknown) => Promise<void> }).start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 120 } },
          async (decodedText: string) => {
            await (html5QrCode as { stop: () => Promise<void> }).stop()
            setScannerOpen(false)
            await lookupBarcode(decodedText)
          },
          () => {}
        )
      } catch (err) {
        console.error('Scanner error:', err)
        setScannerError('Could not access camera. Please allow camera permissions and try again.')
        setScannerOpen(false)
      }
    }

    startScanner()

    return () => {
      if (html5QrCode) {
        (html5QrCode as { stop: () => Promise<void>; clear: () => void }).stop().catch(() => {}).finally(() => {
          (html5QrCode as { stop: () => Promise<void>; clear: () => void }).clear()
        })
      }
    }
  }, [scannerOpen])

  async function closeScanner() {
    if (scannerRef.current) {
      try {
        await (scannerRef.current as { stop: () => Promise<void> }).stop()
      } catch {}
    }
    setScannerOpen(false)
  }

  async function lookupBarcode(barcode: string) {
    setLookingUp(true)
    setScannerError('')
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await res.json()

      if (data.status !== 1 || !data.product) {
        setScannerError(`Product not found for barcode ${barcode}. Try typing the meal manually.`)
        setLookingUp(false)
        return
      }

      const p = data.product
      const n = p.nutriments ?? {}

      const product: ScannedProduct = {
        name: p.product_name || p.generic_name || 'Unknown product',
        calories: Math.round(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0),
        protein_g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        carbs_g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat_g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        fibre_g: Math.round((n['fiber_100g'] ?? 0) * 10) / 10,
        serving_size: p.serving_size,
      }

      setScannedProduct(product)
      setScannedQuantity('100')
    } catch {
      setScannerError('Failed to look up product. Check your connection and try again.')
    }
    setLookingUp(false)
  }

  function getScaledProduct(product: ScannedProduct, grams: number) {
    const scale = grams / 100
    return {
      calories: Math.round(product.calories * scale),
      protein_g: Math.round(product.protein_g * scale * 10) / 10,
      carbs_g: Math.round(product.carbs_g * scale * 10) / 10,
      fat_g: Math.round(product.fat_g * scale * 10) / 10,
      fibre_g: Math.round(product.fibre_g * scale * 10) / 10,
    }
  }

  async function saveScannedProduct() {
    if (!scannedProduct) return
    setSaving(true)
    const grams = parseFloat(scannedQuantity) || 100
    const scaled = getScaledProduct(scannedProduct, grams)
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error: err } = await supabase.from('meal_logs').insert({
      user_id: user?.id,
      date: today,
      meal_type: mealType,
      name: `${scannedProduct.name} (${grams}g)`,
      raw_input: `[Barcode scan] ${scannedProduct.name}`,
      calories: scaled.calories,
      protein_g: scaled.protein_g,
      carbs_g: scaled.carbs_g,
      fat_g: scaled.fat_g,
      fibre_g: scaled.fibre_g,
      items: [{
        name: scannedProduct.name,
        quantity: `${grams}g`,
        calories: scaled.calories,
        protein_g: scaled.protein_g,
        carbs_g: scaled.carbs_g,
        fat_g: scaled.fat_g,
      }],
    }).select().single()

    if (!err && data) {
      setMeals(prev => [...prev, data])
      setScannedProduct(null)
    }
    setSaving(false)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function parseMeal() {
    if (!input.trim() && !imageFile) return
    setParsing(true)
    setError('')
    setParsedPreview(null)
    try {
      let body: Record<string, unknown>
      if (imageFile) {
        const base64 = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.onerror = rej
          reader.readAsDataURL(imageFile)
        })
        body = { input: input.trim() || 'Parse the food/meal from this image', meal_type: mealType, image: { data: base64, mimeType: imageFile.type } }
      } else {
        body = { input, meal_type: mealType }
      }
      const res = await fetch('/api/ai/parse-meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setParsedPreview(data.data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setParsing(false)
    }
  }

  async function saveMeal() {
    if (!parsedPreview) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase.from('meal_logs').insert({
      user_id: user?.id,
      date: today,
      meal_type: parsedPreview.meal_type,
      name: parsedPreview.name,
      raw_input: input || '[Image upload]',
      calories: parsedPreview.totals.calories,
      protein_g: parsedPreview.totals.protein_g,
      carbs_g: parsedPreview.totals.carbs_g,
      fat_g: parsedPreview.totals.fat_g,
      fibre_g: parsedPreview.totals.fibre_g,
      items: parsedPreview.items,
    }).select().single()
    if (!err && data) {
      setMeals(prev => [...prev, data])
      setInput('')
      setParsedPreview(null)
      clearImage()
    }
    setSaving(false)
  }

  async function deleteMeal(id: string) {
    setDeleting(id)
    await supabase.from('meal_logs').delete().eq('id', id)
    setMeals(prev => prev.filter(m => m.id !== id))
    setDeleting(null)
  }

  const calTarget = profile?.calorie_target ?? 2500
  const totals = meals.reduce((acc, m) => ({ cal: acc.cal + m.calories, prot: acc.prot + m.protein_g, carbs: acc.carbs + m.carbs_g, fat: acc.fat + m.fat_g }), { cal: 0, prot: 0, carbs: 0, fat: 0 })
  const calPct = Math.min(totals.cal / calTarget, 1)

  const MacroBar = ({ label, value, target, color }: { label: string; value: number; target: number; color: string }) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontWeight: '500' }}>{Math.round(value)}g / {target}g</span>
      </div>
      <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(value / target, 1) * 100}%`, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  )

  const mealsByType = MEAL_TYPES.reduce((acc, type) => { acc[type] = meals.filter(m => m.meal_type === type); return acc }, {} as Record<string, MealLog[]>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Meal Tracker</h1>

      {/* Daily summary */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Today&apos;s nutrition</h2>
          <span style={{ fontSize: '20px', fontWeight: '700' }}>{Math.round(totals.cal)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>/ {calTarget} kcal</span></span>
        </div>
        <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ height: '100%', borderRadius: '4px', width: `${calPct * 100}%`, background: calPct > 1 ? 'var(--danger)' : 'var(--accent)', transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <MacroBar label="Protein" value={totals.prot} target={profile?.protein_target_g ?? 180} color="var(--protein-color)" />
          <MacroBar label="Carbohydrates" value={totals.carbs} target={profile?.carbs_target_g ?? 280} color="var(--carbs-color)" />
          <MacroBar label="Fat" value={totals.fat} target={profile?.fat_target_g ?? 70} color="var(--fat-color)" />
        </div>
      </div>

      {/* Log a meal */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Log a meal</h2>

        {/* Meal type */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {MEAL_TYPES.map(type => (
            <button key={type} onClick={() => setMealType(type)} style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
              border: mealType === type ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: mealType === type ? 'var(--accent-subtle)' : 'transparent',
              color: mealType === type ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}>{type}</button>
          ))}
        </div>

        {/* Barcode scanner button */}
        {!scannedProduct && !scannerOpen && (
          <button
            onClick={openScanner}
            style={{
              width: '100%', padding: '10px', marginBottom: '10px',
              background: 'var(--surface-2)', border: '1px dashed var(--border)',
              borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            📷 Scan barcode
          </button>
        )}

        {/* Camera / scanner view */}
        {scannerOpen && (
          <div style={{ marginBottom: '14px', position: 'relative' }}>
            <div id="barcode-scanner-div" ref={scannerDivRef} style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }} />
            <button
              onClick={closeScanner}
              style={{
                marginTop: '8px', width: '100%', padding: '8px',
                background: 'var(--surface-3)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {lookingUp && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>⏳ Looking up product...</p>
        )}

        {/* Scanned product preview */}
        {scannedProduct && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{scannedProduct.name}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Values per 100g · {scannedProduct.serving_size ? `Serving: ${scannedProduct.serving_size}` : ''}</span>
              </div>
              <button onClick={() => setScannedProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[
                { label: `${scannedProduct.calories} kcal`, color: 'var(--accent)' },
                { label: `P: ${scannedProduct.protein_g}g`, color: 'var(--protein-color)' },
                { label: `C: ${scannedProduct.carbs_g}g`, color: 'var(--carbs-color)' },
                { label: `F: ${scannedProduct.fat_g}g`, color: 'var(--fat-color)' },
              ].map(p => (
                <span key={p.label} style={{ padding: '3px 10px', borderRadius: '12px', background: `${p.color}20`, color: p.color, fontSize: '12px', fontWeight: '500' }}>{p.label}</span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Quantity (g)</label>
              <input
                type="number"
                value={scannedQuantity}
                onChange={e => setScannedQuantity(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px' }}
              />
            </div>

            {/* Scaled totals */}
            {(() => {
              const grams = parseFloat(scannedQuantity) || 100
              const s = getScaledProduct(scannedProduct, grams)
              return (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  For {grams}g: <strong style={{ color: 'var(--text-primary)' }}>{s.calories} kcal</strong> · P: {s.protein_g}g · C: {s.carbs_g}g · F: {s.fat_g}g
                </div>
              )
            })()}

            <button
              onClick={saveScannedProduct}
              disabled={saving}
              style={{
                width: '100%', padding: '10px',
                background: saving ? 'var(--surface-3)' : 'var(--success)',
                border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : '✓ Save this meal'}
            </button>
          </div>
        )}

        {scannerError && (
          <p style={{ fontSize: '13px', color: 'var(--danger)', background: 'var(--danger-subtle)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>{scannerError}</p>
        )}

        {/* Text input */}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. 2 scrambled eggs, 2 slices brown toast with butter, large protein shake with 300ml semi-skimmed milk"
          rows={3}
          style={{ width: '100%', padding: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
        />

        {/* Image upload */}
        <div style={{ marginTop: '10px' }}>
          {imagePreview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt="Meal preview" style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
              <button onClick={clearImage} style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: 'white', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🖼️ Upload image (Deliveroo screenshot, food packaging, etc.)
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button
            onClick={parseMeal}
            disabled={(!input.trim() && !imageFile) || parsing}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              background: (!input.trim() && !imageFile) || parsing ? 'var(--surface-3)' : 'var(--accent)',
              border: 'none', color: 'white', fontSize: '13px', fontWeight: '500',
              cursor: (!input.trim() && !imageFile) || parsing ? 'not-allowed' : 'pointer',
            }}
          >
            {parsing ? '⏳ Parsing...' : '✨ Parse with AI'}
          </button>
          {parsedPreview && (
            <button onClick={() => { setParsedPreview(null); clearImage() }} style={{ padding: '10px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Clear</button>
          )}
        </div>

        {error && <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--danger)', background: 'var(--danger-subtle)', padding: '10px', borderRadius: '8px' }}>{error}</p>}

        {/* Parsed preview */}
        {parsedPreview && (
          <div style={{ marginTop: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>{parsedPreview.name}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{parsedPreview.meal_type} · {parsedPreview.confidence} confidence</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{Math.round(parsedPreview.totals.calories)} kcal</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[
                { label: 'P', value: parsedPreview.totals.protein_g, color: 'var(--protein-color)' },
                { label: 'C', value: parsedPreview.totals.carbs_g, color: 'var(--carbs-color)' },
                { label: 'F', value: parsedPreview.totals.fat_g, color: 'var(--fat-color)' },
                { label: 'Fibre', value: parsedPreview.totals.fibre_g, color: 'var(--fibre-color)' },
              ].map(m => (
                <span key={m.label} style={{ padding: '3px 10px', borderRadius: '12px', background: `${m.color}20`, color: m.color, fontSize: '12px', fontWeight: '500' }}>
                  {m.label}: {Math.round(m.value)}g
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {parsedPreview.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>{item.name} <span style={{ color: 'var(--text-muted)' }}>({item.quantity})</span></span>
                  <span>{Math.round(item.calories)} kcal</span>
                </div>
              ))}
            </div>
            {parsedPreview.notes && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>💡 {parsedPreview.notes}</p>}
            <button onClick={saveMeal} disabled={saving} style={{ width: '100%', padding: '10px', background: saving ? 'var(--surface-3)' : 'var(--success)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : '✓ Save this meal'}
            </button>
          </div>
        )}
      </div>

      {/* Meals by type */}
      {MEAL_TYPES.map(type => {
        const typeMeals = mealsByType[type]
        if (!typeMeals.length) return null
        const typeTotal = typeMeals.reduce((a, m) => a + m.calories, 0)
        return (
          <div key={type} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', textTransform: 'capitalize' }}>{type}</h2>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{Math.round(typeTotal)} kcal</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {typeMeals.map(meal => (
                <div key={meal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{meal.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>P: {Math.round(meal.protein_g)}g · C: {Math.round(meal.carbs_g)}g · F: {Math.round(meal.fat_g)}g</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600' }}>{Math.round(meal.calories)} kcal</span>
                    <button onClick={() => deleteMeal(meal.id)} disabled={deleting === meal.id} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '2px' }}>
                      {deleting === meal.id ? '...' : '×'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
