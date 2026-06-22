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
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import { DocumentTypeIcon } from "@/components/DocumentTypeIcon";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ShareModal } from "@/components/ShareModal";
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

type Props = {
  forUserId?: string;
  onPressRow: (doc: MedicalDocument) => void;
  onUpload?: () => void;
};

export function DocumentsListView({ forUserId, onPressRow, onUpload }: Props) {
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<DocumentType | null>(null);
  const [clinic, setClinic] = useState<string | null>(null);
  const [fromYMD, setFromYMD] = useState<string | null>(null);
  const [toYMD, setToYMD] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<DateMode | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareIds, setShareIds] = useState<string[] | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      type: type ?? undefined,
      clinic: clinic ?? undefined,
      from: fromYMD ? `${fromYMD}T00:00:00.000Z` : undefined,
      to: toYMD ? `${toYMD}T23:59:59.999Z` : undefined,
      forUserId,
    }),
    [query, type, clinic, fromYMD, toYMD, forUserId]
  );

  const documentsQuery = useQuery({
    queryKey: ["documents", params],
    queryFn: () => documentsApi.list(params),
  });

  const clinicsQuery = useQuery({
    queryKey: ["documents", "clinics", forUserId],
    queryFn: () => documentsApi.clinics(forUserId),
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
    <View style={styles.root}>
      <View style={styles.selectRow}>
        {selectMode ? (
          <>
            <Pressable
              onPress={exitSelect}
              style={({ pressed }) => [styles.selectAction, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={14} color={colors.textMuted} />
              <Text style={styles.selectActionText}>
                {t("documents.actions.cancel")}
              </Text>
            </Pressable>
            <Text style={styles.selectCount}>
              {t("documents.share.selectedCount", { count: selected.size })}
            </Text>
            <Pressable
              onPress={() => {
                if (selected.size === 0) return;
                setShareIds(Array.from(selected));
              }}
              disabled={selected.size === 0}
              style={({ pressed }) => [
                styles.shareCta,
                selected.size === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="share-social-outline" size={14} color={colors.bg} />
              <Text style={styles.shareCtaText}>
                {t("documents.share.shareSelected", { count: selected.size })}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => setSelectMode(true)}
            style={({ pressed }) => [styles.selectAction, pressed && styles.pressed]}
          >
            <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
            <Text style={[styles.selectActionText, { color: colors.primary }]}>
              {t("documents.share.selectMode")}
            </Text>
          </Pressable>
        )}
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

      <View style={styles.secondaryRow}>
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
        <Pressable
          onPress={() => setShowFilterSheet(true)}
          style={({ pressed }) => [
            styles.chip,
            styles.chipWithIcon,
            (type || clinic) && styles.chipActive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={12}
            color={type || clinic ? colors.bg : colors.textMuted}
          />
          <Text
            style={[styles.chipText, (type || clinic) && styles.chipTextActive]}
            numberOfLines={1}
          >
            {t("documents.filters.more")}
            {type || clinic ? ` · ${[type ? t(`documents.type.${type}`) : null, clinic].filter(Boolean).join(", ")}` : ""}
          </Text>
        </Pressable>
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
        <EmptyState onUpload={onUpload} />
      ) : (
        <FlatList
          data={documentsQuery.data?.documents ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DocumentRow
              document={item}
              selectMode={selectMode}
              checked={selected.has(item.id)}
              onPress={() => {
                if (selectMode) toggleSelect(item.id);
                else onPressRow(item);
              }}
              onLongPress={() => {
                if (!selectMode) {
                  setSelectMode(true);
                  toggleSelect(item.id);
                }
              }}
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

      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        type={type}
        onType={setType}
        clinic={clinic}
        clinics={clinicsQuery.data?.clinics ?? []}
        onClinic={setClinic}
      />

      <DatePickerModal
        mode={showDatePicker}
        value={
          showDatePicker === "from" ? fromYMD ?? todayYMD() : toYMD ?? todayYMD()
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

      <ShareModal
        visible={!!shareIds}
        documentIds={shareIds ?? []}
        onClose={() => {
          setShareIds(null);
          exitSelect();
        }}
      />
    </View>
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
      <Ionicons name={icon} size={12} color={active ? colors.bg : colors.textMuted} />
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
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

function DocumentRow({
  document,
  selectMode,
  checked,
  onPress,
  onLongPress,
}: {
  document: MedicalDocument;
  selectMode: boolean;
  checked: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.row,
        checked && styles.rowChecked,
        pressed && styles.pressed,
      ]}
    >
      {selectMode && (
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={14} color={colors.bg} />}
        </View>
      )}
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
      {document.files.length > 1 && (
        <View style={styles.rowBadge}>
          <Ionicons name="documents-outline" size={12} color={colors.primary} />
          <Text style={styles.rowBadgeText}>{document.files.length}</Text>
        </View>
      )}
      {!selectMode && (
        <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
      )}
    </Pressable>
  );
}

function EmptyState({ onUpload }: { onUpload?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Ionicons name="folder-open-outline" size={48} color={colors.textDim} />
      <Text style={styles.emptyTitle}>{t("documents.emptyTitle")}</Text>
      <Text style={styles.emptySubtitle}>{t("documents.emptySubtitle")}</Text>
      {onUpload && (
        <Button
          label={t("documents.uploadCta")}
          onPress={onUpload}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );
}

function FilterSheet({
  visible,
  onClose,
  type,
  onType,
  clinic,
  clinics,
  onClinic,
}: {
  visible: boolean;
  onClose: () => void;
  type: DocumentType | null;
  onType: (t: DocumentType | null) => void;
  clinic: string | null;
  clinics: string[];
  onClinic: (c: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>{t("documents.filters.more")}</Text>

          <Text style={styles.sheetSectionLabel}>{t("documents.filters.type")}</Text>
          <View style={styles.sheetChipWrap}>
            <Chip
              label={t("documents.filters.all")}
              active={!type}
              onPress={() => onType(null)}
            />
            {DOC_TYPES.map((dt) => (
              <Chip
                key={dt}
                label={t(`documents.type.${dt}`)}
                active={type === dt}
                onPress={() => onType(type === dt ? null : dt)}
              />
            ))}
          </View>

          {clinics.length > 0 && (
            <>
              <Text style={styles.sheetSectionLabel}>
                {t("documents.filters.clinic")}
              </Text>
              <ScrollView style={{ maxHeight: 200 }}>
                <Pressable
                  onPress={() => onClinic(null)}
                  style={({ pressed }) => [
                    styles.modalRow,
                    !clinic && styles.modalRowActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.modalRowText}>{t("documents.filters.all")}</Text>
                </Pressable>
                {clinics.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => onClinic(c)}
                    style={({ pressed }) => [
                      styles.modalRow,
                      clinic === c && styles.modalRowActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.modalRowText}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalActionMain}>{t("documents.actions.cancel")}</Text>
            </Pressable>
          </View>
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
            <Pressable
              onPress={onClear}
              style={({ pressed }) => [styles.modalActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalActionGhost}>{t("documents.filters.clear")}</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.modalActionBtn, pressed && styles.pressed]}
            >
              <Text style={styles.modalActionMain}>{t("documents.actions.cancel")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  searchInput: { flex: 1, color: colors.text, fontSize: fontSize.md, paddingVertical: 0 },

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
  rowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primary + "22",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  rowBadgeText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: "700" },
  rowChecked: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },

  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  selectAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  selectActionText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: "700" },
  selectCount: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  shareCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  shareCtaText: { color: colors.bg, fontSize: fontSize.sm, fontWeight: "800" },
  disabled: { opacity: 0.45 },

  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: spacing.md,
  },
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
    padding: spacing.md,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  modalTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "800" },
  modalRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  modalRowActive: { backgroundColor: colors.primaryMuted },
  modalRowText: { color: colors.text, fontSize: fontSize.md },
  modalActions: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "flex-end",
    marginTop: spacing.xs,
  },
  modalActionBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  modalActionGhost: { color: colors.danger, fontSize: fontSize.sm, fontWeight: "700" },
  modalActionMain: { color: colors.primary, fontSize: fontSize.sm, fontWeight: "700" },

  sheetSectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  sheetChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2 },
});
