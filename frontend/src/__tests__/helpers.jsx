import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App'
import { AuthProvider } from '../hooks/useAuth'

/** Stubs fetch only (the network boundary). routes: { 'GET /jobs': body | (req) => [status, body] } */
export function mockApi(routes) {
  const calls = []
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const path = new URL(url).pathname + new URL(url).search
    const method = opts.method || 'GET'
    const body = opts.body ? JSON.parse(opts.body) : undefined
    calls.push({ method, path, body, headers: opts.headers })
    const key = Object.keys(routes).find((k) => k === `${method} ${path}`) || Object.keys(routes).find((k) => k === `${method} ${path.split('?')[0]}`)
    if (!key) return new Response(JSON.stringify({ detail: `unmocked ${method} ${path}` }), { status: 500 })
    let out = routes[key]
    if (typeof out === 'function') out = out({ body, headers: opts.headers })
    const [status, data] = Array.isArray(out) && typeof out[0] === 'number' ? out : [200, out]
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  }))
  return calls
}

export function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  )
}

export const JOB = { id: 1, title: 'Python Developer', track: 'Backend', required_skills: ['Python', 'FastAPI', 'PostgreSQL', 'Git', 'REST API'], status: 'open' }
export const signIn = () => sessionStorage.setItem('archintx_token', 'tok')
