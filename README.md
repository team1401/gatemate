# GateMate — Layover Overlap Finder

Internal web app for employees to discover when they have overlapping layovers at the same airport during business travel.

## Quick Start

### Docker (Production)
```bash
# Set your AviationStack API key in .env
echo "AVIATIONSTACK_API_KEY=your_key_here" >> .env

# Build and run
docker compose up -d --build
# App available at http://localhost:3111
```

### Local Development
```bash
npm install
cd client && npm install && cd ..
# Terminal 1: Backend
npm run dev:server
# Terminal 2: Frontend (with proxy to backend)
npm run dev:client
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `AVIATIONSTACK_API_KEY` | Yes* | API key from aviationstack.com |
| `PORT` | No | Server port (default: 3111) |
| `DB_PATH` | No | SQLite database path |

*Flight lookups won't work without an API key, but auth/trips/overlaps still function with manually entered data.

## Features
- **Register/Login** — Email + password, JWT sessions
- **Add Trip** — Enter flight numbers + dates, lookup real flight data from AviationStack
- **My Trips** — View and manage upcoming/past trips
- **Overlap Detection** — Automatic detection when two users are at the same airport
- **Dashboard** — Feed of upcoming "bumps" with timeline visualization
- **24hr API Caching** — All flight lookups cached in SQLite to minimize API usage

## Stack
- React + Vite + Tailwind CSS (frontend)
- Node.js + Express (backend)
- SQLite via better-sqlite3
- Docker multi-stage build

## Deployment
Deployed on plex at http://100.97.65.28:3111
