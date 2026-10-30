import { CheckCircle2, FileUp, MapPin, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/services/api/axios'
import { useImportWards } from '../hooks/useAdmin'
import { guessFields, parseBoundary } from '../lib/wardGeo'
import { BoundaryPreview } from './BoundaryPreview'
import { Field, blankToNull } from './shared'

const BIG = 150_000 // past this, a textarea is just slow: show a file summary instead

const PLACEHOLDER = `Paste a GeoJSON boundary, or the wards INSERT statement:

{"type":"Polygon","coordinates":[[[73.82,18.53],[73.83,18.53],…]]}

INSERT INTO wards (ward_code, name, city, source, boundary)
VALUES ('PMC-01', 'Admin Ward 01 Aundh', 'Pune', '…', ST_SetSRID(ST_GeomFromGeoJSON('{…}'), 4326));`

function Step({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">{n}</span>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

export function WardImportDialog({ onClose }: { onClose: () => void }) {
  const save = useImportWards()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [drag, setDrag] = useState(false)
  const [f, setF] = useState({ code: '', name: '', city: '', source: '', nameField: 'name', codeField: '', codePrefix: 'WARD-' })
  const [replace, setReplace] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const parsed = useMemo(() => parseBoundary(text), [text])
  const data = parsed?.ok ? parsed.data : null
  const single = data?.features.length === 1
  const guess = useMemo(() => (data ? guessFields(data.features) : null), [data])
  const signature = data ? `${data.features.length}:${data.points}` : ''

  // when new boundary data is loaded, prefill the form from what it contains
  useEffect(() => {
    if (!guess) return
    setF((s) => ({
      ...s,
      code: guess.code, name: guess.name, city: guess.city || s.city, source: guess.source || s.source,
      nameField: guess.nameField, codeField: guess.codeField,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const load = async (file: File) => {
    setFileName(file.name)
    setText(await file.text())
  }
  const clear = () => { setText(''); setFileName('') }

  const submit = () => {
    if (!data) return
    if (single && !f.name.trim()) return
    if (replace && !confirm('Replace ALL existing wards with this import? Wards not in this data will be removed.')) return
    const features = single
      ? [{ ...data.features[0], properties: { ...data.features[0].properties, name: f.name.trim(), code: f.code.trim() } }]
      : data.features
    save.mutate({
      geojson: { type: 'FeatureCollection', features },
      name_field: single ? 'name' : f.nameField.trim() || 'name',
      code_field: single ? (f.code.trim() ? 'code' : null) : blankToNull(f.codeField),
      code_prefix: f.codePrefix.trim() || 'WARD-',
      city: blankToNull(f.city),
      source: blankToNull(f.source) ?? (fileName || null),
      replace,
    }, { onSuccess: onClose })
  }

  const count = data?.features.length ?? 0
  const ready = !!data && (!single || !!f.name.trim())

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Add ward boundary"
      description="Upload or paste the boundary, check it on the map, then import."
      className="max-w-5xl"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        {/* ── left: input + details ─────────────────────────────── */}
        <div className="space-y-5">
          <section>
            <Step n={1} title="Boundary data" hint="GeoJSON (.geojson / .json) or the wards INSERT SQL (.sql / .txt)" />
            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); const file = e.dataTransfer.files[0]; if (file) load(file) }}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors',
                drag ? 'border-brand bg-brand-soft' : 'hover:bg-muted',
              )}
            >
              <input type="file" accept=".geojson,.json,.sql,.txt,application/json,text/plain" className="sr-only"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) load(file); e.target.value = '' }} />
              <FileUp className="size-6 text-muted-foreground" />
              <p className="text-sm font-semibold">{fileName || 'Drop a file here, or click to browse'}</p>
              <p className="text-xs text-muted-foreground">{fileName ? 'Click to choose a different file' : 'or paste the text below'}</p>
            </label>

            {text.length > BIG ? (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span>Large file loaded · {(text.length / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={clear} className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"><Trash2 className="size-3" /> Clear</button>
              </div>
            ) : (
              <div className="relative mt-2">
                <Textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); setFileName('') }}
                  placeholder={PLACEHOLDER}
                  spellCheck={false}
                  className="h-32 resize-y font-mono text-[11px] leading-relaxed"
                  aria-label="Boundary data"
                />
                {text && <button type="button" onClick={clear} aria-label="Clear" className="absolute right-2 top-2 rounded-md bg-card/90 p-1 text-muted-foreground hover:text-foreground"><Trash2 className="size-3.5" /></button>}
              </div>
            )}

            {parsed && (
              <p className={cn('mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium', parsed.ok ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger')} role="status">
                {parsed.ok ? <CheckCircle2 className="mt-px size-4 shrink-0" /> : <TriangleAlert className="mt-px size-4 shrink-0" />}
                <span>
                  {parsed.ok
                    ? `Read ${parsed.data.features.length} ward${parsed.data.features.length === 1 ? '' : 's'} · ${parsed.data.points.toLocaleString()} boundary points · from ${parsed.data.kind}`
                    : parsed.error}
                </span>
              </p>
            )}
          </section>

          <section className={cn('transition-opacity', !data && 'pointer-events-none opacity-45')}>
            <Step n={2} title={single ? 'Ward details' : `Import settings · ${count} wards`} hint={data ? undefined : 'Available once the boundary is read'} />
            {single ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ward code"><Input value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="PMC-01" className="font-mono" /></Field>
                <Field label="Ward name *"><Input required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Admin Ward 01 Aundh" /></Field>
                <Field label="City"><Input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Pune" /></Field>
                <Field label="Source"><Input value={f.source} onChange={(e) => set('source', e.target.value)} placeholder="pune_admin_wards_2017.geojson" /></Field>
                <p className="text-xs text-muted-foreground sm:col-span-2">Leave the code empty to let the server generate one ({f.codePrefix || 'WARD-'}01, …).</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name property *"><Input value={f.nameField} onChange={(e) => set('nameField', e.target.value)} className="font-mono" /></Field>
                  <Field label="Code property (optional)"><Input value={f.codeField} onChange={(e) => set('codeField', e.target.value)} placeholder="auto-generate" className="font-mono" /></Field>
                  <Field label="Code prefix (if generated)"><Input value={f.codePrefix} onChange={(e) => set('codePrefix', e.target.value)} className="font-mono" /></Field>
                  <Field label="City"><Input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="Pune" /></Field>
                  <div className="sm:col-span-2"><Field label="Source"><Input value={f.source} onChange={(e) => set('source', e.target.value)} placeholder={fileName || 'dataset name'} /></Field></div>
                </div>
                {guess && guess.keys.length > 0 && (
                  <div>
                    <Label>Properties found in the file (click to use as name)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {guess.keys.map((k) => (
                        <button key={k} type="button" onClick={() => set('nameField', k)}
                          className={cn('rounded-full border px-2.5 py-0.5 font-mono text-xs hover:bg-muted', f.nameField === k && 'border-brand bg-brand-soft font-semibold')}>{k}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <label className={cn('mt-4 flex items-start gap-3 rounded-xl border p-3', replace && 'border-danger/50 bg-danger-soft')}>
              <Switch checked={replace} onCheckedChange={setReplace} />
              <span className="text-sm">
                <span className="font-semibold">Replace all existing wards</span>
                <span className="block text-xs text-muted-foreground">Off: new wards are added or updated and the rest are kept. On: everything not in this import is removed.</span>
              </span>
            </label>
          </section>
        </div>

        {/* ── right: map preview ───────────────────────────────── */}
        <div className="flex min-h-80 flex-col">
          <Step n={3} title="Preview" hint="Check the outline sits on the right part of the city" />
          <div className="relative min-h-64 flex-1 overflow-hidden rounded-xl border bg-muted">
            {data ? (
              <BoundaryPreview features={data.features} bounds={data.bounds} signature={signature} />
            ) : (
              <div className="grid size-full place-items-center p-6 text-center text-muted-foreground">
                <div>
                  <MapPin className="mx-auto mb-2 size-8" />
                  <p className="text-sm font-semibold">No boundary yet</p>
                  <p className="text-xs">The ward outline appears here as soon as the data is valid.</p>
                </div>
              </div>
            )}
          </div>
          {data && !single && (
            <p className="mt-2 truncate text-xs text-muted-foreground">
              Includes: {data.features.slice(0, 4).map((x) => String(x.properties[f.nameField] ?? '—')).join(' · ')}{count > 4 ? ` · +${count - 4} more` : ''}
            </p>
          )}
        </div>
      </div>

      {save.isError && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {getErrorMessage(save.error)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!ready} loading={save.isPending} variant={replace ? 'solidDanger' : 'default'}>
          {replace ? 'Replace and import' : single ? 'Add ward' : `Import ${count || ''} wards`}
        </Button>
      </div>
    </Dialog>
  )
}
