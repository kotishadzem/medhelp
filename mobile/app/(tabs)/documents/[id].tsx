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
import { documentsApi } from "@/lib/api/endpoints";
import { confirm } from "@/lib/confirm";
import { formatDateLong } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

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

  const fileUrl = documentsApi.fileUrl(doc.id);
  const isImage = doc.mimeType.startsWith("image/");

  const openFile = async () => {
    if (Platform.OS === "web") {
      window.open(fileUrl, "_blank");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch {
      await Linking.openURL(fileUrl);
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t("documents.deleteConfirmTitle"),
      body: t("documents.deleteConfirmBody", { name: doc.fileName }),
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
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.previewCard}>
          {isImage ? (
            <Image source={{ uri: fileUrl }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.previewPdf}>
              <DocumentTypeIcon type={doc.documentType} size={80} />
              <Text style={styles.previewPdfText}>{doc.fileName}</Text>
            </View>
          )}
          <Button label={t("documents.actions.openFile")} onPress={openFile} variant="secondary" />
        </View>

        <Row label={t("documents.fields.documentType")} value={t(`documents.type.${doc.documentType}`)} />
        {doc.customType && (
          <Row label={t("documents.fields.customType")} value={doc.customType} />
        )}
        <Row label={t("documents.fields.clinic")} value={doc.clinic} />
        <Row label={t("documents.fields.studyDate")} value={formatDateLong(doc.studyDate)} />
        <Row label={t("documents.fields.uploadedAt")} value={formatDateLong(doc.uploadedAt)} />
        <Row label={t("documents.fields.fileName")} value={doc.fileName} />
        <Row label={t("documents.fields.fileSize")} value={`${Math.round(doc.fileSize / 1024)} KB`} />
        {doc.notes && <Row label={t("documents.fields.notes")} value={doc.notes} multiline />}

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
  pressed: { opacity: 0.7 },

  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  errorText: { color: colors.danger, fontSize: fontSize.md },

  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: "stretch",
  },
  previewImage: {
    width: "100%",
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  previewPdf: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  previewPdfText: { color: colors.textMuted, fontSize: fontSize.sm },

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
