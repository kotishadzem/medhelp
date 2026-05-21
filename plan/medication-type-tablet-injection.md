# Medication Type: Tablet or Injection

## Goal
1. On the create form, the user picks whether the medication is a tablet or an injection.
2. In the upcoming/today screen, the per-intake action button shows a pill icon for tablets and a needle icon for injections (replacing the previous checkmark/circle).

## File changes

### Backend
- `prisma/schema.prisma` — new `MedicationType` enum (`TABLET`, `INJECTION`); `Medication.type` column with `@default(TABLET)` for backwards compat with existing rows.
- `prisma/migrations/20260517130000_medication_type/migration.sql` — `CREATE TYPE` + `ADD COLUMN ... NOT NULL DEFAULT 'TABLET'`.
- `lib/validators/medications.ts` — `type: z.enum(["TABLET", "INJECTION"]).default("TABLET")`.
- `app/api/medications/route.ts` — pass `type` through to `prisma.medication.create`.
- `app/api/medications/today/route.ts` — include `type` in the `medication` select so the today endpoint returns it.

### Mobile
- `lib/types.ts` — `MedicationType` union, `Medication.type`, included in `IntakeWithMedication` pick.
- `lib/api/endpoints.ts` — `CreateMedicationInput.type` (required).
- `app/(tabs)/medications/create.tsx` — segmented selector between Name+Dosage and Instructions, with pill / needle icons (MaterialCommunityIcons).
- `app/(tabs)/index.tsx` — `checkBtn` icon swapped from `Ionicons checkmark|ellipse-outline` to `MaterialCommunityIcons pill|needle`. Color still distinguishes TAKEN (white-on-green) vs not-yet (muted-on-neutral).

### i18n (ka/en/de)
- `medications.field.type`
- `medications.field.typeOption.TABLET`, `medications.field.typeOption.INJECTION`

## Notes
- `MaterialCommunityIcons` is already bundled via `@expo/vector-icons`.
- Existing rows in DB get `TABLET` automatically via column default.
