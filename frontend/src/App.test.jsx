import '@testing-library/jest-dom/vitest'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TRACE-X app', () => {
  it('renders the login screen', () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<App />)
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it('creates an incident through the API and opens its case workspace', async () => {
    const createdCase = {
      id: `DF-${new Date().getUTCFullYear()}-015`,
      title: 'Suspicious PowerShell activity',
      incidentType: 'Malware',
      severity: 'High',
      status: 'Investigating',
      leadAnalyst: 'R. Jenifer',
      evidence: 0,
      lastActivity: 'Just now',
    }
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (String(url).endsWith('/api/dashboard')) {
        return {
          ok: true,
          json: async () => ({
            summary: {
              activeCases: 3,
              criticalCases: 1,
              evidenceItems: 3,
              activeIocs: 3,
              investigators: 4,
              pendingAnalysis: 1,
            },
            activeInvestigations: [],
          }),
        }
      }
      if (String(url).endsWith('/api/auth/login')) {
        return { ok: true, json: async () => ({ token: 'test-token' }) }
      }
      if (String(url).endsWith('/api/cases') && options.method === 'POST') {
        return { ok: true, json: async () => createdCase }
      }
      throw new Error(`Unexpected API request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }))
    await screen.findByText('INVESTIGATION OVERVIEW')
    fireEvent.click(screen.getByRole('button', { name: '+ New Case' }))

    fireEvent.change(screen.getByLabelText('Incident title'), {
      target: { value: createdCase.title },
    })
    fireEvent.change(screen.getByLabelText('Incident summary'), {
      target: { value: 'Test incident details.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'CREATE INCIDENT' }))

    expect(await screen.findByText(createdCase.id)).toBeInTheDocument()
    await waitFor(() => {
      const createRequest = fetchMock.mock.calls.find(
        ([url, options]) => String(url).endsWith('/api/cases') && options.method === 'POST',
      )
      expect(createRequest).toBeDefined()
      expect(createRequest[1].headers.Authorization).toBe('Bearer test-token')
      expect(JSON.parse(createRequest[1].body)).toMatchObject({
        title: createdCase.title,
        incidentType: 'Malware',
        severity: 'High',
      })
    })
  })
})
