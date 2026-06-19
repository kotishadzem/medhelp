import {
  ActivityIndicator,
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
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { documentsApi } from "@/lib/api/endpoints";
import { formatDateLong } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function SharedDocumentScreen() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token: string }>();

  const query = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => documentsApi.publicShare(token),
    enabled: !!token,
    retry: 0,
  });

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={colors.warning} />
          <Text style={styles.errorText}>{t("documents.share.publicExpired")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { document } = query.data;

  const openFile = async (fileId: string) => {
    const url = documentsApi.publicShareFileUrl(token, fileId);
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

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandLogo}>
            <Text style={styles.brandLogoMark}>+</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>MedHelp</Text>
            <Text style={styles.brandSubtitle}>{t("documents.share.publicTitle")}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <DocumentTypeIcon type={document.documentType} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle} numberOfLines={2}>
              {document.customType?.trim()
                ? document.customType
                : t(`documents.type.${document.documentType}`)}
            </Text>
            <Text style={styles.summaryMeta} numberOfLines={1}>
              {formatDateLong(document.studyDate)} · {document.clinic}
            </Text>
          </View>
        </View>

        {document.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{document.notes}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>
          {t("documents.attachedFiles")} ·{" "}
          {t("documents.filesCount", { count: document.files.length })}
        </Text>

        <View style={styles.filesList}>
          {document.files.map((f) => (
            <View key={f.id} style={styles.fileCard}>
              <View style={styles.fileCardPreview}>
                {f.mimeType.startsWith("image/") ? (
                  <Image
                    source={{ uri: documentsApi.publicShareFileUrl(token, f.id) }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <DocumentTypeIcon type={document.documentType} size={64} />
                )}
              </View>
              <View style={styles.fileCardBody}>
                <Text style={styles.fileCardName} numberOfLines={2}>
                  {f.fileName}
                </Text>
                <Text style={styles.fileCardMeta}>
                  {Math.round(f.fileSize / 1024)} KB ·{" "}
                  {f.mimeType.split("/")[1]?.toUpperCase()}
                </Text>
                <Pressable
                  onPress={() => openFile(f.id)}
                  style={({ pressed }) => [styles.openBtn, pressed && styles.pressed]}
                >
                  <Ionicons name="open-outline" size={14} color={colors.bg} />
                  <Text style={styles.openBtnText}>{t("documents.actions.openFile")}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{t("documents.share.publicFooter")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  errorText: { color: colors.danger, fontSize: fontSize.md, textAlign: "center" },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoMark: { color: colors.bg, fontSize: 28, fontWeight: "800", marginTop: -4 },
  brandTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "800" },
  brandSubtitle: { color: colors.textMuted, fontSize: fontSize.sm },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  summaryTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  summaryMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },

  notesBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  notesText: { color: colors.text, fontSize: fontSize.sm, lineHeight: 22 },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.md,
  },
  filesList: { gap: spacing.md },
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
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  openBtnText: { color: colors.bg, fontSize: fontSize.xs, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  footer: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
