-- 1. New join table.
CREATE TABLE "document_share_documents" (
    "shareId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_share_documents_pkey" PRIMARY KEY ("shareId", "documentId")
);
CREATE INDEX "document_share_documents_documentId_idx" ON "document_share_documents"("documentId");
ALTER TABLE "document_share_documents"
    ADD CONSTRAINT "document_share_documents_shareId_fkey"
    FOREIGN KEY ("shareId") REFERENCES "document_shares"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_share_documents"
    ADD CONSTRAINT "document_share_documents_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Copy each existing single-doc share into the join table.
INSERT INTO "document_share_documents" ("shareId", "documentId", "addedAt")
SELECT "id", "documentId", "createdAt"
FROM "document_shares";

-- 3. Drop the now-relocated FK and column on document_shares.
ALTER TABLE "document_shares" DROP CONSTRAINT IF EXISTS "document_shares_documentId_fkey";
DROP INDEX IF EXISTS "document_shares_documentId_idx";
ALTER TABLE "document_shares" DROP COLUMN "documentId";
