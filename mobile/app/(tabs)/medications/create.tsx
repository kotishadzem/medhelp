import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { medicationsApi } from "@/lib/api/endpoints";
import { Button } from "@/components/Button";
import { addDaysYMD, dateInputToISO, todayYMD } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

const DEFAULT_TIMES = ["08:00", "14:00", "20:00", "22:00"];

export default function CreateMedication() {
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [frequency, setFrequency] = useState(1);
  const [durationDays, setDurationDays] = useState(7);
  const [times, setTimes] = useState<string[]>(["09:00"]);

  // Auto-distribute times when frequency changes
  const setFrequencyAndTimes = (f: number) => {
    setFrequency(f);
    setTimes(DEFAULT_TIMES.slice(0, f));
  };

  const startYMD = todayYMD();
  const endYMD = useMemo(() => addDaysYMD(startYMD, Math.max(1, durationDays) - 1), [startYMD, durationDays]);

  const mutation = useMutation({
    mutationFn: medicationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["today"] });
      router.back();
    },
    onError: (e) => {
      Alert.alert("შეცდომა", e instanceof Error ? e.message : "ვერ მოხერხდა შენახვა");
    },
  });

  const canSubmit =
    name.trim().length > 0 &&
    dosage.trim().length > 0 &&
    times.length === frequency &&
    times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) &&
    durationDays >= 1;

  const submit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      name: name.trim(),
      dosage: dosage.trim(),
      instructions: instructions.trim() ? instructions.trim() : undefined,
      startDate: dateInputToISO(startYMD),
      endDate: dateInputToISO(endYMD),
      frequencyPerDay: frequency,
      timesOfDay: times,
    });
  };

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
          <Text style={styles.title}>ახალი მედიკამენტი</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Section title="დასახელება">
            <Input
              value={name}
              onChangeText={setName}
              placeholder="მაგ. ამოქსიცილინი"
              autoCapitalize="words"
            />
          </Section>

          <Section title="დოზა">
            <Input
              value={dosage}
              onChangeText={setDosage}
              placeholder="მაგ. 500 მგ"
              autoCapitalize="none"
            />
          </Section>

          <Section title="ინსტრუქცია" optional>
            <Input
              value={instructions}
              onChangeText={setInstructions}
              placeholder="მაგ. ჭამის შემდეგ"
              multiline
            />
          </Section>

          <Section title="დღეში რამდენჯერ?">
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

          <Section title="დროები">
            <View style={styles.timesGrid}>
              {times.map((t, i) => (
                <TimePicker
                  key={i}
                  value={t}
                  onChange={(v) => {
                    const next = [...times];
                    next[i] = v;
                    setTimes(next);
                  }}
                />
              ))}
            </View>
          </Section>

          <Section title="ხანგრძლივობა">
            <View style={styles.segment}>
              {[3, 7, 14, 30].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDurationDays(d)}
                  style={[styles.segmentItem, durationDays === d && styles.segmentItemActive]}
                >
                  <Text
                    style={[styles.segmentText, durationDays === d && styles.segmentTextActive]}
                  >
                    {d} დღე
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helper}>
              {startYMD} – {endYMD} ({durationDays * frequency} ჯამში)
            </Text>
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="დამატება"
            onPress={submit}
            disabled={!canSubmit}
            loading={mutation.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{title}</Text>
        {optional && <Text style={styles.optional}>არასავალდებულო</Text>}
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
  const [h, m] = value.split(":");
  return (
    <View style={styles.timeCard}>
      <Ionicons name="time-outline" size={18} color={colors.textMuted} />
      <View style={styles.timeFields}>
        <NumberField
          value={h}
          onChange={(v) => onChange(`${v}:${m ?? "00"}`)}
          max={23}
          width={42}
        />
        <Text style={styles.timeColon}>:</Text>
        <NumberField
          value={m}
          onChange={(v) => onChange(`${h ?? "00"}:${v}`)}
          max={59}
          width={42}
        />
      </View>
    </View>
  );
}

function NumberField({
  value,
  onChange,
  max,
  width,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
  width: number;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => {
        const digits = t.replace(/\D/g, "").slice(0, 2);
        const n = Math.min(Number(digits || 0), max);
        onChange(String(n).padStart(2, "0"));
      }}
      keyboardType="number-pad"
      maxLength={2}
      selectTextOnFocus
      style={[styles.timeInput, { width }]}
    />
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
  timeFields: { flexDirection: "row", alignItems: "center", gap: 2 },
  timeColon: { color: colors.textMuted, fontSize: fontSize.lg, fontWeight: "700" },
  timeInput: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 4,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
