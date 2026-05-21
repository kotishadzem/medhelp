-- Medication form factor: tablet or injection.
CREATE TYPE "MedicationType" AS ENUM ('TABLET', 'INJECTION');

ALTER TABLE "medications"
  ADD COLUMN "type" "MedicationType" NOT NULL DEFAULT 'TABLET';
