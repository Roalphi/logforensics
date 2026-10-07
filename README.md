# TRACE-X

TRACE-X is a dark-themed digital forensics and incident investigation platform built as a production-style prototype for security operations teams. It is designed to support investigation workflows such as case triage, evidence review, IOC tracking, timeline reconstruction, chain-of-custody review, report generation, and audit visibility.

This project combines a React frontend with an Express API and mock forensic data so the application is usable immediately without requiring a live MongoDB instance during local development.

## What this project is

TRACE-X is modeled as a modern SOC / DFIR workspace for:

- Active case management
- Evidence intake and review
- File and endpoint forensics
- IOC correlation and monitoring
- Timeline reconstruction
- Analyst workflow visibility
- Security operations reporting

The UI intentionally follows a serious forensic-lab aesthetic with dark surfaces, copper/burgundy highlights, muted gray panels, and dense operational data views.

## Core features

- Investigations dashboard with KPI summaries
- Case table, case-level workspace pages, and API-backed incident creation
- Evidence inventory and detail views
- IOC tracking with confidence, status, and severity
- Investigation timeline and event reconstruction
- Analysis panel for suspicious artifacts
- Chain-of-custody view
- Reports and audit log screens
- Secure login shell and JWT-based auth scaffolding
- Role-aware backend routes and protected endpoints
- Docker Compose orchestration for frontend, backend, and MongoDB
- Mock data fallback mode for development and demo use

## Tech stack

- Frontend: React 19 + Vite + React Router
- Backend: Node.js + Express
- Auth: JWT + bcryptjs
- Database: MongoDB / Mongoose-ready configuration
- Styling: custom CSS with a forensic dashboard design system
- Containerization: Docker + Docker Compose
- Testing: Vitest + Testing Library

## Demo login

The seeded demo users are defined in the backend mock data and use the same password:

- Email: `r.jenifer@trace-x.local`
- Password: `Password123!`

Additional seeded users:

- `m.osei@trace-x.local`
- `n.patel@trace-x.local`
- `a.rivera@trace-x.local`

All seeded users share the same password: `Password123!`

## Repository structure

```text
logforensics/
├── .env.example
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── config/
│       ├── data/
│       ├── middleware/
│       └── server.js
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── vitest.config.js
├── package.json
├── README.md
└── .dockerignore
```

## Prerequisites

Before running locally, install:

- Node.js 18+ or 20+
- npm
- Docker Desktop / Docker Engine if you want to run the containers

## Local development setup

1. Open a terminal in the project root.
2. Copy the example environment file if needed:

```bash
copy .env.example .env
```

3. Install dependencies for the root project and each app package:

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
```

4. Start the backend and frontend together:

```bash
npm run dev
```

This starts:

- Frontend on `http://localhost:5173`
- Backend on `http://localhost:4000`

5. Open the frontend in the browser and sign in using the demo credentials above.

### Create a demo incident

1. Sign in with the demo login.
2. Select **+ New Case** on the overview page, or **+ Create New Case** on the Investigations page.
3. Enter the incident title, type, severity, source, summary, and optional affected systems.
4. Select **Create incident** to send the form to `POST /api/cases`.
5. The new case is added to the dashboard and opens in its case workspace. To try a pre-filled example, select **Load demo incident** in the form before submitting.

The UI submits through the local TRACE-X backend API. It does not currently ingest alerts from an external SIEM, EDR, or threat-intelligence provider.

## Running the frontend and backend separately

Frontend:

```bash
npm --prefix frontend run dev
```

Backend:

```bash
npm --prefix backend run dev
```

Production build:

```bash
npm run build
```

## Docker Compose

To run the full stack in containers:

```bash
docker compose up --build
```

This starts:

- Frontend container on `http://localhost:5173`
- Backend API on `http://localhost:4000`
- MongoDB on `mongodb://localhost:27017`

To stop it:

```bash
docker compose down
```

To remove the database volume and reset stored data:

```bash
docker compose down -v
```

