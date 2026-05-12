import { StyleSheet, Text, View } from "react-native";
import type { IntakeStatus, MedicationStatus } from "@/lib/types";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const INTAKE_LABEL: Record<IntakeStatus, string> = {
  PENDING: "მოლოდინში",
  TAKEN: "მიღებული",
  MISSED: "გამოტოვებული",
  SKIPPED: "გამოტოვილი",
};

const INTAKE_COLOR: Record<IntakeStatus, string> = {
  PENDING: colors.pending,
  TAKEN: colors.taken,
  MISSED: colors.missed,
  SKIPPED: colors.skipped,
};

const MED_LABEL: Record<MedicationStatus, string> = {
  ACTIVE: "მიმდინარე",
  COMPLETED: "დასრულებული",
  CANCELLED: "გაუქმებული",
  PAUSED: "შეჩერებული",
};

const MED_COLOR: Record<MedicationStatus, string> = {
  ACTIVE: colors.success,
  COMPLETED: colors.textMuted,
  CANCELLED: colors.danger,
  PAUSED: colors.warning,
};

export function IntakeBadge({ status }: { status: IntakeStatus }) {
  return <Badge label={INTAKE_LABEL[status]} color={INTAKE_COLOR[status]} />;
}

export function MedicationBadge({ status }: { status: MedicationStatus }) {
  return <Badge label={MED_LABEL[status]} color={MED_COLOR[status]} />;
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: fontSize.xs, fontWeight: "600" },
});
