# GateMate — SaaS Product Plan & Infrastructure Strategy

**Version:** 1.0  
**Date:** February 16, 2026  
**Author:** Brian Smith, Senior Technology Consultant, PGTEK  
**Status:** Draft for Strategic Review

---

## Executive Summary

GateMate transforms the way distributed teams discover organic connection opportunities during business travel. Starting as an internal tool at PGTEK, it has proven the core value proposition: **when traveling coworkers know they're in the same airport at the same time, spontaneous collaboration happens**.

This document outlines the path from single-tenant MVP to multi-tenant SaaS product with three pricing tiers (Starter, Business, Enterprise), serving consulting firms, enterprise sales teams, field service organizations, and distributed companies where travel is core to operations.

**Market Opportunity:** 5.2M+ knowledge workers travel regularly for work (US only). Consulting, professional services, and enterprise sales represent $40B+ in annual T&E spend. Current solutions focus on booking and expense management—nobody solves the connection problem.

**Go-to-Market:** Leverage PGTEK as proof of concept and case study. Target Nutanix partner ecosystem (400+ consulting partners) and professional services firms via LinkedIn outreach and content marketing.

**Revenue Model:** $49-$399/month tiers based on team size and feature depth. At scale (10,000 users across 200 companies), projected ARR: $2.16M with 65-75% gross margin.

---

## 1. Product Vision & Value Proposition

### The Problem

**Traveling teams miss organic connection opportunities.**

When consultants, sales engineers, and field technicians travel for work, they often pass through the same airports on the same days—sometimes within minutes of each other—without knowing it. These missed connections represent lost opportunities for:

- Spontaneous collaboration and knowledge sharing
- Mentorship moments between senior and junior team members
- Team bonding in an otherwise isolating travel lifestyle
- Cross-department serendipity (sales meets engineering meets operations)
- Improved morale and reduced travel burnout

Current solutions (TripIt, Concur, Navan) focus on itinerary management and expense tracking. They don't answer the question: **"Who else from my company is here right now?"**

### The Solution

**Zero-friction flight forwarding → automatic overlap detection → real-time alerts.**

GateMate requires almost no behavior change:

1. **Forward your flight confirmation email** to `flights@gatemate.app` (or `flights@yourcompany.gatemate.app`)
2. **AI extracts flight details** (airline, flight number, departure/arrival times, airports)
3. **Overlap detection runs automatically** when layover windows align
4. **Both users get instant alerts** via email, Slack, Teams, or mobile push

No app to download (for basic use). No manual data entry. No training required.

When Sarah from Sales and Mike from Professional Services both have 2-hour layovers in DFW Terminal C on the same Tuesday afternoon, they both get an alert at T-24 hours and again at T-2 hours. They grab lunch, Sarah shares insights from her customer calls, Mike explains the new product roadmap. The company wins.

### Key Differentiator

**Simplicity.**

- Email forwarding beats manual itinerary entry
- Passive detection beats active searching
- Real-time alerts beat "check the dashboard"
- No app install required for basic functionality

Unlike competitors who try to be everything (booking, expense, policy compliance, travel content), GateMate does **one thing exceptionally well**: it tells you when your teammates are nearby.

### Target Customers

1. **Consulting Firms** (Deloitte, Accenture, boutique practices)
   - High travel frequency, distributed teams, mentorship culture
   - 50-5,000 traveling consultants per firm

2. **Enterprise Sales Teams** (SaaS companies, enterprise software, industrial)
   - Field sales engineers, solutions architects, account executives
   - 25-500 traveling team members

3. **Field Service Organizations** (Nutanix partners, telecom, energy, healthcare tech)
   - Installation teams, support engineers, trainers
   - 20-200 field personnel

4. **Distributed Companies** (remote-first with periodic travel)
   - All-hands meetings, regional events, customer visits
   - 100-1,000 employees with 20-30% travel rate

**Sweet spot:** 50-500 person companies where 30%+ of employees travel monthly.

---

## 2. Tier Structure

| Feature | **Starter**<br>$49/mo<br>(up to 25 users) | **Business**<br>$149/mo (≤100 users)<br>$5/user/mo | **Enterprise**<br>$399/mo (≤500 users)<br>Custom 500+ |
|---------|-------------------------------------------|-----------------------------------------------------|-------------------------------------------------------|
| **Core Features** |
| Email ingestion (forward flights) | ✓ | ✓ | ✓ |
| AI flight data extraction | ✓ | ✓ | ✓ |
| Automatic overlap detection | ✓ | ✓ | ✓ |
| Email alerts | ✓ | ✓ | ✓ |
| Basic dashboard (my flights, my bumps) | ✓ | ✓ | ✓ |
| Mobile-responsive web app | ✓ | ✓ | ✓ |
| **Team & Collaboration** |
| Department/team grouping | — | ✓ | ✓ |
| Weekly team travel digest | — | ✓ | ✓ |
| Team analytics dashboard | — | ✓ | ✓ |
| Most traveled routes / top airports | — | ✓ | ✓ |
| Bump success rate tracking | — | ✓ | ✓ |
| **Integrations** |
| Google Workspace calendar sync | — | ✓ | ✓ |
| Microsoft 365 calendar sync | — | ✓ | ✓ |
| Slack notifications | — | ✓ | ✓ |
| Microsoft Teams notifications | — | ✓ | ✓ |
| Custom email domain | — | ✓ | ✓ |
| Concur/Navan/SAP travel integration | — | — | ✓ |
| API access | — | — | ✓ |
| **Enterprise Features** |
| SSO/SAML (Okta, Azure AD, Google) | — | — | ✓ |
| SCIM user provisioning | — | — | ✓ |
| Custom branding / white-label | — | — | ✓ |
| Native mobile app (iOS/Android) | — | — | ✓ |
| Advanced analytics & reporting | — | — | ✓ |
| Data residency options | — | — | ✓ |
| SOC 2 Type II compliance | — | — | ✓ |
| 99.9% SLA | — | — | ✓ |
| **Admin & Support** |
| Number of admins | 1 | Unlimited | Unlimited |
| CSV export | — | ✓ | ✓ |
| Support level | Email (48h) | Priority email (24h) | Dedicated success manager |
| Onboarding | Self-serve | Self-serve + docs | White-glove onboarding |

