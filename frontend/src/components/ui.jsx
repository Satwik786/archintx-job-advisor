import { AlertCircle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react'

export function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 sm:flex-row sm:items-center">
      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
    </div>
  )
}

export function Notice({ children, onClose }) {
  if (!children) return null
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{children}</span>
      {onClose && <button aria-label="Dismiss" onClick={onClose}><X className="h-4 w-4" /></button>}
    </div>
  )
}

export function Field({ id, label, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export function SkillChip({ children, variant = 'neutral' }) {
  const styles = {
    neutral: 'bg-brand-100 text-brand-900',
    matched: 'bg-emerald-100 text-emerald-800',
    missing: 'bg-amber-100 text-amber-900',
  }
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[variant]}`}>{children}</span>
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
