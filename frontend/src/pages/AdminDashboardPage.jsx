import { useEffect, useRef, useState } from 'react'
import { Briefcase, FileText, Pencil, Plus, Users } from 'lucide-react'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import JobFormModal from '../components/JobFormModal'
import { Empty, ErrorBox, Notice, SkillChip, Spinner } from '../components/ui'

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4">
      <span className="rounded-lg bg-brand-50 p-3 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <div><p className="text-2xl font-bold text-slate-900">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
    </div>
  )
}

function ApplicationsPanel({ job }) {
  const { data: apps, error, loading, reload } = useAsync(() => api.adminApplications(job.id), [job.id])
  const sectionRef = useRef(null)
  const headingRef = useRef(null)

  // Bring the panel into view when a job is selected (it renders below the jobs list,
  // which is off-screen on phones). Keyed on job.id so saving an edit does not re-scroll.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    sectionRef.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    headingRef.current?.focus({ preventScroll: true }) // announce the new section to screen readers
  }, [job.id])

  return (
    <section ref={sectionRef} className="mt-8 scroll-mt-4" aria-labelledby="apps-h">
      <h2 id="apps-h" ref={headingRef} tabIndex={-1} className="mb-3 text-xl font-bold text-brand-900 focus:outline-none">Applications — {job.title}</h2>
      {loading && <Spinner label="Loading applications…" />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {apps && apps.length === 0 && <Empty title="No applications yet">Applications for this job will appear here.</Empty>}
      {apps && apps.length > 0 && (
        <ul className="space-y-4">
          {apps.map((a) => (
            <li key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {/* React escapes all text: resume content can never execute as HTML */}
                  <p className="break-words font-semibold text-slate-900">{a.applicant_name}</p>
                  <p className="break-all text-sm text-slate-500">{a.applicant_email}</p>
                </div>
                <span className="rounded-full bg-brand-900 px-3 py-1 text-sm font-bold text-white" aria-label={`Match score ${a.match_score} percent`}>{a.match_score}%</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-emerald-700">Matched</p>
                  <div className="flex flex-wrap gap-1.5">{a.matched_skills.length ? a.matched_skills.map((s) => <SkillChip key={s} variant="matched">{s}</SkillChip>) : <span className="text-sm text-slate-400">None</span>}</div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-amber-700">Missing</p>
                  <div className="flex flex-wrap gap-1.5">{a.missing_skills.length ? a.missing_skills.map((s) => <SkillChip key={s} variant="missing">{s}</SkillChip>) : <span className="text-sm text-slate-400">None</span>}</div>
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-700">View resume text</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{a.resume_text}</pre>
              </details>
              <p className="mt-2 text-xs text-slate-400">Applied {new Date(a.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function AdminDashboardPage() {
  const stats = useAsync(api.adminStats)
  const jobs = useAsync(api.adminJobs)
  const [editor, setEditor] = useState(null) // null | 'new' | job
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')

  function onSaved(job, wasEdit) {
    setEditor(null)
    setNotice(wasEdit ? `Updated “${job.title}”.` : `Created “${job.title}”.`)
    jobs.reload(); stats.reload()
    if (selected?.id === job.id) setSelected(job)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">Staff dashboard</h1>
        <button className="btn-primary" onClick={() => { setNotice(''); setEditor('new') }}><Plus className="h-4 w-4" aria-hidden="true" /> New job</button>
      </div>
      <Notice onClose={() => setNotice('')}>{notice}</Notice>

      {stats.error ? <div className="my-4"><ErrorBox error={stats.error} onRetry={stats.reload} /></div> : stats.data && (
        <div className="my-4 grid gap-4 sm:grid-cols-3">
          <Stat icon={Briefcase} label="Total jobs" value={stats.data.total_jobs} />
          <Stat icon={FileText} label="Open jobs" value={stats.data.open_jobs} />
          <Stat icon={Users} label="Applications" value={stats.data.total_applications} />
        </div>
      )}

      <h2 className="mb-3 mt-6 text-xl font-bold text-brand-900">Job postings</h2>
      {jobs.loading && <Spinner label="Loading jobs…" />}
      {jobs.error && <ErrorBox error={jobs.error} onRetry={jobs.reload} />}
      {jobs.data && jobs.data.length === 0 && <Empty title="No jobs yet">Create your first job posting.</Empty>}
      {jobs.data && jobs.data.length > 0 && (
        <ul className="space-y-3">
          {jobs.data.map((job) => (
            <li key={job.id} className={`card ${selected?.id === job.id ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{job.title}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${job.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{job.status}</span>
                  </h3>
                  <p className="text-sm text-slate-500">{job.track}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Skills for ${job.title}`}>{job.required_skills.map((s) => <li key={s}><SkillChip>{s}</SkillChip></li>)}</ul>
                </div>
                <div className="flex gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                  <button className="btn-secondary" onClick={() => { setNotice(''); setEditor(job) }} aria-label={`Edit ${job.title}`}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit</button>
                  <button className="btn-primary" onClick={() => setSelected(job)} aria-label={`View applications for ${job.title}`}><Users className="h-4 w-4" aria-hidden="true" /> Applications</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selected && <ApplicationsPanel job={selected} />}
      {editor && <JobFormModal job={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSaved={onSaved} />}
    </>
  )
}
