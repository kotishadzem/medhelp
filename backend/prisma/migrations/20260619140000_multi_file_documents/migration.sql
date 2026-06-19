-- 1. Create the new MedicalDocumentFile table.
CREATE TABLE "medical_document_files" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_document_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medical_document_files_documentId_idx"
    ON "medical_document_files"("documentId");

ALTER TABLE "medical_document_files"
    ADD CONSTRAINT "medical_document_files_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Move each existing medical_documents row's file metadata into a file row.
INSERT INTO "medical_document_files" (
    "id", "documentId", "fileName", "storagePath", "mimeType", "fileSize", "uploadedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text)::text,
    "id",
    "fileName",
    "storagePath",
    "mimeType",
    "fileSize",
    "uploadedAt"
FROM "medical_documents";

-- 3. Drop the now-relocated columns from medical_documents.
ALTER TABLE "medical_documents" DROP COLUMN "fileName";
ALTER TABLE "medical_documents" DROP COLUMN "storagePath";
ALTER TABLE "medical_documents" DROP COLUMN "mimeType";
ALTER TABLE "medical_documents" DROP COLUMN "fileSize";
