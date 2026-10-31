import { useEffect, useState } from 'react'
import { Coffee, Lightbulb } from 'lucide-react'

const TIPS = [
  'Your match score is computed on the server, never in your browser. No shortcuts!',
  'Capitals don’t matter: python, Python and PYTHON all count as the same skill.',
  'Mention tools by name, like “FastAPI” or “PostgreSQL”. The matcher looks for the exact skills a job lists.',
  'Each skill counts once, however many times you repeat it. Keyword stuffing won’t help.',
  'Missing skills aren’t failures. They’re your learning list for this role.',
  'Jobs come straight from a real PostgreSQL database in Singapore.',
  'Almost there. The server is stretching and finding its coffee…',
]

/** True once `active` has stayed true for `ms` milliseconds. */
export function useSlow(active, ms = 4000) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) { setSlow(false); return undefined }
    const t = setTimeout(() => setSlow(true), ms)
    return () => clearTimeout(t)
  }, [active, ms])
  return slow
}

export function WakeUp() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const tip = Math.floor(seconds / 5) % TIPS.length
  const progress = Math.min(95, (seconds / 45) * 100) // never claims to be finished

  return (
    <div className="mx-auto mt-2 max-w-md rounded-xl border border-brand-100 bg-white p-5 text-center shadow-sm">
      <div role="status">
        <Coffee className="mx-auto mb-2 h-8 w-8 text-brand-500 motion-safe:animate-pulse" aria-hidden="true" />
        <p className="font-semibold text-brand-900">Waking up the server…</p>
        <p className="mt-1 text-sm text-slate-500">
          Free hosting naps when it’s quiet. This can take up to a minute, and only on the first visit.
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-500 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
      </div>
      {/* Rotating tips are decorative: hidden from screen readers so they aren't re-announced every few seconds */}
      <p aria-hidden="true" className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-left text-sm text-brand-900">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
        <span>{TIPS[tip]}</span>
      </p>
    </div>
  )
}
