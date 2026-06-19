export type UserRole = "PATIENT" | "ADMIN";
export type MedicationStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "PAUSED";
export type MedicationType = "TABLET" | "INJECTION";
export type IntakeStatus = "PENDING" | "TAKEN" | "MISSED" | "SKIPPED";

export type User = {
  id: string;
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  createdAt?: string;
  hasPin?: boolean;
};

export type Medication = {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  instructions: string | null;
  type: MedicationType;
  startDate: string;
  endDate: string | null;
  frequencyPerDay: number;
  timesOfDay: string[];
  status: MedicationStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { intakes: number };
};

export type MedicationIntake = {
  id: string;
  medicationId: string;
  scheduledAt: string;
  takenAt: string | null;
  status: IntakeStatus;
  createdAt: string;
};

export type IntakeWithMedication = MedicationIntake & {
  medication: Pick<Medication, "id" | "name" | "dosage" | "instructions" | "status" | "type">;
};

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = AuthTokens & {
  user: User;
};

export type FamilyLinkStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type FamilyParty = {
  id: string;
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type FamilyLink = {
  id: string;
  requesterId: string;
  targetId: string;
  customName: string;
  status: FamilyLinkStatus;
  createdAt: string;
  respondedAt: string | null;
  // populated on the listing endpoint depending on direction
  target?: FamilyParty;
  requester?: FamilyParty;
};

export type FamilyOverview = {
  target: FamilyParty;
  medications: Medication[];
  stats: {
    total: number;
    taken: number;
    missed: number;
    skipped: number;
    pending: number;
    completionPct: number;
  };
  today: IntakeWithMedication[];
};

export type DocumentType =
  | "FORM_100"
  | "PRESCRIPTION"
  | "BLOOD_TEST"
  | "CT_SCAN"
  | "MRI_SCAN"
  | "ULTRASOUND"
  | "ECG"
  | "LAB_ANALYSIS"
  | "OTHER";

export type MedicalDocument = {
  id: string;
  userId: string;
  forUserId: string | null;
  documentType: DocumentType;
  customType: string | null;
  clinic: string;
  studyDate: string;
  notes: string | null;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
};
