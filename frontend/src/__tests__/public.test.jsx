import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JOB, mockApi, renderAt } from './helpers'

describe('jobs page', () => {
  it('loads jobs from the API', async () => {
    mockApi({ 'GET /jobs': [JOB, { ...JOB, id: 2, title: 'QA Engineer', track: 'QA', required_skills: ['Selenium'] }] })
    renderAt('/')
    expect(await screen.findByText('Python Developer')).toBeInTheDocument()
    expect(screen.getByText('QA Engineer')).toBeInTheDocument()
    expect(screen.getByText('FastAPI')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /apply for qa engineer/i })).toHaveAttribute('href', '/apply/2')
  })
  it('shows an empty state', async () => {
    mockApi({ 'GET /jobs': [] })
    renderAt('/')
    expect(await screen.findByText(/no open positions/i)).toBeInTheDocument()
  })
  it('shows an error state with retry', async () => {
    mockApi({ 'GET /jobs': [500, { detail: 'boom' }] })
    renderAt('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})

describe('apply flow', () => {
  const routes = (extra = {}) => ({ 'GET /jobs/1': JOB, 'GET /jobs': [JOB], ...extra })

  it('validates required fields and does not call the API', async () => {
    const calls = mockApi(routes())
    renderAt('/apply/1')
    await userEvent.click(await screen.findByRole('button', { name: /submit application/i }))
    expect(screen.getByText(/full name/i, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/paste your resume/i)).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('submits once, then shows the saved result from the backend', async () => {
    const result = { application_id: 'abc-123', job_id: 1, job_title: 'Python Developer', match_score: 80, matched_skills: ['Python', 'FastAPI', 'Git', 'REST API'], missing_skills: ['PostgreSQL'] }
    const calls = mockApi(routes({ 'POST /applications': [201, result], 'GET /applications/abc-123': result }))
    renderAt('/apply/1')
    await userEvent.type(await screen.findByLabelText('Full name'), 'Asha Rao')
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com')
    await userEvent.type(screen.getByLabelText('Resume text'), 'Python, FastAPI, Git and REST APIs experience')
    const btn = screen.getByRole('button', { name: /submit application/i })
    await userEvent.dblClick(btn)
    expect(await screen.findByText('Skills to pick up for this role')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /match score 80 percent/i })).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    expect(screen.getByText('REST API')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1) // no duplicate submit
    expect(calls.find((c) => c.method === 'POST').body).toMatchObject({ applicant_name: 'Asha Rao', job_id: 1 })
    expect(screen.getByRole('link', { name: /back to jobs/i })).toHaveAttribute('href', '/')
  })

  it('shows API errors', async () => {
    mockApi(routes({ 'POST /applications': [409, { detail: 'This job is no longer accepting applications' }] }))
    renderAt('/apply/1')
    await userEvent.type(await screen.findByLabelText('Full name'), 'Asha Rao')
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com')
    await userEvent.type(screen.getByLabelText('Resume text'), 'Python, FastAPI, Git and REST APIs experience')
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer accepting/i)
    expect(screen.getByRole('button', { name: /submit application/i })).toBeEnabled()
  })

  it('handles a job that does not exist', async () => {
    mockApi({ 'GET /jobs/9': [404, { detail: 'Job not found' }], 'GET /jobs': [] })
    renderAt('/apply/9')
    expect(await screen.findByRole('alert')).toHaveTextContent(/does not exist/i)
  })
})

describe('result page', () => {
  it('handles unknown application ids', async () => {
    mockApi({ 'GET /applications/nope': [404, { detail: 'Application not found' }] })
    renderAt('/results/nope')
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not find/i)
  })
  it('shows a perfect-match message only when nothing is missing', async () => {
    mockApi({ 'GET /applications/x': { application_id: 'x', job_id: 1, job_title: 'QA', match_score: 100, matched_skills: ['A'], missing_skills: [] } })
    renderAt('/results/x')
    expect(await screen.findByText(/cover every required skill/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('img', { name: /100 percent/i })).toBeInTheDocument())
  })
})
