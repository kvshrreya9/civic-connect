import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, CloudOff, Gauge, Loader2, Phone, Save, Send, Users } from 'lucide-react'
import CategorySelect from './CategorySelect.jsx'
import ImageUpload from './ImageUpload.jsx'
import LocationPicker from './LocationPicker.jsx'
import AddressPreview from './AddressPreview.jsx'
import DuplicateWarning from './DuplicateWarning.jsx'
import { CATEGORIES, SEVERITIES } from '../../data/dummyData.js'
import { createComplaint, previewPriority } from '../../services/complaintService.js'
import { checkDuplicates } from '../../services/duplicateService.js'
import { previewDepartment } from '../../services/routingService.js'
import { getMunicipalityContact } from '../../services/locationService.js'
import { getErrorMessage, getFieldErrors, isRetryableError } from '../../services/api.js'
import { clearDraft, enqueueComplaint, loadDraft, saveDraft } from '../../offline/complaintQueue.js'
import { validateComplaint, hasErrors } from '../../utils/validators.js'
import { createClientId } from '../../utils/formatters.js'
import { SEVERITY_META } from '../../utils/statusUtils.js'
import useOnlineStatus from '../../hooks/useOnlineStatus.js'
import useAuth from '../../hooks/useAuth.js'

const EMPTY = {
  title: '',
  description: '',
  category: '',
  severity: 'medium',
  safety_risk: false,
  affected_count: 0,
  latitude: null,
  longitude: null,
  address: '',
}

