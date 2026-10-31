import { screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { JOB, mockApi, renderAt, signIn } from './helpers'

const STATS = { total_jobs: 1, open_jobs: 1, total_applications: 3 }
const dash = (extra = {}) => ({ 'GET /admin/stats': STATS, 'GET /admin/jobs': [JOB], ...extra })

describe('staff login', () => {
  it('validates the form', async () => {
    const calls = mockApi({})
    renderAt('/admin/login')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })
  it('shows a generic error for invalid credentials', async () => {
    mockApi({ 'POST /auth/login': [401, { detail: 'Invalid email or password' }] })
    renderAt('/admin/login')
    await userEvent.type(screen.getByLabelText('Email'), 'staff@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
  it('signs in, stores the token for the session and opens the dashboard', async () => {
    mockApi(dash({ 'POST /auth/login': { access_token: 'tok-1', token_type: 'bearer', expires_in: 3600 } }))
    renderAt('/admin/login')
    await userEvent.type(screen.getByLabelText('Email'), 'staff@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('heading', { name: /staff dashboard/i })).toBeInTheDocument()
    expect(sessionStorage.getItem('archintx_token')).toBe('tok-1')
    expect(localStorage.getItem('archintx_token')).toBeNull()
  })
})

describe('protected dashboard', () => {
  it('redirects unauthenticated visitors to login and never calls admin APIs', async () => {
    const calls = mockApi(dash())
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: /staff login/i })).toBeInTheDocument()
    expect(calls).toHaveLength(0)
  })
  it('sends the bearer token and shows stats and jobs', async () => {
    signIn()
    const calls = mockApi(dash())
    renderAt('/admin')
    expect(await screen.findByText('Python Developer')).toBeInTheDocument()
    expect(await screen.findByText('Total jobs')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(calls.every((c) => c.headers.Authorization === 'Bearer tok')).toBe(true)
  })
  it('returns to login with a message when the session has expired', async () => {
    signIn()
    mockApi({ 'GET /admin/stats': [401, { detail: 'Not authenticated' }], 'GET /admin/jobs': [401, { detail: 'Not authenticated' }] })
    renderAt('/admin')
    expect(await screen.findByText(/session expired/i)).toBeInTheDocument()
    expect(sessionStorage.getItem('archintx_token')).toBeNull()
  })
  it('logs out after confirmation', async () => {
    signIn()
    mockApi(dash({ 'GET /jobs': [] }))
    renderAt('/admin')
    await screen.findByText('Python Developer')
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /log out/i }))
    expect(await screen.findByRole('heading', { name: 'Open positions' })).toBeInTheDocument()
    expect(sessionStorage.getItem('archintx_token')).toBeNull()
  })
})

describe('job create / edit', () => {
  it('validates, then creates a job and refreshes the list', async () => {
    signIn()
    let jobs = [JOB]
    const calls = mockApi({
      'GET /admin/stats': STATS,
      'GET /admin/jobs': () => jobs,
      'POST /jobs': ({ body }) => { const j = { ...body, id: 2 }; jobs = [...jobs, j]; return [201, j] },
    })
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /new job/i }))
    await userEvent.click(screen.getByRole('button', { name: /create job/i }))
    expect(screen.getByText(/at least one required skill/i)).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)

    await userEvent.type(screen.getByLabelText('Job title'), 'QA Engineer')
    await userEvent.type(screen.getByLabelText('Track / category'), 'QA')
    await userEvent.type(screen.getByLabelText('Required skills'), 'Selenium,Postman{Enter}')
    await userEvent.click(screen.getByRole('button', { name: /create job/i }))
    expect(await screen.findByText(/created “QA Engineer”/i)).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'POST').body.required_skills).toEqual(['Selenium', 'Postman'])
    expect(await screen.findByRole('heading', { name: /QA Engineer/ })).toBeInTheDocument()
  })

  it('edits an existing job with PUT', async () => {
    signIn()
    const calls = mockApi(dash({ 'PUT /jobs/1': ({ body }) => ({ ...JOB, ...body }) }))
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /edit python developer/i }))
    const title = screen.getByLabelText('Job title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Senior Python Developer')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/updated “Senior Python Developer”/i)).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'PUT').body.title).toBe('Senior Python Developer')
  })

  it('asks for confirmation before closing a job', async () => {
    signIn()
    const calls = mockApi(dash({ 'PUT /jobs/1': ({ body }) => ({ ...JOB, ...body }) }))
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /edit python developer/i }))
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'closed')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /close job/i }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT').body.status).toBe('closed'))
  })

  it('shows server validation errors', async () => {
    signIn()
    mockApi(dash({ 'PUT /jobs/1': [422, { detail: [{ loc: ['body', 'title'], msg: 'Value error, bad title' }] }] }))
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /edit python developer/i }))
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('bad title')).toBeInTheDocument()
  })
})

describe('applications list', () => {
  const app = { id: 'a1', applicant_name: 'Asha Rao', applicant_email: 'asha@example.com', job_id: 1, match_score: 80, matched_skills: ['Python', 'Git'], missing_skills: ['PostgreSQL'], created_at: '2026-11-01T10:00:00Z', resume_text: '<img src=x onerror=alert(1)><script>alert(2)</script> I know Python' }

  it('shows applicants with scores and renders resume text as escaped text', async () => {
    signIn()
    mockApi(dash({ 'GET /admin/applications?job_id=1': [app] }))
    const { container } = renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /view applications for python developer/i }))
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('asha@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Match score 80 percent')).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: /applications — python developer/i })
    expect(within(panel).getByText('PostgreSQL')).toBeInTheDocument()
    const pre = container.querySelector('pre')
    expect(pre.textContent).toContain('<script>alert(2)</script>')
    expect(container.querySelector('pre script, pre img')).toBeNull()
  })
  it('scrolls the applications panel into view when a job is selected', async () => {
    signIn()
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    mockApi(dash({ 'GET /admin/applications?job_id=1': [] }))
    renderAt('/admin')
    expect(scroll).not.toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: /view applications for/i }))
    await screen.findByText(/no applications yet/i)
    expect(scroll).toHaveBeenCalledTimes(1)
    delete Element.prototype.scrollIntoView
  })
  it('shows an empty state when there are no applications', async () => {
    signIn()
    mockApi(dash({ 'GET /admin/applications?job_id=1': [] }))
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /view applications for/i }))
    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument()
  })
  it('shows an error state', async () => {
    signIn()
    mockApi(dash({ 'GET /admin/applications?job_id=1': [500, { detail: 'db down' }] }))
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /view applications for/i }))
    expect(await screen.findByText('db down')).toBeInTheDocument()
  })
})