### Pricing Philosophy

- **Starter:** Proof-of-concept pricing for small teams (startups, regional offices, pilot programs)
- **Business:** Sweet-spot tier for mid-market companies; per-user pricing at scale encourages expansion
- **Enterprise:** Value-based pricing; compliance, integrations, and support justify premium

**Annual billing discount:** 20% off (2 months free)

**Free trial:** 14 days, no credit card required, full feature access for chosen tier

---

## 3. Feature Roadmap

### Phase 1: MVP / Validation (Current → Month 2)

**Goal:** Make the current PGTEK deployment commercially viable.

**What we have:**
- ✓ Email ingestion via IMAP
- ✓ AI flight extraction (Ollama)
- ✓ Overlap detection engine
- ✓ Email notifications
- ✓ Basic admin panel
- ✓ React + Vite + Tailwind frontend
- ✓ Node/Express backend
- ✓ SQLite database
- ✓ Docker deployment

**What we need:**

| Feature | Effort | Priority | Description |
|---------|--------|----------|-------------|
| Multi-tenant architecture | High | P0 | Tenant isolation, per-org databases or strong RLS |
| Stripe billing integration | Medium | P0 | Subscription management, webhooks, invoicing |
| User onboarding flow | Medium | P0 | Sign up → verify email → invite team → forward first flight |
| Landing page / marketing site | Medium | P0 | Value prop, pricing, testimonials, sign-up CTA |
| Terms of Service | Low | P0 | Legal protection, user obligations |
| Privacy Policy (GDPR-ready) | Low | P0 | Data handling, retention, user rights |
| PostgreSQL migration | Medium | P1 | Replace SQLite for production scale |
| Cloud deployment | High | P1 | AWS/GCP/Fly.io, staging + production environments |
| Monitoring & alerting | Low | P1 | Sentry (errors), uptime checks, log aggregation |

**Timeline:** 6-8 weeks  
**Milestone:** First paying customer (Starter tier)

---

### Phase 2: Business Tier (Month 2-4)

**Goal:** Unlock mid-market customers and recurring expansion revenue.

| Feature | Effort | Priority | Description |
|---------|--------|----------|-------------|
| Google Calendar integration | Medium | P0 | Auto-detect travel from calendar events, OAuth flow |
| Microsoft 365 calendar integration | Medium | P0 | Same as Google, Azure AD OAuth |
| Slack notifications | Low | P0 | Webhook-based alerts, install via Slack App Directory |
| Teams notifications | Medium | P0 | Incoming webhooks or Bot Framework |
| Team/department grouping | Medium | P0 | Admins assign users to groups, filter bumps by group |
| Analytics dashboard | High | P1 | Charts: travel volume, bump rate, top airports/routes |
| Custom email subdomains | Low | P1 | DNS setup, CNAME verification (flights@acme.gatemate.app) |
| CSV export | Low | P1 | Export flights, bumps, user activity for reporting |
| Weekly travel digest | Medium | P1 | Email: "This week: 12 team flights, 3 potential bumps" |

**Timeline:** 8-10 weeks  
**Milestone:** 5 Business tier customers, $3K MRR

---

### Phase 3: Enterprise (Month 4-8)

**Goal:** Win enterprise deals, establish credibility, justify premium pricing.

| Feature | Effort | Priority | Description |
|---------|--------|----------|-------------|
| SSO/SAML | High | P0 | Okta, Azure AD, Google Workspace SAML integration |
| SCIM provisioning | Medium | P0 | Auto-sync users from identity provider |
| Concur integration | High | P0 | Pull itineraries via Concur API (OAuth) |
| Navan integration | High | P0 | Pull itineraries via Navan API |
| API access | Medium | P0 | REST API for third-party integrations, rate limiting |
| Mobile app (React Native) | Very High | P1 | iOS + Android, push notifications, map view of bumps |
| White-labeling | Medium | P1 | Custom logo, colors, domain (app.acme-travel.com) |
| Advanced analytics | Medium | P1 | HR metrics: connection frequency, travel spend per bump |
| SOC 2 audit prep | High | P1 | Engage auditor, implement controls, documentation |
| Multi-region deployment | High | P2 | US-East, US-West, EU-West for data residency |
| Audit logging | Low | P1 | Track all admin actions, data access, exports |

**Timeline:** 16-20 weeks  
**Milestone:** First enterprise customer ($399/mo+), SOC 2 Type I complete

