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
import { Link, useRouter, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { medicationsApi } from "@/lib/api/endpoints";
import type { Medication, MedicationStatus } from "@/lib/types";
import { MedicationBadge } from "@/components/StatusBadge";
import { formatDateShort } from "@/lib/format";
import { medNameFontSize, useMedFontScale } from "@/lib/settings/SettingsContext";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const FILTERS: { key: "ALL" | MedicationStatus; tKey: string }[] = [
  { key: "ALL", tKey: "medications.filter.all" },
  { key: "ACTIVE", tKey: "medications.filter.active" },
  { key: "PAUSED", tKey: "medications.filter.paused" },
  { key: "COMPLETED", tKey: "medications.filter.completed" },
];

export default function MedicationsList() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"ALL" | MedicationStatus>("ALL");
  const query = useQuery({
    queryKey: ["medications", filter],
    queryFn: () => medicationsApi.list(filter === "ALL" ? undefined : filter),
  });

  const medications = query.data?.medications ?? [];

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("medications.title")}</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/medications/create")}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="add" size={22} color={colors.bg} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
          >
            <Text
              style={[
                styles.filterLabel,
                filter === f.key && styles.filterLabelActive,
              ]}
            >
              {t(f.tKey)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {query.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : medications.length === 0 ? (
          <Empty
            onAdd={() => router.push("/(tabs)/medications/create")}
            isFiltered={filter !== "ALL"}
          />
        ) : (
          medications.map((m) => <MedRow key={m.id} medication={m} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MedRow({ medication }: { medication: Medication }) {
  const { t } = useTranslation();
  const { medFontScale } = useMedFontScale();
  return (
    <Link href={`/(tabs)/medications/${medication.id}` as Href} asChild>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.cardHead}>
          <Text
            style={[styles.medName, { fontSize: medNameFontSize(medFontScale) }]}
            numberOfLines={1}
          >
            {medication.name}
          </Text>
          <MedicationBadge status={medication.status} />
        </View>
        <Text style={styles.medMeta}>
          {medication.dosage} ·{" "}
          {t("medications.frequencyShort", { count: medication.frequencyPerDay })} ·{" "}
          {medication.timesOfDay.join(", ")}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textDim} />
            <Text style={styles.metaText}>
              {formatDateShort(medication.startDate)} —{" "}
              {medication.endDate
                ? formatDateShort(medication.endDate)
                : t("medications.detail.ongoing")}
            </Text>
          </View>
          {medication._count && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textDim} />
              <Text style={styles.metaText}>
                {t("medications.doseCount", { count: medication._count.intakes })}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

function Empty({ onAdd, isFiltered }: { onAdd: () => void; isFiltered: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Ionicons name="medkit-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyTitle}>
        {isFiltered ? t("medications.emptyTitleFiltered") : t("medications.emptyTitleAll")}
      </Text>
      <Text style={styles.emptySubtitle}>{t("medications.emptySubtitle")}</Text>
      {!isFiltered && (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={18} color={colors.bg} />
          <Text style={styles.emptyBtnText}>{t("medications.addButton")}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
  filterLabelActive: { color: colors.bg },

  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  medName: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  medMeta: { color: colors.textMuted, fontSize: fontSize.sm },
  cardFooter: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: colors.textDim, fontSize: fontSize.xs },

  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginTop: spacing.md },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  emptyBtnText: { color: colors.bg, fontSize: fontSize.md, fontWeight: "700" },
});
