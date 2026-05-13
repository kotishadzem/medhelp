import { apiRequest } from "./client";
import type {
  FamilyLink,
  FamilyOverview,
  IntakeStatus,
  IntakeWithMedication,
  LoginResponse,
  Medication,
  MedicationIntake,
  MedicationStatus,
  User,
  VerifyOtpResponse,
} from "@/lib/types";

export type Identifier = { phone: string } | { email: string };

export const authApi = {
  // OTP-less: create-or-login by phone/email, returns tokens directly.
  identify: (id: Identifier) =>
    apiRequest<VerifyOtpResponse>("/auth/identify", {
      method: "POST",
      body: id,
      auth: false,
    }),

  setupPin: (pin: string) =>
    apiRequest<{ message: string }>("/auth/setup-pin", {
      method: "POST",
      body: { pin },
    }),

  loginPin: (id: Identifier, pin: string) =>
    apiRequest<LoginResponse>("/auth/login-pin", {
      method: "POST",
      body: { ...id, pin },
      auth: false,
    }),

  logout: (refreshToken: string) =>
    apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    }),

  me: () => apiRequest<{ user: User }>("/auth/me"),

  updateProfile: (data: { firstName?: string; lastName?: string }) =>
    apiRequest<{ user: User }>("/auth/me", {
      method: "PATCH",
      body: data,
    }),
};

export type CreateMedicationInput = {
  name: string;
  dosage: string;
  instructions?: string;
  startDate: string;
  endDate: string;
  frequencyPerDay: number;
  timesOfDay: string[];
};

export type UpdateMedicationInput = {
  name?: string;
  dosage?: string;
  instructions?: string | null;
  status?: MedicationStatus;
};

export const medicationsApi = {
  list: (status?: MedicationStatus) =>
    apiRequest<{ medications: Medication[] }>(
      `/medications${status ? `?status=${status}` : ""}`
    ),

  today: () =>
    apiRequest<{ date: string; intakes: IntakeWithMedication[] }>(
      "/medications/today"
    ),

  detail: (id: string) =>
    apiRequest<{ medication: Medication & { intakes: MedicationIntake[] } }>(
      `/medications/${id}`
    ),

  create: (input: CreateMedicationInput) =>
    apiRequest<{ medication: Medication }>("/medications", {
      method: "POST",
      body: input,
    }),

  update: (id: string, input: UpdateMedicationInput) =>
    apiRequest<{ medication: Medication }>(`/medications/${id}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: string) =>
    apiRequest<{ message: string }>(`/medications/${id}`, {
      method: "DELETE",
    }),

  intakes: (id: string, date?: string) =>
    apiRequest<{ intakes: MedicationIntake[] }>(
      `/medications/${id}/intakes${date ? `?date=${date}` : ""}`
    ),

  updateIntake: (medicationId: string, intakeId: string, status: IntakeStatus) =>
    apiRequest<{ intake: MedicationIntake }>(
      `/medications/${medicationId}/intakes/${intakeId}`,
      { method: "PATCH", body: { status } }
    ),
};

export type CreateFamilyInput = { customName: string } & Identifier;

export const familyApi = {
  list: () =>
    apiRequest<{ outgoing: FamilyLink[]; incoming: FamilyLink[] }>("/family"),

  add: (input: CreateFamilyInput) =>
    apiRequest<{ link: FamilyLink }>("/family", { method: "POST", body: input }),

  respond: (id: string, status: "ACCEPTED" | "REJECTED") =>
    apiRequest<{ link: FamilyLink }>(`/family/${id}`, {
      method: "PATCH",
      body: { status },
    }),

  remove: (id: string) =>
    apiRequest<{ message: string }>(`/family/${id}`, { method: "DELETE" }),

  overview: (id: string) =>
    apiRequest<FamilyOverview>(`/family/${id}/overview`),
};
