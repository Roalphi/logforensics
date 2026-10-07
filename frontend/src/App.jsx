import { BrowserRouter, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { mockData } from './mockData'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const navItems = [
  { label: 'Overview', path: '/' },
  { label: 'Cases', path: '/cases' },
  { label: 'Evidence', path: '/evidence' },
  { label: 'IOCs', path: '/iocs' },
  { label: 'Investigation Timeline', path: '/timeline' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'Chain of Custody', path: '/chain' },
  { label: 'Reports', path: '/reports' },
  { label: 'Audit Logs', path: '/audit' },
  { label: 'Settings', path: '/settings' },
]

const severityStyles = {
  Critical: 'severity-critical',
  High: 'severity-high',
  Medium: 'severity-medium',
  Low: 'severity-low',
}

const systemStatus = '● SYSTEM OPERATIONAL'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [authToken, setAuthToken] = useState('')
  const [dashboardData, setDashboardData] = useState(mockData)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard`)
        if (!response.ok) throw new Error('Backend unavailable')
        const result = await response.json()
        setDashboardData({
          ...mockData,
          summary: result.summary,
          cases: result.activeInvestigations.map(toCaseView),
        })
      } catch (error) {
        setDashboardData(mockData)
      }
    }

    fetchDashboard()
  }, [])

  const handleLogin = async ({ email, password }) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Unable to sign in.')
    setAuthToken(result.token)
    setAuthenticated(true)
  }

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <TraceXShell
        dashboardData={dashboardData}
        authToken={authToken}
        onCreateCase={async (caseDetails) => {
          const response = await fetch(`${API_BASE_URL}/api/cases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(caseDetails),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.message || 'Unable to create the incident.')

          const createdCase = toCaseView(result)
          setDashboardData((current) => ({
            ...current,
            cases: [createdCase, ...current.cases],
            summary: {
              ...current.summary,
              activeCases: current.summary.activeCases + 1,
              criticalCases: current.summary.criticalCases + (createdCase.severity === 'Critical' ? 1 : 0),
            },
          }))
          return createdCase
        }}
      />
    </BrowserRouter>
  )
}

function toCaseView(entry) {
  return {
    ...entry,
    evidence: entry.evidence ?? entry.evidenceCount ?? 0,
    lastActivity: entry.lastActivity || 'Just now',
  }
}

function LoginPage({ onLogin }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      await onLogin({
        email: formData.get('email'),
        password: formData.get('password'),
      })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-visual-panel">
        <div className="brand-block">
          <div className="brand-mark">TRACE-X</div>
          <div className="branding-subtitle">DIGITAL FORENSICS</div>
          <div className="branding-subtitle secondary">&amp; INCIDENT INVESTIGATION</div>
        </div>
        <div className="forensic-pattern" />
      </div>
      <div className="login-form-panel">
        <div className="login-form-inner">
          <div className="login-header">LOGIN</div>
          <form onSubmit={handleSubmit} className="login-form">
            <label>
              <span>Email</span>
              <input name="email" type="email" defaultValue="r.jenifer@trace-x.local" required />
            </label>
            <label>
              <span>Password</span>
              <input name="password" type="password" defaultValue="Password123!" required />
            </label>
            <button type="submit" disabled={submitting}>{submitting ? 'SIGNING IN…' : 'SIGN IN'}</button>
          </form>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="login-meta">
            <label className="remember-row">
              <input type="checkbox" defaultChecked />
              <span>Remember session</span>
            </label>
            <a href="/">Forgot password?</a>
          </div>
          <div className="secure-label">SECURE INVESTIGATION ENVIRONMENT</div>
        </div>
      </div>
    </div>
  )
}

