-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FORM_100', 'PRESCRIPTION', 'BLOOD_TEST', 'CT_SCAN', 'MRI_SCAN', 'ULTRASOUND', 'ECG', 'LAB_ANALYSIS', 'OTHER');

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "forUserId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "customType" TEXT,
    "clinic" TEXT NOT NULL,
    "studyDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_documents_userId_studyDate_idx" ON "medical_documents"("userId", "studyDate" DESC);

-- CreateIndex
CREATE INDEX "medical_documents_userId_clinic_idx" ON "medical_documents"("userId", "clinic");

-- CreateIndex
CREATE INDEX "medical_documents_userId_documentType_idx" ON "medical_documents"("userId", "documentType");

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
