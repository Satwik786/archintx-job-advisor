import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { validateApplication } from '../utils/validation'
import { ErrorBox, Field, SkillChip, Spinner } from '../components/ui'
import { useSlow, WakeUp } from '../components/WakeUp'

export default function ApplyPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const job = useAsync(() => api.getJob(jobId), [jobId])
  const allJobs = useAsync(api.getJobs)
  const [form, setForm] = useState({ name: '', email: '', resume: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const slowSubmit = useSlow(submitting, 6000)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const invalid = (id, key) => ({ id, 'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `${id}-error` : undefined })

  async function onSubmit(e) {
    e.preventDefault()
    if (submitting) return // guard against double submit
    const v = validateApplication(form)
    setErrors(v)
    setSubmitError(null)
    if (Object.keys(v).length) return
    setSubmitting(true)
    try {
      const res = await api.apply({
        applicant_name: form.name.trim(), applicant_email: form.email.trim(),
        resume_text: form.resume, job_id: Number(jobId),
      })
      navigate(`/results/${res.application_id}`)
    } catch (err) {
      setErrors(err.fieldErrors ? { ...err.fieldErrors } : {})
      setSubmitError(err)
      setSubmitting(false)
    }
  }

  if (job.loading) return <Spinner label="Loading job…" />
  if (job.error) return (
    <div className="space-y-4">
      <ErrorBox error={job.error.status === 404 ? { message: 'This job does not exist or is no longer open.' } : job.error} onRetry={job.error.status === 404 ? undefined : job.reload} />
      <Link to="/" className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to jobs</Link>
    </div>
  )
  const j = job.data

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-5">
      <aside className="card h-fit lg:col-span-2">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All jobs</Link>
        <h1 className="break-words text-2xl font-bold text-brand-900">{j.title}</h1>
        <p className="text-sm text-slate-500">{j.track}</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p>
        <ul className="mt-2 flex flex-wrap gap-2">{j.required_skills.map((s) => <li key={s}><SkillChip>{s}</SkillChip></li>)}</ul>
      </aside>

      <form onSubmit={onSubmit} noValidate className="card space-y-5 lg:col-span-3" aria-label="Job application">
        <h2 className="text-lg font-semibold">Your application</h2>
        {submitError && !Object.keys(errors).length && <ErrorBox error={submitError} />}
        <Field id="job" label="Applying for">
          <select id="job" className="input" value={jobId} onChange={(e) => navigate(`/apply/${e.target.value}`)} disabled={submitting}>
            {(allJobs.data || [j]).map((o) => <option key={o.id} value={o.id}>{o.title} — {o.track}</option>)}
          </select>
        </Field>
        <Field id="name" label="Full name" error={errors.applicant_name}>
          <input {...invalid('name', 'applicant_name')} className="input" autoComplete="name" value={form.name} onChange={set('name')} disabled={submitting} />
        </Field>
        <Field id="email" label="Email" error={errors.applicant_email}>
          <input {...invalid('email', 'applicant_email')} type="email" className="input" autoComplete="email" value={form.email} onChange={set('email')} disabled={submitting} />
        </Field>
        <Field id="resume" label="Resume text" error={errors.resume_text} hint="Paste your resume as plain text. Mention the tools and technologies you have used.">
          <textarea {...invalid('resume', 'resume_text')} rows={10} className="input font-mono" value={form.resume} onChange={set('resume')} disabled={submitting} />
        </Field>
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
          <Send className="h-4 w-4" aria-hidden="true" /> {submitting ? 'Analysing your resume…' : 'Submit application'}
        </button>
        {slowSubmit && <WakeUp />}
      </form>
    </div>
  )
}
