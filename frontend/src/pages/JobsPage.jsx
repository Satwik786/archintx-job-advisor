import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase } from 'lucide-react'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { Empty, ErrorBox, SkillChip, Spinner } from '../components/ui'

export default function JobsPage() {
  const { data: jobs, error, loading, reload } = useAsync(api.getJobs)
  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-brand-900">Open positions</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Apply with your resume and instantly see which required skills you already show and which ones to pick up.</p>
      </section>
      {loading && <Spinner label="Loading jobs…" />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {jobs && jobs.length === 0 && <Empty title="No open positions right now">Please check back soon.</Empty>}
      {jobs && jobs.length > 0 && (
        <ul className="grid gap-5 md:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id} className="card flex flex-col">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-brand-50 p-2 text-brand-700"><Briefcase className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{job.title}</h2>
                  <p className="text-sm text-slate-500">{job.track}</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Required skills</p>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Required skills for ${job.title}`}>
                {job.required_skills.map((s) => <li key={s}><SkillChip>{s}</SkillChip></li>)}
              </ul>
              <Link to={`/apply/${job.id}`} className="btn-primary mt-5 self-start" aria-label={`Apply for ${job.title}`}>
                Apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
