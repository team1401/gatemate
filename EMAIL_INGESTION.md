# Email-to-Trip Ingestion System

## Overview
Users can forward flight confirmation emails to a dedicated address. The system automatically extracts flight data and creates pending trips for user confirmation.

## Components

### 1. IMAP Email Poller (`server/services/emailPoller.js`)
- Polls IMAP mailbox every 60 seconds for unread emails
- Matches sender email to registered GateMate users
- Extracts email body (prefers text/plain, falls back to HTML with tag stripping)
- Sends to flight extraction service, creates pending trips
- Marks processed emails as read
- **Gracefully disabled** when IMAP env vars are missing

### 2. AI Flight Extractor (`server/services/flightExtractor.js`)
- **Primary:** MiniMax API (`MiniMax-M1` model) via OpenAI-compatible endpoint
- **Fallback:** Regex-based extraction for common patterns (AA4979, "Flight AA 4979", etc.)
- Validates: flight number format, IATA codes, date format
- Supports major airlines: AA, UA, DL, WN, B6, NK, F9, AS, etc.

### 3. Pending Trips System
- `pending_trips` table: id, user_id, source_email, raw_email_text, extracted_flights (JSON), trip_name, status, created_at
- Status flow: pending → accepted/rejected
- On accept: creates real trip + flights, enriches via AirLabs API, detects overlaps

### 4. API Endpoints
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/trips/pending` | GET | User | Get user's pending trips |
| `/api/trips/pending/:id/accept` | POST | User | Accept & create real trip |
| `/api/trips/pending/:id/reject` | POST | User | Reject pending trip |
| `/api/admin/pending` | GET | Admin | All pending trips |
| `/api/config` | GET | None | Email config (address, enabled status) |

### 5. Frontend (Dashboard.jsx)
- Email forwarding banner (shows address if configured, "coming soon" if not)
- Pending trips section with amber highlight, flight details, Confirm/Reject buttons

## Environment Variables
```
IMAP_HOST=              # IMAP server (e.g., imap.gmail.com)
IMAP_PORT=993           # Default 993
IMAP_USER=              # IMAP username
IMAP_PASS=              # IMAP password
IMAP_TLS=true           # Default true
GATEMATE_EMAIL=flights@gatemate.app
MINIMAX_API_KEY=        # Optional — falls back to regex extraction
```

All email-related env vars are **optional**. App works fully without them.

## Deployed
- Built and deployed 2026-02-16
- Container starts clean with `[EmailPoller] IMAP not configured — email ingestion disabled`