function TraceXShell({ dashboardData, onCreateCase }) {
  const navigate = useNavigate()
  const [createCaseOpen, setCreateCaseOpen] = useState(false)

  const handleCreateCase = async (caseDetails) => {
    const createdCase = await onCreateCase(caseDetails)
    setCreateCaseOpen(false)
    navigate(`/cases/${createdCase.id}`)
  }

  return (
    <div className="trace-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">TRACE-X</div>
          <div className="sidebar-subtitle">FORENSIC LAB</div>
        </div>
        <nav className="side-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input type="text" placeholder="Global search" />
          </div>
          <div className="topbar-actions">
            <button className="icon-button">🔔</button>
            <div className="user-chip">
              <span className="avatar">RJ</span>
              <div>
                <div className="user-name">R. Jenifer</div>
                <div className="user-role">Lead Investigator</div>
              </div>
            </div>
            <div className="status-indicator">{systemStatus}</div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<OverviewPage data={dashboardData} onCreateCase={() => setCreateCaseOpen(true)} />} />
          <Route path="/cases" element={<CasesPage data={dashboardData} onCreateCase={() => setCreateCaseOpen(true)} />} />
          <Route path="/cases/:caseId" element={<CaseWorkspacePage data={dashboardData} />} />
          <Route path="/evidence" element={<EvidencePage data={dashboardData} />} />
          <Route path="/iocs" element={<IocPage data={dashboardData} />} />
          <Route path="/timeline" element={<TimelinePage data={dashboardData} />} />
          <Route path="/analysis" element={<AnalysisPage data={dashboardData} />} />
          <Route path="/chain" element={<ChainPage data={dashboardData} />} />
          <Route path="/reports" element={<ReportsPage data={dashboardData} />} />
          <Route path="/audit" element={<AuditLogsPage data={dashboardData} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
      {createCaseOpen && (
        <CreateCaseDialog
          onClose={() => setCreateCaseOpen(false)}
          onSubmit={handleCreateCase}
        />
      )}
    </div>
  )
}

