# GateMate — Layover Overlap Finder

## Overview
Web app that helps PGTEK employees discover when they're at the same airport at the same time during business travel. Enter your upcoming flights, see who else from the team has overlapping layovers or connections.

## Domain
gatemate.app

## Users
- 20 initial (Nutanix deployment team)
- 160 total PGTEK employees
- All business travelers with frequent layovers

## Critical Constraint: REAL FLIGHT DATA ONLY
**The previous build attempt failed because it used fake/invented flight data.** This build MUST use a live flight data API. No mock data, no invented schedules, no hardcoded airports.

### Flight Data API: AviationStack
- **Free tier:** 100 requests/month (too low for production)
- **Basic plan:** $49.99/mo, 10,000 requests
- **Recommendation:** Start with free tier for development, use BYOK pattern (users provide their own key) OR cache aggressively
- **Alternative approach:** Let users enter flight number + date, look up real departure/arrival times and airports from the API, cache the result. Most PGTEK employees fly similar routes — caching will reduce API calls dramatically.
- **Fallback:** AirLabs API (free tier: 1,000 requests/month) as secondary source

### Data Flow
1. User enters flight number(s) + date(s) (e.g., "UA 1234, Feb 20")
2. Backend looks up real flight data from AviationStack/AirLabs
3. Stores: user, flight number, date, departure airport/time, arrival airport/time, layover windows
4. Compares all users' airport presence windows
5. Shows overlaps: "You and [coworker] will both be at DFW on Feb 20, 2:15 PM - 5:40 PM"

## Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js/Express
- **Database:** SQLite (simple, no Postgres needed for 160 users)
- **Auth:** Email-based magic link OR simple username/password (local auth, M365 SSO later)
- **Deploy:** Docker on plex (port 3111)

## Core Features (v1)
1. **Add Trip** — Enter flight numbers + dates for an upcoming trip
2. **Flight Lookup** — Real-time validation against AviationStack API (departure/arrival airports, times)
3. **Overlap Detection** — Algorithm finds airport+time overlaps across all users
4. **Overlap Feed** — Dashboard showing upcoming overlaps ("You + Sarah both at ORD on March 3!")
5. **Trip History** — See past and upcoming trips
6. **Notifications** — When a new overlap is detected with your trips

## Nice-to-Haves (v2)
- M365 SSO integration
- Slack/Teams notifications
- Airport terminal/gate info
- Suggest meeting spots near gates
- Map visualization of team travel patterns

## Visual Identity
- **Style genre:** "Transit wayfinding" — clean, bold, inspired by airport signage systems (Frutiger, Massimo Vignelli)
- **Color palette:** Deep navy (#0A1628), warm amber (#F59E0B), white (#FFFFFF), cool gray (#64748B), success green (#10B981), soft cream (#FFF8F0)
- **Typography:** Inter or similar grotesque sans-serif, large clear numbers for times
- **Signature element:** Timeline visualization showing flight paths as horizontal bars, with overlap zones highlighted in amber glow
- **Layout:** Clean dashboard with trip cards, overlap alerts prominent at top

## API Key Strategy
For v1, hardcode a single AviationStack API key on the backend (BYOK not needed for internal tool). Cache all flight lookups for 24 hours to minimize API usage. With ~20 active users adding maybe 2-4 flights/week each, we're looking at ~40-80 lookups/week. Free tier (100/month) might barely work; basic plan ($50/mo) is comfortable.

For now: sign up for free AviationStack key, build with caching, upgrade if needed.

## Deployment
- Docker container on plex: port 3111
- `docker compose up -d`
- Volume mount for SQLite database persistence
