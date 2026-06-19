import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import { documentsApi } from "@/lib/api/endpoints";
import { confirm } from "@/lib/confirm";
import { formatDateLong, formatDateShort } from "@/lib/format";
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

  const [shareData, setShareData] = useState<{ url: string; expiresAt: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () => documentsApi.createShare(id),
    onSuccess: (data) => {
      setShareData({ url: data.url, expiresAt: data.share.expiresAt });
      setLinkCopied(false);
    },
    onError: () => {
      Alert.alert(t("documents.share.createFailed"));
    },
  });

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
            onPress={() => shareMutation.mutate()}
            hitSlop={8}
            style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
            disabled={shareMutation.isPending}
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
        share={shareData}
        copied={linkCopied}
        onCopied={() => setLinkCopied(true)}
        onClose={() => setShareData(null)}
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

function ShareModal({
  share,
  copied,
  onCopied,
  onClose,
}: {
  share: { url: string; expiresAt: string } | null;
  copied: boolean;
  onCopied: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!share) return null;
  const expiresLabel = formatDateShort(share.expiresAt);

  const copyLink = async () => {
    try {
      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(share.url);
      } else {
        // Native: requires expo-clipboard — fall back to system share which
        // also lets the user copy. Skip silently if neither is available.
      }
      onCopied();
    } catch {
      // ignore — the link is still visible for manual copy.
    }
  };

  const sendViaEmail = () => {
    const subject = encodeURIComponent(t("documents.share.emailSubject"));
    const body = encodeURIComponent(
      `${t("documents.share.emailBody")}\n\n${share.url}`
    );
    const url = `mailto:?subject=${subject}&body=${body}`;
    if (Platform.OS === "web") {
      window.open(url, "_self");
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  const systemShare = async () => {
    if (Platform.OS === "web") {
      const nav = navigator as { share?: (data: { title: string; url: string }) => Promise<void> };
      if (nav.share) {
        try {
          await nav.share({
            title: t("documents.share.emailSubject"),
            url: share.url,
          });
        } catch {
          // user cancelled
        }
      } else {
        await copyLink();
      }
      return;
    }
    try {
      const { Share } = await import("react-native");
      await Share.share({ message: share.url, url: share.url });
    } catch {
      // ignore
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={shareStyles.backdrop} onPress={onClose}>
        <Pressable style={shareStyles.card} onPress={() => {}}>
          <Text style={shareStyles.title}>{t("documents.share.title")}</Text>
          <Text style={shareStyles.hint}>
            {t("documents.share.hint", { expires: expiresLabel })}
          </Text>
          <View style={shareStyles.linkBox}>
            <Ionicons name="link-outline" size={16} color={colors.textMuted} />
            <Text style={shareStyles.linkText} numberOfLines={1}>
              {share.url}
            </Text>
          </View>
          <View style={shareStyles.actions}>
            <ActionButton
              icon="copy-outline"
              label={copied ? t("documents.share.copied") : t("documents.share.copyLink")}
              onPress={copyLink}
              tone={copied ? "success" : "primary"}
            />
            <ActionButton
              icon="mail-outline"
              label={t("documents.share.viaEmail")}
              onPress={sendViaEmail}
              tone="primary"
            />
            <ActionButton
              icon="share-social-outline"
              label={t("documents.share.viaSystem")}
              onPress={systemShare}
              tone="primary"
            />
          </View>
          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalActionMain}>{t("documents.actions.cancel")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: "primary" | "success";
}) {
  const color = tone === "success" ? colors.success : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        shareStyles.actionBtn,
        { borderColor: color + "55", backgroundColor: color + "18" },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[shareStyles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
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

const shareStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  hint: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  linkBox: {
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
  linkText: { flex: 1, color: colors.text, fontSize: fontSize.xs },
  actions: { gap: spacing.sm },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: fontSize.sm, fontWeight: "700" },
});
