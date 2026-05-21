import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { medicationsApi } from "@/lib/api/endpoints";
import { addDaysYMD, todayYMD } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Period = "7" | "30" | "month";

const NAME_COL_WIDTH = 116;
const CELL_WIDTH = 22;
const CELL_HEIGHT = 22;
const CELL_GAP = 2;

export default function ReportScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>("7");

  const { from, to } = useMemo(() => {
    const today = todayYMD();
    if (period === "month") {
      const [y, m] = today.split("-");
      return { from: `${y}-${m}-01`, to: today };
    }
    const days = period === "7" ? 6 : 29;
    return { from: addDaysYMD(today, -days), to: today };
  }, [period]);

  const query = useQuery({
    queryKey: ["report", from, to],
    queryFn: () => medicationsApi.report(from, to),
  });

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("report.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.periodRow}>
        {(["7", "30", "month"] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[styles.periodPill, period === p && styles.periodPillActive]}
          >
            <Text
              style={[
                styles.periodLabel,
                period === p && styles.periodLabelActive,
              ]}
            >
              {t(`report.period.${p}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : query.data && query.data.medications.length === 0 ? (
        <EmptyReport />
      ) : query.data ? (
        <ReportGrid data={query.data} />
      ) : null}
    </SafeAreaView>
  );
}

function ReportGrid({
  data,
}: {
  data: NonNullable<ReturnType<typeof medicationsApi.report> extends Promise<infer R> ? R : never>;
}) {
  const { days, medications } = data;

  // One vertical scroll for rows, one horizontal scroll spanning the days
  // area so the header and every medication row pan together.
  return (
    <ScrollView style={styles.gridScrollV} contentContainerStyle={styles.gridBody}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: spacing.xl }}
      >
        <View>
          <View style={[styles.gridRow, { paddingLeft: NAME_COL_WIDTH }]}>
            <View style={styles.dayHeaderRow}>
              {days.map((d) => {
                const day = Number(d.split("-")[2]);
                return (
                  <View key={d} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderText}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {medications.map((m) => (
            <View key={m.id} style={styles.medRow}>
              <View style={styles.nameCol}>
                <View
                  style={[
                    styles.typeBadge,
                    m.type === "INJECTION" ? styles.typeBadgeInjection : styles.typeBadgeTablet,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={m.type === "INJECTION" ? "needle" : "pill"}
                    size={16}
                    color={colors.bg}
                  />
                </View>
                <Text style={styles.nameText} numberOfLines={2}>
                  {m.name}
                </Text>
              </View>
              <View style={styles.dayCellRow}>
                {days.map((d) => {
                  const { taken, total } = m.days[d] ?? { taken: 0, total: 0 };
                  return <DayCell key={d} taken={taken} total={total} />;
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

function DayCell({ taken, total }: { taken: number; total: number }) {
  // No scheduled doses that day — empty slot.
  if (total === 0) {
    return <View style={[styles.cell, styles.cellEmpty]} />;
  }
  // All taken → solid green bar (merges visually with adjacent taken days).
  if (taken === total) {
    return <View style={[styles.cell, styles.cellFull]} />;
  }
  // Partial → red base shows the missed portion; green overlay covers the taken portion.
  if (taken > 0) {
    return (
      <View style={[styles.cell, styles.cellMissed]}>
        <View
          style={{
            height: "100%",
            width: `${Math.round((taken / total) * 100)}%`,
            backgroundColor: colors.success,
          }}
        />
      </View>
    );
  }
  // Scheduled but none taken → solid red.
  return <View style={[styles.cell, styles.cellMissed]} />;
}

function EmptyReport() {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Ionicons name="bar-chart-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyText}>{t("report.empty")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  title: { flex: 1, color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },

  periodRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  periodPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
  periodLabelActive: { color: colors.bg },

  gridScrollV: { flex: 1 },
  gridBody: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2, gap: spacing.xs },

  gridRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  dayHeaderRow: { flexDirection: "row", gap: CELL_GAP, alignItems: "center" },
  dayHeaderCell: { width: CELL_WIDTH, alignItems: "center" },
  dayHeaderText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },

  medRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameCol: {
    width: NAME_COL_WIDTH,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  nameText: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  typeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadgeTablet: { backgroundColor: colors.primary },
  typeBadgeInjection: { backgroundColor: colors.warning },

  dayCellRow: { flexDirection: "row", gap: CELL_GAP, alignItems: "center" },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderRadius: 4,
    overflow: "hidden",
  },
  cellEmpty: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cellFull: { backgroundColor: colors.success },
  cellMissed: { backgroundColor: colors.danger },

  center: { padding: spacing.xxl, alignItems: "center" },
  empty: { alignItems: "center", gap: spacing.md, padding: spacing.xxl },
  emptyText: { color: colors.textMuted, fontSize: fontSize.md, textAlign: "center" },
});
