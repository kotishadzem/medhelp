# MedHelp - Phase 1: Registration + Medication Schedule

## Context

MedHelp is a medical mobile app (iOS + Android). **This phase focuses only on**: user registration/auth and medication schedule management. Family features, lab tests, and medical records will come later.

**Tech Stack**: Next.js (API-only, runs locally) + PostgreSQL (Docker) + React Native/Expo (mobile)

---

## What We're Building

1. **Registration & Auth** — phone + OTP, PIN setup, fingerprint/biometric login
2. **Medication Schedule** — add medications with dosage, duration, daily times; get reminders; mark as taken

---

## Phase 1A: Backend Infrastructure

### 1. Docker Setup
- `docker-compose.yml`: PostgreSQL 16 + pgAdmin
- Files: `docker-compose.yml`, `.env.example`, `.gitignore`

### 2. Next.js Backend Init
- Init `backend/` — TypeScript, App Router, API-only (no pages)
- Deps: prisma, @prisma/client, jsonwebtoken, bcrypt, zod
- Files: `backend/package.json`, `backend/next.config.ts`

### 3. Database Schema (Prisma)

```prisma
enum UserRole { PATIENT ADMIN }
enum MedicationStatus { ACTIVE COMPLETED CANCELLED PAUSED }
enum IntakeStatus { PENDING TAKEN MISSED SKIPPED }

model User {
  id           String   @id @default(cuid())
  phone        String   @unique
  pinHash      String?
  firstName    String?
  lastName     String?
  role         UserRole @default(PATIENT)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  medications  Medication[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Medication {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id])
  name            String
  dosage          String
  instructions    String?
  startDate       DateTime
  endDate         DateTime
  frequencyPerDay Int
  timesOfDay      String[]         // ["08:00", "14:00", "20:00"]
  status          MedicationStatus @default(ACTIVE)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  intakes         MedicationIntake[]
}

model MedicationIntake {
  id           String       @id @default(cuid())
  medicationId String
  medication   Medication   @relation(fields: [medicationId], references: [id], onDelete: Cascade)
  scheduledAt  DateTime
  takenAt      DateTime?
  status       IntakeStatus @default(PENDING)
  createdAt    DateTime     @default(now())
}
```

- File: `backend/prisma/schema.prisma`

### 4. Auth API

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/send-otp | Send OTP to phone number |
| POST | /api/auth/verify-otp | Verify OTP → create user → return tokens |
| POST | /api/auth/setup-pin | Set 4-digit PIN (after registration) |
| POST | /api/auth/login-pin | Login with phone + PIN |
| POST | /api/auth/refresh | Refresh token rotation |
| POST | /api/auth/logout | Revoke refresh token |
| GET | /api/auth/me | Get current user profile |
| PATCH | /api/auth/me | Update name etc. |

- OTP: simulated in dev (always "1234"), real SMS integration later
- JWT access token (15 min) + refresh token (30 days, rotation)
- PIN stored as bcrypt hash
- Biometric handled on mobile (unlocks stored token)

Files:
- `backend/lib/prisma.ts` — Prisma singleton
- `backend/lib/auth.ts` — JWT helpers, withAuth middleware
- `backend/lib/responses.ts` — standardized { success, data/error }
- `backend/lib/validators/auth.ts` — Zod schemas
- `backend/app/api/auth/send-otp/route.ts`
- `backend/app/api/auth/verify-otp/route.ts`
- `backend/app/api/auth/setup-pin/route.ts`
- `backend/app/api/auth/login-pin/route.ts`
- `backend/app/api/auth/refresh/route.ts`
- `backend/app/api/auth/logout/route.ts`
- `backend/app/api/auth/me/route.ts`

### 5. Medication API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/medications | List my medications (filter by status) |
| POST | /api/medications | Create medication → auto-generate intakes |
| GET | /api/medications/[id] | Medication detail |
| PATCH | /api/medications/[id] | Update medication |
| DELETE | /api/medications/[id] | Delete medication + cascade intakes |
| GET | /api/medications/today | Today's full schedule across all meds |
| GET | /api/medications/[id]/intakes | Intake history for a medication |
| PATCH | /api/medications/[id]/intakes/[intakeId] | Mark as TAKEN/MISSED/SKIPPED |

**Key logic**: POST /api/medications creates a Medication and generates MedicationIntake rows for each (day × time) from startDate to endDate.

Example: "Amoxicillin, 3x daily at 08:00/14:00/20:00, 14 days" → 42 intake rows.

Files:
- `backend/lib/validators/medications.ts`
- `backend/app/api/medications/route.ts`
- `backend/app/api/medications/today/route.ts`
- `backend/app/api/medications/[id]/route.ts`
- `backend/app/api/medications/[id]/intakes/route.ts`
- `backend/app/api/medications/[id]/intakes/[intakeId]/route.ts`

---

## Phase 1B: Mobile App

### 1. Expo Init
- Init `mobile/` with expo-router
- Deps: expo-secure-store, expo-local-authentication, @tanstack/react-query, react-hook-form, zod, expo-notifications, date-fns

### 2. Auth Screens
- **Register**: phone input → OTP verification → PIN setup → done
- **Login**: PIN pad + fingerprint button
- Biometric: expo-local-authentication → on success, use token from expo-secure-store
- AuthContext: access token in memory, refresh token in secure store

### 3. Medication Screens
- **Home (Today's Schedule)**: timeline view of today's medications with times, tap to mark taken
- **Medications List**: all medications, filter active/completed
- **Add Medication**: form — name, dosage, start date, duration (days/weeks), times per day, pick exact hours
- **Medication Detail**: info + intake calendar/history

### 4. Notifications
- expo-notifications: schedule local push at each medication time
- Reschedule when medications change

### Navigation
```
(auth)/
  register.tsx        — phone → OTP → PIN setup
  login.tsx           — PIN pad + biometric

(tabs)/
  index.tsx           — Today's medication schedule
  medications/
    index.tsx         — All medications
    [id].tsx          — Detail + intake history
    create.tsx        — Add medication form
  profile.tsx         — User info, logout
```

---

## Project Structure
```
medhelp/
  CLAUDE.md
  docker-compose.yml
  .gitignore
  .env.example
  plan/
  docs/
  backend/
    app/api/auth/...
    app/api/medications/...
    lib/
    prisma/
    package.json
  mobile/
    app/
    components/
    hooks/
    services/
    contexts/
    types/
    constants/
    package.json
```

---

## Verification

1. `docker compose up -d` → PostgreSQL on :5432, pgAdmin on :5050
2. POST /api/auth/send-otp → POST /api/auth/verify-otp → tokens returned
3. POST /api/auth/setup-pin → POST /api/auth/login-pin → works
4. POST /api/medications (create "Amoxicillin 3x/day for 2 weeks") → 42 intakes generated
5. GET /api/medications/today → returns today's schedule with times
6. PATCH intake → mark as TAKEN → takenAt populated
7. Mobile: register → login with PIN → see today's schedule → mark dose as taken → notification fires
