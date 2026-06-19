CREATE TABLE "document_shares" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_shares_token_key" ON "document_shares"("token");
CREATE INDEX "document_shares_documentId_idx" ON "document_shares"("documentId");

ALTER TABLE "document_shares"
    ADD CONSTRAINT "document_shares_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_shares"
    ADD CONSTRAINT "document_shares_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
