import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { medicationsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { medNameFontSize, useMedFontScale } from "@/lib/settings/SettingsContext";
import { cancelForIntakes } from "@/lib/notifications";
import { confirm } from "@/lib/confirm";
import { colors, fontSize, radius, spacing } from "@/lib/theme";
import {
  deriveIntakeStatus,
  formatTimeHHMM,
  formatWeekdayDayMonth,
  isToday,
  isTomorrow,
  timePeriod,
  ymdLocal,
  type DerivedIntakeStatus,
} from "@/lib/format";
import type { IntakeWithMedication } from "@/lib/types";

const PERIOD_ICON = {
  morning: "sunny-outline",
  afternoon: "partly-sunny-outline",
  evening: "moon-outline",
} as const;

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const todayQuery = useQuery({
    queryKey: ["today", 2],
    queryFn: () => medicationsApi.today(2),
  });

  // Re-render every minute so derived statuses (IMMINENT / MISSED) refresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Group by date → period
  const grouped = useMemo(() => {
    const intakes = todayQuery.data?.intakes ?? [];
    const byDay: Record<string, IntakeWithMedication[]> = {};
    for (const i of intakes) {
      const key = ymdLocal(i.scheduledAt);
      (byDay[key] ??= []).push(i);
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        periods: groupByPeriod(items),
      }));
  }, [todayQuery.data]);

  const counts = useMemo(() => {
    const intakes = todayQuery.data?.intakes ?? [];
    const todayOnly = intakes.filter((i) => isToday(i.scheduledAt));
    return {
      total: todayOnly.length,
      taken: todayOnly.filter((i) => i.status === "TAKEN").length,
      pending: todayOnly.filter((i) => {
        const d = deriveIntakeStatus(i.status, i.scheduledAt);
        return d === "PENDING" || d === "IMMINENT";
      }).length,
      missed: todayOnly.filter((i) => deriveIntakeStatus(i.status, i.scheduledAt) === "MISSED")
        .length,
    };
  }, [todayQuery.data]);

  const setIntakeStatus = useCallback(
    async (intake: IntakeWithMedication, status: "TAKEN" | "PENDING") => {
      qc.setQueryData<{ date: string; days: number; intakes: IntakeWithMedication[] }>(
        ["today", 2],
        (prev) =>
          prev
            ? {
                ...prev,
                intakes: prev.intakes.map((i) =>
                  i.id === intake.id
                    ? {
                        ...i,
                        status,
                        takenAt: status === "TAKEN" ? new Date().toISOString() : null,
                      }
                    : i
                ),
              }
            : prev
      );
      try {
        await medicationsApi.updateIntake(intake.medicationId, intake.id, status);
        if (status === "TAKEN") await cancelForIntakes([intake.id]);
      } finally {
        qc.invalidateQueries({ queryKey: ["today"] });
      }
    },
    [qc]
  );

  const onIntakePress = useCallback(
    async (intake: IntakeWithMedication) => {
      if (intake.status === "TAKEN") {
        const ok = await confirm({
          title: t("today.undoTitle"),
          body: t("today.undoBody", { name: intake.medication.name }),
          confirmLabel: t("today.undoConfirm"),
          cancelLabel: t("today.undoCancel"),
        });
        if (ok) await setIntakeStatus(intake, "PENDING");
      } else {
        await setIntakeStatus(intake, "TAKEN");
      }
    },
    [setIntakeStatus, t]
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={todayQuery.isRefetching}
            onRefresh={() => todayQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {user?.firstName
              ? t("today.greetingNamed", { name: user.firstName })
              : t("today.greeting")}
          </Text>
          <Text style={styles.dateLine}>{formatTodayLabel()}</Text>
        </View>

        <View style={styles.statRow}>
          <StatCard label={t("today.remaining")} value={counts.pending} tint={colors.warning} />
          <StatCard label={t("today.taken")} value={counts.taken} tint={colors.success} />
          {counts.missed > 0 && (
            <StatCard label={t("today.missed")} value={counts.missed} tint={colors.danger} />
          )}
        </View>

        {todayQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : grouped.length === 0 ? (
          <EmptyToday />
        ) : (
          grouped.map(({ date, periods }) => (
            <View key={date} style={styles.daySection}>
              <Text style={styles.dayHeader}>{dayLabel(date, t)}</Text>
              {(["morning", "afternoon", "evening"] as const).map((period) => {
                const items = periods[period];
                if (items.length === 0) return null;
                return (
                  <View key={period} style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons
                        name={PERIOD_ICON[period]}
                        size={16}
                        color={colors.textMuted}
                      />
                      <Text style={styles.sectionLabel}>{t(`today.period.${period}`)}</Text>
                    </View>
                    {items.map((intake) => (
                      <IntakeRow key={intake.id} intake={intake} onMark={onIntakePress} />
                    ))}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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

function IntakeRow({
  intake,
  onMark,
}: {
  intake: IntakeWithMedication;
  onMark: (i: IntakeWithMedication) => void;
}) {
  const tints = useTint();
  const { medFontScale } = useMedFontScale();
  const derived = deriveIntakeStatus(intake.status, intake.scheduledAt);
  const tint = tints[derived];
  const isTaken = derived === "TAKEN";

  return (
    <View style={[styles.intakeRow, tint && styles.intakeRowTinted, tint && { backgroundColor: tint.bg, borderColor: tint.border }]}>
      <View style={styles.timeCol}>
        <Text style={[styles.time, isTaken && styles.muted]}>
          {formatTimeHHMM(intake.scheduledAt)}
        </Text>
        {tint?.label && <Text style={[styles.tag, { color: tint.tagColor }]}>{tint.label}</Text>}
      </View>
      <View style={styles.medCol}>
        <Text
          style={[
            styles.medName,
            { fontSize: medNameFontSize(medFontScale) },
            isTaken && styles.struck,
          ]}
          numberOfLines={1}
        >
          {intake.medication.name}
        </Text>
        <Text style={styles.medDosage} numberOfLines={1}>
          {intake.medication.dosage}
          {intake.medication.instructions ? ` · ${intake.medication.instructions}` : ""}
        </Text>
      </View>
      <Pressable
        onPress={() => onMark(intake)}
        style={({ pressed }) => [
          styles.checkBtn,
          isTaken && styles.checkBtnTaken,
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialCommunityIcons
          name={intake.medication.type === "INJECTION" ? "needle" : "pill"}
          size={22}
          color={isTaken ? colors.bg : colors.textMuted}
        />
      </Pressable>
    </View>
  );
}

function EmptyToday() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Ionicons name="leaf-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyTitle}>{t("today.emptyTitle")}</Text>
      <Text style={styles.emptySubtitle}>{t("today.emptySubtitle")}</Text>
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

function formatTodayLabel(): string {
  return formatWeekdayDayMonth(new Date().toISOString());
}

function dayLabel(ymd: string, t: (k: string) => string): string {
  const iso = `${ymd}T00:00:00`;
  if (isToday(iso)) return t("today.dayToday");
  if (isTomorrow(iso)) return t("today.dayTomorrow");
  return formatWeekdayDayMonth(iso);
}

// Background tint per derived status — TAKEN gets a soft green, MISSED a red
// tint, IMMINENT (within 30 min) an orange tint. Others stay neutral.
function useTint() {
  const { t } = useTranslation();
  return useMemo<
    Record<DerivedIntakeStatus, { bg: string; border: string; tagColor: string; label?: string } | null>
  >(
    () => ({
      TAKEN: { bg: colors.success + "12", border: colors.success + "40", tagColor: colors.success },
      MISSED: {
        bg: colors.danger + "18",
        border: colors.danger + "50",
        tagColor: colors.danger,
        label: t("today.missed"),
      },
      IMMINENT: {
        bg: colors.warning + "18",
        border: colors.warning + "50",
        tagColor: colors.warning,
        label: t("today.soon"),
      },
      PENDING: null,
      SKIPPED: null,
    }),
    [t]
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  header: { gap: spacing.xs },
  greeting: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  dateLine: { color: colors.textMuted, fontSize: fontSize.md, textTransform: "capitalize" },

  statRow: { flexDirection: "row", gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statValue: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  statLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },

  daySection: { gap: spacing.md },
  dayHeader: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "800",
    letterSpacing: -0.3,
    paddingHorizontal: spacing.xs,
  },

  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  intakeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  intakeRowTinted: {},
  timeCol: { width: 72, gap: 2 },
  time: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  tag: { fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  muted: { color: colors.textMuted },
  struck: { color: colors.textMuted },
  medCol: { flex: 1, gap: 2 },
  medName: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  medDosage: { color: colors.textMuted, fontSize: fontSize.sm },
  checkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkBtnTaken: { backgroundColor: colors.success, borderColor: colors.success },

  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginTop: spacing.md },
  emptySubtitle: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center", lineHeight: 20 },

  center: { padding: spacing.xxl, alignItems: "center" },
});
