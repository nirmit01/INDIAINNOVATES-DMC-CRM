# DMC CRM — Delhi Municipal Corporation Grievance Portal
Full-stack local version of the DMC Citizen Grievance Management System.

---

## Prerequisites
- **Node.js 18+** — https://nodejs.org/

---

## Quick Start (2 terminals)

### Terminal 1 — Backend API
```bash
cd backend
npm install
npm start
```
Backend runs at: http://localhost:3001

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm start
```
Frontend opens at: http://localhost:3000

---

## Demo Credentials

| Role    | Email                          | Password     |
|---------|-------------------------------|--------------|
| Citizen | citizen@delhi.gov.in           | Citizen@123  |
| Admin   | admin@dmc.delhi.gov.in         | Admin@123    |

You can also register a new citizen account from the login screen.

---

## AI Features (Optional)
The app has AI-powered complaint classification, officer recommendations, and executive reports.

**To enable AI:** set your Anthropic API key before starting the backend:
```bash
# Mac/Linux
export ANTHROPIC_API_KEY=sk-ant-...

# Windows CMD
set ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, AI features fall back to rule-based responses automatically.

---

## Project Structure
```
dmc-crm/
├── backend/
│   ├── server.js       # Express API + Anthropic AI proxy
│   └── package.json
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── index.js
    │   └── App.jsx     # Complete React application (pixel-perfect UI)
    └── package.json
```

## API Endpoints
| Method | Path                 | Description           |
|--------|---------------------|-----------------------|
| GET    | /api/complaints      | List all complaints   |
| POST   | /api/complaints      | Create complaint      |
| PATCH  | /api/complaints/:id  | Update status/note    |
| POST   | /api/ai/messages     | Anthropic AI proxy    |
| GET    | /api/health          | Health check          |

> Data is stored in-memory and resets on backend restart.
