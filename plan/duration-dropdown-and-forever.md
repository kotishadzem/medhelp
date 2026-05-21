# Medication Duration: Dropdown + Custom + Forever

## Goal
Replace the segmented "duration" control in the medication create form with a dropdown offering:
- 3 / 7 / 14 / 30 days (presets)
- Custom — user types the number of days
- Forever — no end date; runs until manually paused or completed

Start date stays as a date picker.

## Decisions

### Forever ⇒ nullable `endDate`
`Medication.endDate` becomes nullable in the DB.

### How intakes are generated for Forever
Intakes today are precomputed per (day × time) at create time. For Forever there is no fixed end, so:

- On create, if `endDate` is null, generate intakes for a **90-day horizon** from `startDate`.
- A future task (out of scope here) needs to extend this horizon periodically (e.g. nightly cron) — otherwise notifications will run out 90 days in.

This keeps the existing `today` endpoint and notification scheduler unchanged.

### API contract
- `POST /medications` body: `endDate` is now optional. Omit it ⇒ Forever.
- `Medication.endDate` in responses: `string | null`.

## File changes

### Backend
- `prisma/schema.prisma` — `endDate DateTime?`
- `prisma/migrations/<ts>_medication_endDate_nullable/migration.sql` — `ALTER COLUMN ... DROP NOT NULL`
- `lib/validators/medications.ts` — `endDate: z.coerce.date().optional()`
- `app/api/medications/route.ts` — branch intake generation on `endDate` presence; persist `null` when Forever

### Mobile
- `lib/types.ts` — `endDate: string | null`
- `lib/api/endpoints.ts` — `CreateMedicationInput.endDate?: string`
- `app/(tabs)/medications/create.tsx`
  - `durationMode: "preset" | "custom" | "forever"`
  - Dropdown via Modal sheet (mirrors the existing calendar sheet)
  - Custom: numeric input bounded to [1, 365]
  - Forever: hide helper that shows end date / total intakes; replace with "ongoing" copy
  - Submit: omit `endDate` when Forever
- `app/(tabs)/medications/[id].tsx` — show "ongoing" badge instead of end-date stat when null
- `app/(tabs)/medications/index.tsx` — show start-date + "ongoing" in the meta row when null

### i18n (ka/en/de)
- `medications.field.durationMode.preset|custom|forever`
- `medications.field.customDays`, `medications.field.customDaysPlaceholder`
- `medications.field.foreverHelper`
- `medications.detail.ongoing`

## Out of scope (follow-up)
- Cron job to extend Forever intake horizon as it elapses.
- Editing duration on an existing medication (today the form only creates).