export default function ComplaintForm() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [images, setImages] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duplicates, setDuplicates] = useState([])
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [priority, setPriority] = useState(null)
  const [department, setDepartment] = useState(null)
  const [municipalityContact, setMunicipalityContact] = useState(null)
  const [loadingMunicipalityContact, setLoadingMunicipalityContact] = useState(false)
  const [municipalityContactError, setMunicipalityContactError] = useState(false)
  const [draftStatus, setDraftStatus] = useState(null)
  const severeRisk = form.severity === 'high' || form.severity === 'critical'
  const draftLoaded = useRef(false)
  const requestIdRef = useRef(null)

  const update = useCallback((changes) => {
    setForm((prev) => ({ ...prev, ...changes }))
    setErrors((prev) => {
      const next = { ...prev }
      Object.keys(changes).forEach((key) => delete next[key])
      if ('latitude' in changes) delete next.location
      return next
    })
  }, [])

  // Restore a saved draft (including compressed photos) from IndexedDB.
  useEffect(() => {
    loadDraft()
      .then((draft) => {
        if (draft?.form) {
          setForm({ ...EMPTY, ...draft.form })
          setImages((draft.images || []).map((img) => ({ ...img, preview: URL.createObjectURL(img.blob) })))
          requestIdRef.current = draft.requestId || null
          setDraftStatus(`Draft restored from ${new Date(draft.savedAt).toLocaleString()}`)
        }
      })
      .catch(() => {})
      .finally(() => {
        draftLoaded.current = true
      })
  }, [])

  // Autosave the draft (debounced) so nothing is lost if the tab closes or the network drops.
  useEffect(() => {
    if (!draftLoaded.current) return undefined
    const isEmpty = !form.title && !form.description && !form.category && images.length === 0 && form.latitude === null
    const timer = setTimeout(() => {
      if (isEmpty) return
      saveDraft({
        form,
        images: images.map(({ id, blob, name, hash, size, originalSize }) => ({ id, blob, name, hash, size, originalSize })),
        requestId: requestIdRef.current,
      })
        .then(() => setDraftStatus(`Draft saved at ${new Date().toLocaleTimeString()}`))
        .catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [form, images])

  // Debounced duplicate check against nearby reports.
  useEffect(() => {
    const ready = online && form.category && form.latitude !== null && (form.title + form.description).trim().length >= 10
    if (!ready) {
      setDuplicates([])
      return undefined
    }
    let active = true
    setCheckingDuplicates(true)
    const timer = setTimeout(async () => {
      try {
        const result = await checkDuplicates({
          latitude: form.latitude,
          longitude: form.longitude,
          category: form.category,
          description: `${form.title} ${form.description}`,
          image_hashes: images.map((i) => i.hash).filter(Boolean),
        })
        if (active) setDuplicates(result)
      } catch {
        if (active) setDuplicates([])
      } finally {
        if (active) setCheckingDuplicates(false)
      }
    }, 900)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [online, form.category, form.latitude, form.longitude, form.title, form.description, images])

  // Live priority preview and department routing preview.
  useEffect(() => {
    if (!online) return undefined
    let active = true
    const timer = setTimeout(() => {
      previewPriority({
        severity: form.severity,
        category: form.category || 'other',
        safety_risk: form.safety_risk,
        affected_count: form.affected_count,
        latitude: form.latitude,
        longitude: form.longitude,
      })
        .then((result) => active && setPriority(result))
        .catch(() => {})
    }, 400)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [online, form.severity, form.category, form.safety_risk, form.affected_count, form.latitude, form.longitude])

  useEffect(() => {
    if (!form.category) return setDepartment(null)
    previewDepartment(form.category).then(setDepartment).catch(() => setDepartment(null))
    return undefined
  }, [form.category])

  useEffect(() => {
    const category = CATEGORIES.find((item) => item.value === form.category)
    const severity = SEVERITIES.find((item) => item.value === form.severity)
    const context = {
      category: category?.label || '',
      severity: severity?.label || '',
      title: form.title.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      affected_count: Number(form.affected_count) || 0,
      safety_risk: form.safety_risk,
      department: department?.name || department?.department || '',
      priority: priority?.score ?? null,
    }
    window.__THOZHAN_REPORT_CONTEXT__ = context
    window.dispatchEvent(new CustomEvent('thozhan:context', { detail: context }))
    return () => {
      window.__THOZHAN_REPORT_CONTEXT__ = null
      window.dispatchEvent(new CustomEvent('thozhan:context', { detail: null }))
    }
  }, [form, department, priority])

  useEffect(() => {
    if (!severeRisk || !online || form.latitude === null || form.longitude === null) {
      setMunicipalityContact(null)
      setMunicipalityContactError(false)
      setLoadingMunicipalityContact(false)
      return undefined
    }
    let active = true
    setMunicipalityContactError(false)
    setLoadingMunicipalityContact(true)
    const timer = setTimeout(() => {
      getMunicipalityContact(form.latitude, form.longitude)
        .then((contact) => active && setMunicipalityContact(contact))
        .catch(() => {
          if (!active) return
          setMunicipalityContact(null)
          setMunicipalityContactError(true)
        })
        .finally(() => active && setLoadingMunicipalityContact(false))
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [severeRisk, form.latitude, form.longitude, online])

  const payload = () => ({
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    address: (form.address || '').trim(),
    affected_count: Number(form.affected_count),
  })

  const queueForLater = async (id, reason) => {
    await enqueueComplaint({ id, payload: payload(), files: images, userId: user?.id })
    await clearDraft()
    navigate('/citizen/offline', { state: { queued: true, reason } })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const validation = validateComplaint(form)
    setErrors(validation)
    setSubmitError(null)
    if (hasErrors(validation)) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // One id per report attempt: reused across retries so the server never creates duplicates.
    if (!requestIdRef.current) requestIdRef.current = createClientId()
    const requestId = requestIdRef.current
    setSubmitting(true)
    setProgress(0)

    if (!online) {
      await queueForLater(requestId, 'offline')
      return
    }

    try {
      const result = await createComplaint(payload(), images, requestId, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
      })
      await clearDraft()
      requestIdRef.current = null
      navigate(`/citizen/complaints/${result.complaint.id}`, {
        state: { created: true, duplicates: result.duplicates, replay: result.idempotent_replay },
      })
    } catch (error) {
      if (isRetryableError(error)) {
        await queueForLater(requestId, 'network')
        return
      }
      setErrors((prev) => ({ ...prev, ...getFieldErrors(error) }))
      setSubmitError(getErrorMessage(error))
      setSubmitting(false)
    }
  }

  const discardDraft = async () => {
    await clearDraft()
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setForm(EMPTY)
    setImages([])
    setErrors({})
    setDuplicates([])
    requestIdRef.current = null
    setDraftStatus(null)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {!online && (
          <div className="flex items-start gap-3 rounded-2xl bg-navy-900 p-4 text-white">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
            <p className="text-sm">You are offline. Fill in the report as usual - it will be saved on this device and sent automatically when you reconnect.</p>
          </div>
        )}

        <section className="card space-y-5 p-5 sm:p-6">
          <div data-error={Boolean(errors.category)}>
            <CategorySelect value={form.category} onChange={(category) => update({ category })} error={errors.category} />
          </div>
          <div data-error={Boolean(errors.title)}>
            <label htmlFor="title" className="label">Short title</label>
            <input
              id="title"
              className={`input ${errors.title ? 'input-error' : ''}`}
              value={form.title}
              maxLength={160}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="e.g. Deep pothole outside the bus stop"
            />
            {errors.title && <p className="field-error">{errors.title}</p>}
          </div>
          <div data-error={Boolean(errors.description)}>
            <label htmlFor="description" className="label">What is happening?</label>
            <textarea
              id="description"
              rows={4}
              className={`input ${errors.description ? 'input-error' : ''}`}
              value={form.description}
              maxLength={4000}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Size, how long it has been there, who it affects, any danger"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              {errors.description ? <p className="field-error mt-0">{errors.description}</p> : <span />}
              <span>{form.description.length}/4000</span>
            </div>
          </div>
        </section>

        <section className="card space-y-5 p-5 sm:p-6">
          <fieldset data-error={Boolean(errors.severity)}>
            <legend className="label">How severe is it?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={form.severity === s.value}
                  onClick={() => update({ severity: s.value })}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    form.severity === s.value ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 hover:border-navy-300'
                  }`}
                >
                  <span className="block text-sm font-bold">{s.label}</span>
                  <span className={`block text-[11px] ${form.severity === s.value ? 'text-navy-200' : 'text-slate-500'}`}>{s.description}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${form.safety_risk ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-rose-600" checked={form.safety_risk} onChange={(e) => update({ safety_risk: e.target.checked })} />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-navy-900"><AlertTriangle className="h-4 w-4 text-rose-600" /> Immediate safety risk</span>
                <span className="text-xs text-slate-500">Could someone get hurt before it is fixed?</span>
              </span>
            </label>
            <div data-error={Boolean(errors.affected_count)}>
              <label htmlFor="affected" className="label flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-500" /> People affected (estimate)</label>
              <input
                id="affected"
                type="number"
                min={0}
                max={100000}
                className={`input ${errors.affected_count ? 'input-error' : ''}`}
                value={form.affected_count}
                onChange={(e) => update({ affected_count: e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))) })}
              />
              {errors.affected_count && <p className="field-error">{errors.affected_count}</p>}
            </div>
          </div>
          <ImageUpload
            images={images}
            onAdd={(img) => setImages((prev) => [...prev, img])}
            onRemove={(id) =>
              setImages((prev) => {
                const target = prev.find((i) => i.id === id)
                if (target) URL.revokeObjectURL(target.preview)
                return prev.filter((i) => i.id !== id)
              })
            }
          />
        </section>

        <section className="card space-y-4 p-5 sm:p-6" data-error={Boolean(errors.location)}>
          <LocationPicker latitude={form.latitude} longitude={form.longitude} onChange={update} error={errors.location} />
          {severeRisk && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4" role="region" aria-label="Emergency contact">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><Phone className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-rose-950">Need urgent help?</p>
                  {!online
                    ? <p className="mt-1 text-sm text-rose-800">Connect to the internet and set the issue location to find the responsible municipality’s published phone number.</p>
                    : form.latitude === null || form.longitude === null
                      ? <p className="mt-1 text-sm text-rose-800">Set the issue location to find the responsible municipality’s published phone number.</p>
                      : loadingMunicipalityContact
                        ? <p className="mt-1 text-sm text-rose-800">Finding the municipality for this location…</p>
                        : municipalityContactError
                          ? <p className="mt-1 text-sm text-rose-800">Could not load the municipality contact. Please try again or contact local emergency services.</p>
                        : municipalityContact?.contact_phone
                          ? (
                            <>
                              <p className="mt-1 text-sm text-rose-800">
                                {municipalityContact.office.name}{municipalityContact.ward ? ` · ${municipalityContact.ward.name}` : ''}
                              </p>
                              <a href={`tel:${municipalityContact.contact_phone.replace(/[^\d+]/g, '')}`}
                                 aria-label={`Call ${municipalityContact.office.name} at ${municipalityContact.contact_phone}`}
                                 className="btn-primary mt-3 inline-flex bg-rose-700 hover:bg-rose-800">
                                <Phone className="h-4 w-4" /> Call {municipalityContact.contact_phone}
                              </a>
                              <p className="mt-2 text-xs text-rose-800">Tap to open your phone app and call this office. You choose whether to place the call.</p>
                            </>
                          )
                          : (
                            <p className="mt-1 text-sm text-rose-800">
                              {municipalityContact?.office
                                ? `${municipalityContact.office.name} has not published a contact number.`
                                : 'No municipality is configured for this location yet.'}
                              {' '}For immediate danger, contact your local emergency services.
                            </p>
                          )}
                </div>
              </div>
            </div>
          )}
          <AddressPreview latitude={form.latitude} longitude={form.longitude} value={form.address} onChange={(address) => setForm((p) => ({ ...p, address }))} />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
        <section className="card p-5">
          <h3 className="flex items-center gap-2 font-display text-base font-bold"><Gauge className="h-4 w-4 text-electric-500" /> Estimated priority</h3>
          <dl className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm font-semibold text-navy-800">Severity</dt>
              <dd className={`rounded-md px-2.5 py-1 text-xs font-bold ${SEVERITY_META[form.severity]?.className || ''}`}>{SEVERITY_META[form.severity]?.label || '-'}</dd>
            </div>
            {priority?.breakdown && typeof priority.breakdown.nearby_count === 'number' && form.latitude !== null && (
              <div className="flex items-center justify-between">
                <dt className="text-sm font-semibold text-navy-800">Open similar complaints within 500 m</dt>
                <dd className="text-sm font-bold tabular-nums">{priority.breakdown.nearby_count}</dd>
              </div>
            )}
          </dl>
        </section>

        {department && (
          <section className="card flex items-start gap-3 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Building2 className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-semibold text-slate-500">This goes to</p>
              <p className="font-display font-bold text-navy-900">{department.name}</p>
            </div>
          </section>
        )}

        <DuplicateWarning candidates={duplicates} checking={checkingDuplicates} linkBuilder={(c) => `/citizen/complaints/${c.id}`} />

        <section className="card space-y-3 p-5">
          {submitError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700" role="alert">{submitError}</p>}
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={submitting}>
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : online ? <Send className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {submitting ? (progress > 0 && progress < 100 ? `Uploading ${progress}%` : 'Sending report…') : online ? 'Submit report' : 'Save and send later'}
          </button>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span aria-live="polite">{draftStatus || 'Your draft saves automatically.'}</span>
            {draftStatus && (
              <button type="button" onClick={discardDraft} className="font-semibold text-rose-600 hover:underline">Discard</button>
            )}
          </div>
        </section>
      </aside>
    </form>
  )
}
