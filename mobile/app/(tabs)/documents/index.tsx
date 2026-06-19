import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { MonthCalendar } from "@/components/MonthCalendar";
import { documentsApi } from "@/lib/api/endpoints";
import { formatDateLong, formatDateShort, todayYMD } from "@/lib/format";
import { colors, fontSize, radius, spacing } from "@/lib/theme";
import type { DocumentType, MedicalDocument } from "@/lib/types";

const DOC_TYPES: DocumentType[] = [
  "FORM_100",
  "PRESCRIPTION",
  "BLOOD_TEST",
  "CT_SCAN",
  "MRI_SCAN",
  "ULTRASOUND",
  "ECG",
  "LAB_ANALYSIS",
  "OTHER",
];

type DateMode = "from" | "to";

export default function DocumentsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<DocumentType | null>(null);
  const [clinic, setClinic] = useState<string | null>(null);
  const [fromYMD, setFromYMD] = useState<string | null>(null);
  const [toYMD, setToYMD] = useState<string | null>(null);
  const [showClinicPicker, setShowClinicPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<DateMode | null>(null);

  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      type: type ?? undefined,
      clinic: clinic ?? undefined,
      from: fromYMD ? `${fromYMD}T00:00:00.000Z` : undefined,
      to: toYMD ? `${toYMD}T23:59:59.999Z` : undefined,
    }),
    [query, type, clinic, fromYMD, toYMD]
  );

  const documentsQuery = useQuery({
    queryKey: ["documents", params],
    queryFn: () => documentsApi.list(params),
  });

  const clinicsQuery = useQuery({
    queryKey: ["documents", "clinics"],
    queryFn: () => documentsApi.clinics(),
  });

  const hasFilters = !!(type || clinic || fromYMD || toYMD || query.trim());

  const clearFilters = () => {
    setQuery("");
    setType(null);
    setClinic(null);
    setFromYMD(null);
    setToYMD(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("documents.title")}</Text>
          <Text style={styles.subtitle}>{t("documents.subtitle")}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/documents/create")}
          style={({ pressed }) => [styles.uploadBtn, pressed && styles.pressed]}
          accessibilityLabel={t("documents.uploadCta")}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={colors.bg} />
          <Text style={styles.uploadBtnText}>{t("documents.uploadCtaShort")}</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("documents.searchPlaceholder")}
          placeholderTextColor={colors.textDim}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={6}>
            <Ionicons name="close-circle" size={18} color={colors.textDim} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip
          label={t("documents.filters.all")}
          active={!type}
          onPress={() => setType(null)}
        />
        {DOC_TYPES.map((dt) => (
          <Chip
            key={dt}
            label={t(`documents.type.${dt}`)}
            active={type === dt}
            onPress={() => setType(type === dt ? null : dt)}
          />
        ))}
      </ScrollView>

      <View style={styles.secondaryRow}>
        <FilterChip
          icon="business-outline"
          label={clinic ?? t("documents.filters.clinic")}
          active={!!clinic}
          onPress={() => setShowClinicPicker(true)}
        />
        <FilterChip
          icon="calendar-outline"
          label={
            fromYMD
              ? `${t("documents.filters.from")}: ${formatDateShort(`${fromYMD}T00:00:00`)}`
              : t("documents.filters.from")
          }
          active={!!fromYMD}
          onPress={() => setShowDatePicker("from")}
        />
        <FilterChip
          icon="calendar-outline"
          label={
            toYMD
              ? `${t("documents.filters.to")}: ${formatDateShort(`${toYMD}T00:00:00`)}`
              : t("documents.filters.to")
          }
          active={!!toYMD}
          onPress={() => setShowDatePicker("to")}
        />
        {hasFilters && (
          <Pressable
            onPress={clearFilters}
            style={({ pressed }) => [styles.clearChip, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={12} color={colors.danger} />
            <Text style={styles.clearChipText}>{t("documents.filters.clear")}</Text>
          </Pressable>
        )}
      </View>

      {documentsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (documentsQuery.data?.documents.length ?? 0) === 0 ? (
        <EmptyState onUpload={() => router.push("/(tabs)/documents/create")} />
      ) : (
        <FlatList
          data={documentsQuery.data?.documents ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DocumentRow
              document={item}
              onPress={() => router.push({ pathname: "/(tabs)/documents/[id]", params: { id: item.id } })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={documentsQuery.isRefetching}
              onRefresh={() => documentsQuery.refetch()}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <ClinicPickerModal
        visible={showClinicPicker}
        clinics={clinicsQuery.data?.clinics ?? []}
        selected={clinic}
        onClose={() => setShowClinicPicker(false)}
        onSelect={(c) => {
          setClinic(c);
          setShowClinicPicker(false);
        }}
      />

      <DatePickerModal
        mode={showDatePicker}
        value={
          showDatePicker === "from"
            ? fromYMD ?? todayYMD()
            : toYMD ?? todayYMD()
        }
        onClose={() => setShowDatePicker(null)}
        onSelect={(d) => {
          if (showDatePicker === "from") setFromYMD(d);
          else setToYMD(d);
          setShowDatePicker(null);
        }}
        onClear={() => {
          if (showDatePicker === "from") setFromYMD(null);
          else setToYMD(null);
          setShowDatePicker(null);
        }}
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        styles.chipWithIcon,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={12}
        color={active ? colors.bg : colors.textMuted}
      />
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function DocumentRow({
  document,
  onPress,
}: {
  document: MedicalDocument;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <DocumentTypeIcon type={document.documentType} size={48} />
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {document.customType?.trim()
            ? document.customType
            : t(`documents.type.${document.documentType}`)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatDateLong(document.studyDate)} · {document.clinic}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Ionicons name="folder-open-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyTitle}>{t("documents.emptyTitle")}</Text>
      <Text style={styles.emptySubtitle}>{t("documents.emptySubtitle")}</Text>
      <Button label={t("documents.uploadCta")} onPress={onUpload} style={{ marginTop: spacing.lg }} />
    </View>
  );
}

function ClinicPickerModal({
  visible,
  clinics,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  clinics: string[];
  selected: string | null;
  onClose: () => void;
  onSelect: (clinic: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>{t("documents.filters.clinic")}</Text>
          <ScrollView style={{ maxHeight: 280 }}>
            <Pressable
              onPress={() => onSelect(null)}
              style={({ pressed }) => [styles.modalRow, !selected && styles.modalRowActive, pressed && styles.pressed]}
            >
              <Text style={styles.modalRowText}>{t("documents.filters.all")}</Text>
            </Pressable>
            {clinics.map((c) => (
              <Pressable
                key={c}
                onPress={() => onSelect(c)}
                style={({ pressed }) => [
                  styles.modalRow,
                  selected === c && styles.modalRowActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.modalRowText}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Button label={t("documents.actions.cancel")} onPress={onClose} variant="ghost" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DatePickerModal({
  mode,
  value,
  onClose,
  onSelect,
  onClear,
}: {
  mode: DateMode | null;
  value: string;
  onClose: () => void;
  onSelect: (ymd: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={!!mode} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>
            {mode === "from" ? t("documents.filters.from") : t("documents.filters.to")}
          </Text>
          <MonthCalendar value={value} onChange={onSelect} />
          <View style={styles.modalActions}>
            <Button label={t("documents.filters.clear")} variant="ghost" onPress={onClear} />
            <Button label={t("documents.actions.cancel")} variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  uploadBtnText: { color: colors.bg, fontWeight: "700", fontSize: fontSize.sm },
  pressed: { opacity: 0.7 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },

  chipsScroll: { flexGrow: 0 },
  chipsRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.xs + 2,
    alignItems: "center",
  },
  chip: {
    height: 28,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipWithIcon: {
    flexDirection: "row",
    gap: spacing.xs,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: "600" },
  chipTextActive: { color: colors.bg, fontWeight: "700" },

  secondaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    alignItems: "center",
  },
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 28,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger + "55",
    backgroundColor: colors.danger + "18",
  },
  clearChipText: { color: colors.danger, fontSize: fontSize.xs, fontWeight: "700" },

  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  rowMeta: { color: colors.textMuted, fontSize: fontSize.sm },

  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", marginTop: spacing.md },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  center: { padding: spacing.xxl, alignItems: "center" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: "800" },
  modalRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  modalRowActive: { backgroundColor: colors.primaryMuted },
  modalRowText: { color: colors.text, fontSize: fontSize.md },
  modalActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
});
