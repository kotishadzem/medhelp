import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { medicationsApi } from "@/lib/api/endpoints";
import { IntakeBadge, MedicationBadge } from "@/components/StatusBadge";
import { formatDateShort, formatTimeHHMM } from "@/lib/format";
import {
  cancelForMedication,
  rescheduleMedication,
} from "@/lib/notifications";
import { confirm } from "@/lib/confirm";
import type { MedicationStatus } from "@/lib/types";
import { colors, fontSize, radius, spacing } from "@/lib/theme";
import { useTranslation } from "react-i18next";

const STATUS_ACTIONS: { tKey: string; status: MedicationStatus }[] = [
  { tKey: "medications.action.pause", status: "PAUSED" },
  { tKey: "medications.action.activate", status: "ACTIVE" },
  { tKey: "medications.action.complete", status: "COMPLETED" },
];

export default function MedicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ["medications", "detail", id],
    queryFn: () => medicationsApi.detail(id!),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: MedicationStatus) => {
      const result = await medicationsApi.update(id!, { status });
      const intakes = query.data?.medication.intakes ?? [];
      if (status === "ACTIVE") {
        await rescheduleMedication(result.medication, intakes);
      } else {
        await cancelForMedication(intakes);
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["today"] });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const intakes = query.data?.medication.intakes ?? [];
      await cancelForMedication(intakes);
      return medicationsApi.remove(id!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["today"] });
      router.back();
    },
  });

  if (query.isLoading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const m = query.data?.medication;
  if (!m) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.muted}>{t("medications.detail.notFound")}</Text>
      </SafeAreaView>
    );
  }

  const taken = m.intakes.filter((i) => i.status === "TAKEN").length;
  const total = m.intakes.length;
  const remaining = total - taken;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>
          {m.name}
        </Text>
        <Pressable
          onPress={async () => {
            const ok = await confirm({
              title: t("medications.delete.title"),
              body: t("medications.delete.confirm", { name: m.name }),
              confirmLabel: t("medications.delete.ok"),
              cancelLabel: t("medications.delete.cancel"),
              destructive: true,
            });
            if (ok) remove.mutate();
          }}
          hitSlop={10}
        >
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.medName}>{m.name}</Text>
            <MedicationBadge status={m.status} />
          </View>
          <Text style={styles.medDosage}>{m.dosage}</Text>
          {m.instructions && <Text style={styles.medInstructions}>{m.instructions}</Text>}

          <View style={styles.statsRow}>
            <Stat
              label={t("medications.detail.schedule")}
              value={t("medications.frequencyShort", { count: m.frequencyPerDay })}
            />
            <Stat label={t("medications.detail.times")} value={m.timesOfDay.join(", ")} />
          </View>
          <View style={styles.statsRow}>
            <Stat label={t("medications.detail.startDate")} value={formatDateShort(m.startDate)} />
            <Stat label={t("medications.detail.endDate")} value={formatDateShort(m.endDate)} />
          </View>
        </View>

        <View style={styles.statRow}>
          <ProgressCard
            label={t("medications.detail.taken")}
            value={taken}
            total={total}
            tint={colors.success}
          />
          <ProgressCard
            label={t("medications.detail.remaining")}
            value={remaining}
            total={total}
            tint={colors.warning}
          />
        </View>

        <View style={styles.actionsRow}>
          {STATUS_ACTIONS.filter((a) => a.status !== m.status).map((a) => (
            <Pressable
              key={a.status}
              onPress={() => updateStatus.mutate(a.status)}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.actionText}>{t(a.tKey)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("medications.detail.history")}</Text>
          {m.intakes.slice(0, 30).map((i) => (
            <View key={i.id} style={styles.intakeRow}>
              <Text style={styles.intakeDate}>{formatDateShort(i.scheduledAt)}</Text>
              <Text style={styles.intakeTime}>{formatTimeHHMM(i.scheduledAt)}</Text>
              <View style={{ marginLeft: "auto" }}>
                <IntakeBadge status={i.status} />
              </View>
            </View>
          ))}
          {m.intakes.length > 30 && (
            <Text style={styles.helper}>
              {t("medications.detail.more", { count: m.intakes.length - 30 })}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ProgressCard({
  label,
  value,
  total,
  tint,
}: {
  label: string;
  value: number;
  total: number;
  tint: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.progress}>
      <Text style={[styles.progressValue, { color: tint }]}>{value}</Text>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center" },
  muted: { color: colors.textMuted, fontSize: fontSize.md },

  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headTitle: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },

  body: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  medName: { flex: 1, color: colors.text, fontSize: fontSize.xl, fontWeight: "700" },
  medDosage: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  medInstructions: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },

  statsRow: { flexDirection: "row", gap: spacing.lg },
  stat: { flex: 1, gap: 4 },
  statLabel: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },

  statRow: { flexDirection: "row", gap: spacing.md },
  progress: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  progressValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  progressLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "500" },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 2 },

  actionsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },

  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
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
  intakeDate: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600", width: 60 },
  intakeTime: { color: colors.textMuted, fontSize: fontSize.sm },
  helper: { color: colors.textDim, fontSize: fontSize.xs, textAlign: "center", marginTop: spacing.xs },
});
