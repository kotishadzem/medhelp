import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { familyApi, medicationsApi } from "@/lib/api/endpoints";
import { Button } from "@/components/Button";
import { MonthCalendar } from "@/components/MonthCalendar";
import { addDaysYMD, dateInputToISO, formatDateLong, todayYMD } from "@/lib/format";
import { scheduleForMedication } from "@/lib/notifications";
import type { FamilyLink, FamilyParty, MedicationType } from "@/lib/types";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const DEFAULT_TIMES = ["08:00", "14:00", "20:00", "22:00"];
const PRESET_DURATIONS = [3, 7, 14, 30] as const;

type DurationMode = "preset" | "custom" | "forever";

export default function CreateMedication() {
  const router = useRouter();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const familyQuery = useQuery({ queryKey: ["family"], queryFn: familyApi.list });
  const acceptedFamily = (familyQuery.data?.outgoing ?? []).filter(
    (l) => l.status === "ACCEPTED" && !!l.target
  );

  const [forUserId, setForUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [type, setType] = useState<MedicationType>("TABLET");
  const [startYMD, setStartYMD] = useState<string>(todayYMD());
  const [showCalendar, setShowCalendar] = useState(false);
  const [durationMode, setDurationMode] = useState<DurationMode>("preset");
  const [durationDays, setDurationDays] = useState(7);
  const [customDaysDraft, setCustomDaysDraft] = useState("");
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [frequency, setFrequency] = useState(1);
  const [times, setTimes] = useState<string[]>(["09:00"]);

  // Auto-distribute times when frequency changes
  const setFrequencyAndTimes = (f: number) => {
    setFrequency(f);
    setTimes(DEFAULT_TIMES.slice(0, f));
  };

  const effectiveDays = durationMode === "custom"
    ? Math.max(1, Math.min(365, Number(customDaysDraft) || 0))
    : durationDays;

  const endYMD = useMemo(
    () => addDaysYMD(startYMD, Math.max(1, effectiveDays) - 1),
    [startYMD, effectiveDays]
  );

  const mutation = useMutation({
    mutationFn: async (input: Parameters<typeof medicationsApi.create>[0]) => {
      const created = await medicationsApi.create(input);
      // Only schedule local reminders when the medication is for the current user.
      if (!input.forUserId) {
        try {
          const detail = await medicationsApi.detail(created.medication.id);
          await scheduleForMedication(detail.medication, detail.medication.intakes);
        } catch {
          // best-effort
        }
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["family"] });
      router.back();
    },
    onError: (e) => {
      Alert.alert(
        t("medications.saveFailed"),
        e instanceof Error ? e.message : t("medications.saveFailedBody")
      );
    },
  });

  const durationValid =
    durationMode === "forever" ||
    (durationMode === "custom" ? Number(customDaysDraft) >= 1 : durationDays >= 1);

  const canSubmit =
    name.trim().length > 0 &&
    dosage.trim().length > 0 &&
    times.length === frequency &&
    times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) &&
    durationValid;

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim() ? instructions.trim() : undefined,
      type,
      startDate: dateInputToISO(startYMD),
      endDate: durationMode === "forever" ? undefined : dateInputToISO(endYMD),
      frequencyPerDay: frequency,
      timesOfDay: times,
      forUserId: forUserId ?? undefined,
    });
  };

  const durationLabel = (() => {
    if (durationMode === "forever") return t("medications.field.durationOption.forever");
    if (durationMode === "custom") {
      const n = Number(customDaysDraft);
      return n > 0
        ? t("medications.field.days", { count: n })
        : t("medications.field.durationOption.custom");
    }
    return t("medications.field.days", { count: durationDays });
  })();

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t("medications.newMedication")}</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {acceptedFamily.length > 0 && (
            <Section title={t("medications.forWhom")}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.targetsRow}
                style={styles.targetsScroll}
              >
                <TargetChip
                  active={forUserId === null}
                  label={t("medications.forMe")}
                  iconChar="🙂"
                  onPress={() => setForUserId(null)}
                />
                {acceptedFamily.map((link) => (
                  <TargetChip
                    key={link.id}
                    active={forUserId === link.targetId}
                    label={link.customName}
                    iconChar={(link.customName.trim() || "?").charAt(0)}
                    onPress={() => setForUserId(link.targetId)}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          <Section title={t("medications.field.name")}>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t("medications.field.namePlaceholder")}
              autoCapitalize="words"
            />
          </Section>

          <Section title={t("medications.field.dosage")}>
            <Input
              value={dosage}
              onChangeText={setDosage}
              placeholder={t("medications.field.dosagePlaceholder")}
              autoCapitalize="none"
            />
          </Section>

          <Section title={t("medications.field.type")}>
            <View style={styles.segment}>
              {(["TABLET", "INJECTION"] as const).map((opt) => {
                const active = type === opt;
                const icon = opt === "TABLET" ? "pill" : "needle";
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setType(opt)}
                    style={[styles.typeItem, active && styles.segmentItemActive]}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={20}
                      color={active ? colors.bg : colors.textMuted}
                    />
                    <Text
                      style={[styles.segmentText, active && styles.segmentTextActive]}
                    >
                      {t(`medications.field.typeOption.${opt}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title={t("medications.field.instructions")} optional>
            <Input
              value={instructions}
              onChangeText={setInstructions}
              placeholder={t("medications.field.instructionsPlaceholder")}
              multiline
            />
          </Section>

          <Section title={t("medications.field.startDate")}>
            <Pressable
              onPress={() => setShowCalendar(true)}
              style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.dateButtonText}>{formatYMDLong(startYMD)}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>
          </Section>

          <Section title={t("medications.field.duration")}>
            <Pressable
              onPress={() => setShowDurationPicker(true)}
              style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="hourglass-outline" size={18} color={colors.primary} />
              <Text style={styles.dateButtonText}>{durationLabel}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </Pressable>

            {durationMode === "custom" && (
              <View style={styles.customDaysRow}>
                <Input
                  value={customDaysDraft}
                  onChangeText={(v) => setCustomDaysDraft(v.replace(/\D/g, "").slice(0, 3))}
                  placeholder={t("medications.field.customDaysPlaceholder")}
                  keyboardType="number-pad"
                  inputMode="numeric"
                />
              </View>
            )}

            {durationMode === "forever" ? (
              <Text style={styles.helper}>{t("medications.field.foreverHelper")}</Text>
            ) : (
              <Text style={styles.helper}>
                {t("medications.totalIntakes", {
                  start: startYMD,
                  end: endYMD,
                  total: effectiveDays * frequency,
                })}
              </Text>
            )}
          </Section>

          <Section title={t("medications.field.frequency")}>
            <View style={styles.segment}>
              {[1, 2, 3, 4].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setFrequencyAndTimes(n)}
                  style={[styles.segmentItem, frequency === n && styles.segmentItemActive]}
                >
                  <Text
                    style={[styles.segmentText, frequency === n && styles.segmentTextActive]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>

          <Section title={t("medications.field.times")}>
            <View style={styles.timesGrid}>
              {times.map((tm, i) => (
                <TimePicker
                  key={i}
                  value={tm}
                  onChange={(v) => {
                    const next = [...times];
                    next[i] = v;
                    setTimes(next);
                  }}
                />
              ))}
            </View>
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={t("medications.save")}
            onPress={submit}
            disabled={!canSubmit}
            loading={mutation.isPending}
          />
        </View>

        <Modal
          visible={showCalendar}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCalendar(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowCalendar(false)}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{t("medications.field.startDate")}</Text>
                <Pressable onPress={() => setShowCalendar(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
              <MonthCalendar
                value={startYMD}
                onChange={(d) => {
                  setStartYMD(d);
                  setShowCalendar(false);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showDurationPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDurationPicker(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowDurationPicker(false)}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{t("medications.field.durationPick")}</Text>
                <Pressable onPress={() => setShowDurationPicker(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>

              {PRESET_DURATIONS.map((d) => {
                const active = durationMode === "preset" && durationDays === d;
                return (
                  <DurationOption
                    key={d}
                    label={t(`medications.field.durationOption.preset${d}` as const)}
                    active={active}
                    onPress={() => {
                      setDurationMode("preset");
                      setDurationDays(d);
                      setShowDurationPicker(false);
                    }}
                  />
                );
              })}
              <DurationOption
                label={t("medications.field.durationOption.custom")}
                active={durationMode === "custom"}
                onPress={() => {
                  setDurationMode("custom");
                  if (!customDaysDraft) setCustomDaysDraft(String(durationDays));
                  setShowDurationPicker(false);
                }}
              />
              <DurationOption
                label={t("medications.field.durationOption.forever")}
                active={durationMode === "forever"}
                icon="infinite-outline"
                onPress={() => {
                  setDurationMode("forever");
                  setShowDurationPicker(false);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DurationOption({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.durationOption,
        active && styles.durationOptionActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={active ? colors.primary : colors.textMuted}
        />
      )}
      <Text
        style={[styles.durationOptionText, active && styles.durationOptionTextActive]}
      >
        {label}
      </Text>
      {active && <Ionicons name="checkmark" size={20} color={colors.primary} />}
    </Pressable>
  );
}

function formatYMDLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return formatDateLong(new Date(y, m - 1, d).toISOString());
}

function TargetChip({
  active,
  label,
  iconChar,
  onPress,
}: {
  active: boolean;
  label: string;
  iconChar: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.targetChip,
        active && styles.targetChipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.targetAvatar, active && styles.targetAvatarActive]}>
        <Text style={[styles.targetAvatarText, active && styles.targetAvatarTextActive]}>
          {iconChar}
        </Text>
      </View>
      <Text style={[styles.targetLabel, active && styles.targetLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{title}</Text>
        {optional && <Text style={styles.optional}>{t("medications.field.optional")}</Text>}
      </View>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.textDim}
      style={[styles.input, props.multiline && styles.inputMulti]}
    />
  );
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  // Sync from outside when the parent resets the slot — but only when not actively typing.
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);

  // Normalize "HHMM" / "HH:MM" / partial into "HH:MM", clamped to 23:59.
  const normalize = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 0) return null;
    let hStr: string;
    let mStr: string;
    if (digits.length <= 2) {
      hStr = digits;
      mStr = "00";
    } else {
      hStr = digits.slice(0, digits.length - 2);
      mStr = digits.slice(-2);
    }
    const h = Math.min(Number(hStr) || 0, 23);
    const m = Math.min(Number(mStr) || 0, 59);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Live formatter while user types. Field is cleared on focus so digits
  // accumulate left-to-right: "1" → "1", "14" → "14", "145" → "14:5", "1456" → "14:56".
  const formatDraft = (raw: string): string => {
    let digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  };

  return (
    <View style={styles.timeCard}>
      <Ionicons name="time-outline" size={18} color={colors.textMuted} />
      <TextInput
        value={draft}
        onFocus={() => {
          setFocused(true);
          setDraft(""); // clear so the user types fresh; placeholder shows the old time
        }}
        onChangeText={(text) => {
          const formatted = formatDraft(text);
          setDraft(formatted);
          const norm = normalize(formatted);
          if (norm) onChange(norm);
        }}
        onBlur={() => {
          setFocused(false);
          const norm = normalize(draft);
          if (norm) {
            setDraft(norm);
            onChange(norm);
          } else {
            // user opened the field but typed nothing — restore the previous value
            setDraft(value);
          }
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder={value || "08:30"}
        placeholderTextColor={colors.textDim}
        maxLength={5}
        style={styles.timeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },
  body: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },

  section: { gap: spacing.sm },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  optional: { color: colors.textDim, fontSize: fontSize.xs },
  helper: { color: colors.textDim, fontSize: fontSize.xs, marginTop: spacing.xs },

  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.md,
    padding: spacing.md,
    minHeight: 52,
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },

  segment: { flexDirection: "row", gap: spacing.sm },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  segmentItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: fontSize.md, fontWeight: "700" },
  segmentTextActive: { color: colors.bg },
  typeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  timesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 50,
  },
  timeText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    letterSpacing: 1,
    paddingVertical: 4,
    minWidth: 64,
    textAlign: "center",
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },

  targetsScroll: { flexGrow: 0, flexShrink: 0 },
  targetsRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  targetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  targetAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  targetAvatarActive: { backgroundColor: colors.bg },
  targetAvatarText: { color: colors.text, fontSize: fontSize.sm, fontWeight: "700" },
  targetAvatarTextActive: { color: colors.primary },
  targetLabel: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "600" },
  targetLabelActive: { color: colors.bg },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  dateButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700" },

  customDaysRow: { marginTop: spacing.sm },
  durationOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  durationOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  durationOptionText: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  durationOptionTextActive: { color: colors.primary },
});
