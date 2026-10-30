// All data on screen comes from this module -> the FastAPI backend.
const BASE = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message, fieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// AuthProvider registers these so api.js can read the token and react to expiry.
let authHooks = { getToken: () => null, onExpire: () => {} }
export const setAuthHooks = (h) => { authHooks = h }

function parseError(status, data) {
  const d = data?.detail
  if (typeof d === 'string') return new ApiError(status, d)
  if (Array.isArray(d)) {
    const fieldErrors = {}
    d.forEach((e) => {
      const field = e.loc?.[e.loc.length - 1]
      if (field !== undefined && !(field in fieldErrors)) fieldErrors[field] = String(e.msg).replace(/^Value error, /, '')
    })
    return new ApiError(status, 'Please fix the highlighted fields.', fieldErrors)
  }
  return new ApiError(status, 'Something went wrong. Please try again.')
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  if (!BASE) throw new ApiError(0, 'API URL is not configured (set VITE_API_URL).')
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${authHooks.getToken() ?? ''}`
  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (res.ok) return data
  if (auth && res.status === 401) {
    authHooks.onExpire()
    throw new ApiError(401, 'Your session has expired. Please sign in again.')
  }
  throw parseError(res.status, data)
}

export const api = {
  getJobs: () => request('/jobs'),
  getJob: (id) => request(`/jobs/${id}`),
  apply: (payload) => request('/applications', { method: 'POST', body: payload }),
  getResult: (id) => request(`/applications/${encodeURIComponent(id)}`),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  adminJobs: () => request('/admin/jobs', { auth: true }),
  adminStats: () => request('/admin/stats', { auth: true }),
  adminApplications: (jobId) => request(`/admin/applications?job_id=${jobId}`, { auth: true }),
  createJob: (job) => request('/jobs', { method: 'POST', body: job, auth: true }),
  updateJob: (id, job) => request(`/jobs/${id}`, { method: 'PUT', body: job, auth: true }),
}
