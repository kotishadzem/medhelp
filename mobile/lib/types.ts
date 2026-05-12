export type UserRole = "PATIENT" | "ADMIN";
export type MedicationStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "PAUSED";
export type IntakeStatus = "PENDING" | "TAKEN" | "MISSED" | "SKIPPED";

export type User = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  createdAt?: string;
};

export type Medication = {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  instructions: string | null;
  startDate: string;
  endDate: string;
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
  medication: Pick<Medication, "id" | "name" | "dosage" | "instructions" | "status">;
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

export type VerifyOtpResponse = AuthTokens & {
  isNewUser: boolean;
  hasPinSet: boolean;
  user: User;
};

export type LoginResponse = AuthTokens & {
  user: User;
};