---

### Phase 4: Growth & Differentiation (Month 8+)

**Goal:** Build moat through AI, network effects, and ecosystem integrations.

| Feature | Effort | Priority | Description |
|---------|--------|----------|-------------|
| AI travel recommendations | High | P1 | "You + 3 teammates travel DFW weekly—coordinate flights?" |
| Venue suggestions | Medium | P1 | "Meet at Pappadeaux (Terminal C, Gate 15-20)" |
| Integration marketplace | Medium | P2 | Zapier, Make, custom webhook recipes |
| Travel policy compliance | Medium | P2 | Flag out-of-policy bookings, integrate with expense systems |
| Carbon footprint tracking | Low | P2 | Per-team CO₂ estimates, sustainability reporting |
| Bump history & insights | Low | P1 | "You've met 14 teammates across 8 airports this year" |
| Group trip planning | Medium | P2 | Admins propose shared flights, team votes |

**Timeline:** Ongoing  
**Milestone:** 50+ customers, $50K+ MRR, feature differentiation vs. incumbents

---

## 4. Infrastructure Requirements

### Current (PGTEK Internal)

**Deployment:**
- Single Docker container on home server (Ubuntu, Tailscale VPN access)
- Nginx reverse proxy
- Let's Encrypt SSL

**Stack:**
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: SQLite (single file)
- Email: IMAP polling (Porkbun inbox)
- AI: Ollama (llama3.2 on Mac Mini for flight extraction)

**Limitations:**
- No tenant isolation
- No horizontal scaling
- Single point of failure
- Manual deployment
- No monitoring
- No backups (beyond Git)

**Cost:** ~$0/month (existing hardware)

---

### Production SaaS (Starter / Business Tiers)

**Hosting:**
- **Cloud provider:** Fly.io (simplicity) or AWS (ecosystem maturity)
  - Fly.io: Global edge deployment, built-in Postgres, $0.02/GB egress
  - AWS: ECS Fargate (containers), RDS Postgres, S3, CloudFront
- **Compute:** 2-4 containers (API, worker, cron) at 512MB-1GB each
- **Staging + Production environments**

**Database:**
- **PostgreSQL** (managed): AWS RDS or Fly.io Postgres
  - Single db with strong row-level security (RLS) for tenant isolation
  - Automated backups (7-day retention)
  - Read replicas at scale (>10K users)

**Caching & Queues:**
- **Redis** (managed): ElastiCache or Fly.io Redis
  - Session storage
  - Rate limiting
  - Bull/BullMQ job queues (email processing, overlap detection)

**Email:**
- **SMTP provider:** Postmark (deliverability focus) or AWS SES (cost)
  - Transactional: alerts, bumps, weekly digests
  - Inbound: receive forwarded flight emails via webhook
  - Estimated volume: 10-50 emails/user/month

**Object Storage:**
- **AWS S3** or Cloudflare R2
  - Email archive (retain raw flight confirmations for 90 days)
  - User uploads (profile pics, company logos in Enterprise)

**CDN:**
- **Cloudflare** (free tier) or AWS CloudFront
  - Cache static assets (React build)
  - DDoS protection
  - SSL termination

**Monitoring & Logging:**
- **Error tracking:** Sentry (10K events/month free)
- **Uptime monitoring:** UptimeRobot or BetterStack
- **Logs:** Cloudwatch (AWS) or Fly.io Logs (7-day retention)
- **Metrics:** Prometheus + Grafana (self-hosted) or Datadog (paid)

**CI/CD:**
- **GitHub Actions**
  - Run tests on PR
  - Deploy to staging on merge to `develop`
  - Deploy to production on tag (manual approval)

