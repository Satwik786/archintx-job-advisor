import { act, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { JOB, renderAt } from './helpers'
import { api, retryConfig } from '../services/api'

describe('cold-start handling', () => {
  it('shows the wake-up card only when loading is slow', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // never resolves
    renderAt('/')
    expect(screen.queryByText(/waking up the server/i)).toBeNull()
    await act(async () => { vi.advanceTimersByTime(4100) })
    expect(screen.getByText(/waking up the server/i)).toBeInTheDocument()
  })

  it('retries GET requests while the server wakes up', async () => {
    const saved = retryConfig.delays
    retryConfig.delays = [0, 0, 0]
    let calls = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      calls += 1
      if (calls < 3) throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify([JOB]), { status: 200 })
    }))
    renderAt('/')
    expect(await screen.findByText('Python Developer')).toBeInTheDocument()
    expect(calls).toBe(3)
    retryConfig.delays = saved
  })

  it('never retries POST requests (no duplicate applications)', async () => {
    const saved = retryConfig.delays
    retryConfig.delays = [0, 0, 0]
    const f = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    vi.stubGlobal('fetch', f)
    await expect(api.apply({ applicant_name: 'A B', applicant_email: 'a@b.co', resume_text: 'x'.repeat(30), job_id: 1 })).rejects.toThrow(/cannot reach/i)
    expect(f).toHaveBeenCalledTimes(1)
    retryConfig.delays = saved
  })
})
