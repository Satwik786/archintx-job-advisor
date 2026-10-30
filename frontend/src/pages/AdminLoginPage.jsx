import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { validateLogin } from '../utils/validation'
import { ErrorBox, Field } from '../components/ui'

export default function AdminLoginPage() {
  const { login, isAuthenticated, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/admin" replace />
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    const v = validateLogin(form)
    setErrors(v)
    setApiError(null)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (err) {
      setApiError(err.status === 401 ? { message: 'Invalid email or password.' } : err)
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={onSubmit} noValidate className="card space-y-5" aria-label="Staff login">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Staff login</h1>
          <p className="text-sm text-slate-500">Sign in to manage jobs and review applications.</p>
        </div>
        {notice && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        {apiError && <ErrorBox error={apiError} />}
        <Field id="email" label="Email" error={errors.email}>
          <input id="email" type="email" autoComplete="username" className="input" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} />
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          <input id="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={set('password')} aria-invalid={!!errors.password} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={busy}><LogIn className="h-4 w-4" aria-hidden="true" /> {busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
