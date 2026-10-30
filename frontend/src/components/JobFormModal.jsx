import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../services/api'
import { validateJob } from '../utils/validation'
import { ConfirmDialog, ErrorBox, Field, SkillChip } from './ui'

function SkillsInput({ skills, onChange, error }) {
  const [text, setText] = useState('')
  function add(raw) {
    const next = [...skills]
    raw.split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean).forEach((s) => {
      if (!next.some((x) => x.toLowerCase() === s.toLowerCase())) next.push(s)
    })
    onChange(next)
    setText('')
  }
  return (
    <Field id="skills" label="Required skills" error={error} hint="Type a skill and press Enter or comma.">
      <div className="mb-2 flex flex-wrap gap-2">
        {skills.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-900">
            {s}
            <button type="button" aria-label={`Remove ${s}`} className="rounded-full p-0.5 hover:bg-brand-500/20" onClick={() => onChange(skills.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <input id="skills" className="input" value={text} aria-invalid={!!error}
        onChange={(e) => setText(e.target.value)} onBlur={() => text.trim() && add(text)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (text.trim()) add(text) } }} />
    </Field>
  )
}

export default function JobFormModal({ job, onClose, onSaved }) {
  const editing = !!job
  const [form, setForm] = useState({ title: job?.title ?? '', track: job?.track ?? '', skills: job?.required_skills ?? [], status: job?.status ?? 'open' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    setBusy(true)
    setApiError(null)
    const payload = { title: form.title.trim(), track: form.track.trim(), required_skills: form.skills, status: form.status }
    try {
      const saved = editing ? await api.updateJob(job.id, payload) : await api.createJob(payload)
      onSaved(saved, editing)
    } catch (err) {
      setErrors(err.fieldErrors || {})
      setApiError(err)
      setBusy(false)
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    const v = validateJob(form)
    setErrors(v)
    if (Object.keys(v).length) return
    if (editing && job.status === 'open' && form.status === 'closed') return setConfirmClose(true)
    save()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="job-form-title" onSubmit={onSubmit} noValidate className="my-8 w-full max-w-lg space-y-5 rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 id="job-form-title" className="text-xl font-bold text-brand-900">{editing ? 'Edit job' : 'Create job'}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {apiError && !Object.keys(errors).length && <ErrorBox error={apiError} />}
        <Field id="title" label="Job title" error={errors.title}>
          <input id="title" className="input" autoFocus value={form.title} onChange={set('title')} aria-invalid={!!errors.title} />
        </Field>
        <Field id="track" label="Track / category" error={errors.track}>
          <input id="track" className="input" value={form.track} onChange={set('track')} aria-invalid={!!errors.track} />
        </Field>
        <SkillsInput skills={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} error={errors.required_skills} />
        <Field id="status" label="Status">
          <select id="status" className="input" value={form.status} onChange={set('status')}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create job'}</button>
        </div>
      </form>
      {confirmClose && (
        <ConfirmDialog danger title="Close this job?" message="Closed jobs disappear from the public list and stop accepting applications." confirmLabel="Close job"
          onCancel={() => setConfirmClose(false)} onConfirm={() => { setConfirmClose(false); save() }} />
      )}
    </div>
  )
}
