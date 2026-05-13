-- Family link status enum
CREATE TYPE "FamilyLinkStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Family link table: requester ↔ target with custom display name and status.
CREATE TABLE "family_links" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "customName" TEXT NOT NULL,
  "status" "FamilyLinkStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "family_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "family_links_requesterId_targetId_key" ON "family_links"("requesterId", "targetId");
CREATE INDEX "family_links_targetId_status_idx" ON "family_links"("targetId", "status");
CREATE INDEX "family_links_requesterId_status_idx" ON "family_links"("requesterId", "status");

ALTER TABLE "family_links" ADD CONSTRAINT "family_links_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_links" ADD CONSTRAINT "family_links_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
