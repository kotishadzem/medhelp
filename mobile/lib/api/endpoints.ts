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
  MedicationType,
  User,
} from "@/lib/types";

export type Identifier = { phone: string } | { email: string };

export const authApi = {
  register: (id: Identifier, password: string) =>
    apiRequest<LoginResponse>("/auth/register", {
      method: "POST",
      body: { ...id, password },
      auth: false,
    }),

  login: (id: Identifier, password: string) =>
    apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { ...id, password },
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
  type: MedicationType;
  startDate: string;
  // Omit endDate for Forever medications (no end date).
  endDate?: string;
  frequencyPerDay: number;
  timesOfDay: string[];
  forUserId?: string;
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

  today: (days = 1) =>
    apiRequest<{ date: string; days: number; intakes: IntakeWithMedication[] }>(
      `/medications/today?days=${days}`
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

  report: (from: string, to: string) =>
    apiRequest<{
      from: string;
      to: string;
      days: string[];
      medications: {
        id: string;
        name: string;
        type: MedicationType;
        status: MedicationStatus;
        days: Record<string, { taken: number; total: number }>;
      }[];
    }>(`/medications/report?from=${from}&to=${to}`),
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