**Security:**
- SSL/TLS everywhere (Let's Encrypt or AWS Certificate Manager)
- Secrets management: AWS Secrets Manager or Fly.io Secrets
- Dependency scanning: Dependabot, Snyk
- WAF (Enterprise tier): Cloudflare or AWS WAF

**Estimated Monthly Cost (100 companies, 2,500 users):**

| Component | Service | Cost |
|-----------|---------|------|
| Compute (API + workers) | Fly.io 4x shared-cpu-1x | $24 |
| Database (PostgreSQL) | Fly.io Postgres (2GB RAM) | $15 |
| Redis | Fly.io Redis (256MB) | $5 |
| Email sending (25K/mo) | Postmark | $15 |
| Email receiving | Postmark (inbound) | $0 |
| Object storage (10GB) | Cloudflare R2 | $2 |
| CDN | Cloudflare (free) | $0 |
| Error tracking | Sentry (free tier) | $0 |
| Uptime monitoring | UptimeRobot (free) | $0 |
| Domain | Porkbun renewal | $1 |
| **Total** | | **$62/month** |

At $149/mo average (mix of Starter/Business), breakeven = 1 customer. Gross margin at 50 customers: 98%.

---

### Enterprise Infrastructure

**Additional Requirements:**

1. **Multi-region deployment**
   - Primary: US-East (aws us-east-1 or Fly.io iad)
   - Secondary: EU-West (aws eu-west-1 or Fly.io fra)
   - Data residency: tenant-level region pinning

2. **SOC 2 compliance**
   - Access controls: role-based permissions, MFA for admins
   - Audit logging: all data access, exports, admin actions (retain 1 year)
   - Encryption: at-rest (RDS encryption), in-transit (TLS 1.3)
   - Vendor management: sub-processor agreements (AWS, Postmark, Sentry)
   - Incident response plan
   - Annual penetration testing
   - Engage SOC 2 auditor (Vanta, Drata, or Big 4 firm)

3. **High availability (99.9% SLA)**
   - Load balancers (ALB or Fly.io auto-scaling)
   - Auto-scaling groups (2-10 API containers)
   - Database failover (RDS Multi-AZ or Fly.io HA Postgres)
   - Health checks + automated restarts
   - Disaster recovery: cross-region backups, RTO <4 hours

4. **Dedicated databases per tenant** (optional, for largest customers)
   - Separate RDS instance or Postgres schema
   - Improved isolation, performance guarantees
   - Higher cost (+$50-200/mo per tenant)

5. **Advanced monitoring**
   - Datadog (APM, logs, metrics): ~$150/mo at scale
   - PagerDuty for on-call: $25/user/mo (2 users = $50/mo)
   - Uptime SLA tracking dashboard

**Estimated Monthly Cost (200 companies, 10,000 users, 30% Enterprise tier):**

| Component | Service | Cost |
|-----------|---------|------|
| Compute (auto-scaled) | AWS ECS Fargate (avg 8 tasks) | $250 |
| Database (PostgreSQL HA) | RDS db.t4g.large Multi-AZ | $200 |
| Redis (HA) | ElastiCache cache.t4g.medium | $80 |
| Email sending (200K/mo) | Postmark | $100 |
| Object storage (100GB) | S3 Standard | $5 |
| CDN (1TB egress) | CloudFront | $85 |
| Error tracking | Sentry Team ($26/mo) | $26 |
| Monitoring (APM + logs) | Datadog Pro (10 hosts) | $150 |
| On-call | PagerDuty (2 users) | $50 |
| SOC 2 tooling | Vanta | $300 |
| Backups (S3 + snapshots) | AWS | $30 |
| WAF | Cloudflare Pro | $20 |
| **Total** | | **$1,296/month** |

At 200 customers averaging $180/mo MRR (tier mix), total revenue = $36K/mo. Infrastructure = 3.6% of revenue.

---

## 5. Cost Analysis

### Scenario 1: 10 Companies / 500 Users (Early Growth)

**Tier Mix:**
- 6 Starter ($49/mo) = $294
- 3 Business ($149/mo) = $447
- 1 Enterprise ($399/mo) = $399
- **Total MRR:** $1,140
- **Total ARR:** $13,680

**Infrastructure Costs:**
- Hosting (Fly.io): $50/mo
- Email (Postmark, ~5K sends/mo): $10/mo
- Monitoring (free tier): $0/mo
- Domain/SSL: $1/mo
- **Total:** $61/mo ($732/year)

**Other Costs:**
- Payment processing (Stripe 2.9% + 30¢): ~$35/mo
- Support (founder-led): $0/mo
- **Total OpEx:** $96/mo

**Gross Margin:** ($1,140 - $96) / $1,140 = **91.6%**

---

### Scenario 2: 50 Companies / 2,500 Users (Product-Market Fit)

**Tier Mix:**
- 25 Starter ($49/mo) = $1,225
- 20 Business ($149/mo) = $2,980
- 5 Enterprise ($399/mo) = $1,995
- **Total MRR:** $6,200
- **Total ARR:** $74,400

**Infrastructure Costs:**
- Hosting (Fly.io scaled): $120/mo
- Database (Postgres 4GB): $25/mo
- Redis: $5/mo
- Email (Postmark, ~30K sends/mo): $25/mo
- Monitoring (Sentry + UptimeRobot): $10/mo
- CDN (Cloudflare): $0/mo
- **Total:** $185/mo ($2,220/year)

**Other Costs:**
- Payment processing (Stripe): ~$195/mo
- Support (1 part-time CSM): $2,000/mo
- Marketing (content, ads): $1,500/mo
- **Total OpEx:** $3,880/mo

**Gross Margin:** ($6,200 - $3,880) / $6,200 = **37.4%**  
(Note: Lower margin due to early-stage support/marketing investment)

**Contribution Margin (infra only):** ($6,200 - $185 - $195) / $6,200 = **97%**

---

### Scenario 3: 200 Companies / 10,000 Users (Scale)

**Tier Mix:**
- 100 Starter ($49/mo) = $4,900
- 60 Business ($149/mo) = $8,940
- 40 Enterprise ($399/mo) = $15,960
- **Total MRR:** $29,800 (~$30K)
- **Total ARR:** $357,600

**Infrastructure Costs:**
- Hosting (AWS ECS): $250/mo
- Database (RDS HA): $200/mo
- Redis (HA): $80/mo
- Email (Postmark, 200K sends/mo): $100/mo
- CDN (CloudFront): $85/mo
- Monitoring (Datadog): $150/mo
- SOC 2 compliance (Vanta): $300/mo
- Backups/WAF/misc: $50/mo
- **Total:** $1,215/mo ($14,580/year)

**Other Costs:**
- Payment processing (Stripe): ~$930/mo
- Support team (2 FTE CSMs): $12,000/mo
- Engineering (3 FTE): $45,000/mo
- Marketing (demand gen, content): $8,000/mo
- Sales (1 AE, 1 SDR): $18,000/mo
- Legal/compliance: $2,000/mo
- Office/SaaS tools: $1,500/mo
- **Total OpEx:** $88,645/mo

**Gross Margin:** ($29,800 - $88,645) / $29,800 = **-197%** (not yet profitable)

**Contribution Margin (infra + payments only):** ($29,800 - $1,215 - $930) / $29,800 = **92.8%**

**Path to Profitability:**
- Revenue needs: $88,645 / 0.65 = **$136,400 MRR** (420 customers at current mix)
- Or reduce team size (bootstrap model: 1 eng, 1 CSM, founder-led sales) → OpEx ~$30K/mo → profitable at current scale

---

## 6. Revenue Projections

### Conservative Model (Year 1-3)

**Assumptions:**
- 14-day free trial, 35% trial → paid conversion
- 8% monthly churn (early-stage average)
- 60% annual renewals offer 20% discount (most take it)
- Average customer lifetime: 12 months
- Customer acquisition cost (CAC): $800 (content + outbound)
- Payback period: 6 months

| Quarter | New Customers | Total Customers | MRR | ARR | Churn | Net New |
|---------|---------------|-----------------|-----|-----|-------|---------|
| Q1 (MVP launch) | 8 | 8 | $900 | $10,800 | 0 | 8 |
| Q2 | 12 | 18 | $2,200 | $26,400 | 2 | 10 |
| Q3 | 18 | 32 | $4,500 | $54,000 | 4 | 14 |
| Q4 | 24 | 50 | $7,800 | $93,600 | 6 | 18 |
| **Year 1 Total** | **62** | **50** | **$7,800** | **$93,600** | **12** | **50** |
| Q5 | 30 | 72 | $12,500 | $150,000 | 8 | 22 |
| Q6 | 35 | 96 | $18,200 | $218,400 | 11 | 24 |
| Q7 | 40 | 125 | $25,000 | $300,000 | 11 | 29 |
| Q8 | 45 | 156 | $32,800 | $393,600 | 14 | 31 |
| **Year 2 Total** | **150** | **156** | **$32,800** | **$393,600** | **44** | **106** |

**Year 3 Projection:**
- Exit MRR: $85,000
- Exit ARR: $1,020,000
- Total customers: 380
- Gross margin: 68% (maturing support efficiency)

**LTV Calculation (Year 2):**
- Average MRR per customer: $210
- Average lifetime: 12 months
- LTV: $210 × 12 = $2,520
- CAC: $800
- LTV:CAC ratio: **3.15:1** (healthy SaaS metric)

---

### Growth Model (Year 1-5, Aggressive)

**Assumptions:**
- Product-Market Fit achieved Month 6
- 50% trial → paid conversion (strong value prop)
- 5% monthly churn (best-in-class retention)
- Referral program drives 20% of new signups
- Enterprise customers average 24-month lifetime

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| New Customers | 80 | 220 | 450 | 650 | 800 |
| Total Customers | 72 | 260 | 650 | 1,180 | 1,850 |
| MRR | $12,000 | $52,000 | $145,000 | $285,000 | $475,000 |
| ARR | $144,000 | $624,000 | $1,740,000 | $3,420,000 | $5,700,000 |
| Gross Margin | 85% | 72% | 68% | 70% | 72% |
| Team Size | 3 | 8 | 18 | 32 | 50 |

**Exit Valuation (Year 5):**
- ARR: $5.7M
- SaaS multiple: 8-12x ARR (varies by growth rate, margin, market)
- Conservative exit: **$45M** (8x)
- Optimistic exit: **$68M** (12x)

---

## 7. Go-to-Market Strategy

### Phase 1: Proof of Concept (Month 0-3)

**Objective:** Validate value prop with PGTEK, generate case study, get first testimonials.

**Tactics:**
1. **PGTEK internal launch**
   - Onboard all 160 employees (target 60% adoption = 96 active users)
   - Track metrics: flights logged, bumps found, NPS score
   - Identify power users for testimonials

2. **Case study development**
   - Title: "How PGTEK Increased Team Connections 4x with GateMate"
   - Data points: X bumps in 90 days, Y hours of face time, Z% user satisfaction
   - Quotes from CEO, traveling consultants

3. **Landing page + positioning**
   - Hero: "Your team is closer than you think. Find them."
   - Social proof: PGTEK logo, user quotes
   - Clear pricing, 14-day trial CTA

---

### Phase 2: Network Expansion (Month 3-9)

**Objective:** Leverage Brian's network in Nutanix ecosystem, acquire 20-50 early customers.

**Target Audience:**
- Nutanix partner ecosystem (400+ VARs, SIs, MSPs)
- Professional services firms (consulting, audit, legal)
- Enterprise sales teams (B2B SaaS, infrastructure vendors)

**Channels:**

1. **LinkedIn Outreach (Primary)**
   - Identify target personas:
     - VP of Operations at consulting firms
     - Head of Sales Enablement at B2B companies
     - Chief People Officer / Head of Culture
   - Personalized connection requests (Brian's network = warm intros)
   - Sequence: Connect → case study share → demo offer
   - Volume: 20 connections/week, 10% → demo (2 demos/week)

2. **Content Marketing**
   - Blog post: *"How We Accidentally Built the App That Helps Traveling Teams Connect"*
     - HackerNews, Reddit (r/SaaS), LinkedIn
     - Goal: 10K views, 50 trial signups
   - Guest post on HR/culture blogs: *"The Hidden Cost of Business Travel: Loneliness"*
   - Podcast appearances: SaaS growth, future of work, HR tech shows

3. **Nutanix Partner Ecosystem**
   - Present at Nutanix partner summit (if available)
   - Email to Nutanix partner mailing list (Brian's credibility)
   - Offer: "PGTEK uses this. You should too."

4. **Referral Program**
   - Existing customers get 1 month free for each referral (new paying customer)
   - Branded referral links, tracked in dashboard
   - Email template: "We use GateMate to catch our team at airports. You'd love it."

**Sales Motion:**
- Founder-led sales (Brian)
- 30-min demos (live overlap detection, show bump alerts)
- Free trial → email drip campaign → sales call at day 10
- Close rate target: 35% of demos → paid

---

### Phase 3: Demand Generation (Month 9-24)

**Objective:** Build repeatable acquisition channels, scale to 200+ customers.

**Channels:**

1. **Product Hunt Launch**
   - Goal: #1 Product of the Day
   - Prep: teaser posts, email hunter community, launch day coordination
   - Outcome: 500+ upvotes, 100+ trial signups, press coverage

2. **Paid Ads (LinkedIn, Google)**
   - LinkedIn Sponsored Content targeting:
     - Job titles: VP Operations, Head of Sales, Chief People Officer
     - Industries: Consulting, Professional Services, SaaS
     - Budget: $2K/mo, target CPA $150
   - Google Search ads:
     - Keywords: "travel coordination software," "team travel app," "TripIt alternative"
     - Budget: $1K/mo

3. **Partnerships**
   - Slack App Directory listing
   - Microsoft Teams App Store listing
   - Integration partnerships: Concur, Navan (co-marketing)

4. **Events & Sponsorships**
   - SaaStr Annual (sponsor, booth)
   - HR Tech Conference (booth, speaking slot)
   - Consulting industry events (Deloitte alumni networks, etc.)

5. **Content SEO**
   - Target keywords: "airport layover app," "business travel coordination," "team travel software"
   - Comparison pages: "GateMate vs TripIt," "GateMate vs Concur"
   - City guides: "Best airports for team meetups" (DFW, ATL, ORD, DEN)

**Sales Team Buildout:**
- Month 12: Hire SDR (outbound prospecting)
- Month 18: Hire AE (close deals, expand accounts)
- Month 24: Second AE (geographic or vertical split)

---

## 8. Competitive Analysis

| Competitor | Focus | Pricing | Strengths | Weaknesses | GateMate Advantage |
|------------|-------|---------|-----------|------------|-------------------|
| **TripIt Pro** | Itinerary management | $49/user/year | Mature product, strong consumer brand, flight alerts | Not team-focused, no overlap detection, requires manual entry or email forwarding *per trip* | GateMate is **team-native**: auto-detects overlaps across entire org, not just individual itineraries |
| **Navan** (TripActions) | Corporate travel booking + expense | Custom enterprise pricing | End-to-end booking, policy enforcement, integrated expense | Expensive, complex, overkill for small teams, no social/connection features | GateMate is **lightweight**: no booking, no expense, just connections. Complements Navan. |
| **SAP Concur** | T&E management | Custom enterprise pricing | Industry standard for large enterprises, deep integrations | Clunky UX, expensive, slow, no team connection features | GateMate is **simple & fast**: forward an email, get an alert. No training, no admin burden. |
| **Travo** | Team travel coordination | $8/user/month | Team-focused, calendar integration, shared itineraries | Manual itinerary entry, no AI, limited adoption | GateMate is **zero-friction**: AI extracts flights from emails, no manual entry. |
| **RandomCoffee / Donut** (Slack bots) | Random team intros | Free - $3/user/month | Slack-native, good for remote culture | Random pairings, not location-aware, no travel focus | GateMate is **context-aware**: pairs people *when they're actually in the same place*, not randomly. |

### Positioning Statement

> **For distributed teams where business travel is core to operations, GateMate is the team connection platform that automatically alerts coworkers when they're in the same airport at the same time—enabling spontaneous collaboration without any behavior change. Unlike TripIt (individual-focused) or Concur (expense-focused), GateMate is purpose-built for one thing: helping your team find each other when it matters.**

---

## 9. Legal & Compliance Requirements

### Immediately Required (Before Charging Money)

1. **Terms of Service**
   - User obligations (accurate flight data, no abuse)
   - Service availability (no uptime guarantees in Starter/Business)
   - Acceptable use policy (no scraping, no reselling)
   - Limitation of liability
   - Dispute resolution / arbitration clause

2. **Privacy Policy (GDPR-Ready)**
   - Data collected: email, flight details, overlap alerts, usage analytics
   - Legal basis: consent (trial signup), contract performance (paid users)
   - Data retention: flights retained 90 days after travel date, user data until account deletion
   - User rights: access, export, deletion (GDPR Article 15-17)
   - Sub-processors: AWS, Postmark, Stripe, Sentry
   - International transfers: adequacy decisions (US-EU Data Privacy Framework)
   - Cookie policy: analytics cookies (opt-in for EU users)

3. **Acceptable Use Policy**
   - No automated scraping
   - No transmission of malware
   - No impersonation
   - No harassment of other users

4. **Data Processing Agreement (DPA)**
   - Template for Business/Enterprise customers (GDPR Article 28)
   - Standard Contractual Clauses (if EU customers)

---

### Required for Enterprise Tier

5. **SOC 2 Type II Compliance**
   - Timeline: 6-12 months (3-month gap between Type I and Type II)
   - Auditor: Vanta, Drata, or Big 4 firm
   - Controls: access management, encryption, incident response, vendor management
   - Cost: $30K-60K initial audit, $15K-25K annual renewal

6. **Business Associate Agreement (BAA)** (if healthcare customers)
   - HIPAA compliance: PHI handling, breach notification
   - Likely NOT needed unless customer is healthcare org storing patient travel data

7. **Security & Incident Response Plan**
   - Data breach notification process (72-hour GDPR requirement)
   - Vulnerability disclosure policy
   - Penetration testing (annual, third-party)

---

### Ongoing Compliance

8. **CCPA Compliance (California Consumer Privacy Act)**
   - "Do Not Sell My Personal Information" opt-out (not applicable—we don't sell data)
   - Disclosure of data collected, shared, retained
   - Consumer rights: access, deletion (similar to GDPR)

9. **Cookie Consent (EU ePrivacy Directive)**
   - Cookie banner for EU visitors
   - Opt-in for non-essential cookies (analytics, marketing)
   - Tools: OneTrust, Cookiebot, or custom banner

10. **Annual Legal Review**
   - Update ToS/Privacy Policy as product evolves
   - Review sub-processor list (new vendors require DPA amendments)
   - Monitor regulatory changes (EU AI Act, US state privacy laws)

---

### Recommended Tools

- **Legal templates:** Termly, Iubenda, or attorney-drafted
- **SOC 2 automation:** Vanta ($300/mo), Drata ($500/mo), Secureframe
- **Privacy compliance:** OneTrust (enterprise), Osano (mid-market)
- **Contract management:** PandaDoc, DocuSign

---

## 10. Success Metrics & KPIs

### Product Metrics

| Metric | Target (Month 6) | Target (Month 12) | Description |
|--------|------------------|-------------------|-------------|
| **Monthly Active Users (MAU)** | 300 | 1,200 | Users who log in or receive bump alert |
| **Flights logged per user/month** | 2.5 | 3.0 | Average travel frequency |
| **Bumps detected per 100 flights** | 8 | 12 | Overlap detection rate (improves with density) |
| **Bump acceptance rate** | 35% | 50% | % of bumps where users actually meet |
| **NPS (Net Promoter Score)** | 40 | 60 | Would you recommend GateMate? |

### Business Metrics

| Metric | Target (Month 6) | Target (Month 12) | Description |
|--------|------------------|-------------------|-------------|
| **MRR** | $3,000 | $12,000 | Monthly recurring revenue |
| **Customer count** | 20 | 72 | Total paying customers |
| **Trial → Paid conversion** | 30% | 40% | % of trials that convert |
| **Monthly churn** | 10% | 6% | Customer retention (inverse) |
| **CAC (Customer Acquisition Cost)** | $1,000 | $600 | Marketing + sales cost per customer |
| **LTV (Lifetime Value)** | $1,800 | $3,000 | Average revenue per customer over lifetime |
| **LTV:CAC ratio** | 1.8:1 | 5:1 | Unit economics health (target >3:1) |

---

## 11. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Low trial → paid conversion** | High | Medium | Strong onboarding, in-app demos, founder-led sales calls |
| **Competitors copy feature** | Medium | High | Build moat via network effects (more users = more bumps), integrations, brand |
| **AI extraction accuracy <90%** | High | Medium | Human-in-the-loop review for flagged extractions, user correction feedback loop |
| **Email deliverability issues** | High | Low | Use Postmark (99% inbox rate), SPF/DKIM/DMARC setup, monitor bounce rates |
| **Data breach / security incident** | Critical | Low | SOC 2 controls, penetration testing, bug bounty program, incident response plan |
| **GDPR enforcement action** | High | Very Low | GDPR-ready privacy policy, DPA templates, user data export/deletion automation |
| **Slow enterprise sales cycles** | Medium | High | Focus on Starter/Business tiers for cash flow, use enterprise as expansion revenue |
| **Founder bandwidth (solo founder)** | High | Medium | Hire part-time ops/support early, use no-code tools (Zapier), outsource non-core (legal, design) |

---

## 12. Next Steps (30/60/90 Day Plan)

### Days 1-30: Foundation

- [ ] Incorporate legal entity (LLC or C-Corp)
- [ ] Set up Stripe account, test subscription flows
- [ ] Migrate SQLite → PostgreSQL (local dev, then Fly.io staging)
- [ ] Draft Terms of Service + Privacy Policy (use Termly templates, attorney review)
- [ ] Build landing page (value prop, pricing, trial signup, PGTEK testimonial)
- [ ] Deploy staging environment (Fly.io)
- [ ] Implement basic multi-tenancy (tenant UUID, row-level security)

**Milestone:** Staging environment live, legal docs published, ready for first external trial user.

---

### Days 31-60: MVP Launch

- [ ] Deploy production environment (Fly.io + Postmark + Sentry)
- [ ] Onboard 5 beta customers (PGTEK colleagues' networks, free trials)
- [ ] Implement Stripe webhooks (subscription.created, payment_failed, etc.)
- [ ] Build user onboarding flow (email verify → invite team → forward flight)
- [ ] Set up monitoring (UptimeRobot, Sentry alerts)
- [ ] Migrate PGTEK to production multi-tenant instance
- [ ] Write PGTEK case study (90-day data: X flights, Y bumps, quotes)

**Milestone:** First paying customer ($49 Starter plan).

---

### Days 61-90: Traction

- [ ] LinkedIn outreach (20 connections/week, target Nutanix partners)
- [ ] Publish blog post: "How We Accidentally Built GateMate" (HackerNews, Reddit)
- [ ] Launch referral program (1 month free per referral)
- [ ] Implement Slack notifications (Business tier feature)
- [ ] Build team analytics dashboard (most traveled routes, bump rate)
- [ ] Schedule 10 product demos (LinkedIn outreach, inbound from blog post)
- [ ] Onboard 3-5 paying customers

**Milestone:** 10 total customers, $800 MRR, validation of pricing/value prop.

---

## Appendix A: Founder Bio

**Brian Smith**  
Senior Technology Consultant, PGTEK  
Nutanix Certified Professional (NCP), 8+ years infrastructure consulting

Brian travels 60-80 days/year deploying Nutanix hyperconverged infrastructure for enterprise customers across North America. After missing countless opportunities to connect with PGTEK teammates in airports, he built GateMate as an internal tool in 2025. When the entire company adopted it within 90 days and bump frequency increased 4x, he realized the product had legs beyond PGTEK.

Brian lives full-time in a custom-built Airstream with his partner and dog, working remotely from national parks, customer sites, and airport lounges. He's deeply embedded in the Nutanix partner ecosystem (400+ consulting firms) and has firsthand insight into the pain points of distributed, travel-heavy teams.

---

## Appendix B: Technical Architecture (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  React + Vite + Tailwind (SPA)                             │
│  - Dashboard (my flights, upcoming bumps)                  │
│  - Admin panel (invite users, view analytics)              │
│  - Settings (notification preferences, integrations)       │
│  Hosted: Cloudflare Pages or S3 + CloudFront              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API (Node/Express)                     │
│  - REST endpoints (auth, flights, bumps, users)            │
│  - WebSockets (real-time bump alerts)                      │
│  - Stripe webhooks (billing events)                        │
│  - OAuth callbacks (Google/M365 calendar, Slack)           │
│  Hosted: Fly.io (auto-scaled containers)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┬────────────────┐
                ▼             ▼             ▼                ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐
│   PostgreSQL     │  │    Redis     │  │  Postmark│  │   S3 (R2)    │
│  (tenant data)   │  │ (cache,queue)│  │  (email) │  │ (email store)│
│  RLS isolation   │  │              │  │          │  │              │
│  Fly.io/RDS      │  │  Fly.io      │  │  SaaS    │  │  Cloudflare  │
└──────────────────┘  └──────────────┘  └──────────┘  └──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    WORKER PROCESSES                         │
│  - Email ingestion (IMAP polling or webhook receiver)      │
│  - AI flight extraction (Ollama or OpenAI API)             │
│  - Overlap detection cron (runs every 15 min)              │
│  - Alert dispatcher (email, Slack, Teams, push)            │
│  Queue: Bull (Redis-backed)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix C: Sample Overlap Detection Algorithm

**Input:** New flight added to database  
**Output:** List of users with overlapping layovers

```python
def detect_overlaps(flight):
    overlaps = []
    
    # Find all flights by OTHER users in same org
    # that have layovers at same airport within ±6 hours
    candidates = db.query("""
        SELECT f.*, u.email, u.name
        FROM flights f
        JOIN users u ON f.user_id = u.id
        WHERE f.tenant_id = %s
          AND f.user_id != %s
          AND f.layover_airport = %s
          AND f.departure_time BETWEEN %s AND %s
    """, (
        flight.tenant_id,
        flight.user_id,
        flight.layover_airport,
        flight.arrival_time - timedelta(hours=6),
        flight.arrival_time + timedelta(hours=6)
    ))
    
    for candidate in candidates:
        # Calculate actual overlap window
        overlap_start = max(flight.arrival_time, candidate.arrival_time)
        overlap_end = min(flight.departure_time, candidate.departure_time)
        
        if overlap_end > overlap_start:
            # Minimum 30-min overlap to qualify as "bump"
            if (overlap_end - overlap_start).seconds >= 1800:
                overlaps.append({
                    'user_a': flight.user_id,
                    'user_b': candidate.user_id,
                    'airport': flight.layover_airport,
                    'overlap_start': overlap_start,
                    'overlap_end': overlap_end,
                    'duration_minutes': (overlap_end - overlap_start).seconds // 60
                })
    
    return overlaps
```

**Edge cases handled:**
- Direct flights (no layover) excluded
- Same-user flights ignored
- Cross-tenant leakage prevented via `tenant_id` filter
- Minimum overlap threshold (30 min) to avoid "ships in the night"

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 16, 2026 | Brian Smith | Initial draft for strategic review |

**Distribution:**
- Internal review (PGTEK leadership)
- Potential investors (on request)
- Strategic partners (Nutanix ecosystem)

**Confidentiality:** This document contains proprietary business strategy. Do not distribute without author approval.

---

**Contact:**  
Brian Smith  
w.brian.smith@gmail.com  
Senior Technology Consultant, PGTEK  
Founder, GateMate
