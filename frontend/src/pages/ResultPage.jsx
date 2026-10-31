import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { ErrorBox, SkillChip, Spinner } from '../components/ui'

function ScoreRing({ score }) {
  const r = 52, c = 2 * Math.PI * r
  const color = score >= 75 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626'
  return (
    <div className="relative h-36 w-36" role="img" aria-label={`Match score ${score} percent`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-slate-900">{score}%</span>
    </div>
  )
}

export default function ResultPage() {
  const { applicationId } = useParams()
  const { data: r, error, loading, reload } = useAsync(() => api.getResult(applicationId), [applicationId])

  if (loading) return <Spinner label="Loading your result…" />
  if (error) return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ErrorBox error={error.status === 404 ? { message: 'We could not find this application result.' } : error} onRetry={error.status === 404 ? undefined : reload} />
      <Link to="/" className="btn-secondary"><ArrowLeft className="h-4 w-4" /> Back to jobs</Link>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
        <ScoreRing score={r.match_score} />
        <div>
          <p className="text-sm font-medium text-slate-500">Application submitted for</p>
          <h1 className="break-words text-2xl font-bold text-brand-900">{r.job_title}</h1>
          <p className="mt-2 text-slate-600">
            You match <strong>{r.matched_skills.length}</strong> of <strong>{r.matched_skills.length + r.missing_skills.length}</strong> required skills.
          </p>
        </div>
      </section>

      <section className="card" aria-labelledby="matched-h">
        <h2 id="matched-h" className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Skills found in your resume</h2>
        {r.matched_skills.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">{r.matched_skills.map((s) => <li key={s}><SkillChip variant="matched">{s}</SkillChip></li>)}</ul>
        ) : <p className="mt-3 text-sm text-slate-500">None of the required skills were found in your resume.</p>}
      </section>

      <section className="card" aria-labelledby="missing-h">
        <h2 id="missing-h" className="flex items-center gap-2 font-semibold text-amber-800"><BookOpen className="h-5 w-5" aria-hidden="true" /> Skills to pick up for this role</h2>
        {r.missing_skills.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">{r.missing_skills.map((s) => <li key={s}><SkillChip variant="missing">{s}</SkillChip></li>)}</ul>
        ) : <p className="mt-3 text-sm text-slate-500">Great news — you cover every required skill.</p>}
      </section>

      <Link to="/" className="btn-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to jobs</Link>
    </div>
  )
}
