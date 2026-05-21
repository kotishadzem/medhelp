-- Forever medications: no fixed end date.
ALTER TABLE "medications" ALTER COLUMN "endDate" DROP NOT NULL;
