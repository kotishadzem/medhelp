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
│   ├── app/api/{auth,medications}
│   ├── lib/{prisma,auth,responses,validators}
│   ├── prisma/schema.prisma
│   └── proxy.ts           # Next.js 16 CORS proxy for dev
└── mobile/                # Expo / React Native app
    ├── app/               # Expo Router file-based routes
    │   ├── _layout.tsx    # Providers + Stack.Protected guards
    │   ├── (auth)/        # register / login (multi-step state machines)
    │   └── (tabs)/        # Today / Medications / Profile
    ├── components/        # Button, PinPad, StatusBadge
    └── lib/
        ├── api/           # fetch client (auto-refresh) + typed endpoints
        ├── auth/          # AuthContext + secure-store wrappers
        ├── notifications/ # expo-notifications scheduling (native only)
        ├── theme.ts, format.ts, phone.ts, types.ts, queryClient.ts
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
2. `cd backend && npx prisma migrate deploy` — Apply migrations
3. `cd backend && npm run dev` — Start API server on :3002
4. `cd mobile && npx expo start` — Start the Expo dev server
   - `w` to open in web browser, `i`/`a` for iOS/Android
   - Default API URL: `http://localhost:3002/api` on web/iOS,
     `http://10.0.2.2:3002/api` on Android emulator
   - Override with `EXPO_PUBLIC_API_URL` in `mobile/.env`
5. pgAdmin available at http://localhost:5050 (admin@medhelp.local / admin)

## Mobile App Architecture

### Routing & auth state

- `app/_layout.tsx` is the root. It wires `GestureHandlerRootView`,
  `SafeAreaProvider`, `QueryClientProvider`, `AuthProvider`, and a
  `Stack` whose contents are gated by `Stack.Protected` guards.
- `AuthContext` state machine: `loading` → `unauthenticated` /
  `authenticated`, plus a `pendingPinSetup` flag for users who verified
  OTP but haven't picked a PIN yet. The root navigator keeps the
  `(auth)` group active until both checks pass.
- Secure storage holds the refresh token; the access token lives in
  memory only. The fetch client auto-refreshes on 401 with a single
  in-flight refresh promise, falling back to a forced logout on
  failure.

### Notifications

- `lib/notifications` wraps `expo-notifications`. When a medication is
  created, we re-fetch its intakes and schedule one `DATE`-triggered
  notification per pending intake. An AsyncStorage-backed
  `intakeId → identifier` map enables cancellation when a dose is
  marked TAKEN, when status changes (PAUSED/COMPLETED/CANCELLED), or
  when the medication is deleted. Logout cancels every scheduled
  notification. Web is a no-op.

