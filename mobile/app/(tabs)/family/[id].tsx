import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { documentsApi, familyApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/client";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { IntakeBadge, MedicationBadge } from "@/components/StatusBadge";
import { formatDateLong, formatTimeHHMM, timePeriod } from "@/lib/format";
import type {
  FamilyParty,
  IntakeWithMedication,
  MedicalDocument,
  Medication,
} from "@/lib/types";
import { medNameFontSize, useMedFontScale } from "@/lib/settings/SettingsContext";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Tab = "medications" | "documents";

export default function FamilyOverview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { medFontScale } = useMedFontScale();
  const [tab, setTab] = useState<Tab>("medications");
  const query = useQuery({
    queryKey: ["family", "overview", id],
    queryFn: () => familyApi.overview(id!),
    enabled: !!id,
  });
  const targetUserId = query.data?.target.id;
  const documentsQuery = useQuery({
    queryKey: ["documents", { forUserId: targetUserId }],
    queryFn: () => documentsApi.list({ forUserId: targetUserId! }),
    enabled: !!targetUserId && tab === "documents",
  });

  if (query.isLoading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (query.isError) {
    const e = query.error;
    const message =
      e instanceof ApiError && e.code === "LINK_NOT_ACCEPTED"
        ? t("family.overview.notAcceptedYet")
        : "—";
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Ionicons name="time-outline" size={40} color={colors.textDim} />
        <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.md }]}>
          {message}
        </Text>
      </SafeAreaView>
    );
  }

  const data = query.data;
  if (!data) return null;

  const groupedToday = groupByPeriod(data.today);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {partyDisplay(data.target)}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabSwitch}>
        <Pressable
          onPress={() => setTab("medications")}
          style={({ pressed }) => [
            styles.tabBtn,
            tab === "medications" && styles.tabBtnActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name="medkit-outline"
            size={14}
            color={tab === "medications" ? colors.bg : colors.textMuted}
          />
          <Text
            style={[styles.tabBtnText, tab === "medications" && styles.tabBtnTextActive]}
          >
            {t("documents.tabMedications")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("documents")}
          style={({ pressed }) => [
            styles.tabBtn,
            tab === "documents" && styles.tabBtnActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons
            name="folder-outline"
            size={14}
            color={tab === "documents" ? colors.bg : colors.textMuted}
          />
          <Text
            style={[styles.tabBtnText, tab === "documents" && styles.tabBtnTextActive]}
          >
            {t("documents.tabDocuments")}
          </Text>
        </Pressable>
      </View>

      {tab === "documents" ? (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={documentsQuery.isRefetching}
              onRefresh={() => documentsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
        >
          {documentsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (documentsQuery.data?.documents.length ?? 0) === 0 ? (
            <View style={styles.center}>
              <Ionicons name="folder-open-outline" size={48} color={colors.textDim} />
              <Text style={styles.muted}>{t("documents.emptyTitle")}</Text>
            </View>
          ) : (
            (documentsQuery.data?.documents ?? []).map((doc) => (
              <FamilyDocumentRow
                key={doc.id}
                doc={doc}
                onPress={() =>
                  router.push({ pathname: "/(tabs)/documents/[id]", params: { id: doc.id } })
                }
              />
            ))
          )}
        </ScrollView>
      ) : (
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.completionCard}>
          <Text style={styles.completionLabel}>{t("family.overview.completion")}</Text>
          <Text style={styles.completionValue}>{data.stats.completionPct}%</Text>
          <View style={styles.completionBar}>
            <View
              style={[
                styles.completionFill,
                { width: `${data.stats.completionPct}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label={t("family.overview.taken")}
            value={data.stats.taken}
            tint={colors.success}
          />
          <StatCard
            label={t("family.overview.missed")}
            value={data.stats.missed}
            tint={colors.danger}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label={t("family.overview.remaining")}
            value={data.stats.pending}
            tint={colors.warning}
          />
          <StatCard
            label={t("family.overview.total")}
            value={data.stats.total}
            tint={colors.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("family.overview.today")}</Text>
          {data.today.length === 0 ? (
            <Text style={styles.muted}>{t("family.overview.noToday")}</Text>
          ) : (
            (["morning", "afternoon", "evening"] as const).map((p) => {
              const items = groupedToday[p];
              if (items.length === 0) return null;
              return (
                <View key={p} style={{ gap: spacing.xs }}>
                  <Text style={styles.periodLabel}>{t(`today.period.${p}`)}</Text>
                  {items.map((i) => (
                    <View key={i.id} style={styles.intakeRow}>
                      <Text style={styles.intakeTime}>{formatTimeHHMM(i.scheduledAt)}</Text>
                      <Text
                        style={[styles.intakeName, { fontSize: medNameFontSize(medFontScale) }]}
                        numberOfLines={1}
                      >
                        {i.medication.name}
                      </Text>
                      <IntakeBadge status={i.status} />
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("family.overview.medications")}</Text>
          {data.medications.length === 0 ? (
            <Text style={styles.muted}>{t("family.overview.noMedications")}</Text>
          ) : (
            data.medications.map((m) => <MedicationRow key={m.id} m={m} />)
          )}
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FamilyDocumentRow({
  doc,
  onPress,
}: {
  doc: MedicalDocument;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.docRow, pressed && { opacity: 0.85 }]}
    >
      <DocumentTypeIcon type={doc.documentType} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.docRowTitle} numberOfLines={1}>
          {doc.customType?.trim() || t(`documents.type.${doc.documentType}`)}
        </Text>
        <Text style={styles.docRowMeta} numberOfLines={1}>
          {formatDateLong(doc.studyDate)} · {doc.clinic}
        </Text>
      </View>
      {doc.files.length > 1 && (
        <View style={styles.docRowBadge}>
          <Ionicons name="documents-outline" size={12} color={colors.primary} />
          <Text style={styles.docRowBadgeText}>{doc.files.length}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
    </Pressable>
  );
}

function MedicationRow({ m }: { m: Medication }) {
  const { t } = useTranslation();
  const { medFontScale } = useMedFontScale();
  return (
    <View style={styles.medCard}>
      <View style={styles.medHead}>
        <Text
          style={[styles.medName, { fontSize: medNameFontSize(medFontScale) }]}
          numberOfLines={1}
        >
          {m.name}
        </Text>
        <MedicationBadge status={m.status} />
      </View>
      <Text style={styles.medMeta}>
        {m.dosage} ·{" "}
        {t("medications.frequencyShort", { count: m.frequencyPerDay })} ·{" "}
        {m.timesOfDay.join(", ")}
      </Text>
    </View>
  );
}

function StatCard({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function groupByPeriod(intakes: IntakeWithMedication[]) {
  const buckets: Record<"morning" | "afternoon" | "evening", IntakeWithMedication[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const i of intakes) buckets[timePeriod(i.scheduledAt)].push(i);
  return buckets;
}

function partyDisplay(p?: FamilyParty): string {
  if (!p) return "";
  const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  if (name) return name;
  return p.phone ?? p.email ?? "";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted, fontSize: fontSize.sm },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },

  completionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  completionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  completionValue: { color: colors.text, fontSize: 48, fontWeight: "800", letterSpacing: -1 },
  completionBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  completionFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },

  statsRow: { flexDirection: "row", gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  statValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },

  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  periodLabel: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  intakeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intakeTime: { color: colors.text, fontSize: fontSize.md, fontWeight: "700", width: 56 },
  intakeName: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: "500" },

  medCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  medHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  medName: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  medMeta: { color: colors.textMuted, fontSize: fontSize.xs },

  tabSwitch: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
  tabBtnTextActive: { color: colors.bg, fontWeight: "800" },

  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  docRowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  docRowMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  docRowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primary + "22",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  docRowBadgeText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: "700" },
});
