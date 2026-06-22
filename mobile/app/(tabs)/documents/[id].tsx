import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { Button } from "@/components/Button";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { ShareModal } from "@/components/ShareModal";
import { documentsApi } from "@/lib/api/endpoints";
import { confirm } from "@/lib/confirm";
import { formatDateLong } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";
import type { MedicalDocumentFile } from "@/lib/types";

export default function DocumentDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const documentQuery = useQuery({
    queryKey: ["documents", "detail", id],
    queryFn: () => documentsApi.detail(id),
    enabled: !!id,
  });

  const removeMutation = useMutation({
    mutationFn: () => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      router.back();
    },
    onError: (e) => {
      Alert.alert(
        t("documents.errors.deleteFailed"),
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

  const [shareOpen, setShareOpen] = useState(false);

  if (documentQuery.isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const doc = documentQuery.data?.document;
  if (!doc) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t("documents.errors.loadFailed")}</Text>
          <Button label={t("documents.actions.cancel")} onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const openFile = async (fileId: string) => {
    const url = documentsApi.fileUrl(doc.id, fileId);
    if (Platform.OS === "web") {
      window.open(url, "_blank");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      await Linking.openURL(url);
    }
  };

  const onDeleteFile = async (file: MedicalDocumentFile) => {
    const ok = await confirm({
      title: t("documents.removeFileConfirmTitle"),
      body: t("documents.removeFileConfirmBody", { name: file.fileName }),
      confirmLabel: t("documents.actions.delete"),
      cancelLabel: t("documents.actions.cancel"),
    });
    if (ok) removeFileMutation.mutate(file.id);
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t("documents.deleteConfirmTitle"),
      body: t("documents.deleteConfirmBody", {
        name: doc.customType?.trim() || t(`documents.type.${doc.documentType}`),
      }),
      confirmLabel: t("documents.actions.delete"),
      cancelLabel: t("documents.actions.cancel"),
    });
    if (ok) removeMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {doc.customType?.trim() || t(`documents.type.${doc.documentType}`)}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setShareOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.editBtnText}>{t("documents.share.action")}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/(tabs)/documents/edit/[id]", params: { id: doc.id } })
            }
            hitSlop={8}
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>{t("documents.actions.edit")}</Text>
          </Pressable>
        </View>
      </View>

      <ShareModal
        visible={shareOpen}
        documentIds={[doc.id]}
        onClose={() => setShareOpen(false)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Row label={t("documents.fields.documentType")} value={t(`documents.type.${doc.documentType}`)} />
        {doc.customType && (
          <Row label={t("documents.fields.customType")} value={doc.customType} />
        )}
        <Row label={t("documents.fields.clinic")} value={doc.clinic} />
        <Row label={t("documents.fields.studyDate")} value={formatDateLong(doc.studyDate)} />
        <Row label={t("documents.fields.uploadedAt")} value={formatDateLong(doc.uploadedAt)} />
        {doc.notes && <Row label={t("documents.fields.notes")} value={doc.notes} multiline />}

        <View style={styles.filesSection}>
          <Text style={styles.filesSectionLabel}>
            {t("documents.attachedFiles")} ·{" "}
            {t("documents.filesCount", { count: doc.files.length })}
          </Text>
          {doc.files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              docType={doc.documentType}
              onOpen={() => openFile(f.id)}
              onDelete={
                doc.files.length > 1 ? () => onDeleteFile(f) : undefined
              }
              fileUrl={documentsApi.fileUrl(doc.id, f.id)}
              tOpen={t("documents.actions.openFile")}
              tDelete={t("documents.actions.delete")}
            />
          ))}
        </View>

        <Button
          label={t("documents.actions.delete")}
          onPress={onDelete}
          loading={removeMutation.isPending}
          style={{ marginTop: spacing.xl, backgroundColor: colors.danger }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function FileRow({
  file,
  docType,
  fileUrl,
  onOpen,
  onDelete,
  tOpen,
  tDelete,
}: {
  file: MedicalDocumentFile;
  docType: import("@/lib/types").DocumentType;
  fileUrl: string;
  onOpen: () => void;
  onDelete?: () => void;
  tOpen: string;
  tDelete: string;
}) {
  const isImage = file.mimeType.startsWith("image/");
  return (
    <View style={styles.fileCard}>
      <View style={styles.fileCardPreview}>
        {isImage ? (
          <Image source={{ uri: fileUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <DocumentTypeIcon type={docType} size={64} />
        )}
      </View>
      <View style={styles.fileCardBody}>
        <Text style={styles.fileCardName} numberOfLines={2}>
          {file.fileName}
        </Text>
        <Text style={styles.fileCardMeta}>
          {Math.round(file.fileSize / 1024)} KB · {file.mimeType.split("/")[1]?.toUpperCase()}
        </Text>
        <View style={styles.fileCardActions}>
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => [styles.fileAction, pressed && styles.pressed]}
          >
            <Ionicons name="open-outline" size={14} color={colors.primary} />
            <Text style={styles.fileActionTextPrimary}>{tOpen}</Text>
          </Pressable>
          {onDelete && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.fileAction, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={styles.fileActionTextDanger}>{tDelete}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, multiline && styles.rowValueMulti]}>{value}</Text>
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
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", flex: 1, textAlign: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 32,
  },
  editBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "700" },
  pressed: { opacity: 0.7 },
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

  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  errorText: { color: colors.danger, fontSize: fontSize.md },

  filesSection: { gap: spacing.sm, marginTop: spacing.md },
  filesSectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fileCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fileCardPreview: { width: 72, alignItems: "center", justifyContent: "center" },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bg },
  fileCardBody: { flex: 1, gap: spacing.xs },
  fileCardName: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700" },
  fileCardMeta: { color: colors.textMuted, fontSize: fontSize.xs },
  fileCardActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  fileAction: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  fileActionTextPrimary: { color: colors.primary, fontSize: fontSize.xs, fontWeight: "700" },
  fileActionTextDanger: { color: colors.danger, fontSize: fontSize.xs, fontWeight: "700" },

  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rowLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  rowValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  rowValueMulti: { fontWeight: "400", lineHeight: 22 },
});

