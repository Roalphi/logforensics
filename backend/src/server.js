require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { connectDatabase } = require('./config/db');
const { users, cases, evidence, iocs, timelineEvents, auditLogs, notifications, reports } = require('./data/seed');
const { authenticateToken, authorizeRole } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const databaseConnection = { connected: false };

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

connectDatabase().then((connected) => {
  databaseConnection.connected = connected;
});

function buildDashboardPayload() {
  const metricCases = cases.length;
  const criticalCases = cases.filter((entry) => entry.severity === 'Critical').length;
  const evidenceItems = evidence.length;
  const activeIocs = iocs.filter((entry) => entry.status !== 'Resolved').length;
  const investigators = new Set(cases.flatMap((entry) => entry.investigators)).size;
  const pendingAnalysis = evidence.filter((entry) => entry.analysisStatus !== 'verified').length;

  return {
    summary: {
      activeCases: metricCases,
      criticalCases: criticalCases,
      evidenceItems: evidenceItems,
      activeIocs: activeIocs,
      investigators: investigators,
      pendingAnalysis: pendingAnalysis,
    },
    activeInvestigations: cases.map(toCaseView),
    recentActivity: [
      { label: 'Case DF-2026-014', message: 'Evidence acquisition completed', time: '14:30 UTC' },
      { label: 'IOC-0042', message: 'Malicious IP validated', time: '14:12 UTC' },
      { label: 'EV-0017', message: 'Hash verification passed', time: '14:05 UTC' },
    ],
  };
}

function toCaseView(entry) {
  return {
    ...entry,
    evidence: entry.evidence ?? entry.evidenceCount ?? 0,
    lastActivity: entry.lastActivity || 'Recently updated',
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'trace-x-dev-secret',
    { expiresIn: '8h' },
  );
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    databaseConnection: databaseConnection.connected ? 'connected' : 'mock-mode',
    timestamp: new Date().toISOString(),
    applicationVersion: APP_VERSION,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = users.find((entry) => entry.email.toLowerCase() === String(email).toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const validPassword = await bcrypt.compare(String(password), user.passwordHash);

  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }

  const token = generateToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json(buildDashboardPayload());
});

app.get('/api/cases', authenticateToken, (req, res) => {
  res.json(cases.map(toCaseView));
});

app.post('/api/cases', authenticateToken, authorizeRole('Lead Investigator', 'Forensic Analyst', 'Administrator'), (req, res) => {
  const { title, incidentType, severity, source, description, affectedSystems = [] } = req.body || {};
  const allowedTypes = ['Malware', 'Ransomware', 'Phishing', 'Insider Threat', 'Unauthorized Access', 'Data Exfiltration', 'Other'];
  const allowedSeverities = ['Critical', 'High', 'Medium', 'Low'];
  const allowedSources = ['EDR alert', 'SIEM alert', 'User report', 'Email security', 'Threat intelligence', 'Other'];

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) {
    return res.status(400).json({ message: 'Incident title is required and must be 120 characters or fewer.' });
  }

  if (!allowedTypes.includes(incidentType)) {
    return res.status(400).json({ message: 'Select a valid incident type.' });
  }

  if (!allowedSeverities.includes(severity)) {
    return res.status(400).json({ message: 'Select a valid severity.' });
  }

  if (!allowedSources.includes(source)) {
    return res.status(400).json({ message: 'Select a valid incident source.' });
  }

  if (typeof description !== 'string' || !description.trim() || description.trim().length > 2000) {
    return res.status(400).json({ message: 'Incident summary is required and must be 2,000 characters or fewer.' });
  }

  if (!Array.isArray(affectedSystems) || affectedSystems.length > 25
    || affectedSystems.some((system) => typeof system !== 'string' || system.trim().length > 100)) {
    return res.status(400).json({ message: 'Affected systems must be a list of up to 25 names, each 100 characters or fewer.' });
  }

  const createdAt = new Date().toISOString();
  const year = new Date(createdAt).getUTCFullYear();
  const lastSequence = cases.reduce((highest, entry) => {
    const match = /^DF-(\d{4})-(\d+)$/.exec(entry.id);
    return match && Number(match[1]) === year ? Math.max(highest, Number(match[2])) : highest;
  }, 0);
  const id = `DF-${year}-${String(lastSequence + 1).padStart(3, '0')}`;
  const newCase = {
    id,
    title: title.trim(),
    description: description.trim(),
    summary: description.trim(),
    incidentType,
    severity,
    priority: severity === 'Critical' ? 'Immediate' : severity === 'High' ? 'High' : severity === 'Medium' ? 'Normal' : 'Low',
    status: 'Investigating',
    assignedAnalyst: req.user.name,
    leadAnalyst: req.user.name,
    dateDetected: createdAt.slice(0, 10),
    source,
    createdAt,
    updatedAt: createdAt,
    evidenceCount: 0,
    evidence: 0,
    iocCount: 0,
    progress: 0,
    affectedSystems: affectedSystems.map((system) => system.trim()).filter(Boolean),
    investigators: [req.user.name],
    lastActivity: 'Just now',
  };

  cases.unshift(newCase);
  auditLogs.unshift({
    user: req.user.name,
    timestamp: createdAt,
    action: 'Incident Created',
    object: id,
    caseId: id,
    ip: req.ip,
    result: 'SUCCESS',
  });

  return res.status(201).json(toCaseView(newCase));
});

