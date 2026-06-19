import { apiRequest, getCurrentAccessToken } from "./client";
import { API_URL } from "@/lib/config";
import type {
  DocumentType,
  FamilyLink,
  FamilyOverview,
  IntakeStatus,
  IntakeWithMedication,
  LoginResponse,
  MedicalDocument,
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

export type DocumentMetadataInput = {
  documentType: DocumentType;
  customType?: string;
  clinic: string;
  studyDate: string;
  notes?: string;
  forUserId?: string;
};

export type ListDocumentsParams = {
  from?: string;
  to?: string;
  clinic?: string;
  type?: DocumentType;
  q?: string;
  forUserId?: string;
};

export type DocumentFileInput = {
  uri: string;
  name: string;
  mimeType: string;
};

function buildDocumentsQuery(params: ListDocumentsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const documentsApi = {
  list: (params: ListDocumentsParams = {}) =>
    apiRequest<{ documents: MedicalDocument[] }>(
      `/documents${buildDocumentsQuery(params)}`
    ),

  detail: (id: string) =>
    apiRequest<{ document: MedicalDocument }>(`/documents/${id}`),

  create: (formData: FormData) =>
    apiRequest<{ document: MedicalDocument }>("/documents", {
      method: "POST",
      body: formData,
    }),

  replaceFile: (id: string, formData: FormData) =>
    apiRequest<{ document: MedicalDocument }>(`/documents/${id}/file`, {
      method: "POST",
      body: formData,
    }),

  update: (id: string, patch: Partial<DocumentMetadataInput>) =>
    apiRequest<{ document: MedicalDocument }>(`/documents/${id}`, {
      method: "PATCH",
      body: patch,
    }),

  remove: (id: string) =>
    apiRequest<{ message: string }>(`/documents/${id}`, { method: "DELETE" }),

  clinics: () => apiRequest<{ clinics: string[] }>("/documents/clinics"),

  fileUrl: (id: string) => {
    const token = getCurrentAccessToken();
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${API_URL}/documents/${id}/file${qs}`;
  },
};

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