function OverviewPage({ data, onCreateCase }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">INVESTIGATION OVERVIEW</div>
        </div>
        <button className="primary-button" onClick={onCreateCase}>+ New Case</button>
      </div>

      <div className="metrics-grid">
        <MetricCard value={data.summary.activeCases} label="ACTIVE CASES" />
        <MetricCard value={data.summary.criticalCases} label="CRITICAL" />
        <MetricCard value={data.summary.evidenceItems} label="EVIDENCE ITEMS" />
        <MetricCard value={data.summary.activeIocs} label="ACTIVE IOCs" />
        <MetricCard value={data.summary.investigators} label="INVESTIGATORS" />
        <MetricCard value={data.summary.pendingAnalysis} label="PENDING ANALYSIS" />
      </div>

      <div className="content-card">
        <div className="panel-title-row">
          <h3>ACTIVE INVESTIGATIONS</h3>
          <button className="secondary-button">View all</button>
        </div>

        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Case Name</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Lead Analyst</th>
              <th>Evidence</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {data.cases.map((entry) => (
              <tr key={entry.id}>
                <td><NavLink to={`/cases/${entry.id}`}>{entry.id}</NavLink></td>
                <td>{entry.title}</td>
                <td><StatusBadge text={entry.severity} variant={entry.severity} /></td>
                <td>{entry.status}</td>
                <td>{entry.leadAnalyst}</td>
                <td>{entry.evidence}</td>
                <td>{entry.lastActivity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CasesPage({ data, onCreateCase }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">CASE MANAGEMENT</div>
          <h2>Investigations</h2>
        </div>
        <button className="primary-button" onClick={onCreateCase}>+ Create New Case</button>
      </div>

      <div className="filter-grid">
        <input placeholder="Search cases" />
        <select defaultValue="Severity"><option>Severity</option></select>
        <select defaultValue="Status"><option>Status</option></select>
        <select defaultValue="Analyst"><option>Analyst</option></select>
        <select defaultValue="Sort by date"><option>Sort by date</option></select>
      </div>

      <div className="content-card">
        <div className="panel-title-row">
          <h3>Open investigations</h3>
        </div>
        <table className="cases-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Case title</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Assigned analyst</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {data.cases.map((entry) => (
              <tr key={entry.id}>
                <td><NavLink to={`/cases/${entry.id}`}>{entry.id}</NavLink></td>
                <td>{entry.title}</td>
                <td><StatusBadge text={entry.severity} variant={entry.severity} /></td>
                <td>{entry.status}</td>
                <td>{entry.leadAnalyst}</td>
                <td>06 Oct 2026</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateCaseDialog({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    incidentType: 'Malware',
    severity: 'High',
    source: 'EDR alert',
    description: '',
    affectedSystems: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const updateField = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const loadDemoIncident = () => {
    setFormData({
      title: 'Suspicious PowerShell activity',
      incidentType: 'Malware',
      severity: 'High',
      source: 'EDR alert',
      description: 'Demo incident created from the TRACE-X interface to demonstrate case intake and investigation tracking.',
      affectedSystems: 'FIN-WKS-024, FILE-SRV-02',
    })
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      await onSubmit({
        ...formData,
        affectedSystems: formData.affectedSystems
          .split(',')
          .map((system) => system.trim())
          .filter(Boolean),
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create the incident.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="case-dialog" role="dialog" aria-modal="true" aria-labelledby="create-case-title">
        <div className="dialog-header">
          <div>
            <div className="eyebrow">CASE INTAKE</div>
            <h2 id="create-case-title">Create incident</h2>
          </div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Close create incident form">×</button>
        </div>

        <p className="dialog-description">Enter incident details or load a sample, then submit it to the TRACE-X API.</p>
        <form className="case-form" onSubmit={handleSubmit}>
          <label className="form-field full-width">
            <span>Incident title</span>
            <input name="title" value={formData.title} onChange={updateField} maxLength="120" required />
          </label>

          <label className="form-field">
            <span>Incident type</span>
            <select name="incidentType" value={formData.incidentType} onChange={updateField}>
              {['Malware', 'Ransomware', 'Phishing', 'Insider Threat', 'Unauthorized Access', 'Data Exfiltration', 'Other'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Severity</span>
            <select name="severity" value={formData.severity} onChange={updateField}>
              {['Critical', 'High', 'Medium', 'Low'].map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </select>
          </label>

          <label className="form-field full-width">
            <span>Detected by / source</span>
            <select name="source" value={formData.source} onChange={updateField}>
              {['EDR alert', 'SIEM alert', 'User report', 'Email security', 'Threat intelligence', 'Other'].map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </label>

          <label className="form-field full-width">
            <span>Incident summary</span>
            <textarea name="description" value={formData.description} onChange={updateField} rows="4" maxLength="2000" required />
          </label>

          <label className="form-field full-width">
            <span>Affected systems <small>(comma-separated, optional)</small></span>
            <input name="affectedSystems" value={formData.affectedSystems} onChange={updateField} maxLength="500" />
          </label>

          {error && <div className="form-error full-width" role="alert">{error}</div>}

          <div className="dialog-actions full-width">
            <button className="secondary-button" type="button" onClick={loadDemoIncident}>Load demo incident</button>
            <div>
              <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? 'CREATING…' : 'CREATE INCIDENT'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

function CaseWorkspacePage({ data }) {
  const { caseId } = useParams()
  const caseRecord = data.cases.find((entry) => entry.id === caseId) || data.cases[0]

  return (
    <div className="page-shell">
      <div className="case-header">
        <div>
          <div className="eyebrow">CASE {caseRecord.id}</div>
          <h2>{caseRecord.title.toUpperCase()}</h2>
        </div>
        <div className="case-badges">
          <StatusBadge text={caseRecord.status} variant="status" />
          <StatusBadge text={caseRecord.severity} variant={caseRecord.severity} />
        </div>
      </div>

      <div className="meta-panel">
        <div><span>Lead Analyst</span><strong>{caseRecord.leadAnalyst}</strong></div>
        <div><span>Created Date</span><strong>06 Oct 2026</strong></div>
        <div><span>Last Updated</span><strong>14:30 UTC</strong></div>
        <div><span>Evidence Count</span><strong>{caseRecord.evidence}</strong></div>
        <div><span>IOC Count</span><strong>8</strong></div>
      </div>

      <div className="workspace-tabs">
        {['OVERVIEW', 'EVIDENCE', 'TIMELINE', 'IOCs', 'ANALYSIS', 'CHAIN OF CUSTODY', 'REPORT'].map((tab) => (
          <button key={tab} className={`tab-button ${tab === 'OVERVIEW' ? 'active' : ''}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="workspace-grid">
        <div className="content-card large">
          <div className="panel-title-row">
            <h3>INVESTIGATION PROGRESS</h3>
          </div>
          <div className="progress-meter">
            <div className="progress-track">
              <span style={{ width: '90%' }} />
            </div>
            <div className="progress-label">90%</div>
          </div>
          <div className="two-column-layout">
            <div>
              <p className="field-label">Incident summary</p>
              <p>Multi-host ransomware deployment affecting finance operations and encrypted endpoint shares.</p>
            </div>
            <div>
              <p className="field-label">Attack type</p>
              <p>Ransomware</p>
            </div>
            <div>
              <p className="field-label">Affected systems</p>
              <p>Finance Workstations, Domain Controllers</p>
            </div>
            <div>
              <p className="field-label">Assigned analysts</p>
              <p>R. Jenifer, M. Osei, N. Patel</p>
            </div>
          </div>
        </div>

        <div className="content-card">
          <div className="panel-title-row">
            <h3>Recent activity</h3>
          </div>
          <ul className="compact-list">
            <li>14:30 — Containment updates published.</li>
            <li>14:12 — IOC validated against known C2 list.</li>
            <li>14:05 — Hash verification passed.</li>
            <li>13:48 — Regulatory notification triggered.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function EvidencePage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">EVIDENCE LABORATORY</div>
          <h2>Evidence Examination</h2>
        </div>
        <button className="primary-button">+ Add Evidence</button>
      </div>

      <div className="filter-grid">
        <input placeholder="Search evidence" />
        <select defaultValue="Type"><option>Type</option></select>
        <select defaultValue="Case"><option>Case</option></select>
        <select defaultValue="Status"><option>Status</option></select>
      </div>

      <div className="evidence-grid">
        {data.evidence.map((item) => (
          <div key={item.id} className="evidence-card">
            <div className="evidence-head">
              <span className="mono">{item.id}</span>
              <StatusBadge text={item.status} variant="status" />
            </div>
            <h4>{item.name}</h4>
            <div className="evidence-meta">
              <span>TYPE</span>
              <strong>{item.type}</strong>
            </div>
            <div className="evidence-meta">
              <span>SIZE</span>
              <strong>{item.size}</strong>
            </div>
            <div className="evidence-meta">
              <span>SHA-256</span>
              <strong className="mono">{item.hash}</strong>
            </div>
            <div className="evidence-meta">
              <span>STATUS</span>
              <strong>{item.status}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IocPage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">IOC MANAGEMENT</div>
          <h2>Indicators of Compromise</h2>
        </div>
        <button className="primary-button">+ Add IOC</button>
      </div>

      <div className="content-card">
        <table className="cases-table">
          <thead>
            <tr>
              <th>IOC</th>
              <th>Type</th>
              <th>Risk</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>First Seen</th>
              <th>Last Seen</th>
              <th>Associated Case</th>
            </tr>
          </thead>
          <tbody>
            {data.iocs.map((item) => (
              <tr key={item.id}>
                <td>{item.ioc}</td>
                <td>{item.type}</td>
                <td><StatusBadge text={item.risk} variant={item.risk} /></td>
                <td>{item.confidence}</td>
                <td>{item.status}</td>
                <td>{item.firstSeen}</td>
                <td>{item.lastSeen}</td>
                <td>{item.caseId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TimelinePage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">INVESTIGATION TIMELINE</div>
          <h2>Event Reconstruction</h2>
        </div>
      </div>

      <div className="timeline-shell">
        {data.timeline.map((item) => (
          <div key={item.time} className="timeline-event">
            <div className="timeline-mark">●</div>
            <div className="timeline-content">
              <div className="timeline-time">{item.time}</div>
              <div className="timeline-title">{item.title}</div>
              <div className="timeline-detail">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalysisPage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">FORENSIC ANALYSIS</div>
          <h2>FILE ANALYSIS</h2>
        </div>
      </div>

      <div className="content-card analysis-card">
        <div className="analysis-header">
          <div>
            <h3>suspicious.exe</h3>
            <p>PE32 EXECUTABLE</p>
          </div>
          <div className="analysis-meta">
            <div>4.82 MB</div>
            <div>Entropy 7.81</div>
          </div>
        </div>

        <div className="analysis-grid">
          <div><span>SHA-256</span><strong className="mono">91f3...8c2</strong></div>
          <div><span>MD5</span><strong className="mono">a3c8...19f4</strong></div>
          <div><span>Created</span><strong>2026-10-06</strong></div>
          <div><span>Modified</span><strong>2026-10-06</strong></div>
        </div>

        <div className="indicator-boxes">
          <div>✓ Hash verified</div>
          <div>⚠ Suspicious API calls detected</div>
          <div>⚠ Obfuscated strings detected</div>
          <div>✓ File signature identified</div>
        </div>
      </div>
    </div>
  )
}

function ChainPage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">CHAIN OF CUSTODY</div>
          <h2>Evidence EV-0017</h2>
        </div>
      </div>

      <div className="custody-chain">
        {[
          '06 OCT 14:02 — Evidence Acquired',
          '06 OCT 14:04 — SHA-256 Generated',
          '06 OCT 14:05 — Integrity Verified',
          '06 OCT 14:12 — Assigned to Analyst',
          '06 OCT 14:30 — Under Examination',
        ].map((item) => (
          <div key={item} className="custody-step">
            <span className="arrow">↓</span>
            <div>{item}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportsPage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">REPORT GENERATION</div>
          <h2>Forensic Reports</h2>
        </div>
        <button className="primary-button">GENERATE FORENSIC REPORT</button>
      </div>

      <div className="content-card">
        <table className="cases-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Case</th>
              <th>Title</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.reports.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.caseId}</td>
                <td>{item.title}</td>
                <td>{item.status}</td>
                <td>06 Oct 2026</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuditLogsPage({ data }) {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">AUDIT LOG</div>
          <h2>System Activity</h2>
        </div>
      </div>

      <div className="content-card">
        <table className="cases-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Object</th>
              <th>Case ID</th>
              <th>IP Address</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {data.auditLogs.map((item, index) => (
              <tr key={`${item.action}-${index}`}>
                <td className="mono">{item.timestamp}</td>
                <td>{item.user}</td>
                <td>{item.action}</td>
                <td>{item.object}</td>
                <td>{item.caseId}</td>
                <td className="mono">{item.ip}</td>
                <td>{item.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="page-shell">
      <div className="section-header-row">
        <div>
          <div className="eyebrow">SETTINGS</div>
          <h2>Investigation Environment</h2>
        </div>
      </div>

      <div className="settings-grid">
        <div className="content-card">
          <h3>Roles & access</h3>
          <ul className="compact-list">
            <li>Administrator — Full access</li>
            <li>Lead Investigator — Manage cases, evidence, IOCs, reports</li>
            <li>Forensic Analyst — Analyze evidence, add findings</li>
            <li>Viewer — Read-only access</li>
          </ul>
        </div>
        <div className="content-card">
          <h3>System status</h3>
          <ul className="compact-list">
            <li>● API ONLINE</li>
            <li>● DATABASE CONNECTED</li>
            <li>● STORAGE AVAILABLE</li>
            <li>● CI/CD HEALTHY</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ value, label }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

function StatusBadge({ text, variant = 'neutral' }) {
  return <span className={`pill ${variant ? severityStyles[variant] || variant : ''}`}>{text}</span>
}

export default App