## Environment variables

The app reads environment variables from `.env` at the root. Example values are defined in `.env.example`:

```env
PORT=4000
JWT_SECRET=change-me-in-production
MONGO_URI=mongodb://mongo:27017/trace-x
FRONTEND_URL=http://localhost:5173
APP_VERSION=1.0.0
```

Notes:

- If `MONGO_URI` is missing or invalid, the backend continues in mock-data mode for local development.
- `JWT_SECRET` should be changed before production use.
- `FRONTEND_URL` is used for CORS and web origin configuration.

## Backend API overview

Base URL: `http://localhost:4000`

### Health

- `GET /api/health`

### Authentication

- `POST /api/auth/login`

### Security / protected routes

- `GET /api/cases`
- `POST /api/cases` — create an incident (Lead Investigator, Forensic Analyst, or Administrator)
- `GET /api/cases/:id`
- `GET /api/evidence`
- `GET /api/evidence/:id`
- `GET /api/iocs`
- `GET /api/timeline/:caseId`
- `GET /api/audit-logs`
- `GET /api/reports`
- `GET /api/notifications`
- `GET /api/users/me`
- `GET /api/search?q=...`
- `GET /api/secure/admin`

Authentication is provided via the `Authorization: Bearer <token>` header using the JWT returned by login.

Example API flow:

```bash
# Sign in and copy the returned token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"r.jenifer@trace-x.local","password":"Password123!"}'

# Create an incident using that token
curl -X POST http://localhost:4000/api/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Suspicious PowerShell activity","incidentType":"Malware","severity":"High","source":"EDR alert","description":"Demo incident submitted through the TRACE-X API.","affectedSystems":["FIN-WKS-024","FILE-SRV-02"]}'
```

The create endpoint validates required fields and permitted values, assigns a case ID, records the signed-in analyst as the lead, initializes the case as `Investigating`, and adds an `Incident Created` entry to the audit log.

## Notes on the current implementation

This repository is a strong functional MVP / prototype rather than a fully productionized enterprise platform.

Current strengths:

- Complete forensic UI shell and themed dashboard experience
- Working mock backend API with seeded data
- JWT sign-in and protected API routes
- Incident creation through the UI and `POST /api/cases`
- Dockerized local environment
- CI workflow template for validation
- React tests for the login screen and build health checks

Current limitations / intentional scope:

- New incidents and audit entries are held in backend process memory; they appear immediately in the UI/API but are lost when the backend restarts
- MongoDB is configured in Docker Compose and its connection is checked, but case and audit records are not yet stored in MongoDB
- CRUD operations are not yet fully implemented for all entity types in a persistent database layer
- The “Load demo incident” action pre-fills a sample form; submission still goes through the same API as a manually entered incident
- There are no external SIEM, EDR, email-security, or threat-intelligence API integrations; the source field is descriptive metadata only
- Report generation is UI-oriented rather than fully integrated with PDF/forensic exports
- Real enterprise workflow tooling such as case automation, file extraction pipelines, and live SOC integrations are not included in this prototype

## Development and validation

Run the frontend checks:

```bash
cd frontend
npx vitest run
npm run build
npm run lint
```

## Production readiness guidance

For production use, recommend the following:

- Replace mock seed data with real MongoDB-backed repositories
- Add proper validation and CRUD services for all case/evidence entities
- Add role-based access policies and audit logging storage
- Use real secret management and environment isolation
- Harden CORS, headers, and security policies
- Add integration tests and API contract checks
- Add long-term evidence storage, immutable chain-of-custody records, and case lifecycle automation

## Summary

TRACE-X is a polished investigation platform prototype aimed at digital forensics and incident response teams. It demonstrates the visual language, functional screens, mock investigation workflows, secure-auth scaffolding, and backend API needed for a modern SOC / DFIR product concept.

It is ready to run locally as a demo, supports Docker deployment, and provides a foundation for further expansion into a full production forensic operations platform.
#   l o g f o r e n s i c s  
 