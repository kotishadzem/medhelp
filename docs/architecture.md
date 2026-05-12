# MedHelp Architecture

## Overview

MedHelp is a medical mobile application for managing medications, lab tests, and medical records. The system follows a client-server architecture with a REST API backend and a cross-platform mobile app.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Next.js 16 (App Router, API-only) |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| Mobile | React Native / Expo |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod v4 |
| Containers | Docker (PostgreSQL + pgAdmin) |

## Architecture Diagram

```
┌─────────────────┐     HTTP/REST     ┌──────────────────┐
│                 │ ──────────────────▷│                  │
│  Mobile App     │                   │  Next.js API     │
│  (Expo/RN)      │ ◁──────────────────│  (backend/)      │
│                 │     JSON           │                  │
└─────────────────┘                   └────────┬─────────┘
                                               │
                                               │ Prisma
                                               │
                                      ┌────────▼─────────┐
                                      │                  │
                                      │  PostgreSQL      │
                                      │  (Docker)        │
                                      │                  │
                                      └──────────────────┘
```

## Project Structure

```
medhelp/
├── CLAUDE.md              # AI assistant guidelines
├── docker-compose.yml     # PostgreSQL + pgAdmin
├── .env.example           # Environment template
├── plan/                  # Implementation plans
├── docs/                  # Documentation
├── backend/               # Next.js API server
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/      # Authentication endpoints
│   │   │   └── medications/ # Medication CRUD + intakes
│   │   └── generated/prisma/ # Prisma client (generated)
│   ├── lib/
│   │   ├── prisma.ts      # Prisma client singleton
│   │   ├── auth.ts        # JWT helpers + middleware
│   │   ├── responses.ts   # Standardized API responses
│   │   └── validators/    # Zod validation schemas
│   └── prisma/
│       └── schema.prisma  # Database schema
└── mobile/                # React Native app (TBD)
```

## Database Schema

### Models

- **User** — Patient or admin with phone-based auth
- **RefreshToken** — JWT refresh tokens with rotation
- **Medication** — Prescribed medication with schedule (times per day, specific hours)
- **MedicationIntake** — Individual intake records (one per medication × time × day)

### Key Design Decisions

1. **Phone-based auth** — Georgian market, mobile-first. OTP for registration, PIN for quick login.
2. **Intake pre-generation** — When a medication is created, all intake records are generated upfront (e.g., 3x/day × 14 days = 42 rows). This enables calendar views, missed-dose tracking, and simple status queries.
3. **CUID IDs** — Non-sequential, URL-safe, prevents information leakage about record counts.

## Authentication Flow

```
Register:  Phone → OTP → Verify → Create User → JWT + Refresh Token → Setup PIN
Login:     Phone + PIN → Verify PIN → JWT + Refresh Token
Biometric: Mobile-side → Unlocks stored refresh token → Auto-refresh
```

## API Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

## Running Locally

1. `docker compose up -d` — Start PostgreSQL + pgAdmin
2. `cd backend && npx prisma migrate dev` — Run migrations
3. `cd backend && npm run dev` — Start API server on :3000
4. pgAdmin available at http://localhost:5050 (admin@medhelp.local / admin)