app.get('/api/cases/:id', authenticateToken, (req, res) => {
  const match = cases.find((entry) => entry.id === req.params.id);
  if (!match) {
    return res.status(404).json({ message: 'Case not found.' });
  }

  return res.json({
    ...toCaseView(match),
    timeline: timelineEvents.filter((event) => event.caseId === match.id),
    evidence: evidence.filter((entry) => entry.caseId === match.id),
    iocs: iocs.filter((entry) => entry.caseId === match.id),
  });
});

app.get('/api/evidence', authenticateToken, (req, res) => {
  res.json(evidence);
});

app.get('/api/evidence/:id', authenticateToken, (req, res) => {
  const match = evidence.find((entry) => entry.id === req.params.id);
  if (!match) {
    return res.status(404).json({ message: 'Evidence record not found.' });
  }

  return res.json(match);
});

app.get('/api/iocs', authenticateToken, (req, res) => {
  res.json(iocs);
});

app.get('/api/timeline/:caseId', authenticateToken, (req, res) => {
  res.json(timelineEvents.filter((entry) => entry.caseId === req.params.caseId));
});

app.get('/api/audit-logs', authenticateToken, (req, res) => {
  res.json(auditLogs);
});

app.get('/api/reports', authenticateToken, (req, res) => {
  res.json(reports);
});

app.get('/api/notifications', authenticateToken, (req, res) => {
  res.json(notifications);
});

app.get('/api/users/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    avatar: req.user.avatar,
  });
});

app.get('/api/search', authenticateToken, (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();

  if (!query) {
    return res.json([]);
  }

  const matches = [
    ...cases.map((entry) => ({ ...entry, objectType: 'CASE', typeLabel: entry.id })),
    ...evidence.map((entry) => ({ ...entry, objectType: 'EVIDENCE', typeLabel: entry.id })),
    ...iocs.map((entry) => ({ ...entry, objectType: 'IOC', typeLabel: entry.id })),
    ...auditLogs.map((entry) => ({ ...entry, objectType: 'AUDIT LOG', typeLabel: entry.id })),
  ].filter((entry) => {
    const haystack = `${entry.title || ''} ${entry.name || ''} ${entry.ioc || ''} ${entry.id || ''} ${entry.caseId || ''}`.toLowerCase();
    return haystack.includes(query);
  });

  return res.json(matches.slice(0, 20));
});

app.get('/api/secure/admin', authenticateToken, authorizeRole('Administrator'), (req, res) => {
  res.json({ message: 'Administrative access confirmed.' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found.' });
});

app.listen(PORT, () => {
  console.log(`TRACE-X backend running on port ${PORT}`);
});
