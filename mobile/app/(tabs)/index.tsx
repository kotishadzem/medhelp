import { useCallback, useMemo } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { medicationsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/auth/AuthContext";
import { cancelForIntakes } from "@/lib/notifications";
import { colors, fontSize, radius, spacing } from "@/lib/theme";
import { formatTimeHHMM, timePeriod } from "@/lib/format";
import type { IntakeWithMedication } from "@/lib/types";

const PERIOD_LABEL = {
  morning: "დილა",
  afternoon: "შუადღე",
  evening: "საღამო",
};

const PERIOD_ICON = {
  morning: "sunny-outline",
  afternoon: "partly-sunny-outline",
  evening: "moon-outline",
} as const;

export default function TodayScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const todayQuery = useQuery({
    queryKey: ["today"],
    queryFn: medicationsApi.today,
  });

  const groups = useMemo(() => {
    const intakes = todayQuery.data?.intakes ?? [];
    const buckets: Record<string, IntakeWithMedication[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const i of intakes) {
      buckets[timePeriod(i.scheduledAt)].push(i);
    }
    return buckets;
  }, [todayQuery.data]);

  const counts = useMemo(() => {
    const intakes = todayQuery.data?.intakes ?? [];
    return {
      total: intakes.length,
      taken: intakes.filter((i) => i.status === "TAKEN").length,
      pending: intakes.filter((i) => i.status === "PENDING").length,
    };
  }, [todayQuery.data]);

  const markTaken = useCallback(
    async (intake: IntakeWithMedication) => {
      // Optimistic update
      qc.setQueryData<{ date: string; intakes: IntakeWithMedication[] }>(
        ["today"],
        (prev) =>
          prev
            ? {
                ...prev,
                intakes: prev.intakes.map((i) =>
                  i.id === intake.id
                    ? { ...i, status: "TAKEN", takenAt: new Date().toISOString() }
                    : i
                ),
              }
            : prev
      );
      try {
        await medicationsApi.updateIntake(intake.medicationId, intake.id, "TAKEN");
        await cancelForIntakes([intake.id]);
        qc.invalidateQueries({ queryKey: ["today"] });
      } catch {
        qc.invalidateQueries({ queryKey: ["today"] });
      }
    },
    [qc]
  );

  const undo = useCallback(
    async (intake: IntakeWithMedication) => {
      qc.setQueryData<{ date: string; intakes: IntakeWithMedication[] }>(
        ["today"],
        (prev) =>
          prev
            ? {
                ...prev,
                intakes: prev.intakes.map((i) =>
                  i.id === intake.id ? { ...i, status: "PENDING", takenAt: null } : i
                ),
              }
            : prev
      );
      try {
        // Reverting: there's no explicit "unmark" endpoint — we'd need backend support.
        // For now, send SKIPPED back to TAKEN if user mistapped.
        // Skipped for MVP — once TAKEN, stays TAKEN.
        qc.invalidateQueries({ queryKey: ["today"] });
      } catch {
        qc.invalidateQueries({ queryKey: ["today"] });
      }
    },
    [qc]
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
            გამარჯობა{user?.firstName ? `, ${user.firstName}` : ""}
          </Text>
          <Text style={styles.dateLine}>{formatTodayLabel(todayQuery.data?.date)}</Text>
        </View>

        <View style={styles.statRow}>
          <StatCard
            label="დარჩა დღეს"
            value={counts.pending}
            tint={colors.warning}
          />
          <StatCard
            label="მიღებული"
            value={counts.taken}
            tint={colors.success}
          />
        </View>

        {todayQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : counts.total === 0 ? (
          <EmptyToday />
        ) : (
          (Object.keys(PERIOD_LABEL) as (keyof typeof PERIOD_LABEL)[]).map((period) => {
            const items = groups[period];
            if (items.length === 0) return null;
            return (
              <View key={period} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name={PERIOD_ICON[period]}
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text style={styles.sectionLabel}>{PERIOD_LABEL[period]}</Text>
                </View>
                {items.map((intake) => (
                  <IntakeRow key={intake.id} intake={intake} onMark={markTaken} onUndo={undo} />
                ))}
              </View>
            );
          })
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
  onUndo,
}: {
  intake: IntakeWithMedication;
  onMark: (i: IntakeWithMedication) => void;
  onUndo: (i: IntakeWithMedication) => void;
}) {
  const isTaken = intake.status === "TAKEN";
  const isMissed = intake.status === "MISSED";
  return (
    <View style={[styles.intakeRow, isTaken && styles.intakeRowTaken]}>
      <View style={styles.timeCol}>
        <Text style={[styles.time, isTaken && styles.muted]}>
          {formatTimeHHMM(intake.scheduledAt)}
        </Text>
      </View>
      <View style={styles.medCol}>
        <Text
          style={[styles.medName, isTaken && styles.struck]}
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
        onPress={() => (isTaken ? onUndo(intake) : onMark(intake))}
        style={({ pressed }) => [
          styles.checkBtn,
          isTaken && styles.checkBtnTaken,
          isMissed && styles.checkBtnMissed,
          pressed && { opacity: 0.7 },
        ]}
      >
        {isTaken ? (
          <Ionicons name="checkmark" size={22} color={colors.bg} />
        ) : (
          <Ionicons name="ellipse-outline" size={22} color={colors.textMuted} />
        )}
      </Pressable>
    </View>
  );
}

function EmptyToday() {
  return (
    <View style={styles.empty}>
      <Ionicons name="leaf-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyTitle}>დღეს დოზა არ გაქვს</Text>
      <Text style={styles.emptySubtitle}>დაამატე მედიკამენტი — დაგეგმავ მისი მიღების დროებს.</Text>
    </View>
  );
}

function formatTodayLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("ka-GE", { weekday: "long", day: "numeric", month: "long" });
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
  intakeRowTaken: { borderColor: colors.success + "40", backgroundColor: colors.success + "10" },
  timeCol: { width: 56 },
  time: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
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
  checkBtnMissed: { borderColor: colors.danger },

  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xxl },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginTop: spacing.md },
  emptySubtitle: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center", lineHeight: 20 },

  center: { padding: spacing.xxl, alignItems: "center" },
});
