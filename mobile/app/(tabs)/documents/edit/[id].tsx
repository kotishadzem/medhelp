import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import { Button } from "@/components/Button";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { MonthCalendar } from "@/components/MonthCalendar";
import { documentsApi } from "@/lib/api/endpoints";
import { confirm } from "@/lib/confirm";
import { formatDateLong } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";
import type { DocumentType, MedicalDocumentFile } from "@/lib/types";

const DOC_TYPES: DocumentType[] = [
  "FORM_100",
  "PRESCRIPTION",
  "BLOOD_TEST",
  "CT_SCAN",
  "MRI_SCAN",
  "ULTRASOUND",
  "ECG",
  "LAB_ANALYSIS",
  "OTHER",
];

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];
const MAX_BYTES = 15 * 1024 * 1024;

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  webFile: File | Blob | null;
};

function appendFilePart(form: FormData, file: PickedFile) {
  if (file.webFile) {
    form.append("file", file.webFile, file.name);
  } else {
    form.append(
      "file",
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as unknown as Blob
    );
  }
}

export default function EditDocumentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detailQuery = useQuery({
    queryKey: ["documents", "detail", id],
    queryFn: () => documentsApi.detail(id),
    enabled: !!id,
  });

  const clinicsQuery = useQuery({
    queryKey: ["documents", "clinics"],
    queryFn: () => documentsApi.clinics(),
  });

  const [documentType, setDocumentType] = useState<DocumentType>("FORM_100");
  const [customType, setCustomType] = useState("");
  const [clinic, setClinic] = useState("");
  const [studyYMD, setStudyYMD] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [newFiles, setNewFiles] = useState<PickedFile[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showClinicSuggestions, setShowClinicSuggestions] = useState(false);

  useEffect(() => {
    const doc = detailQuery.data?.document;
    if (!doc) return;
    setDocumentType(doc.documentType);
    setCustomType(doc.customType ?? "");
    setClinic(doc.clinic);
    setStudyYMD(doc.studyDate.slice(0, 10));
    setNotes(doc.notes ?? "");
  }, [detailQuery.data]);

  const clinicSuggestions = useMemo(() => {
    const all = clinicsQuery.data?.clinics ?? [];
    const q = clinic.trim().toLowerCase();
    if (!q) return all.slice(0, 5);
    return all.filter((c) => c.toLowerCase().includes(q)).slice(0, 5);
  }, [clinic, clinicsQuery.data]);

  const canSave =
    !!detailQuery.data && !!clinic.trim() && !!documentType && !!studyYMD;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await documentsApi.update(id, {
        documentType,
        customType: customType.trim() || undefined,
        clinic: clinic.trim(),
        studyDate: `${studyYMD}T00:00:00.000Z`,
        notes: notes.trim() || undefined,
      });
      if (newFiles.length > 0) {
        const form = new FormData();
        for (const f of newFiles) appendFilePart(form, f);
        await documentsApi.addFiles(id, form);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents", "detail", id] });
      router.back();
    },
    onError: (e) => {
      Alert.alert(
        t("documents.errors.uploadFailed"),
        e instanceof Error ? e.message : ""
      );
    },
  });

  const removeFileMutation = useMutation({
    mutationFn: (fileId: string) => documentsApi.removeFile(id, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["documents", "detail", id] });
    },
    onError: (e) => {
      Alert.alert(
        t("documents.errors.deleteFailed"),
        e instanceof Error ? e.message : ""
      );
    },
  });

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ALLOWED_MIMES,
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const added: PickedFile[] = [];
    for (const asset of result.assets) {
      const mime = (asset.mimeType ?? "application/octet-stream").toLowerCase();
      if (!ALLOWED_MIMES.includes(mime)) {
        Alert.alert(t("documents.errors.unsupportedType"), asset.name ?? "");
        continue;
      }
      const size = asset.size ?? 0;
      if (size > MAX_BYTES) {
        Alert.alert(t("documents.errors.fileTooBig"), asset.name ?? "");
        continue;
      }
      added.push({
        uri: asset.uri,
        name: asset.name ?? "document",
        mimeType: mime,
        size,
        webFile: (asset as { file?: File }).file ?? null,
      });
    }
    if (added.length === 0) return;
    setNewFiles((prev) => [...prev, ...added]);
  }

  async function removeExistingFile(file: MedicalDocumentFile) {
    const ok = await confirm({
      title: t("documents.removeFileConfirmTitle"),
      body: t("documents.removeFileConfirmBody", { name: file.fileName }),
      confirmLabel: t("documents.actions.delete"),
      cancelLabel: t("documents.actions.cancel"),
    });
    if (ok) removeFileMutation.mutate(file.id);
  }

  function removeNewFile(idx: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentDoc = detailQuery.data.document;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("documents.editTitle")}</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label={t("documents.fields.documentType")}>
            <Pressable
              onPress={() => setShowTypePicker(true)}
              style={({ pressed }) => [styles.input, styles.inputPickable, pressed && styles.pressed]}
            >
              <DocumentTypeIcon type={documentType} size={32} />
              <Text style={styles.inputValue}>{t(`documents.type.${documentType}`)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
          </Field>

          <Field label={t("documents.fields.customType")}>
            <TextInput
              value={customType}
              onChangeText={setCustomType}
              placeholder={documentType === "BLOOD_TEST" ? "HbA1c" : ""}
              placeholderTextColor={colors.textDim}
              style={styles.input}
              maxLength={120}
            />
          </Field>

          <Field label={t("documents.fields.clinic")}>
            <TextInput
              value={clinic}
              onChangeText={(v) => {
                setClinic(v);
                setShowClinicSuggestions(true);
              }}
              onFocus={() => setShowClinicSuggestions(true)}
              style={styles.input}
              maxLength={200}
            />
            {showClinicSuggestions && clinicSuggestions.length > 0 && (
              <View style={styles.suggestionList}>
                {clinicSuggestions.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => {
                      setClinic(c);
                      setShowClinicSuggestions(false);
                    }}
                    style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                  >
                    <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.suggestionText}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Field>

          <Field label={t("documents.fields.studyDate")}>
            <Pressable
              onPress={() => setShowCalendar(true)}
              style={({ pressed }) => [styles.input, styles.inputPickable, pressed && styles.pressed]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.inputValue}>
                {studyYMD ? formatDateLong(`${studyYMD}T00:00:00`) : ""}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
          </Field>

          <Field label={t("documents.fields.notes")}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.textArea]}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
          </Field>

          <Text style={styles.sectionLabel}>{t("documents.attachedFiles")}</Text>
          <View style={styles.fileList}>
            {currentDoc.files.map((f) => (
              <View key={f.id} style={styles.fileChip}>
                <Ionicons
                  name={f.mimeType.startsWith("image/") ? "image-outline" : "document-outline"}
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.fileChipName} numberOfLines={1}>
                  {f.fileName}
                </Text>
                <Text style={styles.fileChipSize}>
                  {Math.round(f.fileSize / 1024)} KB
                </Text>
                {currentDoc.files.length > 1 && (
                  <Pressable
                    onPress={() => removeExistingFile(f)}
                    hitSlop={6}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            ))}
            {newFiles.map((f, idx) => (
              <View key={`new-${idx}`} style={[styles.fileChip, styles.fileChipNew]}>
                <Ionicons name="add-circle" size={16} color={colors.primary} />
                <Text style={styles.fileChipName} numberOfLines={1}>
                  {f.name}
                </Text>
                <Text style={styles.fileChipSize}>
                  {Math.round(f.size / 1024)} KB
                </Text>
                <Pressable
                  onPress={() => removeNewFile(idx)}
                  hitSlop={6}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Ionicons name="close" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            <Pressable
              onPress={pickFiles}
              style={({ pressed }) => [styles.addFilesBtn, pressed && styles.pressed]}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addFilesBtnText}>{t("documents.actions.addFiles")}</Text>
            </Pressable>
          </View>

          <Button
            label={t("documents.actions.save")}
            onPress={() => saveMutation.mutate()}
            disabled={!canSave}
            loading={saveMutation.isPending}
            style={{ marginTop: spacing.lg }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTypePicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("documents.fields.documentType")}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {DOC_TYPES.map((dt) => (
                <Pressable
                  key={dt}
                  onPress={() => {
                    setDocumentType(dt);
                    setShowTypePicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalRow,
                    dt === documentType && styles.modalRowActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <DocumentTypeIcon type={dt} size={32} />
                  <Text style={styles.modalRowText}>{t(`documents.type.${dt}`)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCalendar(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("documents.fields.studyDate")}</Text>
            <MonthCalendar
              value={studyYMD || new Date().toISOString().slice(0, 10)}
              onChange={(d) => {
                setStudyYMD(d);
                setShowCalendar(false);
              }}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCalendar(false)}
                style={({ pressed }) => [styles.modalActionBtn, pressed && styles.pressed]}
              >
                <Text style={styles.modalActionMain}>{t("documents.actions.cancel")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  pressed: { opacity: 0.7 },

  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  field: { gap: spacing.xs + 2 },
  fieldLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: fontSize.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  inputPickable: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  inputValue: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  textArea: { minHeight: 96 },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fileList: { gap: spacing.xs },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fileChipNew: { borderColor: colors.primary + "55" },
  fileChipName: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  fileChipSize: { color: colors.textMuted, fontSize: fontSize.xs },
  addFilesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  addFilesBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "700" },

  suggestionList: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: { color: colors.text, fontSize: fontSize.sm },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  modalTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  modalRowActive: { backgroundColor: colors.primaryMuted },
  modalRowText: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  modalActions: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  modalActionBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  modalActionMain: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
});
